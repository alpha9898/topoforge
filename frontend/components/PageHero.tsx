import type { ReactNode } from "react";

export function PageHero({
  eyebrow = "Topology pipeline",
  title,
  description,
  children
}: {
  eyebrow?: string;
  title: string;
  description: string;
  children?: ReactNode;
}) {
  return (
    <section className="hero-frame scan-line mx-auto mb-8 max-w-5xl px-5 py-8 text-center sm:px-8">
      <div className="relative z-10 mx-auto max-w-3xl">
        <span className="hero-kicker">{eyebrow}</span>
        <h2 className="mt-5 text-3xl font-semibold tracking-normal text-ink sm:text-4xl">{title}</h2>
        <p className="mx-auto mt-3 max-w-2xl text-sm leading-6 text-muted sm:text-base">{description}</p>
        {children && <div className="mt-6">{children}</div>}
      </div>
    </section>
  );
}
