"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Download, Loader2, Workflow } from "lucide-react";
import { AppShell } from "@/components/AppShell";
import { IssueList } from "@/components/IssueList";
import { LoadingPanel } from "@/components/LoadingPanel";
import { PageHero } from "@/components/PageHero";
import { PrimaryButton } from "@/components/PrimaryButton";
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
        <LoadingPanel loading={false} message="No topology is ready for preview." />
      </AppShell>
    );
  }

  return (
    <AppShell>
      <PageHero
        eyebrow="Diagram preview"
        title="Generate the editable HLD package"
        description="TopoForge will produce Draw.io XML with devices, labels, connector anchors, reference tables, notes, and warnings."
      />
      <div className="mb-6 flex w-full flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="flex items-center gap-2 text-lg font-semibold text-ink">
            <Workflow aria-hidden size={20} />
            Preview
          </h2>
          <p className="text-sm text-muted">The generated Draw.io file will use this normalized topology and warning summary.</p>
        </div>
        <div className="flex flex-wrap gap-3">
          {drawioUrl && (
            <a
              className="focus-ring inline-flex h-10 items-center justify-center gap-2 rounded-md border border-line bg-surface px-4 text-sm font-medium text-ink shadow-sm transition hover:bg-panel"
              href={downloadUrl(drawioUrl)}
              download
            >
              <Download aria-hidden size={16} />
              Download .drawio
            </a>
          )}
          <PrimaryButton disabled={busy} onClick={generate}>
            {busy ? <Loader2 aria-hidden className="animate-spin" size={16} /> : <Download aria-hidden size={16} />}
            {drawioUrl ? "Regenerate" : "Generate .drawio"}
          </PrimaryButton>
        </div>
      </div>
      {error && <p className="status-error mb-4 px-4 py-3 text-sm">{error}</p>}
      <div className="mb-6 w-full">
        <IssueList issues={topology.issues} />
      </div>
      <TopologyTables topology={topology} />
    </AppShell>
  );
}
