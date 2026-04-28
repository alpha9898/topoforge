from __future__ import annotations

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel

from models import Topology
from services.ai_parser import apply_ai_suggestions_to_parsed, build_ai_suggestions, enrich_topology_connections
from services.excel_parser import parse_file
from services.project_store import get_project
from services.topology_builder import build_topology
from services.topology_completion import complete_standard_topology
from services.topology_corrections import apply_topology_corrections, corrections_from_dict
from services.validator import validate_topology

router = APIRouter(tags=["parse"])


class ParseOptions(BaseModel):
    use_ai_helper: bool = False
    include_ips_in_ai: bool = False


@router.post("/projects/{project_id}/parse", response_model=Topology)
def parse_project(project_id: str, options: ParseOptions | None = None) -> Topology:
    project = get_project(project_id)
    if not project:
        raise HTTPException(status_code=404, detail="Project not found.")
    options = options or ParseOptions()
    try:
        parsed = parse_file(project.upload_path)
    except Exception as exc:
        raise HTTPException(status_code=400, detail=f"Could not parse file: {exc}") from exc

    if options.use_ai_helper:
        suggestions = build_ai_suggestions(parsed, include_ips=options.include_ips_in_ai)
        project.ai_suggestions = suggestions
        parsed = apply_ai_suggestions_to_parsed(parsed, suggestions)
    elif project.ai_suggestions:
        parsed = apply_ai_suggestions_to_parsed(parsed, project.ai_suggestions)

    topology = complete_standard_topology(build_topology(parsed, title=f"{project.original_filename} - High Level Design"))
    topology = validate_topology(topology)
    topology.aiSuggestions = project.ai_suggestions
    if project.corrections:
        corrections = corrections_from_dict(project.corrections)
        topology = apply_topology_corrections(topology, corrections_from_dict(project.corrections))
        topology = complete_standard_topology(topology, disabled_device_ids=set(corrections.removed_device_ids))
        topology = validate_topology(topology)
        topology.aiSuggestions = project.ai_suggestions
    if options.use_ai_helper or project.ai_suggestions:
        topology = enrich_topology_connections(topology, project.ai_suggestions, include_ips=options.include_ips_in_ai)
    project.topology = topology
    return topology
