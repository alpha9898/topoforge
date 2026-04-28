import type { Issue } from "@/lib/types";

export function IssueList({ issues }: { issues: Issue[] }) {
  if (!issues.length) {
    return <p className="rounded-md border border-line bg-white px-4 py-3 text-sm text-slate-600">No issues detected.</p>;
  }
  return (
    <div className="divide-y divide-line rounded-md border border-line bg-white">
      {issues.map((issue) => (
        <div key={issue.id} className="flex gap-3 px-4 py-3">
          <span
            className={`mt-0.5 h-2.5 w-2.5 shrink-0 rounded-full ${issue.severity === "error" ? "bg-red-600" : "bg-amber-500"}`}
            aria-hidden
          />
          <div>
            <p className="text-sm font-medium text-ink">{issue.message}</p>
            <p className="text-xs uppercase tracking-wide text-slate-500">{issue.code}</p>
          </div>
        </div>
      ))}
    </div>
  );
}
