import type { ElementType, ReactNode } from "react";
import { cn } from "@/lib/cn";

export function Panel({
  as: Tag = "div",
  className,
  children,
  flat = false,
  hover = false,
}: {
  as?: ElementType;
  className?: string;
  children: ReactNode;
  /** Drop the glass highlight — for nested / secondary surfaces. */
  flat?: boolean;
  /** Lift off the canvas on hover. Meaningless on `flat` — it casts no shadow. */
  hover?: boolean;
}) {
  return (
    <Tag
      className={cn(
        flat ? "panel-flat" : "panel",
        hover && "neu-raise hover:border-lime/30",
        className,
      )}
    >
      {children}
    </Tag>
  );
}

export function PanelHeader({
  title,
  hint,
  children,
  className,
}: {
  title: ReactNode;
  hint?: ReactNode;
  /** Right-hand slot: badges, toggles. */
  children?: ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "flex flex-wrap items-start justify-between gap-4 border-b border-line px-5 py-4 sm:px-6",
        className,
      )}
    >
      <div className="min-w-0">
        <h3 className="text-base font-semibold text-white">{title}</h3>
        {hint && <p className="mt-1 text-sm text-mist-dim">{hint}</p>}
      </div>
      {children && <div className="flex shrink-0 items-center gap-2">{children}</div>}
    </div>
  );
}
