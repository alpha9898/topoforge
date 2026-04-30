"use client";

import { ChangeEvent, useState } from "react";
import { useRouter } from "next/navigation";
import { Cable, FileUp, Loader2, ShieldCheck, Sparkles } from "lucide-react";
import { AppShell } from "@/components/AppShell";
import { PageHero } from "@/components/PageHero";
import { PrimaryButton } from "@/components/PrimaryButton";
import { parseProject, uploadFile } from "@/lib/api";
import { resetProjectState, saveAiPreferences, saveProjectId, saveTopology } from "@/lib/project-state";

const MAX_FILE_SIZE = 20 * 1024 * 1024;
const ALLOWED = [".xlsx", ".xls", ".xlsm", ".csv"];

export default function UploadPage() {
  const [file, setFile] = useState<File | null>(null);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [useAiHelper, setUseAiHelper] = useState(false);
  const [includeIpsInAi, setIncludeIpsInAi] = useState(false);
  const router = useRouter();

  function onFileChange(event: ChangeEvent<HTMLInputElement>) {
    const selected = event.target.files?.[0] ?? null;
    setError("");
    if (!selected) {
      setFile(null);
      return;
    }
    const suffix = selected.name.slice(selected.name.lastIndexOf(".")).toLowerCase();
    if (!ALLOWED.includes(suffix)) {
      setError("Use an Excel or CSV file.");
      setFile(null);
      return;
    }
    if (selected.size > MAX_FILE_SIZE) {
      setError("File size must be 20 MB or less.");
      setFile(null);
      return;
    }
    setFile(selected);
  }

  async function start() {
    if (!file) return;
    setBusy(true);
    setError("");
    try {
      resetProjectState();
      saveAiPreferences(useAiHelper, includeIpsInAi);
      const uploaded = await uploadFile(file);
      saveProjectId(uploaded.project_id);
      const topology = await parseProject(uploaded.project_id, { use_ai_helper: useAiHelper, include_ips_in_ai: includeIpsInAi });
      saveTopology(topology);
      router.push("/review");
    } catch (exc) {
      setError(exc instanceof Error ? exc.message : "Upload failed");
    } finally {
      setBusy(false);
    }
  }

  return (
    <AppShell>
      <PageHero
        eyebrow="TopoForge command center"
        title="Forge clean HLD diagrams from messy LLD workbooks"
        description="Upload an Excel or CSV design sheet, review the parsed topology, clarify missing ports, and generate an editable Draw.io diagram."
      >
        <div className="mx-auto grid max-w-2xl gap-3 text-left sm:grid-cols-3">
          <div className="app-panel flex items-center gap-2 px-3 py-2 text-sm text-muted">
            <Cable aria-hidden className="text-accent" size={16} />
            Port-aware cables
          </div>
          <div className="app-panel flex items-center gap-2 px-3 py-2 text-sm text-muted">
            <Sparkles aria-hidden className="text-accent" size={16} />
            Optional AI helper
          </div>
          <div className="app-panel flex items-center gap-2 px-3 py-2 text-sm text-muted">
            <ShieldCheck aria-hidden className="text-accent" size={16} />
            Best-effort output
          </div>
        </div>
      </PageHero>
      <div className="grid w-full max-w-5xl items-start gap-6 lg:grid-cols-[minmax(0,1fr)_320px]">
        <section className="app-card p-6 text-center">
          <h2 className="text-lg font-semibold text-ink">Upload LLD workbook</h2>
          <div className="mt-6 flex min-h-56 flex-col items-center justify-center rounded-md border border-dashed border-line bg-panel px-4 text-center transition hover:border-[var(--line-strong)]">
            <FileUp aria-hidden className="mb-3 text-accent" size={34} />
            <label className="focus-ring cursor-pointer rounded-md bg-surface px-4 py-2 text-sm font-medium text-ink shadow-sm transition hover:bg-panel">
              Select file
              <input className="sr-only" type="file" accept=".xlsx,.xls,.xlsm,.csv" onChange={onFileChange} />
            </label>
            <p className="mt-3 text-sm text-muted">{file ? file.name : "Excel or CSV, up to 20 MB"}</p>
          </div>
          {error && <p className="status-error mt-4 px-4 py-3 text-sm">{error}</p>}
          <div className="app-panel mt-5 space-y-3 p-4 text-left">
            <label className="flex items-start gap-3 text-sm text-muted">
              <input checked={useAiHelper} className="mt-1 h-4 w-4 accent-[var(--accent)]" type="checkbox" onChange={(event) => setUseAiHelper(event.target.checked)} />
              <span>
                <span className="block font-medium text-ink">Use AI parsing helper</span>
                Suggest aliases like SW1 to the real switch and ignore obvious false connections.
              </span>
            </label>
            <label className="flex items-start gap-3 text-sm text-muted">
              <input
                checked={includeIpsInAi}
                className="mt-1 h-4 w-4 accent-[var(--accent)]"
                disabled={!useAiHelper}
                type="checkbox"
                onChange={(event) => setIncludeIpsInAi(event.target.checked)}
              />
              <span>
                <span className="block font-medium text-ink">Include IPs in AI analysis</span>
                Optional. Leave off to avoid sending management IPs to Gemini.
              </span>
            </label>
          </div>
          <div className="mt-6 flex justify-center">
            <PrimaryButton disabled={!file || busy} onClick={start}>
              {busy ? <Loader2 aria-hidden className="animate-spin" size={16} /> : <FileUp aria-hidden size={16} />}
              Upload and parse
            </PrimaryButton>
          </div>
        </section>
        <aside className="app-card p-5 text-center">
          <h3 className="text-sm font-semibold uppercase text-muted">MVP limits</h3>
          <dl className="mt-4 space-y-4 text-sm">
            <div>
              <dt className="font-medium text-ink">Devices</dt>
              <dd className="text-muted">Up to 200</dd>
            </div>
            <div>
              <dt className="font-medium text-ink">Connections</dt>
              <dd className="text-muted">Up to 1,000</dd>
            </div>
            <div>
              <dt className="font-medium text-ink">Generation</dt>
              <dd className="text-muted">Best effort with warnings</dd>
            </div>
          </dl>
        </aside>
      </div>
    </AppShell>
  );
}
