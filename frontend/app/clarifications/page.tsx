"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowRight, Check } from "lucide-react";
import { AppShell } from "@/components/AppShell";
import { LoadingPanel } from "@/components/LoadingPanel";
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
    if (!projectId) { router.push("/upload"); return; }
    getClarifications(projectId)
      .then((res) => {
        setQuestions(res.questions);
        setAnswers(Object.fromEntries(res.questions.map((q) => [q.id, q.suggested_answer ?? ""])));
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

  const answered = Object.values(answers).filter(Boolean).length;

  return (
    <AppShell>
      <div className="mb-6 flex w-full flex-wrap items-start justify-between gap-4">
        <div>
          <p className="mb-1 text-xs font-semibold uppercase tracking-widest text-[var(--accent)]">Step 3</p>
          <h2 className="text-xl font-semibold text-[var(--text)]">Clarifications</h2>
          {!busy && (
            <p className="mt-1 text-sm text-[var(--muted)]">
              {questions.length === 0
                ? "No clarification needed."
                : `${answered} of ${questions.length} answered`}
            </p>
          )}
        </div>
        <div className="flex flex-wrap gap-2">
          <SecondaryButton onClick={() => router.push("/preview")}>
            Skip
            <ArrowRight aria-hidden size={14} />
          </SecondaryButton>
          <PrimaryButton disabled={busy || questions.length === 0} onClick={save}>
            <Check aria-hidden size={14} />
            Apply and continue
          </PrimaryButton>
        </div>
      </div>

      {error && <p key={error} className="status-error anim-shake mb-5 w-full px-4 py-2.5 text-sm">{error}</p>}

      {busy ? (
        <LoadingPanel message="Loading questions..." />
      ) : questions.length === 0 ? (
        <p className="status-success w-full px-4 py-2.5 text-sm">
          No clarification questions needed — proceed to preview.
        </p>
      ) : (
        <div className="w-full space-y-2">
          {questions.map((question, index) => (
            <div
              key={question.id}
              className="app-card anim-fade-in-up p-4"
              style={{ animationDelay: `${Math.min(index, 6) * 40}ms` }}
            >
              <label htmlFor={`q-${question.id}`} className="block text-sm font-medium text-[var(--text)]">
                <span className="mr-2 font-mono text-xs text-[var(--muted)]">{index + 1}.</span>
                {question.message}
              </label>
              {question.options.length > 0 ? (
                <select
                  id={`q-${question.id}`}
                  className="field-control mt-3 h-9 w-full px-3 text-sm"
                  value={answers[question.id] ?? ""}
                  onChange={(e) => setAnswers((cur) => ({ ...cur, [question.id]: e.target.value }))}
                >
                  {question.options.map((opt) => (
                    <option key={opt} value={opt}>{opt}</option>
                  ))}
                </select>
              ) : (
                <input
                  id={`q-${question.id}`}
                  className="field-control mt-3 h-9 w-full px-3 text-sm"
                  value={answers[question.id] ?? ""}
                  onChange={(e) => setAnswers((cur) => ({ ...cur, [question.id]: e.target.value }))}
                />
              )}
            </div>
          ))}
        </div>
      )}
    </AppShell>
  );
}
