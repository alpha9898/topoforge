from __future__ import annotations

from pathlib import Path
import re
from uuid import uuid4

from fastapi import APIRouter, File, HTTPException, UploadFile

from models import ProjectUploadResponse
from services.project_store import UPLOAD_DIR, create_project

router = APIRouter(tags=["upload"])

ALLOWED_EXTENSIONS = {".xlsx", ".xls", ".xlsm", ".csv"}
MAX_FILE_SIZE = 20 * 1024 * 1024


@router.post("/upload", response_model=ProjectUploadResponse)
async def upload_file(file: UploadFile = File(...)) -> ProjectUploadResponse:
    suffix = Path(file.filename or "").suffix.lower()
    if suffix not in ALLOWED_EXTENSIONS:
        raise HTTPException(status_code=400, detail=f"Unsupported file type: {suffix}")

    content = await file.read()
    if not content:
        raise HTTPException(status_code=400, detail="Uploaded file is empty.")
    if len(content) > MAX_FILE_SIZE:
        raise HTTPException(status_code=400, detail="Uploaded file exceeds the 20 MB limit.")

    safe_stem = _safe_filename_stem(file.filename or "upload")
    temp_path = UPLOAD_DIR / f"{uuid4().hex}-{safe_stem}{suffix}"
    temp_path.write_bytes(content)
    project = create_project(temp_path, file.filename or temp_path.name)
    final_path = UPLOAD_DIR / f"{project.id}{suffix}"
    temp_path.replace(final_path)
    project.upload_path = final_path
    return ProjectUploadResponse(project_id=project.id, status="uploaded")


def _safe_filename_stem(filename: str) -> str:
    name = filename.replace("\\", "/").rsplit("/", 1)[-1]
    stem = Path(name).stem or "upload"
    safe = re.sub(r"[^A-Za-z0-9._-]+", "-", stem).strip(".-_")
    return safe[:80] or "upload"
