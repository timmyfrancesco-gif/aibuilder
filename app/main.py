"""API FastAPI che espone yt-dlp a un frontend web."""

from __future__ import annotations

import base64
import binascii
import os
import secrets
import sys
from pathlib import Path
from urllib.parse import urlparse

from fastapi import FastAPI, HTTPException, Request
from fastapi.responses import FileResponse, JSONResponse, Response
from fastapi.staticfiles import StaticFiles
from pydantic import BaseModel, field_validator

from .downloader import (
    DOWNLOAD_DIR,
    HAS_FFMPEG,
    COOKIES_BROWSER,
    COOKIES_DETTAGLIO,
    COOKIES_STATO,
    SAVE_DIR,
    VERSIONE_YTDLP,
    YTDLP_SCADE_DOPO_GIORNI,
    DownloadFailed,
    eta_ytdlp_giorni,
    pot_disponibile,
    fetch_info,
    get_job,
    prune_old_jobs,
    start_download,
)

STATIC_DIR = Path(__file__).resolve().parent / "static"

app = FastAPI(title="Video Downloader", docs_url=None, redoc_url=None)

# Esposta su internet l'app sarebbe utilizzabile da chiunque conosca l'indirizzo.
# Con APP_PASSWORD impostata serve la password; senza (uso locale) non cambia nulla.
PASSWORD = os.environ.get("APP_PASSWORD", "").strip()


# Il controllo di salute deve restare accessibile: i servizi di hosting lo interrogano
# senza credenziali e considerano guasta (quindi da riavviare) un'istanza che risponde 401.
PERCORSI_LIBERI = frozenset({"/healthz"})


@app.middleware("http")
async def richiedi_password(request: Request, call_next):
    if request.url.path in PERCORSI_LIBERI:
        return await call_next(request)
    if not PASSWORD or _password_valida(request.headers.get("authorization", "")):
        return await call_next(request)
    return Response(
        status_code=401,
        content="Password richiesta.",
        headers={"WWW-Authenticate": 'Basic realm="Video Downloader", charset="UTF-8"'},
    )


def _password_valida(intestazione: str) -> bool:
    if not intestazione.startswith("Basic "):
        return False
    try:
        decodificata = base64.b64decode(intestazione[6:], validate=True).decode("utf-8")
    except (binascii.Error, ValueError):
        return False
    _utente, separatore, fornita = decodificata.partition(":")
    # compare_digest: il confronto non deve rivelare quanti caratteri sono corretti.
    return bool(separatore) and secrets.compare_digest(fornita, PASSWORD)


class UrlPayload(BaseModel):
    url: str

    @field_validator("url")
    @classmethod
    def valida(cls, v: str) -> str:
        v = v.strip()
        parsed = urlparse(v)
        if parsed.scheme not in ("http", "https") or not parsed.netloc:
            raise ValueError("Inserisci un indirizzo http(s) valido.")
        return v


class DownloadPayload(UrlPayload):
    mode: str = "video"
    quality: str = "best"

    @field_validator("mode")
    @classmethod
    def valida_mode(cls, v: str) -> str:
        if v not in ("video", "audio"):
            raise ValueError("mode deve essere 'video' o 'audio'.")
        return v

    @field_validator("quality")
    @classmethod
    def valida_quality(cls, v: str) -> str:
        if v != "best" and not (v.isdigit() and 144 <= int(v) <= 4320):
            raise ValueError("quality deve essere 'best' o un'altezza in pixel.")
        return v


@app.get("/healthz")
def healthz() -> dict:
    """Sonda per il servizio di hosting. Volutamente priva di dettagli sull'ambiente,
    dato che è l'unico indirizzo raggiungibile senza password."""
    return {"status": "ok"}


@app.get("/api/config")
def config() -> dict:
    eta = eta_ytdlp_giorni()
    return {
        "ffmpeg": HAS_FFMPEG,
        "save_dir": str(SAVE_DIR) if SAVE_DIR else None,
        "cookies_browser": COOKIES_BROWSER[0] if COOKIES_BROWSER else None,
        "pot_provider": pot_disponibile(),
        "cookies_stato": COOKIES_STATO,
        "cookies_dettaglio": COOKIES_DETTAGLIO,
        "ytdlp_version": VERSIONE_YTDLP,
        "ytdlp_age_days": eta,
        "ytdlp_stale": eta is not None and eta > YTDLP_SCADE_DOPO_GIORNI,
        "python_version": f"{sys.version_info.major}.{sys.version_info.minor}",
        # Sotto 3.10 pip non può installare le versioni recenti di yt-dlp: si resta
        # bloccati su una release vecchia che YouTube prima o poi rifiuta.
        "python_ok": sys.version_info >= (3, 10),
    }


@app.post("/api/info")
def info(payload: UrlPayload) -> dict:
    prune_old_jobs()
    try:
        return fetch_info(payload.url)
    except DownloadFailed as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc


@app.post("/api/download")
def download(payload: DownloadPayload) -> dict:
    prune_old_jobs()
    job = start_download(payload.url, payload.mode, payload.quality)
    return job.as_dict()


@app.get("/api/progress/{job_id}")
def progress(job_id: str) -> JSONResponse:
    job = get_job(job_id)
    if job is None:
        raise HTTPException(status_code=404, detail="Download non trovato o scaduto.")
    return JSONResponse(job.as_dict())


@app.get("/api/file/{job_id}")
def file(job_id: str) -> FileResponse:
    job = get_job(job_id)
    if job is None or job.status != "done" or not job.filename:
        raise HTTPException(status_code=404, detail="File non disponibile.")

    percorso = (DOWNLOAD_DIR / job_id / job.filename).resolve()
    if not percorso.is_file() or DOWNLOAD_DIR.resolve() not in percorso.parents:
        raise HTTPException(status_code=404, detail="File non disponibile.")

    return FileResponse(
        percorso,
        filename=job.filename,
        media_type="application/octet-stream",
    )


app.mount("/", StaticFiles(directory=STATIC_DIR, html=True), name="static")
