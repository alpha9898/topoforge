import type { TopologyResponse } from "@/lib/types";

export function TopologyTables({ topology }: { topology: TopologyResponse }) {
  const deviceName = new Map(topology.devices.map((device) => [device.id, device.name]));

  return (
    <div className="grid w-full gap-6 xl:grid-cols-2">
      <section>
        <h2 className="mb-3 text-base font-semibold text-ink">Devices</h2>
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
              {topology.devices.map((device) => (
                <tr key={device.id} className="row-hover">
                  <td className="px-3 py-2 font-medium text-ink">{device.name}</td>
                  <td className="px-3 py-2 text-muted">{device.type}</td>
                  <td className="px-3 py-2 text-muted">{device.mgmtIp ?? ""}</td>
                  <td className="px-3 py-2 text-muted">{device.ports.map((port) => port.name).join(", ")}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <section>
        <h2 className="mb-3 text-base font-semibold text-ink">Connections</h2>
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
              {topology.cables.map((cable) => (
                <tr key={cable.id} className="row-hover">
                  <td className="px-3 py-2 text-muted">
                    {deviceName.get(cable.sourceDeviceId)} {cable.sourcePort ?? "?"}
                  </td>
                  <td className="px-3 py-2 text-muted">
                    {deviceName.get(cable.targetDeviceId)} {cable.targetPort ?? "?"}
                  </td>
                  <td className="px-3 py-2 font-medium text-ink">{cable.label}</td>
                  <td className="px-3 py-2 text-muted">{cable.connectionRole}</td>
                  <td className="px-3 py-2 text-muted">{cable.description ?? ""}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
