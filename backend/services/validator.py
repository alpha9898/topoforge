from __future__ import annotations

from collections import defaultdict

from models import Issue, Topology


def validate_topology(topology: Topology) -> Topology:
    issues = list(topology.issues)
    seen_names: set[str] = set()
    for device in topology.devices:
        name_key = device.name.lower().strip()
        if name_key in seen_names:
            issues.append(
                Issue(
                    id=f"duplicate-device-{device.id}",
                    severity="warning",
                    code="duplicate_device",
                    message=f"Device name {device.name} appears more than once after normalization.",
                    entity_id=device.id,
                )
            )
        seen_names.add(name_key)
        if device.type == "unknown":
            issues.append(
                Issue(
                    id=f"unknown-device-type-{device.id}",
                    severity="warning",
                    code="unknown_device_type",
                    message=f"Device {device.name} has an unknown type.",
                    entity_id=device.id,
                )
            )

    port_use: dict[tuple[str, str], list[str]] = defaultdict(list)
    for cable in topology.cables:
        if not cable.sourcePort:
            issues.append(
                Issue(
                    id=f"missing-source-port-{cable.id}",
                    severity="warning",
                    code="missing_source_port",
                    message=f"Connection {cable.id} is missing the source port.",
                    entity_id=cable.id,
                )
            )
        if not cable.targetPort:
            issues.append(
                Issue(
                    id=f"missing-target-port-{cable.id}",
                    severity="warning",
                    code="missing_target_port",
                    message=f"Connection {cable.id} is missing the target port.",
                    entity_id=cable.id,
                )
            )
        if cable.cableType == "unknown":
            issues.append(
                Issue(
                    id=f"unknown-cable-type-{cable.id}",
                    severity="warning",
                    code="unknown_cable_type",
                    message=f"Connection {cable.id} has an unknown cable type.",
                    entity_id=cable.id,
                )
            )
        if cable.sourcePort:
            port_use[(cable.sourceDeviceId, cable.sourcePort)].append(cable.id)
        if cable.targetPort:
            port_use[(cable.targetDeviceId, cable.targetPort)].append(cable.id)

    for (device_id, port), cable_ids in port_use.items():
        if len(cable_ids) > 1 and not _is_multi_link_port(port):
            issues.append(
                Issue(
                    id=f"port-conflict-{device_id}-{port}",
                    severity="warning",
                    code="port_conflict",
                    message=f"Port {port} on {device_id} appears in multiple connections: {', '.join(cable_ids)}.",
                    entity_id=device_id,
                )
            )

    topology.issues = _dedupe_issues(issues)
    return topology


def _is_multi_link_port(port: str) -> bool:
    text = port.lower()
    return any(token in text for token in ["po", "port-channel", "lag", "ae"])


def _dedupe_issues(issues: list[Issue]) -> list[Issue]:
    result: list[Issue] = []
    seen: set[str] = set()
    for issue in issues:
        key = f"{issue.code}:{issue.entity_id}:{issue.message}"
        if key not in seen:
            result.append(issue)
            seen.add(key)
    return result
