import type { Issue } from "@/lib/types";

export function IssueList({ issues }: { issues: Issue[] }) {
  if (!issues.length) {
    return (
      <p className="status-success anim-fade-in-up px-4 py-2.5 text-sm">
        No issues detected.
      </p>
    );
  }

  const errors = issues.filter((i) => i.severity === "error");
  const warnings = issues.filter((i) => i.severity === "warning");
  const ordered = [...errors, ...warnings];

  return (
    <div className="app-card anim-fade-in-up divide-y divide-[var(--line)] overflow-hidden shadow-none">
      {ordered.map((issue, index) => (
        <IssueRow key={issue.id} issue={issue} index={index} />
      ))}
    </div>
  );
}

function IssueRow({ issue, index }: { issue: Issue; index: number }) {
  /* Stagger first 8 rows; beyond that animate all at once */
  const delay = Math.min(index, 7) * 35;
  return (
    <div
      className="anim-fade-in-up row-hover flex gap-3 px-4 py-3"
      style={{ animationDelay: `${delay}ms` }}
    >
      <span
        aria-hidden
        className={[
          "mt-1.5 h-2 w-2 shrink-0 rounded-full",
          issue.severity === "error" ? "bg-[var(--danger)]" : "bg-[var(--warning)]",
        ].join(" ")}
      />
      <div className="min-w-0">
        <p className="text-sm text-[var(--text)]">{issue.message}</p>
        <p className="mt-0.5 font-mono text-xs text-[var(--muted)]">{issue.code}</p>
      </div>
    </div>
  );
}
