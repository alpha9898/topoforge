"use client";

import { Save } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { PrimaryButton, SecondaryButton } from "@/components/PrimaryButton";
import type { Device, TopologyResponse } from "@/lib/types";

const STANDARD_DEVICES = [
  { id: "admin", label: "Admin" },
  { id: "vpn-gateway", label: "VPN" },
  { id: "internet", label: "Internet" },
  { id: "isp-1", label: "ISP-1" },
  { id: "isp-2", label: "ISP-2" },
  { id: "oob-mgmt", label: "OOB" }
];

type Draft = {
  id: string;
  label: string;
  name: string;
  type: string;
  remove: boolean;
  exists: boolean;
};

export function StandardPathPanel({
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
  const [drafts, setDrafts] = useState<Draft[]>(() => buildDrafts(topology));
  const key = useMemo(() => STANDARD_DEVICES.map((item) => topology.devices.find((device) => device.id === item.id)?.name ?? "").join("|"), [topology.devices]);

  useEffect(() => {
    setDrafts(buildDrafts(topology));
  }, [key, topology]);

  function updateDraft(id: string, patch: Partial<Draft>) {
    setDrafts((current) => current.map((draft) => (draft.id === id ? { ...draft, ...patch } : draft)));
  }

  async function apply() {
    const original = new Map(topology.devices.map((device) => [device.id, device]));
    const removed = drafts.filter((draft) => draft.remove && draft.exists).map((draft) => draft.id);
    const updates = drafts
      .filter((draft) => draft.exists && !draft.remove)
      .map((draft) => {
        const device = original.get(draft.id);
        return {
          id: draft.id,
          name: changed(device?.name, draft.name),
          type: changed(device?.type, draft.type)
        };
      })
      .filter((update) => update.name !== undefined || update.type !== undefined);

    const additions = drafts
      .filter((draft) => !draft.exists && !draft.remove && draft.name.trim())
      .map((draft) => ({ name: draft.name.trim(), type: draft.type }));

    await onApply({ device_updates: updates, removed_device_ids: removed, added_devices: additions });
  }

  return (
    <section className="mb-6 rounded-md border border-line bg-white p-4">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-base font-semibold text-ink">Standard path review</h2>
          <p className="text-sm text-slate-600">Review or rename Admin, VPN, Internet, ISP, and OOB before generating the diagram.</p>
        </div>
        <div className="flex gap-3">
          <SecondaryButton disabled={busy} onClick={() => setDrafts(buildDrafts(topology))}>
            Reset path
          </SecondaryButton>
          <PrimaryButton disabled={busy} onClick={apply}>
            <Save aria-hidden size={16} />
            Apply path edits
          </PrimaryButton>
        </div>
      </div>

      <div className="table-scroll rounded-md border border-line">
        <table className="min-w-full text-left text-sm">
          <thead className="bg-panel text-xs uppercase text-slate-500">
            <tr>
              <th className="px-3 py-2">Remove</th>
              <th className="px-3 py-2">Role</th>
              <th className="px-3 py-2">Diagram name</th>
              <th className="px-3 py-2">Type</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-line">
            {drafts.map((draft) => (
              <tr key={draft.id} className={draft.remove ? "bg-red-50" : ""}>
                <td className="px-3 py-2">
                  <input
                    aria-label={`Remove ${draft.label}`}
                    checked={draft.remove}
                    className="h-4 w-4"
                    disabled={!draft.exists}
                    type="checkbox"
                    onChange={(event) => updateDraft(draft.id, { remove: event.target.checked })}
                  />
                </td>
                <td className="px-3 py-2 font-medium text-ink">{draft.label}</td>
                <td className="px-3 py-2">
                  <input
                    className="focus-ring h-9 w-56 rounded-md border border-line px-2"
                    disabled={draft.remove}
                    value={draft.name}
                    onChange={(event) => updateDraft(draft.id, { name: event.target.value })}
                  />
                </td>
                <td className="px-3 py-2 text-slate-700">{draft.type}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}

function buildDrafts(topology: TopologyResponse): Draft[] {
  const devices = new Map(topology.devices.map((device) => [device.id, device]));
  return STANDARD_DEVICES.map((item) => {
    const device = devices.get(item.id);
    return {
      id: item.id,
      label: item.label,
      name: device?.name ?? item.label,
      type: device?.type ?? typeFor(item.id),
      remove: false,
      exists: Boolean(device)
    };
  });
}

function typeFor(id: string): string {
  if (id === "admin") return "admin_endpoint";
  if (id === "vpn-gateway") return "vpn_gateway";
  if (id === "internet") return "cloud";
  if (id.startsWith("isp")) return "isp_router";
  return "switch";
}

function changed(original: string | undefined, next: string): string | undefined {
  const cleaned = next.trim();
  return (original ?? "") === cleaned ? undefined : cleaned;
}
