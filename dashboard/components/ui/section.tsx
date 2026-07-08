import type { ReactNode } from "react";
import { cn } from "@/lib/cn";
import { Reveal } from "./reveal";

export function Eyebrow({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <p
      className={cn(
        "flex items-center gap-2.5 font-mono text-[0.6875rem] tracking-[0.18em] text-lime uppercase",
        className,
      )}
    >
      <span aria-hidden="true" className="h-px w-6 bg-lime/50" />
      {children}
    </p>
  );
}

export function Section({
  id,
  eyebrow,
  title,
  lead,
  actions,
  children,
  className,
  headerClassName,
  wide = false,
}: {
  id?: string;
  eyebrow?: ReactNode;
  title?: ReactNode;
  lead?: ReactNode;
  actions?: ReactNode;
  children: ReactNode;
  className?: string;
  headerClassName?: string;
  /** Opt into the wider 1280px container for dense tables. */
  wide?: boolean;
}) {
  return (
    <section id={id} className={cn("relative scroll-mt-24 px-5 py-20 sm:px-8 sm:py-28", className)}>
      <div className={cn("mx-auto w-full", wide ? "max-w-7xl" : "max-w-6xl")}>
        {(eyebrow || title || lead || actions) && (
          <Reveal>
            <header
              className={cn(
                "mb-12 flex flex-col gap-6 sm:mb-16 lg:flex-row lg:items-end lg:justify-between",
                headerClassName,
              )}
            >
              <div className="max-w-2xl">
                {eyebrow && <Eyebrow>{eyebrow}</Eyebrow>}
                {title && (
                  <h2 className="mt-5 text-[clamp(1.9rem,4.2vw,3.1rem)] leading-[1.05] text-white text-balance">
                    {title}
                  </h2>
                )}
                {lead && (
                  <p className="mt-5 max-w-xl text-[1.0625rem] leading-relaxed text-mist text-pretty">
                    {lead}
                  </p>
                )}
              </div>
              {actions && <div className="flex shrink-0 items-center gap-3">{actions}</div>}
            </header>
          </Reveal>
        )}
        {children}
      </div>
    </section>
  );
}
