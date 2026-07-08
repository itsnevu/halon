"use client";

import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { cn } from "@/lib/cn";
import { pct, usd, usd0, usdCompact } from "@/lib/format";

const useIsomorphicLayoutEffect = typeof window !== "undefined" ? useLayoutEffect : useEffect;

const easeOutExpo = (t: number) => (t === 1 ? 1 : 1 - Math.pow(2, -10 * t));

/**
 * React refuses to serialize a function prop across the RSC boundary, so a
 * Server Component cannot pass `format={usdCompact}` to this client component.
 * `preset` is a string, which crosses fine — that keeps callers like StatsStrip
 * and PoolVaults on the server where they belong.
 */
export type CountFormat = "usd" | "usd0" | "usdCompact" | "int" | "pct";

const PRESETS: Record<CountFormat, (n: number) => string> = {
  usd,
  usd0,
  usdCompact: (n) => usdCompact(n),
  int: (n) => Math.round(n).toLocaleString("en-US"),
  pct: (n) => pct(n),
};

/**
 * Counts up to `value` when scrolled into view.
 *
 * SSR renders the final, formatted number — so the page is correct with JS off
 * and correct for crawlers. On mount we reset to `from` before first paint,
 * which is why this uses a layout effect rather than a plain one.
 */
export function CountUp({
  value,
  from = 0,
  duration = 1400,
  preset = "int",
  format,
  className,
}: {
  value: number;
  from?: number;
  /** ms */
  duration?: number;
  /** Serializable formatter — safe to pass from a Server Component. */
  preset?: CountFormat;
  /** Escape hatch for client callers that need a bespoke formatter. */
  format?: (n: number) => string;
  className?: string;
}) {
  const fmt = format ?? PRESETS[preset];
  const ref = useRef<HTMLSpanElement>(null);
  const [display, setDisplay] = useState(value);
  const started = useRef(false);

  // Rewind to `from` before first paint — but ONLY for tiles that start below
  // the fold. An above-the-fold tile is already showing its SSR'd final value,
  // so rewinding it would flash value → 0 → value on every load. Those simply
  // keep the number they were served.
  useIsomorphicLayoutEffect(() => {
    const el = ref.current;
    if (!el) return;
    const reduced =
      typeof matchMedia !== "undefined" &&
      matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (reduced) return;

    const belowFold = el.getBoundingClientRect().top > window.innerHeight * 0.9;
    if (belowFold) setDisplay(from);
    else started.current = true; // already visible: don't animate, don't rewind
  }, [from]);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    const reduced =
      typeof matchMedia !== "undefined" &&
      matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (reduced || typeof IntersectionObserver === "undefined") {
      setDisplay(value);
      return;
    }

    let raf = 0;
    const run = () => {
      if (started.current) return;
      started.current = true;
      const t0 = performance.now();
      const tick = (now: number) => {
        const t = Math.min(1, (now - t0) / duration);
        setDisplay(from + (value - from) * easeOutExpo(t));
        if (t < 1) raf = requestAnimationFrame(tick);
      };
      raf = requestAnimationFrame(tick);
    };

    const io = new IntersectionObserver(
      (entries) => {
        if (entries.some((e) => e.isIntersecting)) {
          run();
          io.disconnect();
        }
      },
      { threshold: 0.2 },
    );
    io.observe(el);
    return () => {
      io.disconnect();
      cancelAnimationFrame(raf);
    };
  }, [value, from, duration]);

  return (
    <span ref={ref} className={cn("tabular", className)}>
      {fmt(display)}
    </span>
  );
}
