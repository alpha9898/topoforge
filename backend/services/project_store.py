from __future__ import annotations

from dataclasses import dataclass, field
from datetime import UTC, datetime, timedelta
import os
from pathlib import Path
from uuid import uuid4

from models import ClarificationQuestion, Topology

BASE_DIR = Path(__file__).resolve().parents[1]
STORAGE_DIR = BASE_DIR / "storage"
UPLOAD_DIR = STORAGE_DIR / "uploads"
OUTPUT_DIR = STORAGE_DIR / "outputs"
UPLOAD_DIR.mkdir(parents=True, exist_ok=True)
OUTPUT_DIR.mkdir(parents=True, exist_ok=True)

PROJECT_TTL_HOURS = float(os.getenv("PROJECT_TTL_HOURS", "6"))
PROJECT_CLEANUP_INTERVAL_MINUTES = float(os.getenv("PROJECT_CLEANUP_INTERVAL_MINUTES", "30"))


@dataclass
class ProjectState:
    id: str
    upload_path: Path
    original_filename: str
    created_at: datetime = field(default_factory=lambda: datetime.now(UTC))
    updated_at: datetime = field(default_factory=lambda: datetime.now(UTC))
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
    project = projects.get(project_id)
    if project:
        project.updated_at = datetime.now(UTC)
    return project


def cleanup_expired_projects(max_age: timedelta | None = None, now: datetime | None = None) -> int:
    now = now or datetime.now(UTC)
    max_age = max_age or timedelta(hours=PROJECT_TTL_HOURS)
    expired_ids = [project_id for project_id, project in projects.items() if now - project.updated_at > max_age]
    for project_id in expired_ids:
        project = projects.pop(project_id, None)
        if not project:
            continue
        _delete_file(project.upload_path)
        if project.output_path:
            _delete_file(project.output_path)
    _cleanup_orphan_files(UPLOAD_DIR, max_age, now)
    _cleanup_orphan_files(OUTPUT_DIR, max_age, now)
    return len(expired_ids)


def _cleanup_orphan_files(directory: Path, max_age: timedelta, now: datetime) -> None:
    for path in directory.glob("*"):
        if not path.is_file():
            continue
        try:
            modified = datetime.fromtimestamp(path.stat().st_mtime, UTC)
        except OSError:
            continue
        if now - modified > max_age:
            _delete_file(path)


def _delete_file(path: Path) -> None:
    try:
        path.unlink(missing_ok=True)
    except OSError:
        pass
