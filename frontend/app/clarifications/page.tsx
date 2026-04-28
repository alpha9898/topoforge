"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowRight, Save } from "lucide-react";
import { AppShell } from "@/components/AppShell";
import { PrimaryButton, SecondaryButton } from "@/components/PrimaryButton";
import { getClarifications, submitClarifications } from "@/lib/api";
import { loadProjectId, saveTopology } from "@/lib/project-state";
import type { ClarificationQuestion } from "@/lib/types";

export default function ClarificationsPage() {
  const [questions, setQuestions] = useState<ClarificationQuestion[]>([]);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState(true);
  const [error, setError] = useState("");
  const router = useRouter();

  useEffect(() => {
    const projectId = loadProjectId();
    if (!projectId) {
      router.push("/upload");
      return;
    }
    getClarifications(projectId)
      .then((response) => {
        setQuestions(response.questions);
        setAnswers(Object.fromEntries(response.questions.map((q) => [q.id, q.suggested_answer ?? ""])));
      })
      .catch((exc) => setError(exc instanceof Error ? exc.message : "Could not load questions"))
      .finally(() => setBusy(false));
  }, [router]);

  async function save() {
    const projectId = loadProjectId();
    if (!projectId) return router.push("/upload");
    setBusy(true);
    setError("");
    try {
      const topology = await submitClarifications(
        projectId,
        Object.entries(answers).map(([question_id, answer]) => ({ question_id, answer }))
      );
      saveTopology(topology);
      router.push("/preview");
    } catch (exc) {
      setError(exc instanceof Error ? exc.message : "Could not submit clarifications");
    } finally {
      setBusy(false);
    }
  }

  return (
    <AppShell>
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-lg font-semibold text-ink">Clarifications</h2>
          <p className="text-sm text-slate-600">{questions.length} questions generated from incomplete or ambiguous data</p>
        </div>
        <div className="flex gap-3">
          <SecondaryButton onClick={() => router.push("/preview")}>
            <ArrowRight aria-hidden size={16} />
            Skip
          </SecondaryButton>
          <PrimaryButton disabled={busy} onClick={save}>
            <Save aria-hidden size={16} />
            Apply answers
          </PrimaryButton>
        </div>
      </div>
      {error && <p className="mb-4 rounded-md border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</p>}
      {busy ? (
        <p className="rounded-md border border-line bg-white px-4 py-3 text-sm text-slate-600">Loading questions...</p>
      ) : questions.length === 0 ? (
        <p className="rounded-md border border-line bg-white px-4 py-3 text-sm text-slate-600">No clarification questions are needed.</p>
      ) : (
        <div className="space-y-3">
          {questions.map((question) => (
            <label key={question.id} className="block rounded-md border border-line bg-white p-4">
              <span className="text-sm font-medium text-ink">{question.message}</span>
              {question.options.length > 0 ? (
                <select
                  className="focus-ring mt-3 h-10 w-full rounded-md border border-line bg-white px-3 text-sm"
                  value={answers[question.id] ?? ""}
                  onChange={(event) => setAnswers((current) => ({ ...current, [question.id]: event.target.value }))}
                >
                  {question.options.map((option) => (
                    <option key={option} value={option}>
                      {option}
                    </option>
                  ))}
                </select>
              ) : (
                <input
                  className="focus-ring mt-3 h-10 w-full rounded-md border border-line px-3 text-sm"
                  value={answers[question.id] ?? ""}
                  onChange={(event) => setAnswers((current) => ({ ...current, [question.id]: event.target.value }))}
                />
              )}
            </label>
          ))}
        </div>
      )}
    </AppShell>
  );
}
