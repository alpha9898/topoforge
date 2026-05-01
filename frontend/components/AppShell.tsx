"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Check, Network } from "lucide-react";
import { ThemeToggle } from "@/components/ThemeToggle";

const steps = [
  { href: "/upload", label: "Upload" },
  { href: "/review", label: "Review" },
  { href: "/clarifications", label: "Clarify" },
  { href: "/preview", label: "Preview" },
  { href: "/export", label: "Export" },
];

export function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const activeIndex = Math.max(0, steps.findIndex((s) => pathname.startsWith(s.href)));

  const [dirState, setDirState] = useState<{ direction: "forward" | "backward"; lastIndex: number }>(
    { direction: "forward", lastIndex: activeIndex }
  );
  if (dirState.lastIndex !== activeIndex) {
    setDirState({
      direction: activeIndex >= dirState.lastIndex ? "forward" : "backward",
      lastIndex: activeIndex,
    });
  }

  return (
    <div className="min-h-screen">
      <header className="sticky top-0 z-20 border-b border-[var(--line)] backdrop-blur-sm" style={{ backgroundColor: "var(--header-bg)" }}>
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-6 px-4 py-3 sm:px-6">
          <Link href="/upload" className="focus-ring flex shrink-0 items-center gap-2 rounded-md">
            <Network aria-hidden size={17} className="text-[var(--accent)]" />
            <span className="text-sm font-semibold text-[var(--text)]">TopoForge</span>
          </Link>

          <nav aria-label="Wizard steps" className="hidden items-center lg:flex">
            {steps.map((step, index) => {
              const done = index < activeIndex;
              const active = index === activeIndex;
              return (
                <div key={step.href} className="flex items-center">
                  {index > 0 && (
                    <span aria-hidden className="mx-1 select-none text-[10px] text-[var(--line)]">›</span>
                  )}
                  <Link
                    href={step.href}
                    className={[
                      "focus-ring flex items-center gap-1.5 rounded-md px-2.5 py-1.5 text-xs font-medium transition-colors",
                      active ? "bg-[var(--accent-soft)] text-[var(--accent)]"
                        : done ? "text-[var(--muted)] hover:text-[var(--text)]"
                        : "text-[var(--muted)] opacity-50",
                    ].join(" ")}
                  >
                    <span
                      aria-hidden
                      className={[
                        "flex h-4 w-4 shrink-0 items-center justify-center rounded-full text-[10px] font-semibold",
                        active ? "bg-[var(--accent)] text-white"
                          : done ? "text-[var(--accent)]"
                          : "text-[var(--muted)]",
                      ].join(" ")}
                    >
                      {done
                        ? <span className="anim-scale-in flex items-center justify-center"><Check size={10} strokeWidth={2.5} /></span>
                        : index + 1}
                    </span>
                    {step.label}
                  </Link>
                </div>
              );
            })}
          </nav>

          <ThemeToggle />
        </div>

        <nav
          aria-label="Wizard steps"
          className="flex gap-0.5 overflow-x-auto border-t border-[var(--line)] px-4 py-2 lg:hidden"
        >
          {steps.map((step, index) => {
            const done = index < activeIndex;
            const active = index === activeIndex;
            return (
              <div key={step.href} className="flex shrink-0 items-center">
                {index > 0 && (
                  <span aria-hidden className="mx-1 select-none text-[10px] text-[var(--line)]">›</span>
                )}
                <Link
                  href={step.href}
                  className={[
                    "focus-ring flex items-center gap-1.5 rounded-md px-2.5 py-1.5 text-xs font-medium transition-colors",
                    active ? "bg-[var(--accent-soft)] text-[var(--accent)]"
                      : done ? "text-[var(--muted)]"
                      : "text-[var(--muted)] opacity-50",
                  ].join(" ")}
                >
                  <span
                    aria-hidden
                    className={[
                      "flex h-4 w-4 shrink-0 items-center justify-center rounded-full text-[10px] font-semibold",
                      active ? "bg-[var(--accent)] text-white"
                        : done ? "text-[var(--accent)]"
                        : "text-[var(--muted)]",
                    ].join(" ")}
                  >
                    {done
                      ? <span className="anim-scale-in flex items-center justify-center"><Check size={10} strokeWidth={2.5} /></span>
                      : index + 1}
                  </span>
                  {step.label}
                </Link>
              </div>
            );
          })}
        </nav>
      </header>

      <main
        key={pathname}
        className={[
          dirState.direction === "forward" ? "page-slide-forward" : "page-slide-backward",
          "mx-auto max-w-7xl px-4 py-8 sm:px-6",
        ].join(" ")}
      >
        {children}
      </main>
    </div>
  );
}
