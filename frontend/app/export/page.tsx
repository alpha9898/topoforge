"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Download, FileJson, RotateCcw } from "lucide-react";
import { AppShell } from "@/components/AppShell";
import { PageHero } from "@/components/PageHero";
import { PrimaryButton, SecondaryButton } from "@/components/PrimaryButton";
import { downloadUrl } from "@/lib/api";
import { loadDrawioUrl, loadTopology, resetProjectState } from "@/lib/project-state";
import type { TopologyResponse } from "@/lib/types";

export default function ExportPage() {
  const [drawioUrl, setDrawioUrl] = useState<string | null>(null);
  const [topology, setTopology] = useState<TopologyResponse | null>(null);
  const router = useRouter();

  useEffect(() => {
    setDrawioUrl(loadDrawioUrl());
    setTopology(loadTopology());
  }, []);

  function downloadTopologyJson() {
    if (!topology) return;
    const blob = new Blob([JSON.stringify(topology, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = "topoforge-topology.json";
    anchor.click();
    URL.revokeObjectURL(url);
  }

  function startOver() {
    resetProjectState();
    router.push("/upload");
  }

  return (
    <AppShell>
      <PageHero
        eyebrow="Export bay"
        title="Download the generated topology assets"
        description="Save the editable Draw.io diagram and, when useful, the normalized topology JSON for auditing or reprocessing."
      />
      <section className="app-card w-full max-w-5xl p-6 text-center">
        <h2 className="text-lg font-semibold text-ink">Export files</h2>
        <p className="mt-1 text-sm text-muted">
          {drawioUrl ? "The editable Draw.io diagram is ready." : "Generate the Draw.io file from the preview step first."}
        </p>
        <div className="mt-6 flex flex-wrap justify-center gap-3">
          {drawioUrl && (
            <a
              className="focus-ring inline-flex h-10 items-center justify-center gap-2 rounded-md bg-accent px-4 text-sm font-medium text-white shadow-sm transition hover:brightness-95 active:scale-[0.98]"
              href={downloadUrl(drawioUrl)}
              download
            >
              <Download aria-hidden size={16} />
              Download .drawio
            </a>
          )}
          <SecondaryButton disabled={!topology} onClick={downloadTopologyJson}>
            <FileJson aria-hidden size={16} />
            Download topology JSON
          </SecondaryButton>
          <SecondaryButton onClick={startOver}>
            <RotateCcw aria-hidden size={16} />
            New upload
          </SecondaryButton>
        </div>
      </section>
    </AppShell>
  );
}
