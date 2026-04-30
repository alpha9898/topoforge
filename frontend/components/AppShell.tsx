"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { CheckCircle2, Circle, Network } from "lucide-react";
import { ThemeToggle } from "@/components/ThemeToggle";

const steps = [
  { href: "/upload", label: "Upload" },
  { href: "/review", label: "Review" },
  { href: "/clarifications", label: "Clarify" },
  { href: "/preview", label: "Preview" },
  { href: "/export", label: "Export" }
];

export function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const activeIndex = Math.max(0, steps.findIndex((step) => pathname.startsWith(step.href)));

  return (
    <main className="min-h-screen">
      <header className="sticky top-0 z-20 border-b border-line bg-surface/80 backdrop-blur-xl">
        <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-4 px-4 py-4 sm:px-6">
          <div className="flex min-w-0 items-center gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-md bg-accent text-white shadow-sm">
              <Network aria-hidden size={22} />
            </div>
            <div className="min-w-0">
              <h1 className="text-xl font-semibold tracking-normal text-ink">TopoForge</h1>
              <p className="truncate text-sm text-muted">LLD Excel to editable Draw.io HLD</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <nav className="hidden items-center gap-1 rounded-md border border-line bg-panel p-1 lg:flex">
              {steps.map((step, index) => {
                const done = index < activeIndex;
                const active = index === activeIndex;
                const Icon = done ? CheckCircle2 : Circle;
                return (
                  <Link
                    key={step.href}
                    href={step.href}
                    className={`focus-ring flex items-center gap-2 rounded-md px-3 py-2 text-sm transition ${
                      active ? "bg-[var(--accent-soft)] text-accent shadow-sm" : "text-muted hover:bg-surface hover:text-ink"
                    }`}
                  >
                    <Icon aria-hidden size={16} />
                    {step.label}
                  </Link>
                );
              })}
            </nav>
            <ThemeToggle />
          </div>
          <nav className="flex w-full gap-2 overflow-x-auto rounded-md border border-line bg-panel p-1 lg:hidden">
            {steps.map((step, index) => {
              const done = index < activeIndex;
              const active = index === activeIndex;
              const Icon = done ? CheckCircle2 : Circle;
              return (
                <Link
                  key={step.href}
                  href={step.href}
                  className={`focus-ring flex shrink-0 items-center gap-2 rounded-md px-3 py-2 text-sm transition ${
                    active ? "bg-[var(--accent-soft)] text-accent shadow-sm" : "text-muted hover:bg-surface hover:text-ink"
                  }`}
                >
                  <Icon aria-hidden size={16} />
                  {step.label}
                </Link>
              );
            })}
          </nav>
        </div>
      </header>
      <section className="page-enter mx-auto flex max-w-7xl flex-col items-center px-4 py-8 sm:px-6">{children}</section>
    </main>
  );
}
