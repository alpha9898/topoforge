from __future__ import annotations

from models import Cable, Device, Topology

ROW_ORDER = {
    "cloud": 0,
    "vpn_gateway": 0,
    "admin_endpoint": 0,
    "isp_router": 1,
    "firewall": 2,
    "switch": 3,
    "server": 4,
    "storage": 4,
    "pdu": 5,
    "unknown": 6,
}

COLUMN_SPACING = 320
ROW_SPACING = 210
ROW_TOP = 110
LAYOUT_CENTER_X = 720


def layout_topology(topology: Topology) -> Topology:
    grouped: dict[int, list[Device]] = {}
    for device in topology.devices:
        row = ROW_ORDER.get(device.type, 6)
        grouped.setdefault(row, []).append(device)

    for row, devices in grouped.items():
        devices.sort(key=lambda item: item.name.lower())
        total_width = max(0, (len(devices) - 1) * COLUMN_SPACING)
        start_x = max(80, LAYOUT_CENTER_X - total_width // 2)
        for index, device in enumerate(devices):
            device.x = start_x + index * COLUMN_SPACING
            device.y = ROW_TOP + row * ROW_SPACING
            device.width = 190
            device.height = 96

    device_map = {device.id: device for device in topology.devices}
    endpoint_sides: dict[tuple[str, bool], str] = {}
    side_groups: dict[tuple[str, str], list[tuple[Cable, bool]]] = {}

    for cable in topology.cables:
        source = device_map[cable.sourceDeviceId]
        target = device_map[cable.targetDeviceId]
        source_side = _anchor_side_for(source, target, _endpoint_role(cable, source, target, True))
        target_side = _anchor_side_for(target, source, _endpoint_role(cable, target, source, False))
        endpoint_sides[(cable.id, True)] = source_side
        endpoint_sides[(cable.id, False)] = target_side
        side_groups.setdefault((source.id, source_side), []).append((cable, True))
        side_groups.setdefault((target.id, target_side), []).append((cable, False))

    endpoint_points = _assign_side_slot_offsets(side_groups, endpoint_sides)
    for cable in topology.cables:
        cable.exitX, cable.exitY = endpoint_points[(cable.id, True)]
        cable.entryX, cable.entryY = endpoint_points[(cable.id, False)]
    return topology


def _endpoint_role(cable: Cable, device: Device, peer: Device, is_source: bool) -> str:
    port = (cable.sourcePort if is_source else cable.targetPort) or ""
    peer_port = (cable.targetPort if is_source else cable.sourcePort) or ""
    text = " ".join(
        [
            device.type,
            device.name,
            peer.type,
            peer.name,
            port,
            peer_port,
            cable.connectionRole,
            cable.cableType,
            cable.description or "",
        ]
    ).lower()

    if _has_any(text, ["power", "pdu"]):
        return "power"
    if _has_any(text, ["mgmt", "management", "idrac", "ipmi", "oob"]):
        return "management"
    if _has_any(text, ["ha", "sync", "heartbeat"]):
        return "ha"
    if _has_any(text, ["storage", "san", "iscsi", "nas"]):
        return "storage"
    if _has_any(text, ["wan", "internet", "isp"]):
        return "wan"
    if device.type == "switch" and peer.type in {"firewall", "isp_router", "router", "cloud", "vpn_gateway"}:
        return "uplink"
    if device.type == "switch" and peer.type in {"server", "storage"}:
        return "server_access"
    if device.type in {"server", "storage"} and peer.type == "switch":
        return "data"
    if cable.connectionRole == "lan":
        return "lan"
    return "unknown"


def _anchor_side_for(device: Device, peer: Device, endpoint_role: str) -> str:
    if _is_oob_device(device) and endpoint_role == "management":
        return "top"
    if endpoint_role == "power":
        return "top" if device.type == "pdu" else "bottom"
    if device.type == "firewall":
        if endpoint_role == "wan":
            return "top"
        if endpoint_role == "management":
            return "left"
        if endpoint_role == "ha":
            return "right"
        return "bottom"
    if device.type == "switch":
        if endpoint_role == "management":
            return "right" if _peer_is_right(device, peer) else "left"
        if endpoint_role in {"wan", "uplink", "ha"} or peer.type in {"firewall", "isp_router", "router", "cloud", "vpn_gateway"}:
            return "top"
        if endpoint_role in {"server_access", "storage", "lan", "data"} or peer.type in {"server", "storage"}:
            return "bottom"
    if device.type in {"server", "storage"}:
        if endpoint_role == "management":
            return "left"
        if endpoint_role == "power":
            return "bottom"
        return "top"
    if device.type in {"pdu", "admin_endpoint", "vpn_gateway", "cloud", "isp_router"}:
        if endpoint_role in {"management", "power"}:
            return "top"
        return _relative_side(device, peer)
    return _relative_side(device, peer)


def _assign_side_slot_offsets(
    side_groups: dict[tuple[str, str], list[tuple[Cable, bool]]],
    endpoint_sides: dict[tuple[str, bool], str],
) -> dict[tuple[str, bool], tuple[float, float]]:
    points: dict[tuple[str, bool], tuple[float, float]] = {}
    for endpoints in side_groups.values():
        endpoints.sort(key=lambda item: (_endpoint_sort_key(item[0], item[1])))
        count = len(endpoints)
        for index, (cable, is_source) in enumerate(endpoints):
            side = endpoint_sides[(cable.id, is_source)]
            points[(cable.id, is_source)] = _side_point(side, index, count)
    return points


def _side_point(side: str, index: int | None = None, count: int | None = None) -> tuple[float, float]:
    slot = _slot_fraction(index, count)
    if side == "top":
        return slot, 0.0
    if side == "bottom":
        return slot, 1.0
    if side == "left":
        return 0.0, slot
    if side == "right":
        return 1.0, slot
    return 0.5, 0.5


def _slot_fraction(index: int | None, count: int | None) -> float:
    if index is None or count is None or count <= 1:
        return 0.5
    return round((index + 1) / (count + 1), 2)


def _relative_side(device: Device, peer: Device) -> str:
    dx = peer.x - device.x
    dy = peer.y - device.y
    if abs(dx) > abs(dy):
        return "right" if dx > 0 else "left"
    return "bottom" if dy > 0 else "top"


def _peer_is_right(device: Device, peer: Device) -> bool:
    return peer.x > device.x


def _has_any(text: str, tokens: list[str]) -> bool:
    return any(token in text for token in tokens)


def _is_oob_device(device: Device) -> bool:
    text = f"{device.id} {device.name}".lower()
    return "oob" in text


def _endpoint_sort_key(cable: Cable, is_source: bool) -> tuple[str, str, str]:
    port = cable.sourcePort if is_source else cable.targetPort
    peer_id = cable.targetDeviceId if is_source else cable.sourceDeviceId
    return (str(port or ""), peer_id, cable.id)
