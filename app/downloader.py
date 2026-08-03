"""Wrapper attorno a yt-dlp: estrazione metadati e download con progresso."""

from __future__ import annotations

import re
import shutil
import threading
import time
import uuid
from dataclasses import dataclass, field
from pathlib import Path
from typing import Any

from yt_dlp import YoutubeDL
from yt_dlp.utils import DownloadError

DOWNLOAD_DIR = Path(__file__).resolve().parent.parent / "downloads"
DOWNLOAD_DIR.mkdir(exist_ok=True)

# Quanto tempo un file scaricato resta su disco prima di essere rimosso.
JOB_TTL_SECONDS = 60 * 60

HAS_FFMPEG = shutil.which("ffmpeg") is not None


class DownloadFailed(Exception):
    """Errore leggibile da mostrare all'utente."""


@dataclass
class Job:
    id: str
    url: str
    mode: str
    quality: str
    status: str = "queued"  # queued | downloading | processing | done | error
    progress: float = 0.0
    speed: str | None = None
    eta: str | None = None
    # Per la qualità massima yt-dlp scarica video e audio come flussi separati e li unisce:
    # l'avanzamento riparte da zero a ogni flusso, quindi diciamo all'utente quale è in corso.
    stream: str | None = None
    step: str | None = None
    title: str | None = None
    filename: str | None = None
    filesize: int | None = None
    error: str | None = None
    created_at: float = field(default_factory=time.time)

    def as_dict(self) -> dict[str, Any]:
        return {
            "id": self.id,
            "status": self.status,
            "progress": round(self.progress, 1),
            "speed": self.speed,
            "eta": self.eta,
            "stream": self.stream,
            "step": self.step,
            "title": self.title,
            "filename": self.filename,
            "filesize": self.filesize,
            "error": self.error,
        }


_jobs: dict[str, Job] = {}
_jobs_lock = threading.Lock()


def get_job(job_id: str) -> Job | None:
    with _jobs_lock:
        return _jobs.get(job_id)


def _register(job: Job) -> None:
    with _jobs_lock:
        _jobs[job.id] = job


def prune_old_jobs() -> None:
    """Elimina file e job più vecchi del TTL."""
    now = time.time()
    with _jobs_lock:
        scaduti = [j for j in _jobs.values() if now - j.created_at > JOB_TTL_SECONDS]
        for job in scaduti:
            _jobs.pop(job.id, None)
    for job in scaduti:
        shutil.rmtree(DOWNLOAD_DIR / job.id, ignore_errors=True)


def _format_selector(mode: str, quality: str) -> tuple[str, list[dict[str, Any]], str]:
    """Restituisce (format string, postprocessors, estensione preferita)."""
    if mode == "audio":
        if not HAS_FFMPEG:
            # Senza ffmpeg non possiamo transcodificare: prendiamo l'audio così com'è.
            return "bestaudio/best", [], "m4a"
        return (
            "bestaudio/best",
            [{"key": "FFmpegExtractAudio", "preferredcodec": "mp3", "preferredquality": "0"}],
            "mp3",
        )

    altezza = "" if quality == "best" else f"[height<=?{quality}]"

    if not HAS_FFMPEG:
        # Nessun merge possibile: serve un formato già muxato (video+audio nello stesso file).
        return f"best{altezza}[ext=mp4]/best{altezza}/best", [], "mp4"

    return (
        f"bestvideo{altezza}[ext=mp4]+bestaudio[ext=m4a]/bestvideo{altezza}+bestaudio/best{altezza}/best",
        [],
        "mp4",
    )


def _base_opts() -> dict[str, Any]:
    return {
        "quiet": True,
        "no_warnings": True,
        "noplaylist": True,
        "nocheckcertificate": False,
        "retries": 3,
        "socket_timeout": 30,
    }


def fetch_info(url: str) -> dict[str, Any]:
    """Metadati del video senza scaricare nulla."""
    opts = _base_opts() | {"skip_download": True}
    try:
        with YoutubeDL(opts) as ydl:
            info = ydl.extract_info(url, download=False)
    except DownloadError as exc:
        raise DownloadFailed(_pulisci_errore(str(exc))) from exc

    if info.get("_type") == "playlist":
        voci = [e for e in info.get("entries") or [] if e]
        if not voci:
            raise DownloadFailed("Nessun video trovato a questo indirizzo.")
        info = voci[0]

    return {
        "id": info.get("id"),
        "title": info.get("title"),
        "uploader": info.get("uploader") or info.get("channel"),
        "duration": info.get("duration"),
        "thumbnail": info.get("thumbnail"),
        "view_count": info.get("view_count"),
        "webpage_url": info.get("webpage_url") or url,
        "extractor": info.get("extractor_key"),
        "heights": _altezze_disponibili(info),
    }


def _altezze_disponibili(info: dict[str, Any]) -> list[int]:
    altezze = {
        f["height"]
        for f in info.get("formats") or []
        if f.get("height") and f.get("vcodec") not in (None, "none")
    }
    return sorted(altezze, reverse=True)


def start_download(url: str, mode: str, quality: str) -> Job:
    job = Job(id=uuid.uuid4().hex[:12], url=url, mode=mode, quality=quality)
    _register(job)
    threading.Thread(target=_run, args=(job,), daemon=True).start()
    return job


def _run(job: Job) -> None:
    cartella = DOWNLOAD_DIR / job.id
    cartella.mkdir(parents=True, exist_ok=True)

    fmt, postprocessors, _ext = _format_selector(job.mode, job.quality)

    opts = _base_opts() | {
        "format": fmt,
        "postprocessors": postprocessors,
        "outtmpl": str(cartella / "%(title).150B.%(ext)s"),
        "restrictfilenames": True,
        "progress_hooks": [lambda d: _on_progress(job, d)],
        "postprocessor_hooks": [lambda d: _on_postprocess(job, d)],
        "merge_output_format": "mp4" if job.mode == "video" and HAS_FFMPEG else None,
    }

    job.status = "downloading"
    try:
        with YoutubeDL(opts) as ydl:
            info = ydl.extract_info(job.url, download=True)
        job.title = info.get("title")
    except DownloadError as exc:
        job.status = "error"
        job.error = _pulisci_errore(str(exc))
        shutil.rmtree(cartella, ignore_errors=True)
        return
    except Exception as exc:  # noqa: BLE001 - qualunque imprevisto va mostrato all'utente
        job.status = "error"
        job.error = f"Errore imprevisto: {exc}"
        shutil.rmtree(cartella, ignore_errors=True)
        return

    finale = _file_prodotto(info, cartella)
    if finale is None:
        job.status = "error"
        job.error = "Il download è terminato ma non è stato prodotto alcun file."
        shutil.rmtree(cartella, ignore_errors=True)
        return

    job.filename = finale.name
    job.filesize = finale.stat().st_size
    job.progress = 100.0
    job.stream = None
    job.step = None
    job.status = "done"


def _file_prodotto(info: dict[str, Any], cartella: Path) -> Path | None:
    """Il file finale così come lo dichiara yt-dlp, senza doverlo indovinare.

    Dopo un merge la cartella può contenere gli scarti dei singoli flussi, e non è detto
    che il file buono sia il più grande: la traccia audio può superare quella video.
    """
    for scaricato in info.get("requested_downloads") or []:
        for chiave in ("filepath", "_filename", "filename"):
            valore = scaricato.get(chiave)
            if valore and Path(valore).is_file():
                return Path(valore)

    # Riserva: il file completo più recente nella cartella del job.
    candidati = [
        p
        for p in cartella.iterdir()
        if p.is_file() and p.suffix not in (".part", ".ytdl", ".temp")
    ]
    return max(candidati, key=lambda p: p.stat().st_mtime) if candidati else None


def _on_progress(job: Job, d: dict[str, Any]) -> None:
    if d.get("status") == "downloading":
        job.status = "downloading"
        job.stream = _etichetta_flusso(d.get("info_dict") or {})
        totale = d.get("total_bytes") or d.get("total_bytes_estimate")
        scaricato = d.get("downloaded_bytes") or 0
        if totale:
            job.progress = min(99.0, scaricato / totale * 100)
        job.speed = _fmt_speed(d.get("speed"))
        job.eta = _fmt_eta(d.get("eta"))
    elif d.get("status") == "finished":
        # Non passiamo a "processing" qui: dopo il flusso video ne può partire un secondo.
        # Sarà il postprocessor hook a segnalare l'inizio della vera elaborazione.
        job.progress = 100.0
        job.speed = None
        job.eta = None


def _etichetta_flusso(info: dict[str, Any]) -> str | None:
    ha_video = info.get("vcodec") not in (None, "none")
    ha_audio = info.get("acodec") not in (None, "none")
    if ha_video and not ha_audio:
        return "video"
    if ha_audio and not ha_video:
        return "audio"
    return None


_PASSI = {
    "Merger": "unione di video e audio",
    "FFmpegMerger": "unione di video e audio",
    "ExtractAudio": "estrazione dell'audio",
    "FFmpegExtractAudio": "estrazione dell'audio",
}


def _on_postprocess(job: Job, d: dict[str, Any]) -> None:
    if d.get("status") == "started":
        job.status = "processing"
        job.stream = None
        job.step = _PASSI.get(d.get("postprocessor") or "")


def _fmt_speed(speed: float | None) -> str | None:
    if not speed:
        return None
    unita = ["B/s", "KB/s", "MB/s", "GB/s"]
    i = 0
    while speed >= 1024 and i < len(unita) - 1:
        speed /= 1024
        i += 1
    return f"{speed:.1f} {unita[i]}"


def _fmt_eta(eta: int | None) -> str | None:
    if eta is None:
        return None
    minuti, secondi = divmod(int(eta), 60)
    return f"{minuti}:{secondi:02d}" if minuti else f"{secondi}s"


# Righe del banner di ffmpeg (versione, build, elenco delle librerie): non dicono nulla
# sull'errore, ma finiscono nel messaggio perché yt-dlp riporta l'ultima riga di stderr.
_BANNER_FFMPEG = re.compile(
    r"^(ffmpeg version|ffprobe version|built with|configuration:|lib[a-z]+\s+\d)"
)


def _pulisci_errore(messaggio: str) -> str:
    """Rende leggibile l'output di yt-dlp."""
    righe = [r.strip() for r in messaggio.replace("ERROR: ", "").splitlines() if r.strip()]
    if not righe:
        return "Download non riuscito."

    testo = righe[0]

    if testo.startswith("Postprocessing:"):
        dettaglio = testo.split(":", 1)[1].strip()
        # Se resta solo il banner, un messaggio generico è più utile del numero di versione.
        if not dettaglio or _BANNER_FFMPEG.match(dettaglio):
            dettaglio = next(
                (r for r in righe[1:] if not _BANNER_FFMPEG.match(r)),
                "",
            )
        if not dettaglio or _BANNER_FFMPEG.match(dettaglio):
            return (
                "ffmpeg non è riuscito a elaborare il file (unione audio/video o "
                "conversione). Verifica che sia installato e funzionante con "
                "«ffmpeg -version»."
            )
        return f"Errore di ffmpeg: {dettaglio}"

    if "ffmpeg is not installed" in testo or "ffprobe and ffmpeg not found" in testo:
        return "ffmpeg non è installato: serve per unire video e audio in alta qualità."
    if "Unsupported URL" in testo:
        return "Questo indirizzo non è supportato."
    if "Private video" in testo:
        return "Il video è privato."
    if "Video unavailable" in testo:
        return "Video non disponibile."
    if "Sign in to confirm" in testo or "bot" in testo.lower():
        return (
            "YouTube ha richiesto una verifica per questa richiesta. "
            "Riprova più tardi o configura i cookie di yt-dlp."
        )
    return testo or "Download non riuscito."
