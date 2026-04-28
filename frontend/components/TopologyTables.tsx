import type { TopologyResponse } from "@/lib/types";

export function TopologyTables({ topology }: { topology: TopologyResponse }) {
  const deviceName = new Map(topology.devices.map((device) => [device.id, device.name]));

  return (
    <div className="grid gap-6 xl:grid-cols-2">
      <section>
        <h2 className="mb-3 text-base font-semibold text-ink">Devices</h2>
        <div className="table-scroll rounded-md border border-line bg-white">
          <table className="min-w-full text-left text-sm">
            <thead className="bg-panel text-xs uppercase text-slate-500">
              <tr>
                <th className="px-3 py-2">Name</th>
                <th className="px-3 py-2">Type</th>
                <th className="px-3 py-2">Mgmt IP</th>
                <th className="px-3 py-2">Ports</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-line">
              {topology.devices.map((device) => (
                <tr key={device.id}>
                  <td className="px-3 py-2 font-medium text-ink">{device.name}</td>
                  <td className="px-3 py-2 text-slate-700">{device.type}</td>
                  <td className="px-3 py-2 text-slate-700">{device.mgmtIp ?? ""}</td>
                  <td className="px-3 py-2 text-slate-700">{device.ports.map((port) => port.name).join(", ")}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <section>
        <h2 className="mb-3 text-base font-semibold text-ink">Connections</h2>
        <div className="table-scroll rounded-md border border-line bg-white">
          <table className="min-w-full text-left text-sm">
            <thead className="bg-panel text-xs uppercase text-slate-500">
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
                <tr key={cable.id}>
                  <td className="px-3 py-2 text-slate-700">
                    {deviceName.get(cable.sourceDeviceId)} {cable.sourcePort ?? "?"}
                  </td>
                  <td className="px-3 py-2 text-slate-700">
                    {deviceName.get(cable.targetDeviceId)} {cable.targetPort ?? "?"}
                  </td>
                  <td className="px-3 py-2 font-medium text-ink">{cable.label}</td>
                  <td className="px-3 py-2 text-slate-700">{cable.connectionRole}</td>
                  <td className="px-3 py-2 text-slate-600">{cable.description ?? ""}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
