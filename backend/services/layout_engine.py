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
    for cable in topology.cables:
        source = device_map[cable.sourceDeviceId]
        target = device_map[cable.targetDeviceId]
        cable.exitX, cable.exitY = _anchor_for(cable, source, True)
        cable.entryX, cable.entryY = _anchor_for(cable, target, False)
        if source.y > target.y and cable.exitY == 1.0:
            cable.exitY = 0.0
        if target.y < source.y and cable.entryY == 0.0:
            cable.entryY = 1.0
    return topology


def _anchor_for(cable: Cable, device: Device, is_source: bool) -> tuple[float, float]:
    port = (cable.sourcePort if is_source else cable.targetPort) or ""
    text = f"{device.type} {port} {cable.connectionRole} {cable.cableType}".lower()
    if "mgmt" in text or "idrac" in text or "ipmi" in text:
        return 0.0, 0.5
    if "ha" in text or "sync" in text:
        return 1.0, 0.5
    if "wan" in text or "internet" in text or "isp" in text:
        return 0.5, 0.0
    if "power" in text or "pdu" in text:
        return 0.5, 1.0 if device.type != "pdu" else 0.0
    if device.type in {"switch", "server", "storage"} and is_source:
        return 0.5, 0.0
    return 0.5, 1.0
