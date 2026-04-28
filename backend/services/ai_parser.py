from __future__ import annotations

import json
import os
import re
import urllib.error
import urllib.request
from copy import deepcopy
from typing import Any

from models import Cable, Device, Issue, Topology
from services.topology_builder import infer_device_type


def build_ai_suggestions(parsed: dict[str, Any], include_ips: bool = False) -> dict[str, Any]:
    local = _local_suggestions(parsed)
    api_key = os.getenv("GEMINI_API_KEY", "").strip()
    if not api_key:
        local["source"] = "local_rules"
        local["status"] = "gemini_api_key_missing"
    return local


def enrich_topology_connections(topology: Topology, suggestions: dict[str, Any] | None = None, include_ips: bool = False) -> Topology:
    enrichment = _local_connection_enrichment(topology)
    api_key = os.getenv("GEMINI_API_KEY", "").strip()
    if api_key and suggestions and suggestions.get("source") == "gemini":
        try:
            enrichment = _merge_connection_enrichment(enrichment, _gemini_connection_enrichment(topology, include_ips, api_key))
        except Exception as exc:
            topology.issues.append(
                Issue(
                    id="ai-connection-enrichment-failed",
                    severity="warning",
                    code="ai_connection_enrichment_failed",
                    message=f"Gemini connection enrichment failed; local rules were used. {exc}",
                )
            )

    enrichments_by_id = {item["cable_id"]: item for item in enrichment}
    for cable in topology.cables:
        item = enrichments_by_id.get(cable.id)
        if not item:
            continue
        cable.connectionRole = item.get("role", cable.connectionRole)
        cable.cableType = item.get("cableType", cable.cableType)
        cable.label = item.get("label", cable.label)
        cable.description = item.get("description")
        cable.confidence = item.get("confidence")
    if enrichment:
        topology.aiSuggestions = topology.aiSuggestions or {}
        topology.aiSuggestions["connection_enrichment"] = enrichment
    return topology

    try:
        gemini = _gemini_suggestions(parsed, include_ips, api_key)
        return _merge_suggestions(local, gemini)
    except Exception as exc:
        local["source"] = "local_rules"
        local["status"] = "gemini_failed"
        local["message"] = str(exc)
        return local


def apply_ai_suggestions_to_parsed(parsed: dict[str, Any], suggestions: dict[str, Any]) -> dict[str, Any]:
    next_parsed = deepcopy(parsed)
    alias_map = _alias_map_from_suggestions(suggestions)
    ignored = {item.get("source") for item in suggestions.get("ignored_connections", []) if item.get("source")}
    ignored_signatures = {item.get("signature") for item in suggestions.get("ignored_connections", []) if item.get("signature")}

    canonical_keys = {_name_key(value) for value in alias_map.values()}
    next_devices: list[dict[str, Any]] = []
    for raw_device in next_parsed.get("raw_devices", []):
        device_key = _name_key(raw_device.get("name"))
        if device_key in alias_map and _name_key(alias_map[device_key]) != device_key:
            continue
        if device_key in canonical_keys or device_key not in alias_map:
            next_devices.append(raw_device)
    next_parsed["raw_devices"] = next_devices

    next_connections: list[dict[str, Any]] = []
    for raw in next_parsed.get("raw_connections", []):
        if raw.get("source") in ignored or _connection_signature(raw) in ignored_signatures:
            continue
        source_name = raw.get("sourceDevice")
        target_name = raw.get("targetDevice")
        raw["sourceDevice"] = alias_map.get(_name_key(source_name), source_name)
        raw["targetDevice"] = alias_map.get(_name_key(target_name), target_name)
        next_connections.append(raw)
    next_parsed["raw_connections"] = next_connections
    next_parsed["ai_suggestions"] = suggestions
    return next_parsed


def _local_suggestions(parsed: dict[str, Any]) -> dict[str, Any]:
    raw_devices = parsed.get("raw_devices", [])
    raw_connections = parsed.get("raw_connections", [])
    canonical_devices = _canonical_devices(raw_devices)
    real_by_type = _real_devices_by_type(canonical_devices)
    real_names = {_name_key(device.get("name")) for device in canonical_devices}
    alias_suggestions: list[dict[str, Any]] = []

    connection_names = []
    for connection in raw_connections:
        connection_names.extend([connection.get("sourceDevice"), connection.get("targetDevice")])

    for name in sorted({value for value in connection_names if value and _name_key(value) not in real_names}, key=str.lower):
        suggestion = _suggest_alias(name, real_by_type)
        if suggestion:
            alias_suggestions.append(suggestion)

    ignored_connections = []
    for connection in raw_connections:
        reason = _false_connection_reason(connection)
        if reason:
            ignored_connections.append(
                {
                    "source": connection.get("source"),
                    "signature": _connection_signature(connection),
                    "reason": reason,
                    "confidence": 0.96,
                }
            )

    return {
        "source": "local_rules",
        "status": "ok",
        "alias_suggestions": alias_suggestions,
        "device_type_suggestions": [],
        "ignored_connections": ignored_connections,
        "duplicate_devices": [],
    }


def _canonical_devices(raw_devices: list[dict[str, Any]]) -> list[dict[str, Any]]:
    canonical: list[dict[str, Any]] = []
    for device in raw_devices:
        source = str(device.get("source") or "").lower()
        device_type = str(device.get("type") or "").lower()
        if "connection" in source and device_type in {"ethernet", "fiber", "wan", "lan", "management", "unknown"}:
            continue
        canonical.append(device)
    return canonical or raw_devices


def _gemini_suggestions(parsed: dict[str, Any], include_ips: bool, api_key: str) -> dict[str, Any]:
    payload = _safe_payload(parsed, include_ips)
    prompt = (
        "You are helping parse network LLD spreadsheet data into a topology. "
        "Return ONLY compact JSON with keys alias_suggestions, device_type_suggestions, "
        "ignored_connections, duplicate_devices. "
        "Alias suggestions items: alias, canonical, confidence, reason. "
        "Ignored connection items: source, signature, confidence, reason. "
        "Prefer mapping short aliases like SW1/FW1/Firewall-1 to real hostnames with IP rows. "
        "Never invent cables. Here is the sanitized parsed data:\n"
        f"{json.dumps(payload, ensure_ascii=False)}"
    )
    body = {
        "contents": [{"parts": [{"text": prompt}]}],
        "generationConfig": {
            "temperature": 0.1,
            "responseMimeType": "application/json",
        },
    }
    request = urllib.request.Request(
        f"https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key={api_key}",
        data=json.dumps(body).encode("utf-8"),
        headers={"Content-Type": "application/json"},
        method="POST",
    )
    try:
        with urllib.request.urlopen(request, timeout=20) as response:
            data = json.loads(response.read().decode("utf-8"))
    except urllib.error.HTTPError as exc:
        detail = exc.read().decode("utf-8", errors="replace")
        raise RuntimeError(f"Gemini API error {exc.code}: {detail[:240]}") from exc

    text = data["candidates"][0]["content"]["parts"][0]["text"]
    parsed_response = json.loads(text)
    parsed_response["source"] = "gemini"
    parsed_response["status"] = "ok"
    return parsed_response


def _gemini_connection_enrichment(topology: Topology, include_ips: bool, api_key: str) -> list[dict[str, Any]]:
    payload = _topology_payload(topology, include_ips)
    prompt = (
        "You are enriching an existing network topology. Do not create or delete cables. "
        "Return ONLY JSON array. Each item must include cable_id, role, cableType, label, "
        "description, confidence. Use roles: wan, lan, management, ha, storage, power, unknown. "
        "Labels should clearly show source device/port and target device/port. "
        f"Topology:\n{json.dumps(payload, ensure_ascii=False)}"
    )
    body = {
        "contents": [{"parts": [{"text": prompt}]}],
        "generationConfig": {"temperature": 0.1, "responseMimeType": "application/json"},
    }
    request = urllib.request.Request(
        f"https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key={api_key}",
        data=json.dumps(body).encode("utf-8"),
        headers={"Content-Type": "application/json"},
        method="POST",
    )
    with urllib.request.urlopen(request, timeout=20) as response:
        data = json.loads(response.read().decode("utf-8"))
    text = data["candidates"][0]["content"]["parts"][0]["text"]
    parsed = json.loads(text)
    return parsed if isinstance(parsed, list) else parsed.get("connection_enrichment", [])


def _merge_suggestions(local: dict[str, Any], gemini: dict[str, Any]) -> dict[str, Any]:
    merged = {
        "source": "gemini",
        "status": "ok",
        "alias_suggestions": _merge_by_key(local.get("alias_suggestions", []), gemini.get("alias_suggestions", []), "alias"),
        "device_type_suggestions": _merge_by_key(local.get("device_type_suggestions", []), gemini.get("device_type_suggestions", []), "device"),
        "ignored_connections": _merge_by_key(local.get("ignored_connections", []), gemini.get("ignored_connections", []), "signature"),
        "duplicate_devices": gemini.get("duplicate_devices", local.get("duplicate_devices", [])),
    }
    return merged


def _safe_payload(parsed: dict[str, Any], include_ips: bool) -> dict[str, Any]:
    devices = []
    for device in parsed.get("raw_devices", [])[:200]:
        devices.append(
            {
                "name": device.get("name"),
                "type": device.get("type"),
                "mgmtIp": device.get("mgmtIp") if include_ips else None,
                "zone": device.get("zone"),
                "source": device.get("source"),
            }
        )
    connections = []
    for connection in parsed.get("raw_connections", [])[:400]:
        connections.append(
            {
                "sourceDevice": connection.get("sourceDevice"),
                "sourcePort": connection.get("sourcePort"),
                "targetDevice": connection.get("targetDevice"),
                "targetPort": connection.get("targetPort"),
                "source": connection.get("source"),
                "signature": _connection_signature(connection),
            }
        )
    return {"raw_devices": devices, "raw_connections": connections}


def _topology_payload(topology: Topology, include_ips: bool) -> dict[str, Any]:
    devices = {
        device.id: {
            "name": device.name,
            "type": device.type,
            "mgmtIp": device.mgmtIp if include_ips else None,
        }
        for device in topology.devices
    }
    return {
        "devices": devices,
        "cables": [
            {
                "id": cable.id,
                "sourceDevice": devices.get(cable.sourceDeviceId, {}).get("name", cable.sourceDeviceId),
                "sourcePort": cable.sourcePort,
                "targetDevice": devices.get(cable.targetDeviceId, {}).get("name", cable.targetDeviceId),
                "targetPort": cable.targetPort,
                "role": cable.connectionRole,
                "cableType": cable.cableType,
            }
            for cable in topology.cables[:500]
        ],
    }


def _local_connection_enrichment(topology: Topology) -> list[dict[str, Any]]:
    devices = {device.id: device for device in topology.devices}
    enrichments = []
    for cable in topology.cables:
        source = devices.get(cable.sourceDeviceId)
        target = devices.get(cable.targetDeviceId)
        if not source or not target:
            continue
        role = _connection_role(cable, source, target)
        cable_type = _cable_type_for_role(role, cable.cableType)
        label = f"{source.name} {cable.sourcePort or '?'} -> {target.name} {cable.targetPort or '?'}"
        description = _connection_description(role, source, target, cable)
        enrichments.append(
            {
                "cable_id": cable.id,
                "role": role,
                "cableType": cable_type,
                "label": label,
                "description": description,
                "confidence": 0.9 if role != "unknown" else 0.65,
            }
        )
    return enrichments


def _merge_connection_enrichment(local: list[dict[str, Any]], gemini: list[dict[str, Any]]) -> list[dict[str, Any]]:
    merged = {item.get("cable_id"): item for item in local if item.get("cable_id")}
    for item in gemini:
        cable_id = item.get("cable_id")
        if not cable_id:
            continue
        if float(item.get("confidence", 0)) >= 0.75:
            merged[cable_id] = {**merged.get(cable_id, {}), **item}
    return list(merged.values())


def _connection_role(cable: Cable, source: Device, target: Device) -> str:
    text = f"{cable.connectionRole} {cable.cableType} {cable.sourcePort or ''} {cable.targetPort or ''} {source.type} {target.type}".lower()
    if "idrac" in text or "ipmi" in text or "mgmt" in text or "management" in text:
        return "management"
    if "pdu" in text or "power" in text:
        return "power"
    if "isp" in text or "internet" in text or "wan" in text:
        return "wan"
    if "storage" in text or "san" in text or "nas" in text:
        return "storage"
    if "ha" in text or "sync" in text:
        return "ha"
    if {source.type, target.type} & {"switch", "firewall", "server", "storage"}:
        return "lan"
    return "unknown"


def _cable_type_for_role(role: str, current: str) -> str:
    if role == "management":
        return "management"
    if role == "power":
        return "power"
    if role == "wan":
        return "wan"
    if role == "storage":
        return "storage"
    return current if current and current != "unknown" else "ethernet"


def _connection_description(role: str, source: Device, target: Device, cable: Cable) -> str:
    if role == "management":
        return f"Management path from {source.name} {cable.sourcePort or '?'} to {target.name} {cable.targetPort or '?'}."
    if role == "wan":
        return f"WAN or external connectivity between {source.name} and {target.name}."
    if role == "power":
        return f"Power connection between {source.name} and {target.name}."
    if role == "storage":
        return f"Storage network connection between {source.name} and {target.name}."
    if role == "ha":
        return f"High availability or sync connection between {source.name} and {target.name}."
    if role == "lan":
        return f"LAN/data connection from {source.name} port {cable.sourcePort or '?'} to {target.name} port {cable.targetPort or '?'}."
    return f"Connection from {source.name} {cable.sourcePort or '?'} to {target.name} {cable.targetPort or '?'}."


def _real_devices_by_type(raw_devices: list[dict[str, Any]]) -> dict[str, list[dict[str, Any]]]:
    result: dict[str, list[dict[str, Any]]] = {}
    for device in raw_devices:
        name = device.get("name") or ""
        device_type = infer_device_type(name, device.get("type"))
        result.setdefault(device_type, []).append(device)
    for devices in result.values():
        devices.sort(key=lambda item: _device_index(item.get("name") or "9999"))
    return result


def _suggest_alias(name: str, real_by_type: dict[str, list[dict[str, Any]]]) -> dict[str, Any] | None:
    key = _name_key(name)
    match = re.match(r"^(?:sw|switch)(\d+)$", key)
    if match:
        return _indexed_alias(name, real_by_type.get("switch", []), int(match.group(1)), "short switch alias")
    match = re.match(r"^(?:fw|firewall)(\d+)$", key)
    if match:
        return _indexed_alias(name, real_by_type.get("firewall", []), int(match.group(1)), "short firewall alias")
    return None


def _indexed_alias(alias: str, candidates: list[dict[str, Any]], index: int, reason: str) -> dict[str, Any] | None:
    if index < 1 or index > len(candidates):
        return None
    canonical = candidates[index - 1].get("name")
    if not canonical:
        return None
    return {
        "alias": alias,
        "canonical": canonical,
        "confidence": 0.94,
        "reason": reason,
        "applied": True,
    }


def _false_connection_reason(connection: dict[str, Any]) -> str | None:
    source_port = str(connection.get("sourcePort") or "").lower()
    target = str(connection.get("targetDevice") or "").lower()
    target_port = str(connection.get("targetPort") or "").lower()
    if source_port.startswith("switch") and target == "firewall" and ("-to-" in target_port or target_port.startswith("to-")):
        return "Header-derived artifact; the cell also contains a standalone switch-to-firewall cable string."
    return None


def _alias_map_from_suggestions(suggestions: dict[str, Any]) -> dict[str, str]:
    alias_map: dict[str, str] = {}
    for item in suggestions.get("alias_suggestions", []):
        if float(item.get("confidence", 0)) >= 0.85 and item.get("alias") and item.get("canonical"):
            alias_map[_name_key(item["alias"])] = item["canonical"]
    return alias_map


def _merge_by_key(first: list[dict[str, Any]], second: list[dict[str, Any]], key: str) -> list[dict[str, Any]]:
    merged: dict[str, dict[str, Any]] = {}
    for item in first + second:
        item_key = item.get(key)
        if not item_key:
            continue
        current = merged.get(str(item_key))
        if not current or float(item.get("confidence", 0)) >= float(current.get("confidence", 0)):
            merged[str(item_key)] = item
    return list(merged.values())


def _connection_signature(connection: dict[str, Any]) -> str:
    parts = [
        connection.get("sourceDevice"),
        connection.get("sourcePort"),
        connection.get("targetDevice"),
        connection.get("targetPort"),
        connection.get("source"),
    ]
    return "|".join(str(part or "").strip().lower() for part in parts)


def _name_key(name: Any) -> str:
    return re.sub(r"[^a-z0-9]+", "", str(name or "").lower())


def _device_index(name: str) -> int:
    match = re.search(r"(\d+)$", name)
    return int(match.group(1)) if match else 9999
