from __future__ import annotations

from fastapi import APIRouter, HTTPException
from fastapi.responses import FileResponse

from models import GenerateResponse
from services.drawio_generator import write_drawio
from services.layout_engine import layout_topology
from services.project_store import OUTPUT_DIR, get_project

router = APIRouter(tags=["generate"])


@router.post("/projects/{project_id}/generate", response_model=GenerateResponse)
def generate_project(project_id: str) -> GenerateResponse:
    project = get_project(project_id)
    if not project or not project.topology:
        raise HTTPException(status_code=404, detail="Parsed project not found.")
    project.topology = layout_topology(project.topology)
    output_path = OUTPUT_DIR / f"{project_id}.drawio"
    write_drawio(project.topology, output_path)
    project.output_path = output_path
    return GenerateResponse(status="generated", drawio_url=f"/api/projects/{project_id}/download")


@router.get("/projects/{project_id}/download")
def download_project(project_id: str) -> FileResponse:
    project = get_project(project_id)
    if not project or not project.output_path or not project.output_path.exists():
        raise HTTPException(status_code=404, detail="Generated Draw.io file not found.")
    filename = f"{project_id}.drawio"
    return FileResponse(
        path=project.output_path,
        media_type="application/octet-stream",
        filename=filename,
    )
