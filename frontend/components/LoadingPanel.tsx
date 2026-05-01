import { Loader2 } from "lucide-react";

export function LoadingPanel({
  loading = true,
  message = "Loading...",
}: {
  loading?: boolean;
  message?: string;
}) {
  return (
    <div className="flex w-full items-center gap-3 rounded-md border border-[var(--line)] bg-[var(--surface)] px-4 py-3 text-sm text-[var(--muted)]">
      {loading && (
        <Loader2 aria-hidden size={15} className="shrink-0 animate-spin text-[var(--accent)]" />
      )}
      <span>{message}</span>
    </div>
  );
}
