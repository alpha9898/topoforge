from __future__ import annotations

from fastapi import APIRouter, HTTPException

from models import Topology
from services.ai_parser import enrich_topology_connections
from services.project_store import get_project
from services.topology_corrections import TopologyCorrections, apply_topology_corrections, corrections_to_dict

router = APIRouter(tags=["corrections"])


@router.post("/projects/{project_id}/corrections", response_model=Topology)
def correct_project(project_id: str, corrections: TopologyCorrections) -> Topology:
    project = get_project(project_id)
    if not project or not project.topology:
        raise HTTPException(status_code=404, detail="Parsed project not found.")
    project.corrections = corrections_to_dict(corrections)
    project.topology = apply_topology_corrections(project.topology, corrections)
    project.topology.aiSuggestions = project.ai_suggestions
    if project.ai_suggestions:
        project.topology = enrich_topology_connections(project.topology, project.ai_suggestions)
    return project.topology
