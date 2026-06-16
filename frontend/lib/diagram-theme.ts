// Render constants for the in-browser TopologyCanvas preview.
//
// These mirror the static maps used by the Python Draw.io generator so the
// SVG preview lines up with the exported .drawio file. Keep them in sync with:
//   - DEVICE_GEOMETRY  -> backend/services/drawio_generator.py (DEVICE_GEOMETRY)
//   - CABLE_ROLE_STYLE -> backend/services/drawio_generator.py (CABLE_STYLES)
//
// We intentionally render clean icon cards instead of the mxgraph stencils, and
// color cables by connection role (matching the on-screen legend) rather than by
// source device.

import {
  Box,
  Cable,
  Cloud,
  HardDrive,
  KeyRound,
  Laptop,
  Network,
  Router,
  Server,
  Shield,
  Zap,
  type LucideIcon,
} from "lucide-react";

// Device shape box size [width, height]. The Draw.io edges anchor to this
// centered shape box (NOT the larger layout box), so the canvas must use the
// same sizes to place cable endpoints correctly.
export const DEVICE_GEOMETRY: Record<string, [number, number]> = {
  cloud: [120, 80],
  isp_router: [90, 70],
  firewall: [190, 48],
  switch: [190, 46],
  server: [74, 92],
  storage: [80, 80],
  patch_panel: [190, 48],
  pdu: [180, 42],
  vpn_gateway: [76, 76],
  admin_endpoint: [86, 68],
  router: [90, 70],
  unknown: [150, 70],
};

export type DeviceVisual = {
  label: string;
  color: string;
  Icon: LucideIcon;
};

export const DEVICE_THEME: Record<string, DeviceVisual> = {
  cloud: { label: "Internet / Cloud", color: "#607D8B", Icon: Cloud },
  isp_router: { label: "ISP Router", color: "#0277BD", Icon: Router },
  router: { label: "Router", color: "#0277BD", Icon: Router },
  firewall: { label: "Firewall", color: "#C62828", Icon: Shield },
  switch: { label: "Switch", color: "#00897B", Icon: Network },
  server: { label: "Server", color: "#1E88E5", Icon: Server },
  storage: { label: "Storage", color: "#EF6C00", Icon: HardDrive },
  patch_panel: { label: "Patch Panel", color: "#666666", Icon: Cable },
  pdu: { label: "Power / PDU", color: "#F9A825", Icon: Zap },
  vpn_gateway: { label: "VPN Gateway", color: "#5E35B1", Icon: KeyRound },
  admin_endpoint: { label: "Admin Endpoint", color: "#3949AB", Icon: Laptop },
  unknown: { label: "Unknown", color: "#757575", Icon: Box },
};

export function deviceVisual(type: string): DeviceVisual {
  return DEVICE_THEME[type] ?? DEVICE_THEME.unknown;
}

export function deviceShapeSize(type: string): [number, number] {
  return DEVICE_GEOMETRY[type] ?? DEVICE_GEOMETRY.unknown;
}

export type CableVisual = {
  color: string;
  dashed: boolean;
  label: string;
};

// Connection role -> stroke. `unknown` uses a theme variable so it stays
// visible in both light and dark canvases.
export const CABLE_ROLE_STYLE: Record<string, CableVisual> = {
  wan: { color: "#757575", dashed: false, label: "WAN / Internet / ISP" },
  lan: { color: "#1976D2", dashed: false, label: "LAN / internal" },
  ethernet: { color: "#1976D2", dashed: false, label: "LAN / internal" },
  management: { color: "#2E7D32", dashed: true, label: "Management / OOB" },
  ha: { color: "#7B1FA2", dashed: true, label: "Firewall HA / sync" },
  storage: { color: "#EF6C00", dashed: false, label: "Storage" },
  power: { color: "#C62828", dashed: true, label: "Power / PDU" },
  unknown: { color: "var(--muted-strong)", dashed: false, label: "Unknown" },
};

export function cableVisual(role: string): CableVisual {
  return CABLE_ROLE_STYLE[role] ?? CABLE_ROLE_STYLE.unknown;
}
