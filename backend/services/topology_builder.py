from __future__ import annotations

import re
from collections import OrderedDict
from typing import Any

from models import Cable, Device, Issue, Port, Topology


def normalize_port(value: str | None) -> str | None:
    text = str(value or "").replace("\xa0", " ").strip().strip("- ")
    if not text or text.lower() in {"unknown", "none", "nan"}:
        return None
    lower = text.lower()
    lower = re.sub(r"^ethernet\s*", "eth", lower)
    lower = re.sub(r"^management$", "mgmt", lower)
    lower = re.sub(r"^mgmt$", "Mgmt", lower)
    lower = re.sub(r"^idrac$", "iDRAC", lower)
    lower = re.sub(r"^ipmi$", "IPMI", lower)
    lower = re.sub(r"^g(?=\d)", "Gi", lower)
    lower = re.sub(r"^gi", "Gi", lower)
    lower = re.sub(r"^te", "Te", lower)
    lower = re.sub(r"^fa", "Fa", lower)
    lower = re.sub(r"\s+", "", lower)
    if lower.startswith("eth"):
        return lower
    if re.fullmatch(r"\d+", lower):
        return lower
    return lower


def infer_device_type(name: str, explicit: str | None = None) -> str:
    explicit_clean = (explicit or "").strip().lower()
    if explicit_clean and explicit_clean not in {"unknown", "nan"}:
        return explicit_clean.replace(" ", "_")

    text = name.lower()
    rules = [
        ("cloud", ["internet", "cloud"]),
        ("isp_router", ["isp", "carrier"]),
        ("firewall", ["firewall", "fwall", "fw"]),
        ("switch", ["switch", "swtch", "sw"]),
        ("vpn_gateway", ["vpn"]),
        ("admin_endpoint", ["admin", "jump", "bastion"]),
        ("pdu", ["pdu", "power"]),
        ("storage", ["storage", "san", "nas"]),
        ("server", ["server", "srv", "vpsie", "host"]),
    ]
    for device_type, tokens in rules:
        if any(token in text for token in tokens):
            return device_type
    return "unknown"


def build_topology(parsed: dict[str, Any], title: str = "TopoForge - High Level Design") -> Topology:
    devices: OrderedDict[str, Device] = OrderedDict()
    issues: list[Issue] = list(parsed.get("issues", []))

    def add_device(name: str, explicit_type: str | None = None, hostname: str | None = None, mgmt_ip: str | None = None, zone: str | None = None) -> Device | None:
        clean_name = str(name or "").strip()
        if not clean_name:
            return None
        key = _device_key(clean_name)
        if key not in devices:
            devices[key] = Device(
                id=key,
                name=clean_name,
                hostname=hostname or clean_name,
                type=infer_device_type(clean_name, explicit_type),
                mgmtIp=mgmt_ip or None,
                zone=zone or None,
            )
        else:
            device = devices[key]
            if explicit_type and device.type == "unknown":
                device.type = infer_device_type(clean_name, explicit_type)
            device.hostname = device.hostname or hostname
            device.mgmtIp = device.mgmtIp or mgmt_ip
            device.zone = device.zone or zone
        return devices[key]

    for raw in parsed.get("raw_devices", []):
        add_device(raw.get("name"), raw.get("type"), raw.get("hostname"), raw.get("mgmtIp"), raw.get("zone"))

    cables: list[Cable] = []
    for raw in parsed.get("raw_connections", []):
        source = add_device(raw.get("sourceDevice"))
        target = add_device(raw.get("targetDevice"))
        if not source or not target:
            issues.append(
                Issue(
                    id=f"conn-missing-endpoint-{len(issues)+1}",
                    severity="error",
                    code="missing_endpoint",
                    message=f"Connection from {raw.get('sourceDevice') or '?'} to {raw.get('targetDevice') or '?'} has a missing endpoint.",
                )
            )
            continue
        source_port = normalize_port(raw.get("sourcePort"))
        target_port = normalize_port(raw.get("targetPort"))
        cable_type = _normalize_cable_type(raw.get("cableType"), source, target, source_port, target_port)
        role = _infer_connection_role(raw.get("role"), cable_type, source_port, target_port, source, target)
        _add_port(source, source_port, role)
        _add_port(target, target_port, role)

        cable_number = len(cables) + 1
        cables.append(Cable(
            id=f"cable-{cable_number:03d}",
            sourceDeviceId=source.id,
            sourcePort=source_port,
            targetDeviceId=target.id,
            targetPort=target_port,
            cableType=cable_type,
            connectionRole=role,
            label=f"{source.name} {source_port or '?'} -> {target.name} {target_port or '?'}",
        ))

    zones = sorted({device.zone for device in devices.values() if device.zone})
    topology = Topology(
        title=title,
        devices=list(devices.values()),
        cables=cables,
        issues=issues,
        zones=zones,
        legend=["WAN", "LAN", "Management", "Firewall HA", "Storage", "Power", "Unknown"],
    )
    topology.notes.append("Generated by TopoForge MVP. Review warnings before using as final documentation.")
    return topology


def _add_port(device: Device, port_name: str | None, role: str) -> None:
    if not port_name:
        return
    if any(port.name == port_name for port in device.ports):
        return
    device.ports.append(
        Port(
            id=f"{device.id}-{_slug(port_name)}",
            deviceId=device.id,
            name=port_name,
            side="auto",
            order=len(device.ports) + 1,
            vlan=role if role not in {"unknown", ""} else None,
        )
    )


def _normalize_cable_type(raw: str | None, source: Device, target: Device, source_port: str | None, target_port: str | None) -> str:
    text = f"{raw or ''} {source.type} {target.type} {source_port or ''} {target_port or ''}".lower()
    if "pdu" in text or "power" in text:
        return "power"
    if "mgmt" in text or "idrac" in text or "ipmi" in text:
        return "management"
    if "ha" in text or "sync" in text:
        return "ha"
    if "storage" in text or "san" in text:
        return "storage"
    if "wan" in text or "isp" in text or "internet" in text:
        return "wan"
    if raw and raw.strip().lower() not in {"unknown", "nan"}:
        return raw.strip().lower()
    return "ethernet"


def _infer_connection_role(raw: str | None, cable_type: str, source_port: str | None, target_port: str | None, source: Device, target: Device) -> str:
    text = f"{raw or ''} {cable_type} {source_port or ''} {target_port or ''} {source.type} {target.type}".lower()
    if "management" in text or "mgmt" in text or "idrac" in text or "ipmi" in text:
        return "management"
    if "power" in text or "pdu" in text:
        return "power"
    if "wan" in text or "isp" in text or "internet" in text:
        return "wan"
    if "storage" in text or "san" in text:
        return "storage"
    if "ha" in text or "sync" in text:
        return "ha"
    return "lan" if cable_type == "ethernet" else cable_type


def _device_key(name: str) -> str:
    text = name.strip().lower()
    aliases = [
        (r"^sw(?:itch)?\s*-?(\d+)$", "sw{n}"),
        (r"^swi(?:tch)?\s*-?(\d+)$", "sw{n}"),
        (r"^fw\s*-?(\d+)$", "firewall-{n}"),
        (r"^firewall\s*-?(\d+)$", "firewall-{n}"),
        (r"^isp\s*-?(\d+)$", "isp-{n}"),
        (r"^pdu\s*-?(\d+)$", "pdu-{n}"),
    ]
    for pattern, replacement in aliases:
        match = re.match(pattern, text)
        if match:
            return replacement.format(n=match.group(1))
    return _slug(text)


def _slug(value: str) -> str:
    return re.sub(r"[^a-z0-9]+", "-", value.lower()).strip("-") or "item"
