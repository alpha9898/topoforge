"""Integration tests for corrections, clarify, generate, and download endpoints."""
from __future__ import annotations

import io
import tempfile
from pathlib import Path

import pytest
from fastapi.testclient import TestClient
from openpyxl import Workbook

from main import app
from models import Topology
from services.project_store import OUTPUT_DIR, create_project, projects
from services.topology_builder import build_topology
from services.validator import validate_topology

client = TestClient(app)


def setup_function():
    projects.clear()


def _make_project_with_topology() -> str:
    upload_path = Path(tempfile.gettempdir()) / "topoforge_test_upload.xlsx"
    upload_path.touch()
    project = create_project(upload_path, "test.xlsx")
    topology = validate_topology(
        build_topology(
            {
                "raw_devices": [
                    {"name": "Firewall-1", "type": "firewall"},
                    {"name": "SW1", "type": "switch"},
                ],
                "raw_connections": [
                    {
                        "sourceDevice": "Firewall-1",
                        "sourcePort": "eth1",
                        "targetDevice": "SW1",
                        "targetPort": "Gi1/0/1",
                        "cableType": "ethernet",
                    }
                ],
                "issues": [],
            }
        )
    )
    project.topology = topology
    return project.id


class TestCorrectionsEndpoint:
    def test_returns_404_for_missing_project(self):
        response = client.post(
            "/api/projects/nonexistent/corrections",
            json={"device_updates": [], "removed_device_ids": [], "added_devices": []},
        )
        assert response.status_code == 404

    def test_rename_device(self):
        project_id = _make_project_with_topology()
        response = client.post(
            f"/api/projects/{project_id}/corrections",
            json={
                "device_updates": [{"id": "firewall-1", "name": "FW-Primary"}],
                "removed_device_ids": [],
                "added_devices": [],
            },
        )
        assert response.status_code == 200
        data = response.json()
        names = [d["name"] for d in data["devices"]]
        assert "FW-Primary" in names

    def test_remove_device(self):
        project_id = _make_project_with_topology()
        response = client.post(
            f"/api/projects/{project_id}/corrections",
            json={
                "device_updates": [],
                "removed_device_ids": ["sw1"],
                "added_devices": [],
            },
        )
        assert response.status_code == 200
        data = response.json()
        ids = [d["id"] for d in data["devices"]]
        assert "sw1" not in ids

    def test_add_device(self):
        project_id = _make_project_with_topology()
        response = client.post(
            f"/api/projects/{project_id}/corrections",
            json={
                "device_updates": [],
                "removed_device_ids": [],
                "added_devices": [{"name": "New-Router", "type": "isp_router"}],
            },
        )
        assert response.status_code == 200
        data = response.json()
        names = [d["name"] for d in data["devices"]]
        assert "New-Router" in names

    def test_change_device_type(self):
        project_id = _make_project_with_topology()
        response = client.post(
            f"/api/projects/{project_id}/corrections",
            json={
                "device_updates": [{"id": "sw1", "type": "server"}],
                "removed_device_ids": [],
                "added_devices": [],
            },
        )
        assert response.status_code == 200
        data = response.json()
        device = next((d for d in data["devices"] if d["id"] == "sw1"), None)
        assert device is not None
        assert device["type"] == "server"

    def test_no_op_corrections_returns_topology(self):
        project_id = _make_project_with_topology()
        response = client.post(
            f"/api/projects/{project_id}/corrections",
            json={"device_updates": [], "removed_device_ids": [], "added_devices": []},
        )
        assert response.status_code == 200
        data = response.json()
        assert len(data["devices"]) == 2


class TestClarifyEndpoint:
    def test_get_clarifications_returns_404_for_missing_project(self):
        response = client.get("/api/projects/nonexistent/clarifications")
        assert response.status_code == 404

    def test_get_clarifications_returns_questions(self):
        project_id = _make_project_with_topology()
        response = client.get(f"/api/projects/{project_id}/clarifications")
        assert response.status_code == 200
        data = response.json()
        assert "questions" in data
        assert isinstance(data["questions"], list)

    def test_submit_clarifications_returns_404_for_missing_project(self):
        response = client.post(
            "/api/projects/nonexistent/clarifications",
            json={"answers": []},
        )
        assert response.status_code == 404

    def test_submit_empty_answers_returns_topology(self):
        project_id = _make_project_with_topology()
        response = client.post(
            f"/api/projects/{project_id}/clarifications",
            json={"answers": []},
        )
        assert response.status_code == 200
        data = response.json()
        assert "devices" in data
        assert "cables" in data

    def test_submit_device_type_answer(self):
        upload_path = Path(tempfile.gettempdir()) / "topoforge_test_upload2.xlsx"
        upload_path.touch()
        project = create_project(upload_path, "test2.xlsx")
        topology = validate_topology(
            build_topology(
                {
                    "raw_devices": [{"name": "mystery-device", "type": "unknown"}],
                    "raw_connections": [],
                    "issues": [],
                }
            )
        )
        project.topology = topology
        client.get(f"/api/projects/{project.id}/clarifications")

        response = client.post(
            f"/api/projects/{project.id}/clarifications",
            json={"answers": [{"question_id": "device-type-mystery-device", "answer": "server"}]},
        )
        assert response.status_code == 200


class TestGenerateEndpoint:
    def test_generate_returns_404_for_missing_project(self):
        response = client.post("/api/projects/nonexistent/generate")
        assert response.status_code == 404

    def test_generate_returns_drawio_url(self):
        project_id = _make_project_with_topology()
        response = client.post(f"/api/projects/{project_id}/generate")
        assert response.status_code == 200
        data = response.json()
        assert data["status"] == "generated"
        assert "/download" in data["drawio_url"]

    def test_generate_produces_downloadable_file(self):
        project_id = _make_project_with_topology()
        client.post(f"/api/projects/{project_id}/generate")
        response = client.get(f"/api/projects/{project_id}/download")
        assert response.status_code == 200
        assert b"<mxfile" in response.content

    def test_download_returns_404_before_generate(self):
        project_id = _make_project_with_topology()
        response = client.get(f"/api/projects/{project_id}/download")
        assert response.status_code == 404

    def test_generate_with_dangling_cable_reference_does_not_crash(self):
        """Topology with a cable referencing a removed device must not raise KeyError."""
        upload_path = Path(tempfile.gettempdir()) / "topoforge_test_dangling.xlsx"
        upload_path.touch()
        project = create_project(upload_path, "dangling.xlsx")
        topology = validate_topology(
            build_topology(
                {
                    "raw_devices": [
                        {"name": "Firewall-1"},
                        {"name": "SW1"},
                    ],
                    "raw_connections": [
                        {"sourceDevice": "Firewall-1", "sourcePort": "eth1", "targetDevice": "SW1", "targetPort": "Gi1/0/1"}
                    ],
                    "issues": [],
                }
            )
        )
        topology.devices = [d for d in topology.devices if d.id != "sw1"]
        project.topology = topology

        response = client.post(f"/api/projects/{project.id}/generate")
        assert response.status_code == 200


class TestLayoutInResponses:
    """Live preview support: topology-returning endpoints must emit layout coordinates."""

    def test_corrections_response_includes_layout_coordinates(self):
        project_id = _make_project_with_topology()
        response = client.post(
            f"/api/projects/{project_id}/corrections",
            json={"device_updates": [], "removed_device_ids": [], "added_devices": []},
        )
        assert response.status_code == 200
        devices = response.json()["devices"]
        assert devices
        assert all(d["x"] > 0 and d["y"] > 0 for d in devices)

    def test_clarifications_response_includes_layout_coordinates(self):
        project_id = _make_project_with_topology()
        response = client.post(
            f"/api/projects/{project_id}/clarifications",
            json={"answers": []},
        )
        assert response.status_code == 200
        devices = response.json()["devices"]
        assert devices
        assert all(d["x"] > 0 and d["y"] > 0 for d in devices)

    def test_parse_response_includes_layout_coordinates(self):
        workbook = Workbook()
        sheet = workbook.active
        sheet.append(["Device", "Port", "Connected To", "Peer Port"])
        sheet.append(["Firewall-1", "eth1", "SW1", "Gi1/0/1"])
        sheet.append(["SW1", "Gi1/0/2", "Server-1", "eth0"])
        buffer = io.BytesIO()
        workbook.save(buffer)
        buffer.seek(0)

        upload = client.post(
            "/api/upload",
            files={
                "file": (
                    "network.xlsx",
                    buffer.read(),
                    "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
                )
            },
        )
        assert upload.status_code == 200
        project_id = upload.json()["project_id"]

        response = client.post(f"/api/projects/{project_id}/parse", json={})
        assert response.status_code == 200
        body = response.json()
        devices = body["devices"]
        assert len(devices) >= 3
        assert all(d["x"] > 0 and d["y"] > 0 for d in devices)
        for cable in body["cables"]:
            assert 0.0 <= cable["exitX"] <= 1.0
            assert 0.0 <= cable["entryY"] <= 1.0
