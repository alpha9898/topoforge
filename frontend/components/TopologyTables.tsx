"use client";

import { useState } from "react";
import { Search } from "lucide-react";
import type { TopologyResponse } from "@/lib/types";

export function TopologyTables({ topology }: { topology: TopologyResponse }) {
  const [deviceFilter, setDeviceFilter] = useState("");
  const [cableFilter, setCableFilter] = useState("");
  const deviceName = new Map(topology.devices.map((device) => [device.id, device.name]));

  const lowerDevice = deviceFilter.toLowerCase();
  const filteredDevices = lowerDevice
    ? topology.devices.filter(
        (device) =>
          device.name.toLowerCase().includes(lowerDevice) ||
          device.type.toLowerCase().includes(lowerDevice) ||
          (device.mgmtIp ?? "").toLowerCase().includes(lowerDevice)
      )
    : topology.devices;

  const lowerCable = cableFilter.toLowerCase();
  const filteredCables = lowerCable
    ? topology.cables.filter((cable) => {
        const src = (deviceName.get(cable.sourceDeviceId) ?? "").toLowerCase();
        const tgt = (deviceName.get(cable.targetDeviceId) ?? "").toLowerCase();
        return (
          src.includes(lowerCable) ||
          tgt.includes(lowerCable) ||
          (cable.label ?? "").toLowerCase().includes(lowerCable) ||
          cable.connectionRole.toLowerCase().includes(lowerCable)
        );
      })
    : topology.cables;

  return (
    <div className="grid w-full gap-6 xl:grid-cols-2">
      <section>
        <div className="mb-3 flex items-center justify-between gap-3">
          <h2 className="text-base font-semibold text-ink">Devices</h2>
          <div className="relative">
            <Search aria-hidden size={13} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-[var(--muted)]" />
            <input
              aria-label="Filter devices"
              className="field-control h-7 w-44 pl-7 pr-2 text-xs"
              placeholder="Filter devices…"
              value={deviceFilter}
              onChange={(e) => setDeviceFilter(e.target.value)}
            />
          </div>
        </div>
        <div className="table-shell">
          <table className="min-w-full text-left text-sm">
            <thead className="table-head text-xs uppercase">
              <tr>
                <th className="px-3 py-2">Name</th>
                <th className="px-3 py-2">Type</th>
                <th className="px-3 py-2">Mgmt IP</th>
                <th className="px-3 py-2">Ports</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-line">
              {filteredDevices.length === 0 ? (
                <tr>
                  <td colSpan={4} className="px-3 py-4 text-center text-xs text-muted">No devices match filter</td>
                </tr>
              ) : (
                filteredDevices.map((device) => (
                  <tr key={device.id} className="row-hover">
                    <td className="px-3 py-2 font-medium text-ink">{device.name}</td>
                    <td className="px-3 py-2 text-muted">{device.type}</td>
                    <td className="px-3 py-2 text-muted">{device.mgmtIp ?? ""}</td>
                    <td className="max-w-[200px] truncate px-3 py-2 text-muted" title={device.ports.map((port) => port.name).join(", ")}>
                      {device.ports.map((port) => port.name).join(", ")}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </section>

      <section>
        <div className="mb-3 flex items-center justify-between gap-3">
          <h2 className="text-base font-semibold text-ink">Connections</h2>
          <div className="relative">
            <Search aria-hidden size={13} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-[var(--muted)]" />
            <input
              aria-label="Filter connections"
              className="field-control h-7 w-44 pl-7 pr-2 text-xs"
              placeholder="Filter connections…"
              value={cableFilter}
              onChange={(e) => setCableFilter(e.target.value)}
            />
          </div>
        </div>
        <div className="table-shell">
          <table className="min-w-full text-left text-sm">
            <thead className="table-head text-xs uppercase">
              <tr>
                <th className="px-3 py-2">Source</th>
                <th className="px-3 py-2">Target</th>
                <th className="px-3 py-2">Label</th>
                <th className="px-3 py-2">Role</th>
                <th className="px-3 py-2">AI note</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-line">
              {filteredCables.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-3 py-4 text-center text-xs text-muted">No connections match filter</td>
                </tr>
              ) : (
                filteredCables.map((cable) => (
                  <tr key={cable.id} className="row-hover">
                    <td className="px-3 py-2 text-muted">
                      {deviceName.get(cable.sourceDeviceId)} {cable.sourcePort ?? "?"}
                    </td>
                    <td className="px-3 py-2 text-muted">
                      {deviceName.get(cable.targetDeviceId)} {cable.targetPort ?? "?"}
                    </td>
                    <td className="max-w-[180px] truncate px-3 py-2 font-medium text-ink" title={cable.label ?? ""}>
                      {cable.label}
                    </td>
                    <td className="px-3 py-2 text-muted">{cable.connectionRole}</td>
                    <td className="max-w-[160px] truncate px-3 py-2 text-muted" title={cable.description ?? ""}>
                      {cable.description ?? ""}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
