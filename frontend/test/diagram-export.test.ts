import { describe, expect, it } from "vitest";
import { topologyToSvgString } from "@/lib/diagram-export";
import type { TopologyResponse } from "@/lib/types";

const topology: TopologyResponse = {
  title: "Test HLD",
  devices: [
    {
      id: "sw1",
      name: "SW1",
      type: "switch",
      mgmtIp: "10.0.0.2",
      x: 600,
      y: 110,
      width: 190,
      height: 96,
      ports: [{ id: "sw1-gi1", deviceId: "sw1", name: "Gi1/0/1", side: "auto", order: 1 }],
      aliases: [],
    },
    {
      id: "srv1",
      name: "Server-1",
      type: "server",
      x: 600,
      y: 420,
      width: 190,
      height: 96,
      ports: [{ id: "srv1-eth0", deviceId: "srv1", name: "eth0", side: "auto", order: 1 }],
      aliases: [],
    },
  ],
  cables: [
    {
      id: "cable-001",
      sourceDeviceId: "srv1",
      sourcePort: "eth0",
      targetDeviceId: "sw1",
      targetPort: "Gi1/0/1",
      cableType: "ethernet",
      // 'unknown' role uses a CSS var color on screen — the export must resolve it.
      connectionRole: "unknown",
      label: "Server-1 eth0 -> SW1 Gi1/0/1",
      exitX: 0.5,
      exitY: 0,
      entryX: 0.5,
      entryY: 1,
    },
  ],
  issues: [],
  zones: [],
  legend: [],
  notes: [],
};

describe("topologyToSvgString", () => {
  it("produces a self-contained SVG with fully resolved colors", () => {
    const { svg, width, height } = topologyToSvgString(topology, { background: "#ffffff" });

    expect(svg.startsWith("<svg")).toBe(true);
    expect(svg).toContain("viewBox=");
    expect(svg).toContain("Test HLD");
    expect(svg).toContain("SW1");
    expect(svg).toContain("Server-1");
    // No unresolved CSS variables may leak into a standalone file.
    expect(svg).not.toContain("var(");
    expect(Number.isFinite(width)).toBe(true);
    expect(Number.isFinite(height)).toBe(true);
    expect(width).toBeGreaterThan(0);
    expect(height).toBeGreaterThan(0);
  });

  it("draws a rect for each device (plus the background)", () => {
    const { svg } = topologyToSvgString(topology, { background: "#ffffff" });
    const rects = (svg.match(/<rect /g) ?? []).length;
    // background rect + one per device
    expect(rects).toBe(3);
  });

  it("omits the background rect when none is requested", () => {
    const { svg } = topologyToSvgString(topology);
    const rects = (svg.match(/<rect /g) ?? []).length;
    expect(rects).toBe(2);
  });
});
