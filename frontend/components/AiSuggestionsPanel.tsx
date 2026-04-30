import { BrainCircuit, GitMerge, ShieldAlert } from "lucide-react";
import type { AiSuggestions } from "@/lib/types";

export function AiSuggestionsPanel({ suggestions }: { suggestions?: AiSuggestions | null }) {
  if (!suggestions) {
    return (
      <section className="app-card mb-6 w-full p-4">
        <h2 className="flex items-center gap-2 text-base font-semibold text-ink">
          <BrainCircuit aria-hidden size={18} />
          AI Suggestions
        </h2>
        <p className="mt-2 text-sm text-muted">Run the AI helper from this page to suggest alias merges and ignored false connections.</p>
      </section>
    );
  }

  return (
    <section className="app-card mb-6 w-full p-4">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="flex items-center gap-2 text-base font-semibold text-ink">
            <BrainCircuit aria-hidden size={18} />
            AI Suggestions
          </h2>
          <p className="text-sm text-muted">
            Source: {suggestions.source} - Status: {suggestions.status}
          </p>
          {suggestions.message && <p className="mt-1 text-sm text-warning">{suggestions.message}</p>}
        </div>
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <div className="overflow-hidden rounded-md border border-line bg-surface">
          <div className="flex items-center gap-2 border-b border-line bg-panel px-3 py-2 text-sm font-medium text-ink">
            <GitMerge aria-hidden size={16} />
            Alias merges
          </div>
          <div className="divide-y divide-line">
            {suggestions.alias_suggestions.length === 0 ? (
              <p className="px-3 py-3 text-sm text-muted">No alias suggestions.</p>
            ) : (
              suggestions.alias_suggestions.map((item) => (
                <div key={`${item.alias}-${item.canonical}`} className="row-hover px-3 py-3 text-sm">
                  <p className="font-medium text-ink">
                    {item.alias} -&gt; {item.canonical}
                  </p>
                  <p className="text-muted">
                    {Math.round(item.confidence * 100)}% - {item.reason}
                  </p>
                </div>
              ))
            )}
          </div>
        </div>

        <div className="overflow-hidden rounded-md border border-line bg-surface">
          <div className="flex items-center gap-2 border-b border-line bg-panel px-3 py-2 text-sm font-medium text-ink">
            <ShieldAlert aria-hidden size={16} />
            Ignored false connections
          </div>
          <div className="divide-y divide-line">
            {suggestions.ignored_connections.length === 0 ? (
              <p className="px-3 py-3 text-sm text-muted">No false connections ignored.</p>
            ) : (
              suggestions.ignored_connections.map((item, index) => (
                <div key={`${item.signature ?? item.source}-${index}`} className="row-hover px-3 py-3 text-sm">
                  <p className="font-medium text-ink">{item.source ?? item.signature ?? "connection"}</p>
                  <p className="text-muted">
                    {Math.round(item.confidence * 100)}% - {item.reason}
                  </p>
                </div>
              ))
            )}
          </div>
        </div>

        <div className="overflow-hidden rounded-md border border-line bg-surface">
          <div className="flex items-center gap-2 border-b border-line bg-panel px-3 py-2 text-sm font-medium text-ink">
            <BrainCircuit aria-hidden size={16} />
            Connection enrichment
          </div>
          <div className="max-h-72 divide-y divide-line overflow-auto">
            {!suggestions.connection_enrichment || suggestions.connection_enrichment.length === 0 ? (
              <p className="px-3 py-3 text-sm text-muted">No enriched connection notes yet.</p>
            ) : (
              suggestions.connection_enrichment.slice(0, 20).map((item) => (
                <div key={item.cable_id} className="row-hover px-3 py-3 text-sm">
                  <p className="font-medium text-ink">
                    {item.cable_id}: {item.role}
                  </p>
                  <p className="text-muted">{item.description}</p>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </section>
  );
}
