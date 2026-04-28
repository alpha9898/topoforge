from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles

from routers import clarify, corrections, generate, parse, upload
from services.project_store import OUTPUT_DIR

app = FastAPI(title="TopoForge API", version="0.1.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:3000",
        "http://127.0.0.1:3000",
        "http://localhost:3001",
        "http://127.0.0.1:3001",
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
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
