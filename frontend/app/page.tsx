"use client";

import React from "react";
import Link from "next/link";
import {
  Network,
  ChevronRight,
  ArrowRight,
  FileSpreadsheet,
  Download,
  CheckCircle,
  ScanSearch,
  Sparkles,
  FileCode2,
  LayoutTemplate,
} from "lucide-react";
import { ThemeToggle } from "@/components/ThemeToggle";

// ── Hooks ─────────────────────────────────────────────────────────────────────

function useInView(threshold = 0.15): [React.RefCallback<Element>, boolean] {
  const [inView, setInView] = React.useState(false);
  const observerRef = React.useRef<IntersectionObserver | null>(null);

  const ref = React.useCallback(
    (node: Element | null) => {
      if (observerRef.current) {
        observerRef.current.disconnect();
        observerRef.current = null;
      }
      if (!node) return;
      observerRef.current = new IntersectionObserver(
        (entries) => {
          const first = entries[0];
          if (first?.isIntersecting) {
            setInView(true);
            observerRef.current?.disconnect();
          }
        },
        { threshold },
      );
      observerRef.current.observe(node);
    },
    [threshold],
  );

  return [ref, inView];
}

function useCountUp(target: number, duration = 1200, enabled = false): number {
  const [count, setCount] = React.useState(0);

  React.useEffect(() => {
    if (!enabled) return;
    setCount(0);
    const start = performance.now();
    let frameId: number;
    function tick(now: number) {
      const elapsed = now - start;
      const progress = Math.min(elapsed / duration, 1);
      const eased = 1 - (1 - progress) * (1 - progress);
      setCount(Math.round(eased * target));
      if (progress < 1) frameId = requestAnimationFrame(tick);
    }
    frameId = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frameId);
  }, [enabled, target, duration]);

  return count;
}

// ── SVG Topology Diagram ──────────────────────────────────────────────────────

const TOPO_NODES = [
  { id: "fw",  label: "Firewall",  x: 50, y: 16 },
  { id: "sw1", label: "Core SW-1", x: 28, y: 42 },
  { id: "sw2", label: "Core SW-2", x: 72, y: 42 },
  { id: "ac1", label: "Access-A",  x: 12, y: 70 },
  { id: "ac2", label: "Access-B",  x: 50, y: 70 },
  { id: "ac3", label: "Access-C",  x: 88, y: 70 },
];

const TOPO_EDGES: ReadonlyArray<readonly [string, string]> = [
  ["fw",  "sw1"],
  ["fw",  "sw2"],
  ["sw1", "ac1"],
  ["sw1", "ac2"],
  ["sw2", "ac2"],
  ["sw2", "ac3"],
];

const nodeMap = new Map<string, { x: number; y: number }>(
  TOPO_NODES.map((n) => [n.id, { x: n.x, y: n.y }]),
);

function TopoSVG() {
  return (
    <div aria-hidden="true" className="mx-auto w-full max-w-md select-none">
      <svg viewBox="0 0 100 84" className="w-full">
        <style>{`
          @keyframes draw-edge {
            from { stroke-dashoffset: 150; }
            to   { stroke-dashoffset: 0; }
          }
          .topo-edge {
            stroke-dasharray: 150;
            stroke-dashoffset: 150;
            animation: draw-edge 700ms cubic-bezier(0.16, 1, 0.3, 1) forwards;
          }
        `}</style>

        {/* Edges — rendered first so they sit behind nodes */}
        {TOPO_EDGES.map(([from, to], i) => {
          const a = nodeMap.get(from);
          const b = nodeMap.get(to);
          if (!a || !b) return null;
          return (
            <line
              key={`${from}-${to}`}
              className="topo-edge"
              x1={a.x} y1={a.y}
              x2={b.x} y2={b.y}
              stroke="var(--line-strong)"
              strokeWidth="0.6"
              style={{ animationDelay: `${320 + i * 80}ms` }}
            />
          );
        })}

        {/* Nodes */}
        {TOPO_NODES.map(({ id, label, x, y }, i) => (
          <g
            key={id}
            className="anim-scale-in"
            style={{ animationDelay: `${i * 90}ms` }}
          >
            <rect
              x={x - 12} y={y - 5}
              width={24} height={10}
              rx="2"
              fill="var(--surface)"
              stroke="var(--accent)"
              strokeWidth="0.7"
            />
            <text
              x={x} y={y + 1.8}
              textAnchor="middle"
              fontSize="2.7"
              fill="var(--muted)"
              fontFamily="ui-monospace, monospace"
            >
              {label}
            </text>
          </g>
        ))}
      </svg>
    </div>
  );
}

// ── Landing Header ────────────────────────────────────────────────────────────

function LandingHeader() {
  return (
    <header
      className="sticky top-0 z-20 border-b border-[var(--line)] backdrop-blur-sm"
      style={{ backgroundColor: "var(--header-bg)" }}
    >
      <div className="mx-auto flex max-w-7xl items-center justify-between gap-6 px-4 py-3 sm:px-6">
        <Link href="/" className="focus-ring flex shrink-0 items-center gap-2 rounded-md">
          <Network aria-hidden size={17} className="text-[var(--accent)]" />
          <span className="text-sm font-semibold text-[var(--text)]">TopoForge</span>
        </Link>
        <div className="flex items-center gap-2">
          <ThemeToggle />
          <Link
            href="/upload"
            className="focus-ring inline-flex h-9 items-center justify-center gap-2 rounded-md bg-[var(--accent)] px-4 text-sm font-medium text-white transition-[colors,transform] hover:bg-[var(--accent-strong)] active:scale-[0.97]"
          >
            Get Started
            <ChevronRight aria-hidden size={14} />
          </Link>
        </div>
      </div>
    </header>
  );
}

// ── Hero ──────────────────────────────────────────────────────────────────────

function HeroSection() {
  return (
    <section className="page-enter flex min-h-[85dvh] flex-col items-center justify-center px-4 py-20 text-center sm:px-6">
      <p className="mb-4 text-xs font-semibold uppercase tracking-widest text-[var(--accent)]">
        Network Diagrams, Automated
      </p>
      <h1
        className="mb-4 max-w-2xl text-4xl font-bold tracking-tight text-[var(--text)] sm:text-5xl"
        style={{ textWrap: "balance" } as React.CSSProperties}
      >
        Turn network spreadsheets into diagrams — instantly
      </h1>
      <p className="mb-8 max-w-xl text-base text-[var(--muted)]">
        Drop in your LLD Excel file and TopoForge produces a standards-compliant
        Draw.io topology diagram in seconds. No Visio license. No manual redrawing.
      </p>

      <div className="mb-14 flex flex-wrap items-center justify-center gap-3">
        <Link
          href="/upload"
          className="focus-ring inline-flex h-10 items-center justify-center gap-2 rounded-md bg-[var(--accent)] px-5 text-sm font-medium text-white transition-[colors,transform] hover:bg-[var(--accent-strong)] active:scale-[0.97]"
        >
          Start for free
          <ArrowRight aria-hidden size={15} />
        </Link>
        <button
          type="button"
          onClick={() =>
            document.getElementById("how-it-works")?.scrollIntoView({ behavior: "smooth" })
          }
          className="focus-ring inline-flex h-10 items-center justify-center gap-2 rounded-md border border-[var(--line)] bg-[var(--surface)] px-5 text-sm font-medium text-[var(--text)] transition-[colors,transform] hover:border-[var(--line-strong)] hover:bg-[var(--surface-elevated)] active:scale-[0.97]"
        >
          See how it works ↓
        </button>
      </div>

      <TopoSVG />
    </section>
  );
}

// ── How It Works ──────────────────────────────────────────────────────────────

interface HowStep {
  icon: React.ElementType;
  number: string;
  title: string;
  description: string;
}

const HOW_STEPS: HowStep[] = [
  {
    icon: FileSpreadsheet,
    number: "01",
    title: "Upload your spreadsheet",
    description:
      "Drop in an Excel or CSV file containing your device list and connection table. TopoForge accepts .xlsx, .xls, .xlsm, and .csv formats up to 20 MB.",
  },
  {
    icon: CheckCircle,
    number: "02",
    title: "Review & correct the topology",
    description:
      "Inspect the parsed devices and cables. Use the AI helper to resolve ambiguous aliases, merge duplicates, and flag phantom connections.",
  },
  {
    icon: Download,
    number: "03",
    title: "Export your Draw.io diagram",
    description:
      "Generate standards-compliant mxGraph XML with automatic tiered layout, cable colour-coding, and port labels. Open it in Draw.io, Confluence, or VS Code.",
  },
];

function HowItWorksSection() {
  const [ref, inView] = useInView();
  return (
    <section
      id="how-it-works"
      ref={ref}
      className="mx-auto w-full max-w-7xl px-4 py-20 sm:px-6"
    >
      <div className="mb-10 text-center">
        <p className="mb-2 text-xs font-semibold uppercase tracking-widest text-[var(--accent)]">
          How it works
        </p>
        <h2 className="text-2xl font-bold text-[var(--text)]">
          Three steps from spreadsheet to diagram
        </h2>
      </div>

      <div className="grid gap-5 sm:grid-cols-3">
        {HOW_STEPS.map(({ icon: Icon, number, title, description }, i) => (
          <div
            key={number}
            className={[
              "app-card p-6 transition-[transform,box-shadow] duration-200",
              "hover:-translate-y-1 hover:shadow-[var(--shadow-md)]",
              inView ? "anim-fade-in-up" : "opacity-0",
            ].join(" ")}
            style={inView ? { animationDelay: `${i * 80}ms` } : undefined}
          >
            <div className="mb-4 flex items-center gap-3">
              <span className="text-xs font-bold tabular-nums text-[var(--muted)]">{number}</span>
              <span className="flex h-9 w-9 items-center justify-center rounded-md bg-[var(--accent-soft)]">
                <Icon aria-hidden size={18} className="text-[var(--accent)]" />
              </span>
            </div>
            <h3 className="mb-1.5 text-sm font-semibold text-[var(--text)]">{title}</h3>
            <p className="text-sm text-[var(--muted)]">{description}</p>
          </div>
        ))}
      </div>
    </section>
  );
}

// ── Features ──────────────────────────────────────────────────────────────────

interface Feature {
  icon: React.ElementType;
  title: string;
  description: string;
}

const FEATURES: Feature[] = [
  {
    icon: ScanSearch,
    title: "Smart Header Detection",
    description:
      "Recognises 30+ column name variants — 'Device', 'Node', 'Hostname', 'Host', and more — without any configuration.",
  },
  {
    icon: Sparkles,
    title: "AI-Assisted Parsing",
    description:
      "Gemini enrichment suggests alias merges and flags suspicious connections. IP addresses are redacted before being sent.",
  },
  {
    icon: FileCode2,
    title: "Instant Draw.io Export",
    description:
      "Produces standards-compliant mxGraph XML — open in diagrams.net, Draw.io Desktop, the VS Code extension, or embed in Confluence.",
  },
  {
    icon: LayoutTemplate,
    title: "Enterprise Layout Engine",
    description:
      "Automatic tiered HLD placement across External, ISP, Firewall, Switch, and Server layers. Seven cable types colour-coded.",
  },
];

function FeaturesSection() {
  const [ref, inView] = useInView();
  return (
    <section
      ref={ref}
      className="py-20"
      style={{ backgroundColor: "var(--surface-elevated)" }}
    >
      <div className="mx-auto max-w-7xl px-4 sm:px-6">
        <div className="mb-10 text-center">
          <p className="mb-2 text-xs font-semibold uppercase tracking-widest text-[var(--accent)]">
            Features
          </p>
          <h2 className="text-2xl font-bold text-[var(--text)]">
            Everything you need, nothing you don&apos;t
          </h2>
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          {FEATURES.map(({ icon: Icon, title, description }, i) => (
            <div
              key={title}
              className={[
                "app-card p-5 transition-[transform,box-shadow] duration-200",
                "hover:-translate-y-0.5 hover:shadow-[var(--shadow-md)]",
                inView ? "anim-fade-in-up" : "opacity-0",
              ].join(" ")}
              style={inView ? { animationDelay: `${i * 80}ms` } : undefined}
            >
              <span className="mb-3 flex h-9 w-9 items-center justify-center rounded-md bg-[var(--accent-soft)]">
                <Icon aria-hidden size={18} className="text-[var(--accent)]" />
              </span>
              <h3 className="mb-1 text-sm font-semibold text-[var(--text)]">{title}</h3>
              <p className="text-sm text-[var(--muted)]">{description}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

// ── Stats ─────────────────────────────────────────────────────────────────────

interface StatDef {
  value: number;
  suffix: string;
  label: string;
}

const STATS: StatDef[] = [
  { value: 30, suffix: "+", label: "column aliases recognised" },
  { value: 7,  suffix: "",  label: "cable types auto-coloured" },
  { value: 6,  suffix: "h", label: "session — no sign-up needed" },
];

interface StatItemProps extends StatDef {
  enabled: boolean;
}

function StatItem({ value, suffix, label, enabled }: StatItemProps) {
  const count = useCountUp(value, 1200, enabled);
  return (
    <div className="flex flex-col items-center gap-1 text-center">
      <span className="text-3xl font-bold tabular-nums text-[var(--text)]">
        {count}
        {suffix}
      </span>
      <span className="text-sm text-[var(--muted)]">{label}</span>
    </div>
  );
}

function StatsSection() {
  const [ref, inView] = useInView(0.4);
  return (
    <section
      ref={ref}
      className="mx-auto w-full max-w-7xl px-4 py-20 sm:px-6"
    >
      <div
        className={[
          "app-card flex flex-wrap items-center justify-around gap-10 px-8 py-10",
          inView ? "anim-fade-in-up" : "opacity-0",
        ].join(" ")}
      >
        {STATS.map((stat) => (
          <StatItem key={stat.label} {...stat} enabled={inView} />
        ))}
      </div>
    </section>
  );
}

// ── Final CTA ─────────────────────────────────────────────────────────────────

function FinalCTASection() {
  const [ref, inView] = useInView();
  return (
    <section
      ref={ref}
      className={[
        "py-24 text-center",
        inView ? "anim-fade-in-up" : "opacity-0",
      ].join(" ")}
      style={{ backgroundColor: "var(--surface-elevated)" }}
    >
      <div className="mx-auto max-w-xl px-4 sm:px-6">
        <h2 className="mb-2 text-2xl font-bold text-[var(--text)]">
          Ready to map your network?
        </h2>
        <p className="mb-8 text-sm text-[var(--muted)]">
          No account required. No data stored on our servers. Your files are
          processed and discarded within your 6-hour session.
        </p>
        <Link
          href="/upload"
          className="focus-ring inline-flex h-10 items-center justify-center gap-2 rounded-md bg-[var(--accent)] px-6 text-sm font-medium text-white transition-[colors,transform] hover:bg-[var(--accent-strong)] active:scale-[0.97]"
        >
          <FileSpreadsheet aria-hidden size={16} />
          Upload your spreadsheet →
        </Link>
      </div>
    </section>
  );
}

// ── Footer ────────────────────────────────────────────────────────────────────

function LandingFooter() {
  return (
    <footer className="border-t border-[var(--line)] py-6 text-center">
      <p className="text-xs text-[var(--muted)]">
        TopoForge — No account required. No data stored.
      </p>
    </footer>
  );
}

// ── Page ──────────────────────────────────────────────────────────────────────

export default function LandingPage() {
  return (
    <div className="min-h-screen" style={{ backgroundColor: "var(--bg)" }}>
      <LandingHeader />
      <main>
        <HeroSection />
        <HowItWorksSection />
        <FeaturesSection />
        <StatsSection />
        <FinalCTASection />
      </main>
      <LandingFooter />
    </div>
  );
}
