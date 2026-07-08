import { cn } from "@/lib/cn";

/**
 * The mark is a suppression nozzle seen head-on: a charged core, a discharge
 * ring, and four jets. It doubles as the "O" in HALON.
 */
export function HalonMark({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 32 32"
      fill="none"
      aria-hidden="true"
      className={cn("size-8", className)}
    >
      <circle cx="16" cy="16" r="14.25" stroke="currentColor" strokeWidth="1.5" opacity="0.25" />
      <circle cx="16" cy="16" r="9.25" stroke="currentColor" strokeWidth="1.5" opacity="0.55" />
      <circle cx="16" cy="16" r="4.5" fill="currentColor" />
      {[0, 90, 180, 270].map((deg) => (
        <line
          key={deg}
          x1="16"
          y1="1"
          x2="16"
          y2="5.5"
          stroke="currentColor"
          strokeWidth="1.5"
          strokeLinecap="round"
          transform={`rotate(${deg} 16 16)`}
        />
      ))}
    </svg>
  );
}

export function HalonWordmark({
  className,
  markClassName,
}: {
  className?: string;
  markClassName?: string;
}) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-[0.1em] font-display text-2xl leading-none font-bold tracking-[-0.04em] text-white",
        className,
      )}
    >
      <span className="sr-only">HALON</span>
      <span aria-hidden="true">HAL</span>
      <HalonMark
        className={cn("size-[0.85em] shrink-0 translate-y-[0.02em] text-lime", markClassName)}
      />
      <span aria-hidden="true">N</span>
    </span>
  );
}
