import type { ReactNode } from "react";
import Image, { type StaticImageData } from "next/image";
import { cn } from "@/lib/cn";
import { Reveal } from "./reveal";

export function Eyebrow({
  index,
  children,
  className,
}: {
  /** Two-digit position in the page's running order, e.g. "03". Decorative. */
  index?: string;
  children: ReactNode;
  className?: string;
}) {
  return (
    <p
      className={cn(
        "flex items-center gap-3 font-mono text-[0.6875rem] tracking-[0.18em] uppercase",
        className,
      )}
    >
      {index && (
        <span
          aria-hidden="true"
          className="neu tabular grid size-6 shrink-0 place-items-center rounded-[0.45rem] text-[0.5625rem] leading-none text-lime"
        >
          {index}
        </span>
      )}
      <span className="text-mist">{children}</span>
    </p>
  );
}

export function Section({
  id,
  eyebrow,
  index,
  title,
  lead,
  actions,
  icon,
  art,
  children,
  className,
  headerClassName,
  wide = false,
  clip = true,
}: {
  id?: string;
  eyebrow?: ReactNode;
  /** Running order of this section on the page, e.g. "03". */
  index?: string;
  title?: ReactNode;
  lead?: ReactNode;
  actions?: ReactNode;
  /** Line-art glyph for the header's right-hand column. Decorative. */
  icon?: StaticImageData;
  /** A `<SectionArt>` bled behind the content. Rendered first so content wins. */
  art?: ReactNode;
  children: ReactNode;
  className?: string;
  headerClassName?: string;
  /** Opt into the wider 1280px container for dense tables. */
  wide?: boolean;
  /**
   * Clip `art` to the section box. Turn off when a piece of art is meant to run
   * past the seam into the section above. `clip` uses `overflow-clip`, never
   * `overflow-hidden`: two sections hold `position: sticky` children and a
   * scroll container would silently stop them sticking.
   */
  clip?: boolean;
}) {
  return (
    <section
      id={id}
      className={cn(
        "relative scroll-mt-24 px-5 py-20 sm:px-8 sm:py-28",
        clip && "overflow-clip",
        className,
      )}
    >
      {art}
      {/* `relative` so the content paints over `art`, which is positioned. */}
      <div className={cn("relative mx-auto w-full", wide ? "max-w-7xl" : "max-w-6xl")}>
        {(eyebrow || title || lead || actions) && (
          <Reveal>
            <header
              className={cn(
                "mb-12 flex flex-col gap-6 sm:mb-16 lg:flex-row lg:items-end lg:justify-between",
                headerClassName,
              )}
            >
              <div className="max-w-2xl">
                {eyebrow && <Eyebrow index={index}>{eyebrow}</Eyebrow>}
                {title && (
                  <h2 className="mt-5 text-[clamp(1.9rem,4.2vw,3.1rem)] leading-[1.05] text-fg text-balance">
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
              {icon && (
                <Image
                  src={icon}
                  alt=""
                  aria-hidden="true"
                  className="section-icon size-20 shrink-0 select-none opacity-90 lg:size-28"
                />
              )}
            </header>
          </Reveal>
        )}
        {children}
      </div>
    </section>
  );
}
