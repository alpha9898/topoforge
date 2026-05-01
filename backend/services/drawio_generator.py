from __future__ import annotations

import html
import xml.etree.ElementTree as ET
from pathlib import Path

from models import Cable, Device, Topology

DEVICE_STYLES = {
    "cloud": "image;aspect=fixed;perimeter=ellipsePerimeter;html=1;align=center;shadow=0;dashed=0;spacingTop=3;image=img/lib/active_directory/internet_cloud.svg;",
    "isp_router": "strokeColor=#ffffff;sketch=0;html=1;pointerEvents=1;dashed=0;fillColor=#036897;strokeWidth=2;verticalLabelPosition=bottom;verticalAlign=top;align=center;outlineConnect=0;shape=mxgraph.cisco.routers.ip_telephony_router;",
    "firewall": "strokeColor=#ffffff;sketch=0;html=1;pointerEvents=1;dashed=0;fillColor=#C62828;strokeWidth=2;verticalLabelPosition=bottom;verticalAlign=top;align=center;outlineConnect=0;shape=mxgraph.cisco.security.firewall;",
    "switch": "html=1;verticalLabelPosition=bottom;verticalAlign=top;outlineConnect=0;shadow=0;dashed=0;shape=mxgraph.rack.hpe_aruba.switches.j9772a_2530_48g_poeplus_switch;points=[[0.12,0.39,0,0,0],[0.16,0.39,0,0,0],[0.19,0.39,0,0,0],[0.38,0.36,0,0,0],[0.41,0.36,0,0,0],[0.79,0.36,0,0,0],[0.81,0.36,0,0,0],[0.85,0.36,0,0,0],[0.88,0.68,0,0,0]];",
    "server": "verticalLabelPosition=bottom;html=1;verticalAlign=top;align=center;strokeColor=none;fillColor=#00BEF2;shape=mxgraph.azure.server;",
    "storage": "strokeColor=#666666;html=1;labelPosition=right;align=left;spacingLeft=15;shadow=0;dashed=0;outlineConnect=0;shape=mxgraph.rack.general.cat5e_rack_mount_patch_panel_24_ports;points=[[0.07,0.49,0,0,0],[0.13,0.5,0,0,0],[0.81,0.49,0,0,0],[0.89,0.49,0,0,0]];",
    "pdu": "shape=mxgraph.rack.general.horizontal_pdu;html=1;verticalLabelPosition=bottom;verticalAlign=top;align=center;strokeColor=#666666;fillColor=#f5f5f5;shadow=0;dashed=0;outlineConnect=0;",
    "vpn_gateway": "html=1;strokeWidth=1;shadow=0;dashed=0;shape=mxgraph.ios7.misc.vpn;fillColor=#007AFF;strokeColor=none;buttonText=;strokeColor2=#222222;fontColor=#222222;fontSize=8;verticalLabelPosition=bottom;verticalAlign=top;align=center;sketch=0;",
    "admin_endpoint": "shape=mxgraph.azure.laptop;verticalLabelPosition=bottom;html=1;verticalAlign=top;align=center;strokeColor=none;fillColor=#00A4EF;",
    "unknown": "shape=mxgraph.basic.rect;rounded=1;whiteSpace=wrap;html=1;fillColor=#FFFFFF;strokeColor=#424242;",
}

DEVICE_GEOMETRY = {
    "cloud": (120, 80),
    "isp_router": (90, 70),
    "firewall": (110, 78),
    "switch": (190, 46),
    "server": (74, 92),
    "storage": (170, 48),
    "pdu": (180, 42),
    "vpn_gateway": (76, 76),
    "admin_endpoint": (86, 68),
    "unknown": (150, 70),
}

CABLE_STYLES = {
    "wan": ("#757575", "0"),
    "lan": ("#1976D2", "0"),
    "ethernet": ("#1976D2", "0"),
    "management": ("#2E7D32", "1"),
    "ha": ("#7B1FA2", "1"),
    "storage": ("#EF6C00", "0"),
    "power": ("#C62828", "1"),
    "unknown": ("#212121", "0"),
}

SOURCE_COLOR_PALETTE = [
    ("YELLOW", "#FDD835"),
    ("RED", "#E53935"),
    ("GREEN", "#43A047"),
    ("CYAN", "#00ACC1"),
    ("PURPLE", "#8E24AA"),
    ("ORANGE", "#FB8C00"),
    ("PINK", "#D81B60"),
    ("BROWN", "#6D4C41"),
    ("TEAL", "#00897B"),
    ("BLUE", "#1E88E5"),
    ("GRAY", "#757575"),
    ("LIME", "#C0CA33"),
]

REFERENCE_START_X = 1220
REFERENCE_START_Y = 80
REFERENCE_GAP = 36
TABLE_HEADER_FILL = "#174E78"
TABLE_BORDER = "#2F6F9F"
TABLE_ROW_HEIGHT = 20


def write_drawio(topology: Topology, output_path: Path) -> Path:
    output_path.parent.mkdir(parents=True, exist_ok=True)
    xml = generate_drawio_xml(topology)
    output_path.write_text(xml, encoding="utf-8")
    return output_path


def generate_drawio_xml(topology: Topology) -> str:
    reference_x = _reference_x(topology)
    reference_bottom = _reference_bottom(topology)
    notes_y = max(1220, reference_bottom + REFERENCE_GAP)
    page_width = str(max(2200, reference_x + 980))
    page_height = str(max(1450, notes_y + 160))
    mxfile = ET.Element("mxfile", {"host": "TopoForge", "modified": "", "agent": "TopoForge MVP", "version": "0.1"})
    diagram = ET.SubElement(mxfile, "diagram", {"name": _safe(topology.title)})
    model = ET.SubElement(
        diagram,
        "mxGraphModel",
        {"dx": "1422", "dy": "794", "grid": "1", "gridSize": "10", "page": "1", "pageScale": "1", "pageWidth": page_width, "pageHeight": page_height},
    )
    root = ET.SubElement(model, "root")
    ET.SubElement(root, "mxCell", {"id": "0"})
    ET.SubElement(root, "mxCell", {"id": "1", "parent": "0"})

    _add_text(root, "title", topology.title, 80, 28, 600, 36, "fontSize=24;fontStyle=1;html=1;strokeColor=none;fillColor=none;")
    for device in topology.devices:
        _add_device(root, device)
    device_map = {device.id: device for device in topology.devices}
    source_color_map = _source_color_map(topology.devices)
    cable_offsets = _parallel_cable_offsets(topology.cables, device_map)
    for cable in topology.cables:
        _add_cable(root, cable, device_map, cable_offsets.get(cable.id, 0), source_color_map)
    _add_cable_reference(root, topology, device_map, reference_x, REFERENCE_START_Y, source_color_map)
    _add_legend(root, topology, reference_x + _cable_reference_width() + 40, REFERENCE_START_Y)
    _add_switch_port_summary(root, topology, device_map, reference_x, _cable_reference_bottom(topology) + REFERENCE_GAP)
    _add_source_color_table(root, topology, device_map, source_color_map, reference_x, _source_color_table_y(topology))
    _add_notes(root, topology, notes_y)
    return ET.tostring(mxfile, encoding="unicode", xml_declaration=True)


def _add_device(root: ET.Element, device: Device) -> None:
    lines = [device.name]
    if device.hostname and device.hostname != device.name:
        lines.append(device.hostname)
    if device.mgmtIp:
        lines.append(device.mgmtIp)
    label = "&#xa;".join(_safe(line) for line in lines)
    shape_width, shape_height = DEVICE_GEOMETRY.get(device.type, DEVICE_GEOMETRY["unknown"])
    shape_x = device.x + max(0, (device.width - shape_width) // 2)
    cell = ET.SubElement(
        root,
        "mxCell",
        {
            "id": f"device-{device.id}",
            "value": "",
            "style": DEVICE_STYLES.get(device.type, DEVICE_STYLES["unknown"]),
            "vertex": "1",
            "parent": "1",
        },
    )
    ET.SubElement(
        cell,
        "mxGeometry",
        {"x": str(shape_x), "y": str(device.y), "width": str(shape_width), "height": str(shape_height), "as": "geometry"},
    )
    _add_text(
        root,
        f"label-{device.id}",
        label,
        device.x - 20,
        device.y + shape_height + 6,
        device.width + 40,
        54,
        "fontSize=12;fontStyle=1;html=1;strokeColor=none;fillColor=none;whiteSpace=wrap;align=center;verticalAlign=top;",
    )


def _add_cable(root: ET.Element, cable: Cable, devices: dict[str, Device], offset: int, source_color_map: dict[str, tuple[str, str]]) -> None:
    _, dashed = CABLE_STYLES.get(cable.connectionRole, CABLE_STYLES.get(cable.cableType, CABLE_STYLES["unknown"]))
    color = _cable_owner_color(cable, devices, source_color_map)[1]
    style = (
        "edgeStyle=orthogonalEdgeStyle;rounded=1;arcSize=10;html=1;"
        "labelBackgroundColor=#ffffff;fontSize=10;spacing=4;"
        f"strokeColor={color};strokeWidth=3;dashed={dashed};endArrow=none;startArrow=none;"
        f"exitX={cable.exitX};exitY={cable.exitY};entryX={cable.entryX};entryY={cable.entryY};"
    )
    cell = ET.SubElement(
        root,
        "mxCell",
        {
            "id": cable.id,
            "value": cable.label,
            "style": style,
            "edge": "1",
            "parent": "1",
            "source": f"device-{cable.sourceDeviceId}",
            "target": f"device-{cable.targetDeviceId}",
        },
    )
    geom = ET.SubElement(cell, "mxGeometry", {"relative": "1", "as": "geometry"})
    waypoint = _parallel_waypoint(cable, devices, offset)
    if waypoint:
        points = ET.SubElement(geom, "Array", {"as": "points"})
        ET.SubElement(points, "mxPoint", {"x": str(waypoint[0]), "y": str(waypoint[1])})


def _parallel_cable_offsets(cables: list[Cable], devices: dict[str, Device]) -> dict[str, int]:
    grouped: dict[tuple[str, str], list[Cable]] = {}
    row_grouped: dict[tuple[int, int], list[Cable]] = {}
    for cable in cables:
        pair = tuple(sorted((cable.sourceDeviceId, cable.targetDeviceId)))
        grouped.setdefault(pair, []).append(cable)
        source = devices.get(cable.sourceDeviceId)
        target = devices.get(cable.targetDeviceId)
        if source and target:
            row_pair = tuple(sorted((source.y, target.y)))
            row_grouped.setdefault(row_pair, []).append(cable)

    offsets: dict[str, int] = {}
    for pair_cables in grouped.values():
        if len(pair_cables) == 1:
            offsets[pair_cables[0].id] = 0
            continue
        step = min(54, 28 + len(pair_cables) * 3)
        start = -((len(pair_cables) - 1) * step) // 2
        for index, cable in enumerate(pair_cables):
            offsets[cable.id] = start + index * step
    for row_cables in row_grouped.values():
        if len(row_cables) <= 2:
            continue
        row_cables.sort(key=lambda item: item.id)
        lane_step = min(18, 6 + len(row_cables) // 2)
        start = -((len(row_cables) - 1) * lane_step) // 2
        for index, cable in enumerate(row_cables):
            offsets[cable.id] = offsets.get(cable.id, 0) + start + index * lane_step
    return offsets


def _parallel_waypoint(cable: Cable, devices: dict[str, Device], offset: int) -> tuple[int, int] | None:
    if offset == 0:
        return None
    source = devices.get(cable.sourceDeviceId)
    target = devices.get(cable.targetDeviceId)
    if not source or not target:
        return None
    source_x = source.x + source.width // 2
    source_y = source.y + source.height // 2
    target_x = target.x + target.width // 2
    target_y = target.y + target.height // 2
    dx = target_x - source_x
    dy = target_y - source_y
    length = max((dx * dx + dy * dy) ** 0.5, 1)
    normal_x = -dy / length
    normal_y = dx / length
    mid_x = (source_x + target_x) // 2
    mid_y = (source_y + target_y) // 2
    return round(mid_x + normal_x * offset), round(mid_y + normal_y * offset)


def _add_legend(root: ET.Element, topology: Topology, x: int, y: int) -> None:
    rows = [
        ("GRAY solid", "WAN / Internet / ISP links"),
        ("BLUE solid", "LAN / internal links"),
        ("GREEN dashed", "Management / OOB links"),
        ("PURPLE dashed", "Firewall HA / sync links"),
        ("ORANGE solid", "Storage links"),
        ("RED dashed", "Power / PDU links"),
        ("BLACK solid", "Unknown links"),
    ]
    _add_box(root, "legend-box", x, y, 330, 178)
    _add_text(root, "legend-title", "ROLE / STYLE LEGEND", x, y, 330, 24, _table_title_style("#666666"))
    for index, (label, description) in enumerate(rows):
        role = ["wan", "lan", "management", "ha", "storage", "power", "unknown"][index]
        color, dashed = CABLE_STYLES[role]
        row_y = y + 34 + index * 18
        _add_line(root, f"legend-line-{role}", x + 12, row_y + 8, x + 58, row_y + 8, color, dashed)
        _add_text(root, f"legend-label-{role}", f"{label} - {description}", x + 66, row_y, 252, 18, _table_cell_style("#FFFFFF", font_size=8))


def _add_cable_reference(root: ET.Element, topology: Topology, devices: dict[str, Device], x: int, y: int, source_color_map: dict[str, tuple[str, str]]) -> None:
    columns = [
        ("ID", 34),
        ("Source Device", 132),
        ("Source Port", 72),
        ("Destination Device", 150),
        ("Destination Port", 86),
        ("Role", 72),
        ("Color", 120),
        ("VLAN", 70),
        ("Notes", 170),
    ]
    width = _cable_reference_width()
    _add_box(root, "cable-reference-box", x, y, width, _cable_reference_height(topology))
    _add_text(root, "cable-reference-title", "TABLE 1: CABLE REFERENCE", x, y, width, 24, _table_title_style(TABLE_HEADER_FILL))
    header_y = y + 24
    cursor_x = x
    for label, col_width in columns:
        _add_text(root, f"cable-reference-header-{_slug(label)}", label, cursor_x, header_y, col_width, TABLE_ROW_HEIGHT, _table_header_style())
        cursor_x += col_width

    for index, cable in enumerate(topology.cables):
        source = devices.get(cable.sourceDeviceId)
        target = devices.get(cable.targetDeviceId)
        role = cable.connectionRole or cable.cableType or "unknown"
        row = [
            f"A{index + 1}",
            _clip(source.name if source else cable.sourceDeviceId, 22),
            _clip(cable.sourcePort or "?", 12),
            _clip(target.name if target else cable.targetDeviceId, 24),
            _clip(cable.targetPort or "?", 14),
            _clip(role, 12),
            _clip(_cable_owner_color_label(cable, devices, source_color_map), 18),
            _clip(_cable_vlan(cable, source, target), 10),
            _clip(cable.description or cable.label, 36),
        ]
        row_y = y + 24 + TABLE_ROW_HEIGHT + index * TABLE_ROW_HEIGHT
        fill = "#FFFFFF" if index % 2 == 0 else "#F7FBFE"
        cursor_x = x
        for cell_index, value in enumerate(row):
            col_width = columns[cell_index][1]
            _add_text(
                root,
                f"cable-reference-row-{index}-{cell_index}",
                value,
                cursor_x,
                row_y,
                col_width,
                TABLE_ROW_HEIGHT,
                _table_cell_style(fill, font_size=8),
            )
            cursor_x += col_width


def _add_switch_port_summary(root: ET.Element, topology: Topology, devices: dict[str, Device], x: int, y: int) -> None:
    switch_devices = [device for device in topology.devices if device.type == "switch"]
    if not switch_devices:
        return
    cable_rows = _port_summary_rows(topology, devices, switch_devices)
    width = 650
    height = 24 + TABLE_ROW_HEIGHT + len(cable_rows) * TABLE_ROW_HEIGHT
    _add_box(root, "switch-port-summary-box", x, y, width, height)
    _add_text(root, "switch-port-summary-title", "TABLE 2: SWITCH / OOB PORT SUMMARY", x, y, width, 24, _table_title_style(TABLE_HEADER_FILL))
    columns = [("Device", 130), ("Port", 75), ("Connected to", 150), ("Peer port", 80), ("Type", 80), ("Cable", 135)]
    cursor_x = x
    header_y = y + 24
    for label, col_width in columns:
        _add_text(root, f"switch-summary-header-{_slug(label)}", label, cursor_x, header_y, col_width, TABLE_ROW_HEIGHT, _table_header_style())
        cursor_x += col_width
    for index, row in enumerate(cable_rows):
        row_y = y + 24 + TABLE_ROW_HEIGHT + index * TABLE_ROW_HEIGHT
        fill = "#FFFFFF" if index % 2 == 0 else "#F7FBFE"
        cursor_x = x
        for cell_index, value in enumerate(row):
            col_width = columns[cell_index][1]
            _add_text(root, f"switch-summary-row-{index}-{cell_index}", value, cursor_x, row_y, col_width, TABLE_ROW_HEIGHT, _table_cell_style(fill, font_size=8))
            cursor_x += col_width


def _add_source_color_table(
    root: ET.Element,
    topology: Topology,
    devices: dict[str, Device],
    source_color_map: dict[str, tuple[str, str]],
    x: int,
    y: int,
) -> None:
    rows = _source_color_rows(topology, devices)
    width = 650
    height = 24 + TABLE_ROW_HEIGHT + max(1, len(rows)) * TABLE_ROW_HEIGHT
    _add_box(root, "source-color-table-box", x, y, width, height)
    _add_text(root, "source-color-table-title", "TABLE 3: SOURCE CABLE COLORS", x, y, width, 24, _table_title_style(TABLE_HEADER_FILL))
    columns = [("Device", 180), ("Type", 100), ("Color", 110), ("Sample", 90), ("Cable count", 170)]
    cursor_x = x
    header_y = y + 24
    for label, col_width in columns:
        _add_text(root, f"source-color-header-{_slug(label)}", label, cursor_x, header_y, col_width, TABLE_ROW_HEIGHT, _table_header_style())
        cursor_x += col_width

    if not rows:
        _add_text(root, "source-color-empty", "No source cables", x, y + 24 + TABLE_ROW_HEIGHT, width, TABLE_ROW_HEIGHT, _table_cell_style("#FFFFFF", font_size=8))
        return

    for index, (device, count) in enumerate(rows):
        color_name, color = _source_color(device.id, source_color_map)
        row_y = y + 24 + TABLE_ROW_HEIGHT + index * TABLE_ROW_HEIGHT
        fill = "#FFFFFF" if index % 2 == 0 else "#F7FBFE"
        row = [_clip(device.name, 28), _clip(device.type, 14), color_name, "", str(count)]
        cursor_x = x
        for cell_index, value in enumerate(row):
            col_width = columns[cell_index][1]
            _add_text(root, f"source-color-row-{index}-{cell_index}", value, cursor_x, row_y, col_width, TABLE_ROW_HEIGHT, _table_cell_style(fill, font_size=8))
            if cell_index == 3:
                _add_line(root, f"source-color-sample-{device.id}", cursor_x + 12, row_y + 10, cursor_x + col_width - 12, row_y + 10, color, "0")
            cursor_x += col_width


def _cable_reference_height(topology: Topology) -> int:
    return 24 + TABLE_ROW_HEIGHT + max(1, len(topology.cables)) * TABLE_ROW_HEIGHT


def _cable_reference_width() -> int:
    return 906


def _cable_reference_bottom(topology: Topology) -> int:
    return REFERENCE_START_Y + _cable_reference_height(topology)


def _switch_port_summary_height(topology: Topology) -> int:
    device_map = {device.id: device for device in topology.devices}
    switches = [device for device in topology.devices if device.type == "switch"]
    if not switches:
        return 0
    return 24 + TABLE_ROW_HEIGHT + len(_port_summary_rows(topology, device_map, switches)) * TABLE_ROW_HEIGHT


def _source_color_table_height(topology: Topology) -> int:
    device_map = {device.id: device for device in topology.devices}
    owner_ids = {_cable_color_owner(cable, device_map) for cable in topology.cables}
    return 24 + TABLE_ROW_HEIGHT + max(1, len(owner_ids)) * TABLE_ROW_HEIGHT


def _source_color_table_y(topology: Topology) -> int:
    summary_height = _switch_port_summary_height(topology)
    y = _cable_reference_bottom(topology) + REFERENCE_GAP
    if summary_height:
        y += summary_height + REFERENCE_GAP
    return y


def _reference_bottom(topology: Topology) -> int:
    source_bottom = _source_color_table_y(topology) + _source_color_table_height(topology)
    return max(source_bottom, REFERENCE_START_Y + 178)


def _reference_x(topology: Topology) -> int:
    if not topology.devices:
        return REFERENCE_START_X
    max_device_x = max(device.x + device.width for device in topology.devices)
    return max(REFERENCE_START_X, max_device_x + 150)


def _endpoint_label(device: Device | None, port: str | None) -> str:
    device_name = device.name if device else "Unknown device"
    port_name = port or "?"
    return f"{device_name} {port_name}"


def _cable_vlan(cable: Cable, source: Device | None, target: Device | None) -> str:
    direct = _normalize_vlan_label(getattr(cable, "vlan", None))
    if direct:
        return direct
    source_vlan = _port_vlan(source, cable.sourcePort)
    if source_vlan:
        return source_vlan
    target_vlan = _port_vlan(target, cable.targetPort)
    if target_vlan:
        return target_vlan
    role_vlan = _normalize_vlan_label(cable.connectionRole)
    return role_vlan or "-"


def _port_vlan(device: Device | None, port_name: str | None) -> str | None:
    if not device or not port_name:
        return None
    for port in device.ports:
        if port.name == port_name:
            return _normalize_vlan_label(port.vlan)
    return None


def _normalize_vlan_label(value: str | None) -> str | None:
    text = str(value or "").strip()
    if not text:
        return None
    lower = text.lower()
    if lower in {"unknown", "none", "nan", "lan", "wan", "management", "power", "ha", "storage", "ethernet"}:
        return None
    if lower.isdigit() and len(lower) <= 4:
        return text
    if "vlan" in lower:
        return text
    return None


def _port_summary_rows(topology: Topology, devices: dict[str, Device], switches: list[Device]) -> list[list[str]]:
    switch_ids = {device.id for device in switches}
    rows: list[list[str]] = []
    for cable in topology.cables:
        source = devices.get(cable.sourceDeviceId)
        target = devices.get(cable.targetDeviceId)
        if source and source.id in switch_ids:
            rows.append(
                [
                    _clip(source.name, 18),
                    _clip(cable.sourcePort or "?", 10),
                    _clip(target.name if target else cable.targetDeviceId, 20),
                    _clip(cable.targetPort or "?", 10),
                    _clip(cable.connectionRole or cable.cableType, 12),
                    _clip(cable.id, 16),
                ]
            )
        if target and target.id in switch_ids:
            rows.append(
                [
                    _clip(target.name, 18),
                    _clip(cable.targetPort or "?", 10),
                    _clip(source.name if source else cable.sourceDeviceId, 20),
                    _clip(cable.sourcePort or "?", 10),
                    _clip(cable.connectionRole or cable.cableType, 12),
                    _clip(cable.id, 16),
                ]
            )
    return rows


def _source_color_rows(topology: Topology, devices: dict[str, Device]) -> list[tuple[Device, int]]:
    counts: dict[str, int] = {}
    for cable in topology.cables:
        owner_id = _cable_color_owner(cable, devices)
        counts[owner_id] = counts.get(owner_id, 0) + 1
    rows = [(devices[owner_id], count) for owner_id, count in counts.items() if owner_id in devices]
    rows.sort(key=lambda item: item[0].name.lower())
    return rows


def _add_notes(root: ET.Element, topology: Topology, y: int = 1040) -> None:
    warnings = [issue for issue in topology.issues if issue.severity == "warning"]
    errors = [issue for issue in topology.issues if issue.severity == "error"]
    lines = list(topology.notes)
    if errors:
        lines.append(f"Errors: {len(errors)}")
    if warnings:
        lines.append(f"Warnings: {len(warnings)}")
    if warnings[:5]:
        lines.extend(issue.message for issue in warnings[:5])
    text = "&#xa;".join(_safe(line) for line in lines)
    _add_text(root, "notes", text, 80, y, 900, 110, "rounded=1;whiteSpace=wrap;html=1;fillColor=#FFFDE7;strokeColor=#F9A825;align=left;verticalAlign=top;spacing=10;")


def _add_text(root: ET.Element, cell_id: str, value: str, x: int, y: int, width: int, height: int, style: str) -> None:
    cell = ET.SubElement(root, "mxCell", {"id": cell_id, "value": value, "style": style, "vertex": "1", "parent": "1"})
    ET.SubElement(cell, "mxGeometry", {"x": str(x), "y": str(y), "width": str(width), "height": str(height), "as": "geometry"})


def _add_box(root: ET.Element, cell_id: str, x: int, y: int, width: int, height: int) -> None:
    _add_text(root, cell_id, "", x, y, width, height, "rounded=0;whiteSpace=wrap;html=1;fillColor=#FFFFFF;strokeColor=#7895B2;")


def _add_line(root: ET.Element, cell_id: str, x1: int, y1: int, x2: int, y2: int, color: str, dashed: str) -> None:
    cell = ET.SubElement(
        root,
        "mxCell",
        {
            "id": cell_id,
            "value": "",
            "style": f"endArrow=none;html=1;rounded=1;strokeColor={color};dashed={dashed};strokeWidth=2;",
            "edge": "1",
            "parent": "1",
        },
    )
    geom = ET.SubElement(cell, "mxGeometry", {"relative": "1", "as": "geometry"})
    ET.SubElement(geom, "mxPoint", {"x": str(x1), "y": str(y1), "as": "sourcePoint"})
    ET.SubElement(geom, "mxPoint", {"x": str(x2), "y": str(y2), "as": "targetPoint"})


def _table_title_style(fill: str) -> str:
    return f"fontSize=10;fontStyle=1;html=1;fillColor={fill};fontColor=#FFFFFF;strokeColor={fill};align=left;verticalAlign=middle;spacingLeft=6;"


def _table_header_style() -> str:
    return "fontSize=8;fontStyle=1;html=1;fillColor=#EAF2F8;strokeColor=#B5C7D8;align=left;verticalAlign=middle;spacingLeft=4;"


def _table_cell_style(fill: str, font_size: int = 8) -> str:
    return f"fontSize={font_size};fontFamily=Courier New;html=1;whiteSpace=wrap;fillColor={fill};strokeColor=#D8E3EC;align=left;verticalAlign=middle;spacingLeft=4;"


def _legend_color_label(role: str) -> str:
    labels = {
        "wan": "GRAY",
        "lan": "BLUE",
        "ethernet": "BLUE",
        "management": "GREEN dashed",
        "ha": "PURPLE dashed",
        "storage": "ORANGE",
        "power": "RED dashed",
        "unknown": "BLACK",
    }
    return labels.get(role, labels.get(role.lower(), "BLACK"))


def _source_color_map(devices: list[Device]) -> dict[str, tuple[str, str]]:
    color_map: dict[str, tuple[str, str]] = {}
    for index, device in enumerate(sorted(devices, key=lambda item: item.name.lower())):
        color_map[device.id] = SOURCE_COLOR_PALETTE[index % len(SOURCE_COLOR_PALETTE)]
    return color_map


def _source_color(source_device_id: str, source_color_map: dict[str, tuple[str, str]]) -> tuple[str, str]:
    return source_color_map.get(source_device_id, ("BLACK", "#212121"))


def _source_color_label(source_device_id: str, source_color_map: dict[str, tuple[str, str]]) -> str:
    color_name, _ = _source_color(source_device_id, source_color_map)
    return color_name


def _cable_owner_color(cable: Cable, devices: dict[str, Device], source_color_map: dict[str, tuple[str, str]]) -> tuple[str, str]:
    return _source_color(_cable_color_owner(cable, devices), source_color_map)


def _cable_owner_color_label(cable: Cable, devices: dict[str, Device], source_color_map: dict[str, tuple[str, str]]) -> str:
    color_name, _ = _cable_owner_color(cable, devices, source_color_map)
    owner = devices.get(_cable_color_owner(cable, devices))
    return f"{color_name} {owner.name}" if owner else color_name


def _cable_color_owner(cable: Cable, devices: dict[str, Device]) -> str:
    source = devices.get(cable.sourceDeviceId)
    target = devices.get(cable.targetDeviceId)
    preferred_types = {"server", "storage", "pdu", "admin_endpoint", "vpn_gateway"}
    if source and source.type in preferred_types:
        return source.id
    if target and target.type in preferred_types:
        return target.id
    return cable.sourceDeviceId


def _clip(value: str | None, limit: int) -> str:
    text = str(value or "")
    return text if len(text) <= limit else f"{text[: max(0, limit - 1)]}..."


def _slug(value: str) -> str:
    return "".join(character.lower() if character.isalnum() else "-" for character in value).strip("-")


def _safe(value: str) -> str:
    return html.escape(str(value), quote=True)
