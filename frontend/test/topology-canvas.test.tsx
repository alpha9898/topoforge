import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { TopologyCanvas } from "@/components/TopologyCanvas";
import { computeDiagramBounds } from "@/lib/diagram-geometry";
import type { TopologyResponse } from "@/lib/types";

const topology: TopologyResponse = {
  title: "Test",
  devices: [
    {
      id: "sw1",
      name: "SW1",
      type: "switch",
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
      mgmtIp: "10.0.0.5",
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
      connectionRole: "lan",
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

describe("TopologyCanvas", () => {
  it("renders one node per device and one path per cable", () => {
    render(<TopologyCanvas topology={topology} />);
    expect(screen.getAllByTestId("device")).toHaveLength(2);
    expect(screen.getAllByTestId("cable")).toHaveLength(1);
    expect(screen.getByText("SW1")).toBeInTheDocument();
    expect(screen.getByText("Server-1")).toBeInTheDocument();
  });

  it("exposes an accessible summary of the diagram", () => {
    render(<TopologyCanvas topology={topology} />);
    expect(screen.getByRole("img", { name: /2 devices, 1 links/i })).toBeInTheDocument();
  });

  it("computes finite diagram bounds from device positions", () => {
    const bounds = computeDiagramBounds(topology.devices);
    expect(Number.isFinite(bounds.x)).toBe(true);
    expect(Number.isFinite(bounds.y)).toBe(true);
    expect(bounds.w).toBeGreaterThan(0);
    expect(bounds.h).toBeGreaterThan(0);
  });

  it("shows an empty state when there are no devices", () => {
    render(<TopologyCanvas topology={{ ...topology, devices: [], cables: [] }} />);
    expect(screen.getByText(/no devices to preview/i)).toBeInTheDocument();
  });
});
