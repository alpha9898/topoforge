from __future__ import annotations

from pathlib import Path

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

    temp_path = UPLOAD_DIR / f"{Path(file.filename or 'upload').stem}-{len(content)}{suffix}"
    temp_path.write_bytes(content)
    project = create_project(temp_path, file.filename or temp_path.name)
    final_path = UPLOAD_DIR / f"{project.id}{suffix}"
    temp_path.replace(final_path)
    project.upload_path = final_path
    return ProjectUploadResponse(project_id=project.id, status="uploaded")
