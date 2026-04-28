"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { CheckCircle2, Circle } from "lucide-react";

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
      <header className="border-b border-line bg-white">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-4">
          <div>
            <h1 className="text-xl font-semibold tracking-normal text-ink">TopoForge</h1>
            <p className="text-sm text-slate-600">LLD Excel to editable Draw.io HLD</p>
          </div>
          <nav className="hidden items-center gap-2 md:flex">
            {steps.map((step, index) => {
              const done = index < activeIndex;
              const active = index === activeIndex;
              const Icon = done ? CheckCircle2 : Circle;
              return (
                <Link
                  key={step.href}
                  href={step.href}
                  className={`focus-ring flex items-center gap-2 rounded-md px-3 py-2 text-sm ${
                    active ? "bg-teal-50 text-teal-800" : "text-slate-600 hover:bg-slate-100"
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
      <section className="mx-auto max-w-7xl px-6 py-8">{children}</section>
    </main>
  );
}
