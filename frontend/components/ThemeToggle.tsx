"use client";

import { Moon, Sun } from "lucide-react";
import { useTheme } from "@/components/ThemeProvider";

export function ThemeToggle() {
  const { theme, toggleTheme } = useTheme();
  const isDark = theme === "dark";

  return (
    <button
      type="button"
      aria-label={`Switch to ${isDark ? "light" : "dark"} theme`}
      onClick={toggleTheme}
      className="focus-ring inline-flex h-8 w-8 items-center justify-center rounded-md border border-[var(--line)] bg-[var(--surface)] text-[var(--muted)] transition-colors hover:border-[var(--line-strong)] hover:text-[var(--text)]"
    >
      {isDark ? <Sun aria-hidden size={15} /> : <Moon aria-hidden size={15} />}
    </button>
  );
}
