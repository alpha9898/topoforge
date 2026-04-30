import type { Issue } from "@/lib/types";

export function IssueList({ issues }: { issues: Issue[] }) {
  if (!issues.length) {
    return <p className="status-success px-4 py-3 text-sm">No issues detected.</p>;
  }
  return (
    <div className="app-card divide-y divide-line overflow-hidden shadow-none">
      {issues.map((issue) => (
        <div key={issue.id} className="row-hover flex gap-3 px-4 py-3">
          <span
            className={`mt-0.5 h-2.5 w-2.5 shrink-0 rounded-full ${issue.severity === "error" ? "bg-danger" : "bg-warning"}`}
            aria-hidden
          />
          <div>
            <p className="text-sm font-medium text-ink">{issue.message}</p>
            <p className="text-xs uppercase text-muted">{issue.code}</p>
          </div>
        </div>
      ))}
    </div>
  );
}
