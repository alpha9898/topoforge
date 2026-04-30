"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowRight, Save } from "lucide-react";
import { AppShell } from "@/components/AppShell";
import { LoadingPanel } from "@/components/LoadingPanel";
import { PageHero } from "@/components/PageHero";
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
      <PageHero
        eyebrow="Clarification matrix"
        title="Resolve ambiguity without stopping the pipeline"
        description="Answer only the uncertain items. Unresolved warnings stay visible and the Draw.io output can still be generated."
      />
      <div className="mb-6 flex w-full flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-lg font-semibold text-ink">Clarifications</h2>
          <p className="text-sm text-muted">{questions.length} questions generated from incomplete or ambiguous data</p>
        </div>
        <div className="flex flex-wrap gap-3">
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
      {error && <p className="status-error mb-4 px-4 py-3 text-sm">{error}</p>}
      {busy ? (
        <LoadingPanel message="Loading questions..." />
      ) : questions.length === 0 ? (
        <p className="status-success px-4 py-3 text-sm">No clarification questions are needed.</p>
      ) : (
        <div className="w-full space-y-3">
          {questions.map((question) => (
            <label key={question.id} className="app-card block p-4 shadow-none">
              <span className="text-sm font-medium text-ink">{question.message}</span>
              {question.options.length > 0 ? (
                <select
                  className="field-control mt-3 h-10 w-full px-3 text-sm"
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
                  className="field-control mt-3 h-10 w-full px-3 text-sm"
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
