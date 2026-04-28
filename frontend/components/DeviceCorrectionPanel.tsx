"use client";

import { Plus, Save } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { PrimaryButton, SecondaryButton } from "@/components/PrimaryButton";
import type { Device, TopologyResponse } from "@/lib/types";

const DEVICE_TYPES = ["server", "firewall", "switch", "isp_router", "cloud", "vpn_gateway", "admin_endpoint", "storage", "pdu", "unknown", "other"];

type DeviceDraft = {
  id: string;
  name: string;
  type: string;
  mgmtIp: string;
  zone: string;
  remove: boolean;
};

type AddedDeviceDraft = {
  name: string;
  type: string;
  mgmtIp: string;
  zone: string;
};

export function DeviceCorrectionPanel({
  topology,
  busy,
  onApply
}: {
  topology: TopologyResponse;
  busy: boolean;
  onApply: (payload: {
    device_updates: { id: string; name?: string; type?: string; mgmtIp?: string; zone?: string }[];
    removed_device_ids: string[];
    added_devices: { name: string; type: string; mgmtIp?: string; zone?: string }[];
  }) => Promise<void>;
}) {
  const [drafts, setDrafts] = useState<DeviceDraft[]>(() => topology.devices.map(toDraft));
  const [addedDevices, setAddedDevices] = useState<AddedDeviceDraft[]>([]);

  const topologyKey = useMemo(() => topology.devices.map((device) => `${device.id}:${device.name}:${device.type}`).join("|"), [topology.devices]);

  useEffect(() => {
    resetFromTopology();
  }, [topologyKey]);

  function resetFromTopology() {
    setDrafts(topology.devices.map(toDraft));
    setAddedDevices([]);
  }

  function updateDraft(id: string, patch: Partial<DeviceDraft>) {
    setDrafts((current) => current.map((draft) => (draft.id === id ? { ...draft, ...patch } : draft)));
  }

  function updateAdded(index: number, patch: Partial<AddedDeviceDraft>) {
    setAddedDevices((current) => current.map((draft, draftIndex) => (draftIndex === index ? { ...draft, ...patch } : draft)));
  }

  async function apply() {
    const original = new Map(topology.devices.map((device) => [device.id, device]));
    const removed = drafts.filter((draft) => draft.remove).map((draft) => draft.id);
    const updates = drafts
      .filter((draft) => !draft.remove)
      .map((draft) => {
        const device = original.get(draft.id);
        return {
          id: draft.id,
          name: changed(device?.name, draft.name),
          type: changed(device?.type, draft.type),
          mgmtIp: changed(device?.mgmtIp ?? "", draft.mgmtIp),
          zone: changed(device?.zone ?? "", draft.zone)
        };
      })
      .filter((update) => update.name !== undefined || update.type !== undefined || update.mgmtIp !== undefined || update.zone !== undefined);

    const additions = addedDevices
      .filter((device) => device.name.trim())
      .map((device) => ({
        name: device.name.trim(),
        type: device.type,
        mgmtIp: device.mgmtIp.trim() || undefined,
        zone: device.zone.trim() || undefined
      }));

    await onApply({ device_updates: updates, removed_device_ids: removed, added_devices: additions });
  }

  return (
    <section className="mb-6 rounded-md border border-line bg-white p-4" data-topology-key={topologyKey}>
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-base font-semibold text-ink">Parsing corrections</h2>
          <p className="text-sm text-slate-600">Change device type, remove extra devices, or add missing devices, then rebuild the topology.</p>
        </div>
        <div className="flex gap-3">
          <SecondaryButton disabled={busy} onClick={resetFromTopology}>
            Reset edits
          </SecondaryButton>
          <PrimaryButton disabled={busy} onClick={apply}>
            <Save aria-hidden size={16} />
            Apply corrections
          </PrimaryButton>
        </div>
      </div>

      <div className="table-scroll rounded-md border border-line">
        <table className="min-w-full text-left text-sm">
          <thead className="bg-panel text-xs uppercase text-slate-500">
            <tr>
              <th className="px-3 py-2">Remove</th>
              <th className="px-3 py-2">Device</th>
              <th className="px-3 py-2">Type</th>
              <th className="px-3 py-2">Mgmt IP</th>
              <th className="px-3 py-2">Zone</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-line">
            {drafts.map((draft) => (
              <tr key={draft.id} className={draft.remove ? "bg-red-50" : ""}>
                <td className="px-3 py-2">
                  <input
                    aria-label={`Remove ${draft.name}`}
                    checked={draft.remove}
                    className="h-4 w-4"
                    type="checkbox"
                    onChange={(event) => updateDraft(draft.id, { remove: event.target.checked })}
                  />
                </td>
                <td className="px-3 py-2">
                  <input
                    className="focus-ring h-9 w-44 rounded-md border border-line px-2"
                    disabled={draft.remove}
                    value={draft.name}
                    onChange={(event) => updateDraft(draft.id, { name: event.target.value })}
                  />
                </td>
                <td className="px-3 py-2">
                  <select
                    className="focus-ring h-9 w-40 rounded-md border border-line bg-white px-2"
                    disabled={draft.remove}
                    value={draft.type}
                    onChange={(event) => updateDraft(draft.id, { type: event.target.value })}
                  >
                    {DEVICE_TYPES.map((type) => (
                      <option key={type} value={type}>
                        {type}
                      </option>
                    ))}
                  </select>
                </td>
                <td className="px-3 py-2">
                  <input
                    className="focus-ring h-9 w-36 rounded-md border border-line px-2"
                    disabled={draft.remove}
                    value={draft.mgmtIp}
                    onChange={(event) => updateDraft(draft.id, { mgmtIp: event.target.value })}
                  />
                </td>
                <td className="px-3 py-2">
                  <input
                    className="focus-ring h-9 w-32 rounded-md border border-line px-2"
                    disabled={draft.remove}
                    value={draft.zone}
                    onChange={(event) => updateDraft(draft.id, { zone: event.target.value })}
                  />
                </td>
              </tr>
            ))}
            {addedDevices.map((device, index) => (
              <tr key={`added-${index}`} className="bg-teal-50">
                <td className="px-3 py-2 text-xs uppercase text-teal-700">Add</td>
                <td className="px-3 py-2">
                  <input
                    className="focus-ring h-9 w-44 rounded-md border border-line px-2"
                    placeholder="Device name"
                    value={device.name}
                    onChange={(event) => updateAdded(index, { name: event.target.value })}
                  />
                </td>
                <td className="px-3 py-2">
                  <select
                    className="focus-ring h-9 w-40 rounded-md border border-line bg-white px-2"
                    value={device.type}
                    onChange={(event) => updateAdded(index, { type: event.target.value })}
                  >
                    {DEVICE_TYPES.map((type) => (
                      <option key={type} value={type}>
                        {type}
                      </option>
                    ))}
                  </select>
                </td>
                <td className="px-3 py-2">
                  <input
                    className="focus-ring h-9 w-36 rounded-md border border-line px-2"
                    placeholder="Optional"
                    value={device.mgmtIp}
                    onChange={(event) => updateAdded(index, { mgmtIp: event.target.value })}
                  />
                </td>
                <td className="px-3 py-2">
                  <input
                    className="focus-ring h-9 w-32 rounded-md border border-line px-2"
                    placeholder="Optional"
                    value={device.zone}
                    onChange={(event) => updateAdded(index, { zone: event.target.value })}
                  />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <SecondaryButton className="mt-4" disabled={busy} onClick={() => setAddedDevices((current) => [...current, { name: "", type: "server", mgmtIp: "", zone: "" }])}>
        <Plus aria-hidden size={16} />
        Add missing device
      </SecondaryButton>
    </section>
  );
}

function toDraft(device: Device): DeviceDraft {
  return {
    id: device.id,
    name: device.name,
    type: device.type,
    mgmtIp: device.mgmtIp ?? "",
    zone: device.zone ?? "",
    remove: false
  };
}

function changed(original: string | undefined, next: string): string | undefined {
  const cleaned = next.trim();
  return (original ?? "") === cleaned ? undefined : cleaned;
}
