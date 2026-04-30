"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { HelpCircle, RefreshCw } from "lucide-react";
import { AiSuggestionsPanel } from "@/components/AiSuggestionsPanel";
import { AppShell } from "@/components/AppShell";
import { DeviceCorrectionPanel } from "@/components/DeviceCorrectionPanel";
import { IssueList } from "@/components/IssueList";
import { LoadingPanel } from "@/components/LoadingPanel";
import { PageHero } from "@/components/PageHero";
import { PrimaryButton, SecondaryButton } from "@/components/PrimaryButton";
import { StandardPathPanel } from "@/components/StandardPathPanel";
import { TopologyTables } from "@/components/TopologyTables";
import { applyTopologyCorrections, parseProject } from "@/lib/api";
import { loadAiPreferences, loadProjectId, loadTopology, saveAiPreferences, saveTopology } from "@/lib/project-state";
import type { TopologyResponse } from "@/lib/types";

export default function ReviewPage() {
  const [topology, setTopology] = useState<TopologyResponse | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [includeIpsInAi, setIncludeIpsInAi] = useState(false);
  const router = useRouter();

  useEffect(() => {
    const saved = loadTopology();
    if (saved) setTopology(saved);
    setIncludeIpsInAi(loadAiPreferences().includeIpsInAi);
  }, []);

  async function refresh() {
    const projectId = loadProjectId();
    if (!projectId) return router.push("/upload");
    setBusy(true);
    setError("");
    try {
      const next = await parseProject(projectId);
      setTopology(next);
      saveTopology(next);
    } catch (exc) {
      setError(exc instanceof Error ? exc.message : "Could not reparse topology");
    } finally {
      setBusy(false);
    }
  }

  async function runAiHelper() {
    const projectId = loadProjectId();
    if (!projectId) return router.push("/upload");
    setBusy(true);
    setError("");
    try {
      saveAiPreferences(true, includeIpsInAi);
      const next = await parseProject(projectId, { use_ai_helper: true, include_ips_in_ai: includeIpsInAi });
      setTopology(next);
      saveTopology(next);
    } catch (exc) {
      setError(exc instanceof Error ? exc.message : "Could not run AI helper");
    } finally {
      setBusy(false);
    }
  }

  async function applyCorrections(payload: {
    device_updates: { id: string; name?: string; type?: string; mgmtIp?: string; zone?: string }[];
    removed_device_ids: string[];
    added_devices: { name: string; type: string; mgmtIp?: string; zone?: string }[];
  }) {
    const projectId = loadProjectId();
    if (!projectId) return router.push("/upload");
    setBusy(true);
    setError("");
    try {
      const next = await applyTopologyCorrections(projectId, payload);
      setTopology(next);
      saveTopology(next);
    } catch (exc) {
      setError(exc instanceof Error ? exc.message : "Could not apply corrections");
    } finally {
      setBusy(false);
    }
  }

  if (!topology) {
    return (
      <AppShell>
        <LoadingPanel loading={false} message="No parsed topology is loaded." />
      </AppShell>
    );
  }

  const warnings = topology.issues.filter((issue) => issue.severity === "warning").length;
  const errors = topology.issues.filter((issue) => issue.severity === "error").length;

  return (
    <AppShell>
      <PageHero
        eyebrow="Parse review"
        title="Clean the topology before the diagram is forged"
        description="Check detected devices, AI suggestions, standard path devices, and every parsed connection before generation."
      >
        <div className="mx-auto flex max-w-2xl flex-wrap justify-center gap-3 text-sm">
          <span className="app-panel px-3 py-2 text-muted">{topology.devices.length} devices</span>
          <span className="app-panel px-3 py-2 text-muted">{topology.cables.length} connections</span>
          <span className="app-panel px-3 py-2 text-warning">{warnings} warnings</span>
          <span className="app-panel px-3 py-2 text-danger">{errors} errors</span>
        </div>
      </PageHero>
      <div className="mb-6 flex w-full flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-lg font-semibold text-ink">Review parsed topology</h2>
          <p className="text-sm text-muted">
            {topology.devices.length} devices, {topology.cables.length} connections, {warnings} warnings, {errors} errors
          </p>
        </div>
        <div className="flex flex-wrap gap-3">
          <label className="flex items-center gap-2 rounded-md border border-line bg-surface px-3 py-2 text-sm text-muted shadow-sm">
            <input checked={includeIpsInAi} className="h-4 w-4 accent-[var(--accent)]" type="checkbox" onChange={(event) => setIncludeIpsInAi(event.target.checked)} />
            Include IPs in AI
          </label>
          <SecondaryButton disabled={busy} onClick={runAiHelper}>
            Run AI helper
          </SecondaryButton>
          <SecondaryButton disabled={busy} onClick={refresh}>
            <RefreshCw aria-hidden size={16} />
            Reparse
          </SecondaryButton>
          <PrimaryButton onClick={() => router.push("/clarifications")}>
            <HelpCircle aria-hidden size={16} />
            Clarify
          </PrimaryButton>
        </div>
      </div>
      <div className="mb-6">
        <IssueList issues={topology.issues} />
      </div>
      {error && <p className="status-error mb-4 px-4 py-3 text-sm">{error}</p>}
      <AiSuggestionsPanel suggestions={topology.aiSuggestions} />
      <StandardPathPanel topology={topology} busy={busy} onApply={applyCorrections} />
      <DeviceCorrectionPanel topology={topology} busy={busy} onApply={applyCorrections} />
      <TopologyTables topology={topology} />
    </AppShell>
  );
}
