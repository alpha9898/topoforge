from __future__ import annotations

import asyncio
from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles

from routers import clarify, corrections, generate, parse, upload
from services.project_store import OUTPUT_DIR, PROJECT_CLEANUP_INTERVAL_MINUTES, cleanup_expired_projects


@asynccontextmanager
async def lifespan(app: FastAPI):
    stop_event = asyncio.Event()

    async def cleanup_loop() -> None:
        while not stop_event.is_set():
            cleanup_expired_projects()
            try:
                await asyncio.wait_for(stop_event.wait(), timeout=PROJECT_CLEANUP_INTERVAL_MINUTES * 60)
            except TimeoutError:
                continue

    task = asyncio.create_task(cleanup_loop())
    try:
        yield
    finally:
        stop_event.set()
        task.cancel()
        try:
            await task
        except asyncio.CancelledError:
            pass


app = FastAPI(title="TopoForge API", version="0.1.0", lifespan=lifespan)

app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:3000",
        "http://127.0.0.1:3000",
        "http://localhost:3001",
        "http://127.0.0.1:3001",
    ],
    allow_credentials=True,
    allow_methods=["GET", "POST"],
    allow_headers=["Content-Type"],
)

app.include_router(upload.router, prefix="/api")
app.include_router(parse.router, prefix="/api")
app.include_router(corrections.router, prefix="/api")
app.include_router(clarify.router, prefix="/api")
app.include_router(generate.router, prefix="/api")
app.mount("/downloads", StaticFiles(directory=str(OUTPUT_DIR)), name="downloads")


@app.get("/api/health")
def health() -> dict[str, str]:
    return {"status": "ok"}
