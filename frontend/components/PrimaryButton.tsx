"use client";

import type { ButtonHTMLAttributes } from "react";

export function PrimaryButton({ className = "", ...props }: ButtonHTMLAttributes<HTMLButtonElement>) {
  return (
    <button
      {...props}
      className={`focus-ring inline-flex h-10 items-center justify-center gap-2 rounded-md border border-[var(--accent-strong)] bg-accent px-4 text-sm font-medium text-white shadow-sm transition hover:brightness-105 active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-55 disabled:active:scale-100 ${className}`}
    />
  );
}

export function SecondaryButton({ className = "", ...props }: ButtonHTMLAttributes<HTMLButtonElement>) {
  return (
    <button
      {...props}
      className={`focus-ring inline-flex h-10 items-center justify-center gap-2 rounded-md border border-line bg-surface/80 px-4 text-sm font-medium text-ink shadow-sm backdrop-blur transition hover:border-[var(--line-strong)] hover:bg-panel active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-55 disabled:active:scale-100 ${className}`}
    />
  );
}
