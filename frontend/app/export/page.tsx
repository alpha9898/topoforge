"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Download, FileJson, RotateCcw } from "lucide-react";
import { AppShell } from "@/components/AppShell";
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
      <div className="mb-6 w-full">
        <p className="mb-1 text-xs font-semibold uppercase tracking-widest text-[var(--accent)]">Step 5</p>
        <h2 className="text-xl font-semibold text-[var(--text)]">Export</h2>
        <p className="mt-1 text-sm text-[var(--muted)]">
          {drawioUrl
            ? "Your Draw.io diagram is ready to download."
            : "Generate the diagram from the preview step before exporting."}
        </p>
      </div>

      <div className="app-card anim-fade-in-up w-full p-5">
        <h3 className="mb-1 text-sm font-semibold text-[var(--text)]">Download files</h3>
        <p className="mb-4 text-sm text-[var(--muted)]">
          Open the .drawio file in diagrams.net, Draw.io Desktop, or the Draw.io VS Code extension.
        </p>

        <div className="flex flex-wrap gap-2">
          {drawioUrl ? (
            <a
              href={downloadUrl(drawioUrl)}
              download
              className="focus-ring inline-flex h-9 items-center gap-2 rounded-md bg-[var(--accent)] px-4 text-sm font-medium text-white transition-colors hover:bg-[var(--accent-strong)]"
            >
              <Download aria-hidden size={14} />
              Download .drawio
            </a>
          ) : (
            <PrimaryButton disabled>
              <Download aria-hidden size={14} />
              Download .drawio
            </PrimaryButton>
          )}

          <SecondaryButton disabled={!topology} onClick={downloadTopologyJson}>
            <FileJson aria-hidden size={14} />
            Download topology JSON
          </SecondaryButton>
        </div>

        <div className="mt-5 border-t border-[var(--line)] pt-4">
          <SecondaryButton onClick={startOver}>
            <RotateCcw aria-hidden size={14} />
            Start new upload
          </SecondaryButton>
        </div>
      </div>
    </AppShell>
  );
}
