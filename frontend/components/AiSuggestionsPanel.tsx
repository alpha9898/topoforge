import { BrainCircuit, GitMerge, ShieldAlert } from "lucide-react";
import type { AiSuggestions } from "@/lib/types";

export function AiSuggestionsPanel({ suggestions }: { suggestions?: AiSuggestions | null }) {
  if (!suggestions) {
    return (
      <section className="app-card anim-fade-in-up mb-5 w-full p-4">
        <h2 className="flex items-center gap-2 text-sm font-semibold text-[var(--text)]">
          <BrainCircuit aria-hidden size={16} className="text-[var(--muted)]" />
          AI suggestions
        </h2>
        <p className="mt-1.5 text-sm text-[var(--muted)]">
          Run the AI helper from the review page to get alias merges and false-connection flags.
        </p>
      </section>
    );
  }

  return (
    <section className="app-card anim-fade-in-up mb-5 w-full p-4">
      <div className="mb-4 flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="flex items-center gap-2 text-sm font-semibold text-[var(--text)]">
            <BrainCircuit aria-hidden size={16} className="text-[var(--muted)]" />
            AI suggestions
          </h2>
          <p className="mt-0.5 text-xs text-[var(--muted)]">
            Source: {suggestions.source} · Status: {suggestions.status}
          </p>
          {suggestions.message && (
            <p className="mt-1 text-xs text-[var(--warning)]">{suggestions.message}</p>
          )}
        </div>
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <SuggestionPanel
          icon={<GitMerge aria-hidden size={14} />}
          title="Alias merges"
          empty="No alias suggestions."
        >
          {suggestions.alias_suggestions.map((item) => (
            <div
              key={`${item.alias}-${item.canonical}`}
              className="row-hover px-3 py-2.5 text-sm"
            >
              <p className="font-medium text-[var(--text)]">
                {item.alias} → {item.canonical}
              </p>
              <p className="mt-0.5 text-xs text-[var(--muted)]">
                {Math.round(item.confidence * 100)}% · {item.reason}
              </p>
            </div>
          ))}
        </SuggestionPanel>

        <SuggestionPanel
          icon={<ShieldAlert aria-hidden size={14} />}
          title="Ignored connections"
          empty="No false connections ignored."
        >
          {suggestions.ignored_connections.map((item, i) => (
            <div
              key={`${item.signature ?? item.source}-${i}`}
              className="row-hover px-3 py-2.5 text-sm"
            >
              <p className="font-medium text-[var(--text)]">
                {item.source ?? item.signature ?? "connection"}
              </p>
              <p className="mt-0.5 text-xs text-[var(--muted)]">
                {Math.round(item.confidence * 100)}% · {item.reason}
              </p>
            </div>
          ))}
        </SuggestionPanel>

        <SuggestionPanel
          icon={<BrainCircuit aria-hidden size={14} />}
          title="Connection enrichment"
          empty="No enriched connection notes."
          scrollable
        >
          {(suggestions.connection_enrichment ?? []).slice(0, 20).map((item) => (
            <div key={item.cable_id} className="row-hover px-3 py-2.5 text-sm">
              <p className="font-medium text-[var(--text)]">
                {item.cable_id}: {item.role}
              </p>
              <p className="mt-0.5 text-xs text-[var(--muted)]">{item.description}</p>
            </div>
          ))}
        </SuggestionPanel>
      </div>
    </section>
  );
}

function SuggestionPanel({
  icon,
  title,
  empty,
  scrollable,
  children,
}: {
  icon: React.ReactNode;
  title: string;
  empty: string;
  scrollable?: boolean;
  children: React.ReactNode;
}) {
  const count = Array.isArray(children) ? children.length : (children ? 1 : 0);
  return (
    <div className="overflow-hidden rounded-md border border-[var(--line)] bg-[var(--surface)]">
      <div className="flex items-center gap-2 border-b border-[var(--line)] bg-[var(--surface-elevated)] px-3 py-2 text-xs font-semibold text-[var(--muted-strong)]">
        {icon}
        {title}
      </div>
      <div className={scrollable ? "max-h-64 divide-y divide-[var(--line)] overflow-auto" : "divide-y divide-[var(--line)]"}>
        {count === 0 ? (
          <p className="px-3 py-3 text-sm text-[var(--muted)]">{empty}</p>
        ) : children}
      </div>
    </div>
  );
}
