"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowRight, RefreshCw } from "lucide-react";
import { AiSuggestionsPanel } from "@/components/AiSuggestionsPanel";
import { AppShell } from "@/components/AppShell";
import { DeviceCorrectionPanel } from "@/components/DeviceCorrectionPanel";
import { IssueList } from "@/components/IssueList";
import { LoadingPanel } from "@/components/LoadingPanel";
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
        <LoadingPanel loading={false} message="No parsed topology loaded. Upload a file first." />
      </AppShell>
    );
  }

  const warnings = topology.issues.filter((i) => i.severity === "warning").length;
  const errors = topology.issues.filter((i) => i.severity === "error").length;

  return (
    <AppShell>
      {/* Page header */}
      <div className="mb-6 flex w-full flex-wrap items-start justify-between gap-4">
        <div>
          <p className="mb-1 text-xs font-semibold uppercase tracking-widest text-[var(--accent)]">Step 2</p>
          <h2 className="text-xl font-semibold text-[var(--text)]">Review parsed topology</h2>
          <div className="mt-1.5 flex flex-wrap items-center gap-3 text-sm text-[var(--muted)]" style={{ fontVariantNumeric: "tabular-nums" }}>
            <span>{topology.devices.length} devices</span>
            <span className="text-[var(--line)]">·</span>
            <span>{topology.cables.length} connections</span>
            {warnings > 0 && (
              <>
                <span className="text-[var(--line)]">·</span>
                <span className="text-[var(--warning)]">{warnings} warnings</span>
              </>
            )}
            {errors > 0 && (
              <>
                <span className="text-[var(--line)]">·</span>
                <span className="text-[var(--danger)]">{errors} errors</span>
              </>
            )}
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <label className="flex cursor-pointer items-center gap-2 rounded-md border border-[var(--line)] bg-[var(--surface)] px-3 py-2 text-xs text-[var(--muted)] transition-colors hover:border-[var(--line-strong)]">
            <input
              type="checkbox"
              checked={includeIpsInAi}
              className="h-3.5 w-3.5 accent-[var(--accent)]"
              onChange={(e) => setIncludeIpsInAi(e.target.checked)}
            />
            Include IPs in AI
          </label>
          <SecondaryButton disabled={busy} onClick={runAiHelper}>
            Run AI helper
          </SecondaryButton>
          <SecondaryButton disabled={busy} onClick={refresh}>
            <RefreshCw aria-hidden size={14} />
            Reparse
          </SecondaryButton>
          <PrimaryButton onClick={() => router.push("/clarifications")}>
            Clarify
            <ArrowRight aria-hidden size={14} />
          </PrimaryButton>
        </div>
      </div>

      {error && <p key={error} className="status-error anim-shake mb-5 w-full px-4 py-2.5 text-sm">{error}</p>}

      {/* Issues */}
      {topology.issues.length > 0 && (
        <div className="mb-5 w-full">
          <IssueList issues={topology.issues} />
        </div>
      )}

      {/* Panels */}
      <div className="w-full">
        <AiSuggestionsPanel suggestions={topology.aiSuggestions} />
        <StandardPathPanel topology={topology} busy={busy} onApply={applyCorrections} />
        <DeviceCorrectionPanel topology={topology} busy={busy} onApply={applyCorrections} />
        <TopologyTables topology={topology} />
      </div>
    </AppShell>
  );
}
