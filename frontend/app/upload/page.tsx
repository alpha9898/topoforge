"use client";

import { type ChangeEvent, useState } from "react";
import { useRouter } from "next/navigation";
import { FileUp, Loader2 } from "lucide-react";
import { AppShell } from "@/components/AppShell";
import { PrimaryButton } from "@/components/PrimaryButton";
import { parseProject, uploadFile } from "@/lib/api";
import { resetProjectState, saveAiPreferences, saveProjectId, saveTopology } from "@/lib/project-state";

const MAX_FILE_SIZE = 20 * 1024 * 1024;
const ALLOWED = [".xlsx", ".xls", ".xlsm", ".csv"];

function formatBytes(bytes: number) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

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
    if (!selected) { setFile(null); return; }
    const ext = selected.name.slice(selected.name.lastIndexOf(".")).toLowerCase();
    if (!ALLOWED.includes(ext)) { setError("Accepted formats: .xlsx, .xls, .xlsm, .csv"); setFile(null); return; }
    if (selected.size > MAX_FILE_SIZE) { setError("File must be 20 MB or less."); setFile(null); return; }
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
      const topology = await parseProject(uploaded.project_id, {
        use_ai_helper: useAiHelper,
        include_ips_in_ai: includeIpsInAi,
      });
      saveTopology(topology);
      router.push("/review");
    } catch (exc) {
      setError(exc instanceof Error ? exc.message : "Upload failed — check the backend is running.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <AppShell>
      <div className="mb-6 w-full">
        <p className="mb-1.5 text-xs font-semibold uppercase tracking-widest text-[var(--accent)]">
          Step 1
        </p>
        <h2 className="text-xl font-semibold text-[var(--text)]">Upload LLD workbook</h2>
        <p className="mt-1 text-sm text-[var(--muted)]">
          Upload an Excel or CSV file containing your low-level design data. TopoForge will parse devices,
          ports, and connections.
        </p>
      </div>

      <div className="grid w-full gap-5 lg:grid-cols-[1fr_300px]">
        {/* Drop zone */}
        <section className="app-card p-5">
          <label className="block">
            <span className="sr-only">Select LLD file</span>
            <div
              className={[
                "flex min-h-48 cursor-pointer flex-col items-center justify-center gap-3 rounded-md border-2 border-dashed p-8 text-center transition-colors",
                file
                  ? "border-[var(--accent)] bg-[var(--accent-soft)]"
                  : "border-[var(--line)] hover:border-[var(--line-strong)] hover:bg-[var(--surface-elevated)]",
              ].join(" ")}
            >
              <FileUp
                aria-hidden
                size={28}
                className={file ? "text-[var(--accent)]" : "text-[var(--muted)]"}
              />
              {file ? (
                <div>
                  <p className="text-sm font-medium text-[var(--text)]">{file.name}</p>
                  <p className="mt-0.5 text-xs text-[var(--muted)]">{formatBytes(file.size)}</p>
                </div>
              ) : (
                <div>
                  <p className="text-sm font-medium text-[var(--text)]">Click to select a file</p>
                  <p className="mt-0.5 text-xs text-[var(--muted)]">Excel or CSV, up to 20 MB</p>
                </div>
              )}
              <input
                className="sr-only"
                type="file"
                accept=".xlsx,.xls,.xlsm,.csv"
                onChange={onFileChange}
              />
            </div>
          </label>

          {error && (
            <p key={error} className="status-error anim-shake mt-4 px-4 py-2.5 text-sm">{error}</p>
          )}

          <div className="mt-5 flex justify-end">
            <PrimaryButton disabled={!file || busy} onClick={start}>
              {busy ? (
                <Loader2 aria-hidden size={15} className="animate-spin" />
              ) : (
                <FileUp aria-hidden size={15} />
              )}
              {busy ? "Parsing..." : "Upload and parse"}
            </PrimaryButton>
          </div>
        </section>

        {/* Options panel */}
        <aside className="space-y-4">
          <section className="app-card p-4">
            <h3 className="mb-3 text-sm font-semibold text-[var(--text)]">AI parsing helper</h3>
            <div className="space-y-3">
              <label className="flex cursor-pointer gap-3">
                <span className="flex h-5 shrink-0 items-center">
                  <input
                    type="checkbox"
                    checked={useAiHelper}
                    className="h-4 w-4 accent-[var(--accent)]"
                    onChange={(e) => setUseAiHelper(e.target.checked)}
                  />
                </span>
                <span className="text-sm leading-5">
                  <span className="block font-medium text-[var(--text)]">Enable AI helper</span>
                  <span className="block text-[var(--muted)]">
                    Suggests alias merges and flags false connections via Gemini.
                  </span>
                </span>
              </label>
              <label className={["flex cursor-pointer gap-3", !useAiHelper && "opacity-40"].join(" ")}>
                <span className="flex h-5 shrink-0 items-center">
                  <input
                    type="checkbox"
                    checked={includeIpsInAi}
                    disabled={!useAiHelper}
                    className="h-4 w-4 accent-[var(--accent)]"
                    onChange={(e) => setIncludeIpsInAi(e.target.checked)}
                  />
                </span>
                <span className="text-sm leading-5">
                  <span className="block font-medium text-[var(--text)]">Include IPs in AI</span>
                  <span className="block text-[var(--muted)]">
                    Off by default — avoids sending management IPs to Gemini.
                  </span>
                </span>
              </label>
            </div>
          </section>

          <section className="app-card p-4">
            <h3 className="mb-3 text-sm font-semibold text-[var(--text)]">Limits</h3>
            <dl className="space-y-2 text-sm">
              <div className="flex justify-between gap-4">
                <dt className="text-[var(--muted)]">Devices</dt>
                <dd className="font-medium text-[var(--text)]" style={{ fontVariantNumeric: "tabular-nums" }}>200</dd>
              </div>
              <div className="flex justify-between gap-4">
                <dt className="text-[var(--muted)]">Connections</dt>
                <dd className="font-medium text-[var(--text)]" style={{ fontVariantNumeric: "tabular-nums" }}>1,000</dd>
              </div>
              <div className="flex justify-between gap-4">
                <dt className="text-[var(--muted)]">File size</dt>
                <dd className="font-medium text-[var(--text)]">20 MB</dd>
              </div>
            </dl>
          </section>
        </aside>
      </div>
    </AppShell>
  );
}
