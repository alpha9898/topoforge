from __future__ import annotations

from typing import Any, Literal, TypeAlias

from pydantic import BaseModel, Field

DeviceType: TypeAlias = Literal[
    "admin_endpoint",
    "cloud",
    "firewall",
    "isp_router",
    "other",
    "pdu",
    "router",
    "server",
    "storage",
    "switch",
    "unknown",
    "vpn_gateway",
]

CableRole: TypeAlias = Literal["ha", "lan", "management", "power", "storage", "unknown", "wan"]


class Issue(BaseModel):
    id: str
    severity: Literal["error", "warning"]
    code: str
    message: str
    entity_id: str | None = None


class Port(BaseModel):
    id: str
    deviceId: str
    name: str
    side: str = "auto"
    order: int = 0
    speed: str | None = None
    vlan: str | None = None


class Device(BaseModel):
    id: str
    name: str
    hostname: str | None = None
    type: DeviceType | str = "unknown"
    mgmtIp: str | None = None
    zone: str | None = None
    x: int = 0
    y: int = 0
    width: int = 160
    height: int = 80
    ports: list[Port] = Field(default_factory=list)
    aliases: list[str] = Field(default_factory=list)


class Cable(BaseModel):
    id: str
    sourceDeviceId: str
    sourcePort: str | None = None
    targetDeviceId: str
    targetPort: str | None = None
    cableType: str = "unknown"
    connectionRole: CableRole | str = "unknown"
    vlan: str | None = None
    label: str = "? -> ?"
    description: str | None = None
    confidence: float | None = None
    exitX: float = 0.5
    exitY: float = 1.0
    entryX: float = 0.5
    entryY: float = 0.0


class Topology(BaseModel):
    title: str = "TopoForge - High Level Design"
    devices: list[Device] = Field(default_factory=list)
    cables: list[Cable] = Field(default_factory=list)
    issues: list[Issue] = Field(default_factory=list)
    zones: list[str] = Field(default_factory=list)
    legend: list[str] = Field(default_factory=list)
    notes: list[str] = Field(default_factory=list)
    aiSuggestions: dict[str, Any] | None = None


class ClarificationQuestion(BaseModel):
    id: str
    type: str
    message: str
    suggested_answer: str | None = None
    entity_id: str | None = None
    options: list[str] = Field(default_factory=list)


class Answer(BaseModel):
    question_id: str
    answer: str


class ProjectUploadResponse(BaseModel):
    project_id: str
    status: Literal["uploaded"]


class GenerateResponse(BaseModel):
    status: Literal["generated"]
    drawio_url: str
