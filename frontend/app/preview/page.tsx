"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Download, Workflow } from "lucide-react";
import { AppShell } from "@/components/AppShell";
import { IssueList } from "@/components/IssueList";
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
        <p className="rounded-md border border-line bg-white px-4 py-3 text-sm text-slate-600">No topology is ready for preview.</p>
      </AppShell>
    );
  }

  return (
    <AppShell>
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="flex items-center gap-2 text-lg font-semibold text-ink">
            <Workflow aria-hidden size={20} />
            Preview
          </h2>
          <p className="text-sm text-slate-600">The generated Draw.io file will use this normalized topology and warning summary.</p>
        </div>
        <div className="flex flex-wrap gap-3">
          {drawioUrl && (
            <a
              className="focus-ring inline-flex h-10 items-center justify-center gap-2 rounded-md bg-white px-4 text-sm font-medium text-slate-700 ring-1 ring-line hover:bg-slate-50"
              href={downloadUrl(drawioUrl)}
              download
            >
              <Download aria-hidden size={16} />
              Download .drawio
            </a>
          )}
          <PrimaryButton disabled={busy} onClick={generate}>
            <Download aria-hidden size={16} />
            {drawioUrl ? "Regenerate" : "Generate .drawio"}
          </PrimaryButton>
        </div>
      </div>
      {error && <p className="mb-4 rounded-md border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</p>}
      <div className="mb-6">
        <IssueList issues={topology.issues} />
      </div>
      <TopologyTables topology={topology} />
    </AppShell>
  );
}
