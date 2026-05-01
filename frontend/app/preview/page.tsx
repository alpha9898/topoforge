"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowRight, Download, Loader2 } from "lucide-react";
import { AppShell } from "@/components/AppShell";
import { IssueList } from "@/components/IssueList";
import { LoadingPanel } from "@/components/LoadingPanel";
import { PrimaryButton, SecondaryButton } from "@/components/PrimaryButton";
import { TopologyTables } from "@/components/TopologyTables";
import { downloadDrawioFile, downloadUrl, generateDrawio } from "@/lib/api";
import { loadDrawioUrl, loadProjectId, loadTopology, saveDrawioUrl } from "@/lib/project-state";
import type { TopologyResponse } from "@/lib/types";

export default function PreviewPage() {
  const [topology, setTopology] = useState<TopologyResponse | null>(null);
  const [drawioUrl, setDrawioUrl] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const router = useRouter();

  useEffect(() => {
    setTopology(loadTopology());
    setDrawioUrl(loadDrawioUrl());
  }, []);

  async function generate() {
    const projectId = loadProjectId();
    if (!projectId) return router.push("/upload");
    setBusy(true);
    setError("");
    try {
      const response = await generateDrawio(projectId);
      saveDrawioUrl(response.drawio_url);
      setDrawioUrl(response.drawio_url);
      await downloadDrawioFile(response.drawio_url);
    } catch (exc) {
      setError(exc instanceof Error ? exc.message : "Generation failed");
    } finally {
      setBusy(false);
    }
  }

  if (!topology) {
    return (
      <AppShell>
        <LoadingPanel loading={false} message="No topology ready for preview. Complete the review step first." />
      </AppShell>
    );
  }

  const issueCount = topology.issues.length;

  return (
    <AppShell>
      <div className="mb-6 flex w-full flex-wrap items-start justify-between gap-4">
        <div>
          <p className="mb-1 text-xs font-semibold uppercase tracking-widest text-[var(--accent)]">Step 4</p>
          <h2 className="text-xl font-semibold text-[var(--text)]">Generate diagram</h2>
          <p className="mt-1 text-sm text-[var(--muted)]">
            {drawioUrl
              ? "Diagram generated. Download or regenerate below."
              : "TopoForge will produce Draw.io XML with devices, cables, port labels, and reference tables."}
            {issueCount > 0 && ` ${issueCount} issue${issueCount > 1 ? "s" : ""} will appear in the diagram notes.`}
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          {drawioUrl && (
            <a
              href={downloadUrl(drawioUrl)}
              download
              className="focus-ring inline-flex h-9 items-center gap-2 rounded-md border border-[var(--line)] bg-[var(--surface)] px-4 text-sm font-medium text-[var(--text)] transition-colors hover:border-[var(--line-strong)] hover:bg-[var(--surface-elevated)]"
            >
              <Download aria-hidden size={14} />
              Download .drawio
            </a>
          )}
          <PrimaryButton disabled={busy} onClick={generate}>
            {busy ? (
              <Loader2 aria-hidden size={14} className="animate-spin" />
            ) : (
              <Download aria-hidden size={14} />
            )}
            {busy ? "Generating..." : drawioUrl ? "Regenerate" : "Generate .drawio"}
          </PrimaryButton>
          {drawioUrl && (
            <SecondaryButton onClick={() => router.push("/export")}>
              Export
              <ArrowRight aria-hidden size={14} />
            </SecondaryButton>
          )}
        </div>
      </div>

      {error && <p key={error} className="status-error anim-shake mb-5 w-full px-4 py-2.5 text-sm">{error}</p>}

      {issueCount > 0 && (
        <div className="mb-5 w-full">
          <IssueList issues={topology.issues} />
        </div>
      )}

      <TopologyTables topology={topology} />
    </AppShell>
  );
}
