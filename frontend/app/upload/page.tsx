"use client";

import { ChangeEvent, useState } from "react";
import { useRouter } from "next/navigation";
import { FileUp, Loader2 } from "lucide-react";
import { AppShell } from "@/components/AppShell";
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
      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_360px]">
        <section className="rounded-md border border-line bg-white p-6">
          <h2 className="text-lg font-semibold text-ink">Upload LLD workbook</h2>
          <div className="mt-6 flex min-h-56 flex-col items-center justify-center rounded-md border border-dashed border-slate-300 bg-panel px-4 text-center">
            <FileUp aria-hidden className="mb-3 text-teal-700" size={32} />
            <label className="focus-ring cursor-pointer rounded-md bg-white px-4 py-2 text-sm font-medium text-slate-800 shadow-sm">
              Select file
              <input className="sr-only" type="file" accept=".xlsx,.xls,.xlsm,.csv" onChange={onFileChange} />
            </label>
            <p className="mt-3 text-sm text-slate-600">{file ? file.name : "Excel or CSV, up to 20 MB"}</p>
          </div>
          {error && <p className="mt-4 rounded-md border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</p>}
          <div className="mt-5 space-y-3 rounded-md border border-line bg-panel p-4">
            <label className="flex items-start gap-3 text-sm text-slate-700">
              <input checked={useAiHelper} className="mt-1 h-4 w-4" type="checkbox" onChange={(event) => setUseAiHelper(event.target.checked)} />
              <span>
                <span className="block font-medium text-ink">Use AI parsing helper</span>
                Suggest aliases like SW1 to the real switch and ignore obvious false connections.
              </span>
            </label>
            <label className="flex items-start gap-3 text-sm text-slate-700">
              <input
                checked={includeIpsInAi}
                className="mt-1 h-4 w-4"
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
          <div className="mt-6">
            <PrimaryButton disabled={!file || busy} onClick={start}>
              {busy ? <Loader2 aria-hidden className="animate-spin" size={16} /> : <FileUp aria-hidden size={16} />}
              Upload and parse
            </PrimaryButton>
          </div>
        </section>
        <aside className="rounded-md border border-line bg-white p-5">
          <h3 className="text-sm font-semibold uppercase text-slate-500">MVP limits</h3>
          <dl className="mt-4 space-y-4 text-sm">
            <div>
              <dt className="font-medium text-ink">Devices</dt>
              <dd className="text-slate-600">Up to 200</dd>
            </div>
            <div>
              <dt className="font-medium text-ink">Connections</dt>
              <dd className="text-slate-600">Up to 1,000</dd>
            </div>
            <div>
              <dt className="font-medium text-ink">Generation</dt>
              <dd className="text-slate-600">Best effort with warnings</dd>
            </div>
          </dl>
        </aside>
      </div>
    </AppShell>
  );
}
