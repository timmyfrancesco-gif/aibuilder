"""API FastAPI che espone yt-dlp a un frontend web."""

from __future__ import annotations

from pathlib import Path
from urllib.parse import urlparse

from fastapi import FastAPI, HTTPException
from fastapi.responses import FileResponse, JSONResponse
from fastapi.staticfiles import StaticFiles
from pydantic import BaseModel, field_validator

from .downloader import (
    DOWNLOAD_DIR,
    HAS_FFMPEG,
    DownloadFailed,
    fetch_info,
    get_job,
    prune_old_jobs,
    start_download,
)

STATIC_DIR = Path(__file__).resolve().parent / "static"

app = FastAPI(title="YouTube Downloader", docs_url=None, redoc_url=None)


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


@app.get("/api/config")
def config() -> dict:
    return {"ffmpeg": HAS_FFMPEG}


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
