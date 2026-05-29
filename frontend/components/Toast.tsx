"use client";

import { useEffect } from "react";
import { CheckCircle } from "lucide-react";

interface ToastProps {
  message: string;
  onDismiss: () => void;
  durationMs?: number;
}

export function Toast({ message, onDismiss, durationMs = 3000 }: ToastProps) {
  useEffect(() => {
    const timer = setTimeout(onDismiss, durationMs);
    return () => clearTimeout(timer);
  }, [onDismiss, durationMs]);

  return (
    <div
      role="status"
      aria-live="polite"
      className="fixed bottom-5 right-5 z-50 flex items-center gap-2.5 rounded-lg border border-[var(--line)] bg-[var(--surface-elevated)] px-4 py-3 text-sm shadow-lg anim-scale-in"
    >
      <CheckCircle aria-hidden size={16} className="shrink-0 text-[var(--accent)]" />
      <span className="text-[var(--text)]">{message}</span>
    </div>
  );
}
