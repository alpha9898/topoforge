import type { ReactNode } from "react";

export function PageHero({
  eyebrow,
  title,
  description,
  children,
}: {
  eyebrow?: string;
  title: string;
  description: string;
  children?: ReactNode;
}) {
  return (
    <div className="mb-6 w-full">
      {eyebrow && (
        <p className="mb-1.5 text-xs font-semibold uppercase tracking-widest text-[var(--accent)]">
          {eyebrow}
        </p>
      )}
      <h2 className="text-xl font-semibold text-[var(--text)]" style={{ textWrap: "balance" } as React.CSSProperties}>
        {title}
      </h2>
      <p className="mt-1 max-w-2xl text-sm text-[var(--muted)]">{description}</p>
      {children && <div className="mt-4">{children}</div>}
    </div>
  );
}
