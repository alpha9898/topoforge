"use client";

import type { ButtonHTMLAttributes } from "react";

export function PrimaryButton({ className = "", ...props }: ButtonHTMLAttributes<HTMLButtonElement>) {
  return (
    <button
      {...props}
      className={[
        "focus-ring inline-flex h-9 items-center justify-center gap-2 rounded-md",
        "bg-[var(--accent)] px-4 text-sm font-medium text-white",
        "transition-[colors,transform] hover:bg-[var(--accent-strong)] active:scale-[0.97]",
        "disabled:cursor-not-allowed disabled:opacity-50 disabled:active:scale-100",
        className,
      ].join(" ")}
    />
  );
}

export function SecondaryButton({ className = "", ...props }: ButtonHTMLAttributes<HTMLButtonElement>) {
  return (
    <button
      {...props}
      className={[
        "focus-ring inline-flex h-9 items-center justify-center gap-2 rounded-md",
        "border border-[var(--line)] bg-[var(--surface)] px-4 text-sm font-medium text-[var(--text)]",
        "transition-[colors,transform] hover:border-[var(--line-strong)] hover:bg-[var(--surface-elevated)] active:scale-[0.97]",
        "disabled:cursor-not-allowed disabled:opacity-50 disabled:active:scale-100",
        className,
      ].join(" ")}
    />
  );
}
