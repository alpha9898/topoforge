from __future__ import annotations

from datetime import UTC, datetime, timedelta
import json
from pathlib import Path

from fastapi.testclient import TestClient

from main import app
from models import Answer
from routers.upload import _safe_filename_stem
from services.ai_parser import build_ai_suggestions
from services.clarification_engine import apply_answers
from services.project_store import cleanup_expired_projects, create_project, projects
from services.topology_builder import build_topology
from services.validator import validate_topology


def setup_function():
    projects.clear()


def test_gemini_suggestions_are_used_when_api_key_exists(monkeypatch):
    class FakeResponse:
        def __enter__(self):
            return self

        def __exit__(self, *args):
            return False

        def read(self):
            payload = {
                "candidates": [
                    {
                        "content": {
                            "parts": [
                                {
                                    "text": json.dumps(
                                        {
                                            "alias_suggestions": [{"alias": "SW1", "canonical": "gui1swtch01", "confidence": 0.99, "reason": "test"}],
                                            "device_type_suggestions": [],
                                            "ignored_connections": [],
                                            "duplicate_devices": [],
                                        }
                                    )
                                }
                            ]
                        }
                    }
                ]
            }
            return json.dumps(payload).encode()

    monkeypatch.setenv("GEMINI_API_KEY", "test-key")
    monkeypatch.setattr("services.ai_parser.urllib.request.urlopen", lambda *args, **kwargs: FakeResponse())

    suggestions = build_ai_suggestions({"raw_devices": [{"name": "gui1swtch01", "type": "switch"}], "raw_connections": []})

    assert suggestions["source"] == "gemini"
    assert suggestions["status"] == "ok"
    assert suggestions["alias_suggestions"][0]["alias"] == "SW1"


def test_gemini_failure_falls_back_to_local_rules(monkeypatch):
    monkeypatch.setenv("GEMINI_API_KEY", "test-key")
    monkeypatch.setattr("services.ai_parser.urllib.request.urlopen", lambda *args, **kwargs: (_ for _ in ()).throw(RuntimeError("offline")))

    suggestions = build_ai_suggestions({"raw_devices": [], "raw_connections": []})

    assert suggestions["source"] == "local_rules"
    assert suggestions["status"] == "gemini_failed"
    assert "offline" in suggestions["message"]


def test_upload_filename_stem_is_sanitized():
    assert _safe_filename_stem("../../etc/passwd.csv") == "passwd"
    assert _safe_filename_stem("..\\..\\secret network.xlsx") == "secret-network"
    assert _safe_filename_stem("!!!.csv") == "upload"


def test_clarification_preserves_detailed_cable_label():
    topology = validate_topology(
        build_topology(
            {
                "raw_devices": [{"name": "Firewall-1"}, {"name": "SW1"}],
                "raw_connections": [{"sourceDevice": "Firewall-1", "sourcePort": "", "targetDevice": "SW1", "targetPort": "Gi1/0/1", "cableType": "ethernet"}],
                "issues": [],
            }
        )
    )

    answered = apply_answers(topology, [Answer(question_id="q-source-port-cable-001", answer="eth1")])

    assert answered.cables[0].label == "Firewall-1 eth1 -> SW1 Gi1/0/1"


def test_cleanup_expired_projects_removes_state_and_files():
    tmp_dir = Path(__file__).with_name("_tmp_hardening")
    tmp_dir.mkdir(exist_ok=True)
    upload = tmp_dir / "upload.xlsx"
    output = tmp_dir / "output.drawio"
    upload.write_text("upload")
    output.write_text("output")
    project = create_project(upload, "upload.xlsx")
    project.output_path = output
    project.updated_at = datetime.now(UTC) - timedelta(hours=7)

    removed = cleanup_expired_projects(max_age=timedelta(hours=6), now=datetime.now(UTC))

    assert removed == 1
    assert project.id not in projects
    assert not upload.exists()
    assert not output.exists()
    tmp_dir.rmdir()


def test_upload_endpoint_success_and_errors():
    with TestClient(app) as client:
        ok = client.post("/api/upload", files={"file": ("..\\..\\network.xlsx", b"not-empty", "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet")})
        unsupported = client.post("/api/upload", files={"file": ("bad.txt", b"x", "text/plain")})
        empty = client.post("/api/upload", files={"file": ("empty.xlsx", b"", "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet")})

    assert ok.status_code == 200
    assert ok.json()["status"] == "uploaded"
    assert unsupported.status_code == 400
    assert empty.status_code == 400


def test_missing_project_endpoints_return_404():
    with TestClient(app) as client:
        parse_response = client.post("/api/projects/missing/parse")
        generate_response = client.post("/api/projects/missing/generate")
        download_response = client.get("/api/projects/missing/download")

    assert parse_response.status_code == 404
    assert generate_response.status_code == 404
    assert download_response.status_code == 404
