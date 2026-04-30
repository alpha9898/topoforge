from __future__ import annotations

import re

from models import Cable, Device, Port, Topology

EXTERNAL_CHAIN = [
    ("admin", "Admin", "admin_endpoint"),
    ("vpn-gateway", "VPN Gateway", "vpn_gateway"),
    ("internet", "Internet", "cloud"),
    ("isp-1", "ISP-1", "isp_router"),
    ("isp-2", "ISP-2", "isp_router"),
]

OOB_ID = "oob-mgmt"


def complete_standard_topology(topology: Topology, disabled_device_ids: set[str] | None = None) -> Topology:
    disabled_device_ids = disabled_device_ids or set()
    devices = {device.id: device for device in topology.devices}
    cable_signatures = _existing_cable_signatures(topology)
    for device_id, name, device_type in EXTERNAL_CHAIN:
        if device_id in disabled_device_ids:
            continue
        _ensure_device(topology, devices, device_id, name, device_type)

    _ensure_external_chain(topology, devices, cable_signatures)
    _ensure_isp_to_firewall(topology, devices, cable_signatures)
    if OOB_ID not in disabled_device_ids:
        _ensure_oob(topology, devices, cable_signatures)
    topology.notes.append("Standard path added where missing: Admin -> VPN Gateway -> Internet -> ISP pair -> firewall layer.")
    topology.notes.append("OOB-MGMT switch added with management links to infrastructure devices.")
    return topology


def _ensure_device(topology: Topology, devices: dict[str, Device], device_id: str, name: str, device_type: str) -> Device:
    existing = devices.get(device_id)
    if existing:
        return existing
    device = Device(id=device_id, name=name, hostname=name, type=device_type)
    topology.devices.append(device)
    devices[device_id] = device
    return device


def _ensure_external_chain(topology: Topology, devices: dict[str, Device], cable_signatures: set[tuple]) -> None:
    required = {"admin", "vpn-gateway", "internet", "isp-1", "isp-2"}
    if not required.issubset(devices):
        return
    _ensure_cable(topology, cable_signatures, devices["admin"], "VPN", devices["vpn-gateway"], "Admin", "management", "management", "Admin VPN access")
    _ensure_cable(topology, cable_signatures, devices["vpn-gateway"], "Internet", devices["internet"], "VPN", "wan", "wan", "VPN to Internet")
    _ensure_cable(topology, cable_signatures, devices["internet"], "ISP-1", devices["isp-1"], "WAN", "wan", "wan", "Internet to ISP-1")
    _ensure_cable(topology, cable_signatures, devices["internet"], "ISP-2", devices["isp-2"], "WAN", "wan", "wan", "Internet to ISP-2")


def _ensure_isp_to_firewall(topology: Topology, devices: dict[str, Device], cable_signatures: set[tuple]) -> None:
    if "isp-1" not in devices or "isp-2" not in devices:
        return
    firewalls = sorted([device for device in topology.devices if device.type == "firewall"], key=lambda item: item.name.lower())
    if not firewalls:
        return
    isp_1 = devices["isp-1"]
    isp_2 = devices["isp-2"]
    _ensure_cable(topology, cable_signatures, isp_1, "LAN", firewalls[0], "WAN1", "wan", "wan", f"ISP-1 handoff to {firewalls[0].name}")
    target_fw = firewalls[1] if len(firewalls) > 1 else firewalls[0]
    _ensure_cable(topology, cable_signatures, isp_2, "LAN", target_fw, "WAN2", "wan", "wan", f"ISP-2 handoff to {target_fw.name}")


def _ensure_oob(topology: Topology, devices: dict[str, Device], cable_signatures: set[tuple]) -> None:
    oob = _ensure_device(topology, devices, OOB_ID, "OOB-MGMT", "switch")
    managed_devices = [
        device
        for device in topology.devices
        if device.id != OOB_ID and device.type in {"firewall", "switch", "server", "storage", "pdu", "vpn_gateway"}
    ]
    for index, device in enumerate(sorted(managed_devices, key=lambda item: item.name.lower()), start=1):
        target_port = _management_port_for(device)
        _ensure_cable(
            topology,
            cable_signatures,
            oob,
            f"mgmt-{index}",
            device,
            target_port,
            "management",
            "management",
            f"OOB management to {device.name}",
        )


def _management_port_for(device: Device) -> str:
    preferred = ["iDRAC", "IPMI", "Mgmt", "mgmt", "Management"]
    existing = {port.name.lower(): port.name for port in device.ports}
    for port in preferred:
        if port.lower() in existing:
            return existing[port.lower()]
    if device.type == "server":
        return "iDRAC"
    return "Mgmt"


def _ensure_cable(
    topology: Topology,
    cable_signatures: set[tuple],
    source: Device,
    source_port: str,
    target: Device,
    target_port: str,
    cable_type: str,
    role: str,
    description: str,
) -> None:
    signatures = _signatures_for(source.id, target.id, source_port, target_port, role)
    if cable_signatures.intersection(signatures):
        return
    _add_port(source, source_port, role)
    _add_port(target, target_port, role)
    cable_id = f"cable-{len(topology.cables) + 1:03d}"
    topology.cables.append(
        Cable(
            id=cable_id,
            sourceDeviceId=source.id,
            sourcePort=source_port,
            targetDeviceId=target.id,
            targetPort=target_port,
            cableType=cable_type,
            connectionRole=role,
            label=f"{source.name} {source_port} -> {target.name} {target_port}",
            description=description,
            confidence=0.98,
        )
    )
    cable_signatures.update(signatures)


def _has_cable(topology: Topology, source_id: str, target_id: str, source_port: str, target_port: str, role: str) -> bool:
    signatures = _existing_cable_signatures(topology)
    return bool(signatures.intersection(_signatures_for(source_id, target_id, source_port, target_port, role)))


def _existing_cable_signatures(topology: Topology) -> set[tuple]:
    signatures: set[tuple] = set()
    for cable in topology.cables:
        signatures.update(_signatures_for(cable.sourceDeviceId, cable.targetDeviceId, cable.sourcePort or "", cable.targetPort or "", cable.connectionRole))
    return signatures


def _signatures_for(source_id: str, target_id: str, source_port: str, target_port: str, role: str) -> set[tuple]:
    pair = tuple(sorted((source_id, target_id)))
    ports = tuple(sorted((source_port or "", target_port or "")))
    signatures = {("role-port", pair, ports, role)}
    if role == "management" and OOB_ID in pair:
        signatures.add(("oob-management", pair))
    return signatures


def _add_port(device: Device, port_name: str, role: str) -> None:
    if any(port.name == port_name for port in device.ports):
        return
    device.ports.append(
        Port(
            id=f"{device.id}-{_slug(port_name)}",
            deviceId=device.id,
            name=port_name,
            side="auto",
            order=len(device.ports) + 1,
            vlan=role,
        )
    )


def _slug(value: str) -> str:
    return re.sub(r"[^a-z0-9]+", "-", value.lower()).strip("-") or "port"
