import type { ReactNode } from "react";
import { cn } from "@/lib/cn";

export type Tone = "lime" | "danger" | "warn" | "info" | "neutral";

const tones: Record<Tone, string> = {
  lime: "border-lime/25 bg-lime/10 text-lime",
  danger: "border-danger/30 bg-danger/10 text-danger",
  warn: "border-warn/30 bg-warn/10 text-warn",
  info: "border-info/25 bg-info/10 text-info",
  neutral: "border-line bg-white/[0.04] text-mist",
};

const dots: Record<Tone, string> = {
  lime: "bg-lime",
  danger: "bg-danger",
  warn: "bg-warn",
  info: "bg-info",
  neutral: "bg-mist-dim",
};

export function Badge({
  tone = "neutral",
  children,
  className,
  dot = false,
}: {
  tone?: Tone;
  children: ReactNode;
  className?: string;
  dot?: boolean;
}) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5",
        "font-mono text-[0.6875rem] leading-5 tracking-wide uppercase",
        tones[tone],
        className,
      )}
    >
      {dot && <span className={cn("size-1.5 rounded-full", dots[tone])} />}
      {children}
    </span>
  );
}

/** A dot with a slow expanding ring — used for "live" / "armed" indicators. */
export function StatusDot({
  tone = "lime",
  className,
  pulse = true,
}: {
  tone?: Tone;
  className?: string;
  pulse?: boolean;
}) {
  return (
    <span className={cn("relative grid size-2 place-items-center", className)}>
      {pulse && (
        <span
          className={cn("absolute size-2 rounded-full animate-pulse-ring", dots[tone])}
          aria-hidden="true"
        />
      )}
      <span className={cn("size-2 rounded-full", dots[tone])} />
    </span>
  );
}

/** Small mono key/value used inside cards. */
export function Meta({
  label,
  children,
  className,
}: {
  label: string;
  children: ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("flex items-baseline justify-between gap-3", className)}>
      <span className="font-mono text-[0.6875rem] tracking-wide text-mist-dim uppercase">
        {label}
      </span>
      <span className="tabular text-sm text-white">{children}</span>
    </div>
  );
}
