from __future__ import annotations

from dataclasses import dataclass, field
from pathlib import Path
from uuid import uuid4

from models import ClarificationQuestion, Topology

BASE_DIR = Path(__file__).resolve().parents[1]
STORAGE_DIR = BASE_DIR / "storage"
UPLOAD_DIR = STORAGE_DIR / "uploads"
OUTPUT_DIR = STORAGE_DIR / "outputs"
UPLOAD_DIR.mkdir(parents=True, exist_ok=True)
OUTPUT_DIR.mkdir(parents=True, exist_ok=True)


@dataclass
class ProjectState:
    id: str
    upload_path: Path
    original_filename: str
    topology: Topology | None = None
    questions: list[ClarificationQuestion] = field(default_factory=list)
    output_path: Path | None = None
    corrections: dict | None = None
    ai_suggestions: dict | None = None


projects: dict[str, ProjectState] = {}


def create_project(upload_path: Path, original_filename: str) -> ProjectState:
    project_id = uuid4().hex
    state = ProjectState(project_id, upload_path, original_filename)
    projects[project_id] = state
    return state


def get_project(project_id: str) -> ProjectState | None:
    return projects.get(project_id)
