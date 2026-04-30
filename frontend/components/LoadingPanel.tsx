import { Loader2 } from "lucide-react";

export function LoadingPanel({ loading = true, message = "Loading..." }: { loading?: boolean; message?: string }) {
  return (
    <div className="app-card flex w-full items-center gap-3 px-4 py-3 text-sm text-muted">
      {loading && <Loader2 aria-hidden className="animate-spin text-accent" size={18} />}
      <span>{message}</span>
    </div>
  );
}
