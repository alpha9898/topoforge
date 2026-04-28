from __future__ import annotations

from pydantic import BaseModel

from models import Cable, Device, Port, Topology
from services.topology_builder import infer_device_type
from services.validator import validate_topology


class DeviceUpdate(BaseModel):
    id: str
    name: str | None = None
    type: str | None = None
    mgmtIp: str | None = None
    zone: str | None = None


class DeviceAdd(BaseModel):
    name: str
    type: str = "unknown"
    mgmtIp: str | None = None
    zone: str | None = None


class TopologyCorrections(BaseModel):
    device_updates: list[DeviceUpdate] = []
    removed_device_ids: list[str] = []
    added_devices: list[DeviceAdd] = []


def apply_topology_corrections(topology: Topology, corrections: TopologyCorrections) -> Topology:
    removed = set(corrections.removed_device_ids)
    updates = {update.id: update for update in corrections.device_updates}

    next_devices: list[Device] = []
    existing_ids: set[str] = set()
    for device in topology.devices:
        if device.id in removed:
            continue
        update = updates.get(device.id)
        if update:
            if update.name and update.name.strip():
                device.name = update.name.strip()
                device.hostname = device.hostname or device.name
            if update.type and update.type.strip():
                device.type = update.type.strip().lower().replace(" ", "_")
            if update.mgmtIp is not None:
                device.mgmtIp = update.mgmtIp.strip() or None
            if update.zone is not None:
                device.zone = update.zone.strip() or None
        existing_ids.add(device.id)
        next_devices.append(device)

    for added in corrections.added_devices:
        name = added.name.strip()
        if not name:
            continue
        device_id = _unique_id(_slug(name), existing_ids)
        existing_ids.add(device_id)
        next_devices.append(
            Device(
                id=device_id,
                name=name,
                hostname=name,
                type=(added.type or infer_device_type(name)).strip().lower().replace(" ", "_"),
                mgmtIp=added.mgmtIp.strip() if added.mgmtIp else None,
                zone=added.zone.strip() if added.zone else None,
                ports=[],
            )
        )

    topology.devices = next_devices
    topology.cables = [_refresh_cable_label(cable, topology.devices) for cable in topology.cables if cable.sourceDeviceId not in removed and cable.targetDeviceId not in removed]
    topology.zones = sorted({device.zone for device in topology.devices if device.zone})
    topology.issues = [issue for issue in topology.issues if not issue.entity_id or issue.entity_id not in removed]
    return validate_topology(topology)


def corrections_to_dict(corrections: TopologyCorrections) -> dict:
    return corrections.model_dump()


def corrections_from_dict(raw: dict | None) -> TopologyCorrections:
    return TopologyCorrections(**raw) if raw else TopologyCorrections()


def _refresh_cable_label(cable: Cable, devices: list[Device]) -> Cable:
    names = {device.id: device.name for device in devices}
    source = names.get(cable.sourceDeviceId, cable.sourceDeviceId)
    target = names.get(cable.targetDeviceId, cable.targetDeviceId)
    cable.label = f"{source} {cable.sourcePort or '?'} -> {target} {cable.targetPort or '?'}"
    return cable


def _slug(value: str) -> str:
    import re

    return re.sub(r"[^a-z0-9]+", "-", value.lower()).strip("-") or "device"


def _unique_id(base: str, existing: set[str]) -> str:
    if base not in existing:
        return base
    index = 2
    while f"{base}-{index}" in existing:
        index += 1
    return f"{base}-{index}"
