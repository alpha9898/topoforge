import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { TopologyTables } from "@/components/TopologyTables";
import type { TopologyResponse } from "@/lib/types";

const topology: TopologyResponse = {
  title: "Test",
  devices: [
    { id: "srv1", name: "Server-1", type: "server", x: 0, y: 0, width: 160, height: 80, ports: [{ id: "srv1-eth0", deviceId: "srv1", name: "eth0", side: "auto", order: 1 }], aliases: [] },
    { id: "sw1", name: "SW1", type: "switch", x: 0, y: 0, width: 160, height: 80, ports: [{ id: "sw1-gi1", deviceId: "sw1", name: "Gi1/0/1", side: "auto", order: 1 }], aliases: [] }
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
      exitY: 1,
      entryX: 0.5,
      entryY: 0
    }
  ],
  issues: [],
  zones: [],
  legend: [],
  notes: []
};

describe("TopologyTables", () => {
  it("renders devices and connections", () => {
    render(<TopologyTables topology={topology} />);

    expect(screen.getByText("Server-1")).toBeInTheDocument();
    expect(screen.getByText("SW1")).toBeInTheDocument();
    expect(screen.getByText("Server-1 eth0 -> SW1 Gi1/0/1")).toBeInTheDocument();
    expect(screen.getByText("lan")).toBeInTheDocument();
  });
});
