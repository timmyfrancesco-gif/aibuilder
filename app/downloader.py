"""Wrapper attorno a yt-dlp: estrazione metadati e download con progresso."""

from __future__ import annotations

import os
import re
import shutil
import threading
import time
import uuid
from dataclasses import dataclass, field
from datetime import date
from pathlib import Path
from typing import Any

from yt_dlp import YoutubeDL
from yt_dlp.utils import DownloadError
from yt_dlp.version import __version__ as VERSIONE_YTDLP

DOWNLOAD_DIR = Path(__file__).resolve().parent.parent / "downloads"
DOWNLOAD_DIR.mkdir(exist_ok=True)

# Quanto tempo un file scaricato resta su disco prima di essere rimosso.
JOB_TTL_SECONDS = int(os.environ.get("JOB_TTL_MINUTES", "60")) * 60

# Su un server in affitto il disco è poco e si riempie in fretta: oltre questa soglia
# i download conclusi più vecchi vengono eliminati anche prima della scadenza.
MAX_DISK_BYTES = int(os.environ.get("MAX_DISK_MB", "2048")) * 1024 * 1024

HAS_FFMPEG = shutil.which("ffmpeg") is not None

# Con SAVE_DIR impostata (es. ~/Desktop) il file finito viene copiato lì appena pronto,
# senza passare dal browser. Ha senso solo quando il server gira sulla propria macchina:
# in cloud scriverebbe sul disco del servizio di hosting, non sul tuo.
SAVE_DIR: Path | None = None
_save_env = os.environ.get("SAVE_DIR", "").strip()
if _save_env:
    SAVE_DIR = Path(_save_env).expanduser()

# YouTube sfida spesso le richieste che arrivano da un datacenter. Esportando i cookie
# del proprio browser e incollandoli qui (formato Netscape) si passa come utente normale.
COOKIE_FILE: str | None = None
_cookie_env = os.environ.get("YTDLP_COOKIES", "").strip()
if _cookie_env:
    _percorso = Path(os.environ.get("YTDLP_COOKIES_FILE", "/tmp/yt-dlp-cookies.txt"))
    try:
        _percorso.write_text(_cookie_env, encoding="utf-8")
        _percorso.chmod(0o600)
        COOKIE_FILE = str(_percorso)
    except OSError:
        COOKIE_FILE = None
elif os.environ.get("YTDLP_COOKIES_FILE"):
    _percorso = Path(os.environ["YTDLP_COOKIES_FILE"])
    COOKIE_FILE = str(_percorso) if _percorso.is_file() else None

# In locale è più comodo leggere i cookie direttamente dal browser in cui si è già
# loggati: TikTok e Instagram li richiedono per buona parte dei contenuti.
# Formato: "safari", "chrome", "firefox"… oppure "chrome:NomeProfilo".
COOKIES_BROWSER: tuple[str, str | None, None, None] | None = None
# Perché i cookie non sono attivi. Serve a dare all'utente l'istruzione giusta:
# "non configurato" e "configurato ma illeggibile" richiedono rimedi opposti.
COOKIES_STATO: str = "non_configurato"
COOKIES_DETTAGLIO: str = ""


def _leggi_browser_cookie():
    global COOKIES_STATO, COOKIES_DETTAGLIO

    grezzo = os.environ.get("COOKIES_FROM_BROWSER", "").strip()
    if not grezzo:
        COOKIES_STATO = "non_configurato"
        return None

    nome, _, profilo = grezzo.partition(":")
    nome = nome.lower()

    from yt_dlp.cookies import SUPPORTED_BROWSERS, extract_cookies_from_browser

    if nome not in SUPPORTED_BROWSERS:
        COOKIES_STATO = "browser_sconosciuto"
        COOKIES_DETTAGLIO = f"«{nome}» non è tra: {', '.join(sorted(SUPPORTED_BROWSERS))}"
        return None

    # Una prova subito: se il browser non è leggibile (su macOS il Terminale ha bisogno
    # dell'Accesso completo al disco per Safari), è meglio accorgersene adesso e
    # proseguire senza cookie, invece di far fallire ogni singolo download.
    try:
        extract_cookies_from_browser(nome, profilo or None)
    except Exception as exc:  # noqa: BLE001 - qualunque problema significa "non usarli"
        COOKIES_STATO = "lettura_fallita"
        COOKIES_DETTAGLIO = f"{nome}: {str(exc).splitlines()[0][:200]}"
        return None

    COOKIES_STATO = "attivo"
    return (nome, profilo or None, None, None)


COOKIES_BROWSER = _leggi_browser_cookie()

# Ricevendo i cookie di un account loggato, yt-dlp passa al client "tv_downgraded",
# che YouTube respinge con «The page needs to be reloaded». Indicare client alternativi
# è il rimedio consigliato da yt-dlp. Si applica solo quando i cookie sono in uso:
# senza, i client predefiniti se la cavano meglio da soli.
PLAYER_CLIENT = os.environ.get("YTDLP_PLAYER_CLIENT", "default,web_embedded").strip()


def _extractor_args() -> dict[str, dict[str, list[str]]]:
    if not (COOKIES_BROWSER or COOKIE_FILE) or not PLAYER_CLIENT:
        return {}
    clients = [c.strip() for c in PLAYER_CLIENT.split(",") if c.strip()]
    return {"youtube": {"player_client": clients}}

# YouTube cambia spesso il modo in cui serve i video, e una yt-dlp di qualche mese
# semplicemente smette di funzionare: meglio dirlo prima che l'utente sbatta su un errore
# incomprensibile.
YTDLP_SCADE_DOPO_GIORNI = 90


def eta_ytdlp_giorni() -> int | None:
    """Da quanti giorni è uscita la yt-dlp installata (le versioni sono date: 2026.7.4)."""
    parti = VERSIONE_YTDLP.split(".")[:3]
    try:
        rilascio = date(int(parti[0]), int(parti[1]), int(parti[2]))
    except (ValueError, IndexError):
        return None
    return max(0, (date.today() - rilascio).days)


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
    saved_to: str | None = None
    error: str | None = None
    created_at: float = field(default_factory=time.time)
    finished_at: float | None = None

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
            "saved_to": self.saved_to,
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
    """Elimina file e job conclusi da più del TTL.

    Il tempo si conta dalla fine del download, non dall'inizio: un download lungo non
    deve vedersi cancellare la cartella mentre è ancora in corso.
    """
    now = time.time()
    with _jobs_lock:
        scaduti = [
            j
            for j in _jobs.values()
            if j.status in ("done", "error")
            and now - (j.finished_at or j.created_at) > JOB_TTL_SECONDS
        ]
        for job in scaduti:
            _jobs.pop(job.id, None)
        vivi = set(_jobs)

    for job in scaduti:
        shutil.rmtree(DOWNLOAD_DIR / job.id, ignore_errors=True)

    # Cartelle rimaste da un'esecuzione precedente del server: nessun job in memoria le
    # rivendica più, quindi resterebbero su disco per sempre.
    for cartella in DOWNLOAD_DIR.iterdir():
        if not cartella.is_dir() or cartella.name in vivi:
            continue
        try:
            if now - cartella.stat().st_mtime > JOB_TTL_SECONDS:
                shutil.rmtree(cartella, ignore_errors=True)
        except OSError:
            pass

    _limita_disco()


def _limita_disco() -> None:
    """Elimina i download conclusi più vecchi finché lo spazio occupato rientra nel limite.

    Su un piano gratuito il disco è di pochi giga: senza questo, tre video lunghi lo
    riempiono e ogni download successivo fallisce.
    """
    with _jobs_lock:
        conclusi = sorted(
            (j for j in _jobs.values() if j.status == "done" and j.filesize),
            key=lambda j: j.finished_at or j.created_at,
        )
    totale = sum(j.filesize or 0 for j in conclusi)
    for job in conclusi:
        if totale <= MAX_DISK_BYTES:
            return
        totale -= job.filesize or 0
        with _jobs_lock:
            _jobs.pop(job.id, None)
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

    # Nessun vincolo sull'estensione qui: sopra i 1080p YouTube spesso offre solo VP9 in
    # webm, e pretendere ext=mp4 farebbe scegliere in silenzio la variante 1080p.
    # La preferenza per mp4/H.264 si esprime con FORMAT_SORT, che ordina a parità di
    # risoluzione invece di escludere formati.
    return (
        f"bestvideo{altezza}+bestaudio/best{altezza}/best",
        [],
        "mp4",
    )


# A parità di risoluzione preferiamo H.264 in mp4: è l'unica combinazione che QuickTime,
# Anteprima e Safari aprono senza installare nulla. La risoluzione resta il criterio
# principale, quindi in 4K (dove H.264 non esiste) si passa comunque a VP9/AV1.
FORMAT_SORT = ["res", "vcodec:h264", "ext:mp4:m4a"]


def _base_opts() -> dict[str, Any]:
    return {
        "quiet": True,
        "no_warnings": True,
        "noplaylist": True,
        "cookiefile": COOKIE_FILE,
        "cookiesfrombrowser": COOKIES_BROWSER,
        "extractor_args": _extractor_args(),
        # "quiet" non basta a togliere la barra di avanzamento di yt-dlp, che sporcherebbe
        # il terminale: l'avanzamento lo mostriamo noi nel browser.
        "noprogress": True,
        "nocheckcertificate": False,
        "retries": 3,
        "socket_timeout": 30,
    }


def fetch_info(url: str) -> dict[str, Any]:
    """Metadati del video senza scaricare nulla."""
    # "noplaylist" non copre gli indirizzi di playlist o di canale: senza un limite
    # esplicito yt-dlp estrarrebbe ogni singolo video prima di restituire il primo.
    opts = _base_opts() | {"skip_download": True, "playlist_items": "1"}
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
        "has_video": _ha_video(info),
    }


def _ha_video(info: dict[str, Any]) -> bool:
    """Alcuni post non contengono un filmato: le slideshow di TikTok, per esempio,
    espongono solo la traccia audio. Senza questo, chiedere "video" restituirebbe
    un file audio con estensione da video."""
    return any(
        f.get("vcodec") not in (None, "none") for f in info.get("formats") or []
    )


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
        "format_sort": FORMAT_SORT,
        "postprocessors": postprocessors,
        # "%(title,id)s": se il titolo si riduce a nulla dopo la ripulitura si usa l'id,
        # così due download diversi non finiscono con lo stesso nome.
        "outtmpl": str(cartella / "%(title,id).150B.%(ext)s"),
        "progress_hooks": [lambda d: _on_progress(job, d)],
        "postprocessor_hooks": [lambda d: _on_postprocess(job, d)],
        # "mp4/mkv" e non "mp4": se i flussi non sono compatibili con il contenitore mp4
        # (VP9 con Opus, per esempio) yt-dlp ripiega su mkv invece di produrre un mp4
        # che poi nessun lettore di sistema riesce ad aprire.
        "merge_output_format": "mp4/mkv" if job.mode == "video" and HAS_FFMPEG else None,
    }

    job.status = "downloading"
    # Tutto dentro il try: se qualcosa fallisce dopo il download, il thread muore in
    # silenzio e il job resterebbe "in corso" per sempre agli occhi dell'utente.
    try:
        with YoutubeDL(opts) as ydl:
            info = ydl.extract_info(job.url, download=True)
        job.title = info.get("title")

        finale = _file_prodotto(info, cartella)
        if finale is None:
            _fallisci(job, cartella, "Il download è terminato ma non è stato prodotto alcun file.")
            return

        job.filename = finale.name
        job.filesize = finale.stat().st_size
        job.saved_to = _copia_in_save_dir(finale)
    except DownloadError as exc:
        _fallisci(job, cartella, _pulisci_errore(str(exc)))
        return
    except Exception as exc:  # noqa: BLE001 - qualunque imprevisto va mostrato all'utente
        _fallisci(job, cartella, f"Errore imprevisto: {exc}")
        return

    job.progress = 100.0
    job.stream = None
    job.step = None
    job.finished_at = time.time()
    job.status = "done"
    _limita_disco()


def _copia_in_save_dir(sorgente: Path) -> str | None:
    """Copia (non sposta) il file finito nella cartella scelta dall'utente.

    Copia perché l'originale continua a servire il pulsante di download nel browser;
    la copia nel job viene poi eliminata alla scadenza, quella dell'utente resta.
    Un problema qui non deve far fallire un download andato a buon fine.
    """
    if SAVE_DIR is None:
        return None
    try:
        SAVE_DIR.mkdir(parents=True, exist_ok=True)
        destinazione = _nome_libero(SAVE_DIR / sorgente.name)
        shutil.copy2(sorgente, destinazione)
        return str(destinazione)
    except OSError:
        return None


def _nome_libero(percorso: Path) -> Path:
    """Evita di sovrascrivere un file già presente: «video.mp4» -> «video (2).mp4»."""
    if not percorso.exists():
        return percorso
    for n in range(2, 100):
        alternativa = percorso.with_name(f"{percorso.stem} ({n}){percorso.suffix}")
        if not alternativa.exists():
            return alternativa
    return percorso.with_name(f"{percorso.stem} ({uuid.uuid4().hex[:6]}){percorso.suffix}")


def _fallisci(job: Job, cartella: Path, messaggio: str) -> None:
    job.error = messaggio
    job.stream = None
    job.step = None
    job.finished_at = time.time()
    job.status = "error"
    shutil.rmtree(cartella, ignore_errors=True)


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

# yt-dlp colora "ERROR:" quando pensa di scrivere su un terminale. Nel browser quelle
# sequenze finirebbero a schermo come caratteri illeggibili.
_ANSI = re.compile(r"\x1b\[[0-9;]*[A-Za-z]")


def _errore_youtube_rifiutata() -> str:
    """YouTube respinge sia le yt-dlp obsolete sia le richieste che gli sembrano
    automatiche. Sono cause diverse con rimedi opposti: confonderle manda l'utente ad
    aggiornare una versione che è già l'ultima."""
    eta = eta_ytdlp_giorni()
    if eta is not None and eta > YTDLP_SCADE_DOPO_GIORNI:
        return (
            f"YouTube ha rifiutato la richiesta e yt-dlp {VERSIONE_YTDLP} ha circa "
            f"{max(1, eta // 30)} mesi: aggiornala con «pip install -U yt-dlp»."
        )

    # yt-dlp è aggiornata: resta la verifica con cui YouTube filtra le richieste
    # che non sembrano venire da un browser.
    if COOKIES_STATO == "attivo" and COOKIES_BROWSER:
        browser = COOKIES_BROWSER[0].capitalize()
        return (
            f"YouTube ha rifiutato la richiesta pur usando i cookie di {browser}. "
            f"Controlla di aver fatto l'accesso a YouTube proprio in {browser}. Se il "
            "problema resta, prova ad avviare l'app senza COOKIES_FROM_BROWSER: su "
            "YouTube i cookie a volte peggiorano le cose (restano necessari per TikTok)."
        )
    if COOKIES_STATO == "lettura_fallita":
        return (
            "YouTube chiede una verifica che si supera con i cookie del browser, ma non "
            "sono leggibili. Su macOS serve dare al Terminale l'Accesso completo al disco "
            "(Impostazioni di Sistema \u2192 Privacy e sicurezza), poi riavviare l'app. "
            f"Dettaglio: {COOKIES_DETTAGLIO}"
        )
    return (
        "YouTube chiede una verifica per distinguere le persone dai programmi. Si supera "
        "riusando i cookie del browser in cui hai gi\u00e0 fatto l'accesso: avvia l'app con "
        "COOKIES_FROM_BROWSER=chrome (o safari, firefox)."
    )


def _pulisci_errore(messaggio: str) -> str:
    """Rende leggibile l'output di yt-dlp."""
    messaggio = _ANSI.sub("", messaggio).replace("ERROR: ", "")
    righe = [r.strip() for r in messaggio.splitlines() if r.strip()]
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
    # Errori con cui YouTube respinge una richiesta che non riconosce.
    if (
        "page needs to be reloaded" in testo
        or "Failed to extract any player response" in testo
        or "nsig extraction failed" in testo
    ):
        return _errore_youtube_rifiutata()
    # TikTok e Instagram richiedono un account per buona parte dei contenuti.
    if "requiring login" in testo or "login required" in testo.lower() or "--cookies" in testo:
        if COOKIES_STATO == "attivo" and COOKIES_BROWSER:
            return (
                f"Il sito richiede un account. I cookie di "
                f"{COOKIES_BROWSER[0].capitalize()} vengono già letti: assicurati di aver "
                f"fatto l'accesso al sito proprio in {COOKIES_BROWSER[0].capitalize()}, "
                "poi riprova."
            )
        if COOKIES_STATO == "lettura_fallita":
            return (
                "Questo contenuto richiede un account, e i cookie del browser non sono "
                "leggibili. Su macOS serve dare al Terminale l'Accesso completo al disco "
                "(Impostazioni di Sistema → Privacy e sicurezza → Accesso completo al "
                "disco), poi riavviare l'app. In alternativa esporta i cookie in un file "
                f"e indicalo con YTDLP_COOKIES_FILE. Dettaglio: {COOKIES_DETTAGLIO}"
            )
        if COOKIES_STATO == "browser_sconosciuto":
            return (
                f"Questo contenuto richiede un account, ma il browser indicato non è "
                f"valido. {COOKIES_DETTAGLIO}"
            )
        return (
            "Questo contenuto richiede un account. Avvia l'app con "
            "COOKIES_FROM_BROWSER=safari (o chrome, firefox) per usare i cookie del "
            "browser in cui hai già fatto l'accesso."
        )
    if "Requested format is not available" in testo:
        return "La qualità richiesta non è disponibile per questo video: provane un'altra."
    return testo or "Download non riuscito."
