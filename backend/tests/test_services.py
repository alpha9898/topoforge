from pathlib import Path
import xml.etree.ElementTree as ET

from openpyxl import Workbook

from services.drawio_generator import generate_drawio_xml
from services.ai_parser import apply_ai_suggestions_to_parsed, build_ai_suggestions, enrich_topology_connections
from services.excel_parser import normalize_header, parse_file
from services.layout_engine import layout_topology
from services.topology_builder import build_topology, infer_device_type, normalize_port
from services.topology_completion import complete_standard_topology
from services.topology_corrections import DeviceAdd, DeviceUpdate, TopologyCorrections, apply_topology_corrections
from services.validator import validate_topology


def test_header_detection_and_excel_flow():
    workbook = Workbook()
    sheet = workbook.active
    sheet.title = "Connections"
    sheet.append(["Device", "Port", "Connected To", "Peer Port", "Management IP", "Cable Type"])
    sheet.append(["Firewall-1", "eth1", "SW1", "G1/0/1", "10.0.0.1", "ethernet"])
    sheet.append(["SW1", "G1/0/1", "Firewall-1", "eth1", "", "ethernet"])
    path = Path(__file__).with_name("_tmp_lld.xlsx")
    try:
        workbook.save(path)
        parsed = parse_file(path)
    finally:
        import os

        if os.path.exists(path):
            os.remove(path)
    topology = validate_topology(build_topology(parsed))

    assert normalize_header("Hostname / Label") == "hostname label"
    assert len(topology.devices) == 2
    assert len(topology.cables) == 2
    assert topology.cables[0].label == "Firewall-1 eth1 -> SW1 Gi1/0/1"


def test_normalizers_and_inference():
    assert normalize_port("Ethernet 1") == "eth1"
    assert normalize_port("G1/0/1") == "Gi1/0/1"
    assert normalize_port("mgmt") == "Mgmt"
    assert infer_device_type("gui1fwall01") == "firewall"
    assert infer_device_type("PDU-1") == "pdu"


def test_missing_port_warning_and_drawio_xml():
    parsed = {
        "raw_devices": [{"name": "Firewall-1"}, {"name": "SW1"}],
        "raw_connections": [
            {"sourceDevice": "Firewall-1", "sourcePort": "", "targetDevice": "SW1", "targetPort": "Gi1/0/1", "cableType": "ethernet"}
        ],
        "issues": [],
    }
    topology = layout_topology(validate_topology(build_topology(parsed)))
    xml = generate_drawio_xml(topology)

    assert any(issue.code == "missing_source_port" for issue in topology.issues)
    assert "<mxfile" in xml
    assert "device-firewall-1" in xml
    assert "shape=mxgraph.cisco.security.firewall" in xml
    assert "shape=mxgraph.rack.hpe_aruba.switches" in xml
    assert "Firewall-1 ? -&gt; SW1 Gi1/0/1" in xml
    assert "Gi1/0/1" in xml
    assert "TABLE 1: CABLE REFERENCE" in xml
    assert "TABLE 2: SWITCH / OOB PORT SUMMARY" in xml
    assert "LEGEND" in xml
    assert "A1" in xml
    assert "Firewall-1" in xml
    assert "Gi1/0/1" in xml


def test_device_corrections_change_remove_and_add_devices():
    parsed = {
        "raw_devices": [{"name": "BadDevice"}, {"name": "SW1"}],
        "raw_connections": [
            {"sourceDevice": "BadDevice", "sourcePort": "eth1", "targetDevice": "SW1", "targetPort": "Gi1/0/1", "cableType": "ethernet"}
        ],
        "issues": [],
    }
    topology = validate_topology(build_topology(parsed))
    corrected = apply_topology_corrections(
        topology,
        TopologyCorrections(
            device_updates=[DeviceUpdate(id="baddevice", type="firewall", name="Firewall-1")],
            removed_device_ids=["sw1"],
            added_devices=[DeviceAdd(name="SW2", type="switch")],
        ),
    )

    assert [device.name for device in corrected.devices] == ["Firewall-1", "SW2"]
    assert corrected.devices[0].type == "firewall"
    assert corrected.cables == []


def test_drawio_source_device_cable_colors_are_deterministic():
    parsed = {
        "raw_devices": [{"name": "Server-1"}, {"name": "Server-2"}, {"name": "SW1"}],
        "raw_connections": [
            {"sourceDevice": "Server-1", "sourcePort": "eth0", "targetDevice": "SW1", "targetPort": "Gi1/0/1", "cableType": "ethernet"},
            {"sourceDevice": "Server-1", "sourcePort": "eth1", "targetDevice": "SW1", "targetPort": "Gi1/0/2", "cableType": "ethernet"},
            {"sourceDevice": "SW1", "sourcePort": "Gi1/0/3", "targetDevice": "Server-2", "targetPort": "eth0", "cableType": "ethernet"},
        ],
        "issues": [],
    }
    topology = layout_topology(validate_topology(build_topology(parsed)))
    xml = generate_drawio_xml(topology)
    root = ET.fromstring(xml)
    cells = {cell.attrib["id"]: cell for cell in root.iter("mxCell") if "id" in cell.attrib}

    assert "TABLE 3: SOURCE CABLE COLORS" in xml
    assert "Server-1" in xml
    assert "Server-2" in xml
    assert "YELLOW" in xml
    assert "RED" in xml
    assert "strokeColor=#FDD835" in cells["cable-001"].attrib["style"]
    assert "strokeColor=#FDD835" in cells["cable-002"].attrib["style"]
    assert "strokeColor=#E53935" in cells["cable-003"].attrib["style"]
    assert "RED Server-2" in xml


def test_ai_helper_maps_sample_aliases_and_ignores_false_connections(monkeypatch):
    monkeypatch.delenv("GEMINI_API_KEY", raising=False)
    workbook = Workbook()
    devices = workbook.active
    devices.title = "Devices"
    devices.append(["Device", "Device Type", "Management IP", "Zone"])
    devices.append(["gui1swtch01", "switch", "10.123.11.11", "Site-1-links"])
    devices.append(["gui1swtch02", "switch", "10.123.11.12", "Site-1-links"])
    devices.append(["gui1fwall01", "firewall", "10.123.11.7", "Site-1-links"])
    devices.append(["gui1fwall02", "firewall", "10.123.11.8", "Site-1-links"])

    connections = workbook.create_sheet("Connections")
    connections.append(["Device", "Port", "Connected To", "Peer Port", "Cable Type"])
    connections.append(["SW1", "49:1", "Firewall-1", "port9", "ethernet"])
    connections.append(["SW2", "49:2", "Firewall-2", "port10", "ethernet"])
    connections.append(["gui1vpsie01", "switch1", "firewall", "to-fw2-port12", "ethernet"])

    path = Path(__file__).with_name("_tmp_ai_aliases.xlsx")
    try:
        workbook.save(path)
        parsed = parse_file(path)
    finally:
        import os

        if os.path.exists(path):
            os.remove(path)
    suggestions = build_ai_suggestions(parsed)
    ai_parsed = apply_ai_suggestions_to_parsed(parsed, suggestions)
    topology = build_topology(ai_parsed)
    device_names = {device.name for device in topology.devices}

    assert suggestions["status"] == "gemini_api_key_missing"
    assert any(item["alias"] == "SW1" and item["canonical"] == "gui1swtch01" for item in suggestions["alias_suggestions"])
    assert any(item["alias"] == "Firewall-1" and item["canonical"] == "gui1fwall01" for item in suggestions["alias_suggestions"])
    assert "SW1" not in device_names
    assert "Firewall-1" not in device_names
    assert not any(cable.sourcePort == "switch1" and cable.targetDeviceId == "firewall" for cable in topology.cables)


def test_connection_enrichment_updates_roles_labels_and_descriptions(monkeypatch):
    monkeypatch.delenv("GEMINI_API_KEY", raising=False)
    parsed = {
        "raw_devices": [{"name": "gui1vpsie01"}, {"name": "gui1swtch01"}],
        "raw_connections": [
            {"sourceDevice": "gui1vpsie01", "sourcePort": "iDRAC", "targetDevice": "gui1swtch01", "targetPort": "41", "cableType": "ethernet"}
        ],
        "issues": [],
    }
    topology = build_topology(parsed)
    enriched = enrich_topology_connections(topology, {"source": "local_rules"})

    assert enriched.cables[0].connectionRole == "management"
    assert enriched.cables[0].cableType == "management"
    assert enriched.cables[0].description
    assert enriched.aiSuggestions
    assert enriched.aiSuggestions["connection_enrichment"][0]["cable_id"] == "cable-001"


def test_standard_topology_completion_adds_external_chain_and_oob():
    parsed = {
        "raw_devices": [{"name": "gui1fwall01"}, {"name": "gui1swtch01"}, {"name": "gui1vpsie01"}],
        "raw_connections": [
            {"sourceDevice": "gui1fwall01", "sourcePort": "eth1", "targetDevice": "gui1swtch01", "targetPort": "49", "cableType": "ethernet"}
        ],
        "issues": [],
    }
    topology = complete_standard_topology(build_topology(parsed))
    device_ids = {device.id for device in topology.devices}
    labels = {cable.label for cable in topology.cables}

    assert {"admin", "vpn-gateway", "internet", "isp-1", "isp-2", "oob-mgmt"}.issubset(device_ids)
    assert "Admin VPN -> VPN Gateway Admin" in labels
    assert "VPN Gateway Internet -> Internet VPN" in labels
    assert "Internet ISP-1 -> ISP-1 WAN" in labels
    assert any(cable.sourceDeviceId == "oob-mgmt" and cable.targetDeviceId == "gui1vpsie01" for cable in topology.cables)
    assert any(cable.sourceDeviceId == "isp-1" and cable.targetDeviceId == "gui1fwall01" for cable in topology.cables)


def test_standard_topology_completion_does_not_duplicate_on_second_pass():
    parsed = {
        "raw_devices": [{"name": "gui1fwall01"}, {"name": "gui1vpsie01"}],
        "raw_connections": [],
        "issues": [],
    }
    topology = complete_standard_topology(build_topology(parsed))
    first_count = len(topology.cables)
    topology = complete_standard_topology(topology)

    assert len(topology.cables) == first_count
