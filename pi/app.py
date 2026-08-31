"""Public ALPR API for Raspberry Pi — https://alpr.api.harryludemann.com"""

from __future__ import annotations

import logging
import os
import platform
import socket
import threading
import time
from collections import defaultdict, deque

from fastapi import FastAPI, File, HTTPException, Request, UploadFile
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse

from engine import AlprEngine

ALLOWED_ORIGINS = [
    origin.strip()
    for origin in os.environ.get(
        "ALLOWED_ORIGINS",
        "https://alpr.harryludemann.com,http://localhost:3000,http://127.0.0.1:3000",
    ).split(",")
    if origin.strip()
]
MAX_UPLOAD_BYTES = int(os.environ.get("ALPR_MAX_UPLOAD_BYTES", str(8 * 1024 * 1024)))
RATE_LIMIT = int(os.environ.get("ALPR_RATE_LIMIT", "12"))
RATE_WINDOW_S = int(os.environ.get("ALPR_RATE_WINDOW_S", "60"))
API_KEY = os.environ.get("ALPR_API_KEY", "").strip()
STARTED_AT = time.time()

logging.basicConfig(level=logging.INFO, format="%(asctime)s %(levelname)s %(message)s")
log = logging.getLogger("alpr-api")

engine: AlprEngine | None = None
load_error: str | None = None
ready = False
total_recognized = 0
total_requests = 0
recognition_lock = threading.Lock()


class RateLimiter:
    def __init__(self, max_requests: int, window_s: int) -> None:
        self.max_requests = max_requests
        self.window_s = window_s
        self.hits: dict[str, deque[float]] = defaultdict(deque)
        self.lock = threading.Lock()

    def allow(self, key: str) -> bool:
        now = time.time()
        with self.lock:
            queue = self.hits[key]
            while queue and now - queue[0] > self.window_s:
                queue.popleft()
            if len(queue) >= self.max_requests:
                return False
            queue.append(now)
            return True


limiter = RateLimiter(RATE_LIMIT, RATE_WINDOW_S)


def _load_engine() -> None:
    global engine, load_error, ready
    try:
        log.info("Loading ALPR models (first boot downloads weights)…")
        engine = AlprEngine()
        ready = True
        log.info("ALPR models ready")
    except Exception as exc:  # pragma: no cover - startup diagnostics
        load_error = str(exc)
        log.exception("Failed to load ALPR models")


threading.Thread(target=_load_engine, daemon=True).start()

app = FastAPI(
    title="Harry Ludemann ALPR",
    version="1.0.0",
    docs_url="/docs",
    redoc_url=None,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=ALLOWED_ORIGINS,
    allow_origin_regex=r"https://.*\.vercel\.app",
    allow_credentials=False,
    allow_methods=["GET", "POST", "OPTIONS"],
    allow_headers=["*"],
    max_age=600,
)


def _client_ip(request: Request) -> str:
    forwarded = request.headers.get("x-forwarded-for", "")
    if forwarded:
        return forwarded.split(",")[0].strip()
    return request.client.host if request.client else "unknown"


def _require_key(request: Request) -> None:
    if not API_KEY:
        return
    provided = request.headers.get("x-api-key", "")
    if provided != API_KEY:
        raise HTTPException(status_code=401, detail="Invalid or missing API key")


@app.get("/")
def root() -> dict[str, str]:
    return {
        "service": "alpr",
        "health": "/health",
        "stats": "/stats",
        "recognize": "POST /recognize",
        "docs": "/docs",
    }


@app.get("/stats")
def stats() -> dict[str, int]:
    with recognition_lock:
        return {
            "total_recognized": total_recognized,
            "total_requests": total_requests,
        }


@app.get("/health")
def health() -> dict[str, object]:
    status = "ready" if ready else ("error" if load_error else "loading")
    return {
        "ok": ready,
        "status": status,
        "error": load_error,
        "device": platform.machine(),
        "platform": platform.platform(),
        "host": socket.gethostname(),
        "models_loaded": ready,
        "uptime_s": round(time.time() - STARTED_AT, 1),
        "models": {
            "detector": os.environ.get(
                "ALPR_DETECTOR_MODEL", "yolo-v9-t-384-license-plate-end2end"
            ),
            "ocr": os.environ.get(
                "ALPR_OCR_MODEL", "global-plates-mobile-vit-v2-model"
            ),
        },
    }


@app.post("/recognize")
async def recognize(request: Request, image: UploadFile = File(...)) -> JSONResponse:
    _require_key(request)

    if not limiter.allow(_client_ip(request)):
        raise HTTPException(status_code=429, detail="Too many requests — try again shortly.")

    if not ready or engine is None:
        raise HTTPException(
            status_code=503,
            detail=load_error or "Models are still loading. Retry in a few seconds.",
        )

    content_type = (image.content_type or "").lower()
    if content_type and content_type not in {
        "image/jpeg",
        "image/jpg",
        "image/png",
        "image/webp",
        "application/octet-stream",
    }:
        raise HTTPException(status_code=415, detail="Send a JPEG, PNG, or WebP image.")

    payload = await image.read()
    if not payload:
        raise HTTPException(status_code=400, detail="Empty file.")
    if len(payload) > MAX_UPLOAD_BYTES:
        raise HTTPException(
            status_code=413,
            detail=f"Image too large. Max {MAX_UPLOAD_BYTES // (1024 * 1024)} MB.",
        )

    try:
        result = engine.recognize(payload)
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc
    except Exception:
        log.exception("Recognition failed")
        raise HTTPException(status_code=500, detail="Recognition failed on the Pi.") from None

    with recognition_lock:
        global total_recognized, total_requests
        total_recognized += len(result.get("plates", []))
        total_requests += 1

    result["filename"] = image.filename
    return JSONResponse(result)
