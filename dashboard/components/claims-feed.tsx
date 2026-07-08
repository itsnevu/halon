"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { DEMO_COVERAGE_USD, DEMO_QUOTE, EVENTS, PROTOCOL_STATS } from "@/lib/data";
import { agoLabel, basescanTx, secondsLabel, shortHash, usd, usd0 } from "@/lib/format";
import type { ChainEvent, EventKind, Severity, TxHash } from "@/lib/types";
import { cn } from "@/lib/cn";
import { Meta, StatusDot } from "@/components/ui/badge";
import { Reveal } from "@/components/ui/reveal";
import { Section } from "@/components/ui/section";

/* ── Filters ────────────────────────────────────────────────── */

type FilterId = "all" | "discharges" | "failures" | "bindings" | "capital";

const FILTERS: readonly { id: FilterId; label: string; kinds?: readonly EventKind[] }[] = [
  { id: "all", label: "All events" },
  { id: "discharges", label: "Discharges", kinds: ["discharge", "cascade_recovery"] },
  { id: "failures", label: "Failures", kinds: ["order_rejected", "order_expired"] },
  { id: "bindings", label: "Bindings", kinds: ["policy_bound", "reinsurance_bound"] },
  { id: "capital", label: "Capital", kinds: ["capital_deposit"] },
];

const matches = (ev: ChainEvent, id: FilterId): boolean => {
  const f = FILTERS.find((x) => x.id === id);
  return !f?.kinds || f.kinds.includes(ev.kind);
};

/* ── Presentation maps ──────────────────────────────────────── */

const SEVERITY_TONE: Record<Severity, string> = {
  good: "bg-lime/10 text-lime",
  bad: "bg-danger/10 text-danger",
  warn: "bg-warn/10 text-warn",
  info: "bg-white/[0.05] text-mist",
};

/** Kinds where the transfer lands in a pool or in a client's hands. */
const MOVES_MONEY: ReadonlySet<EventKind> = new Set<EventKind>([
  "discharge",
  "cascade_recovery",
  "policy_bound",
  "reinsurance_bound",
  "capital_deposit",
]);

function amountClass(ev: ChainEvent): string {
  if (ev.kind === "order_rejected") return "text-danger";
  if (ev.severity === "good" && MOVES_MONEY.has(ev.kind)) return "text-lime";
  return "text-white";
}

/** Money never gets hand-rolled — only the precision is chosen here. */
const money = (n: number) => (Math.abs(n) >= 1_000 ? usd0(n) : usd(n));

/* ── Icons — 16px viewBox, currentColor, decorative ─────────── */

const SVG = {
  className: "size-3.5",
  viewBox: "0 0 16 16",
  fill: "none",
  stroke: "currentColor",
  strokeWidth: 1.5,
  strokeLinecap: "round",
  strokeLinejoin: "round",
  "aria-hidden": true,
} as const;

function KindIcon({ kind }: { kind: EventKind }) {
  switch (kind) {
    case "discharge":
      return (
        <svg {...SVG}>
          <path d="M8 2.5v10" />
          <path d="M4 9l4 4 4-4" />
        </svg>
      );
    case "cascade_recovery":
    case "capital_deposit":
      return (
        <svg {...SVG}>
          <path d="M4.5 11.5 11.5 4.5" />
          <path d="M6 4.5h5.5V10" />
        </svg>
      );
    case "policy_bound":
    case "reinsurance_bound":
      return (
        <svg {...SVG}>
          <path d="M8 2.2 12.6 4v3.5c0 2.8-1.9 4.8-4.6 5.9-2.7-1.1-4.6-3.1-4.6-5.9V4z" />
        </svg>
      );
    case "order_rejected":
      return (
        <svg {...SVG}>
          <circle cx="8" cy="8" r="5.6" />
          <path d="M6.1 6.1 9.9 9.9M9.9 6.1 6.1 9.9" />
        </svg>
      );
    case "order_expired":
      return (
        <svg {...SVG}>
          <circle cx="8" cy="8" r="5.6" />
          <path d="M8 4.8V8l2.4 1.4" />
        </svg>
      );
    case "order_completed":
      return (
        <svg {...SVG}>
          <path d="M3.4 8.4 6.6 11.6 12.8 4.8" />
        </svg>
      );
    default:
      return (
        <svg {...SVG} fill="currentColor" stroke="none">
          <circle cx="8" cy="8" r="2.6" />
        </svg>
      );
  }
}

/* ── Simulated liveness ─────────────────────────────────────── */

const MAX_ROWS = 24;
const TICK_MS = 1_000;
const INJECT_MS = 11_000;
const LIVE_BLOCK = 24_918_406;

/** Deterministic pseudo-hex — never Math.random, so replays are identical. */
function hex(seed: number, chars: number): string {
  let x = seed >>> 0 || 0x9e3779b9;
  let out = "";
  while (out.length < chars) {
    x ^= x << 13;
    x >>>= 0;
    x ^= x >>> 17;
    x ^= x << 5;
    x >>>= 0;
    out += x.toString(16).padStart(8, "0");
  }
  return out.slice(0, chars);
}

/**
 * `agoSeconds` is negative by exactly the elapsed tick count, so that
 * `agoSeconds + elapsed === 0` on the frame it appears → "just now".
 */
function cannedEvent(n: number, elapsed: number): ChainEvent {
  const base = {
    id: `live-${n}`,
    agoSeconds: -elapsed,
    txHash: `0x${hex(6_100 + n, 64)}` as TxHash,
    blockNumber: LIVE_BLOCK + n,
  };
  switch (n % 3) {
    case 0:
      return {
        ...base,
        kind: "order_completed",
        title: "Kite Search delivered",
        detail: "CAP order reached terminal status `completed`. No claim. Reliability ticks up.",
        amountUsd: 25,
        from: "Helios Ops",
        to: "Kite Search",
        severity: "good",
      };
    case 1:
      return {
        ...base,
        kind: "policy_bound",
        title: `Policy #${1_044 + n} bound`,
        detail:
          "ERC-721 minted to the buyer. Premium landed in Sentinel Pool atomically, in the pay-tx.",
        amountUsd: DEMO_QUOTE.premiumUsd,
        from: "Vector Studio",
        to: "Sentinel Pool",
        severity: "good",
      };
    default:
      return {
        ...base,
        kind: "cascade_recovery",
        title: "Cascade recovery settled",
        detail: "Bastion Re Pool reimbursed Sentinel Pool for its quota share. Layer under layer.",
        amountUsd: DEMO_COVERAGE_USD * DEMO_QUOTE.cededShare,
        from: "Bastion Re Pool",
        to: "Sentinel Pool",
        severity: "good",
      };
  }
}

/* ── Component ──────────────────────────────────────────────── */

export function ClaimsFeed() {
  const [filter, setFilter] = useState<FilterId>("all");
  const [events, setEvents] = useState<ChainEvent[]>(() => EVENTS);
  /** Starts at 0 so SSR and the first client render agree. */
  const [elapsed, setElapsed] = useState(0);

  const elapsedRef = useRef(0);
  const injectedRef = useRef(0);

  useEffect(() => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

    const tick = window.setInterval(() => {
      elapsedRef.current += 1;
      setElapsed(elapsedRef.current);
    }, TICK_MS);

    const inject = window.setInterval(() => {
      const n = injectedRef.current++;
      const ev = cannedEvent(n, elapsedRef.current);
      setEvents((prev) => [ev, ...prev].slice(0, MAX_ROWS));
    }, INJECT_MS);

    return () => {
      window.clearInterval(tick);
      window.clearInterval(inject);
    };
  }, []);

  const counts = useMemo(() => {
    const out = {} as Record<FilterId, number>;
    for (const f of FILTERS) out[f.id] = events.filter((e) => matches(e, f.id)).length;
    return out;
  }, [events]);

  const visible = useMemo(() => events.filter((e) => matches(e, filter)), [events, filter]);

  return (
    <Section
      id="claims"
      wide
      eyebrow="Live"
      title="The discharge log."
      lead="order_rejected and order_expired are CAP's own terminal order states. We did not build a failure oracle — we subscribed to one."
    >
      <div className="grid items-start gap-6 lg:grid-cols-[260px_1fr]">
        {/* ── Left rail ─────────────────────────────────────── */}
        <Reveal className="lg:sticky lg:top-24">
          <aside className="panel-flat space-y-6 p-5">
            <div className="flex items-center justify-between">
              <span className="flex items-center gap-2.5">
                <StatusDot tone="lime" />
                <span className="font-mono text-xs tracking-[0.2em] text-white">LIVE</span>
              </span>
              <span aria-hidden="true" className="h-3 w-0.5 animate-blink bg-lime" />
            </div>

            <div className="font-mono text-[0.625rem] leading-relaxed text-mist-dim">
              <span className="block">
                wss:// connectWebSocket<span className="text-lime">()</span>
              </span>
              <span className="block text-pretty">subscribed: order_rejected, order_expired</span>
            </div>

            <div role="group" aria-label="Filter events" className="flex flex-col gap-1">
              {FILTERS.map((f) => {
                const active = f.id === filter;
                return (
                  <button
                    key={f.id}
                    type="button"
                    onClick={() => setFilter(f.id)}
                    aria-pressed={active}
                    className={cn(
                      "flex items-center justify-between gap-3 py-1.5 pr-2 pl-3 text-left text-[0.8125rem] transition-colors",
                      active
                        ? "border-l-2 border-lime bg-white/[0.05] text-white"
                        : "border-l border-line text-mist-dim hover:text-mist",
                    )}
                  >
                    <span>{f.label}</span>
                    <span className="tabular font-mono text-[0.625rem]">{counts[f.id]}</span>
                  </button>
                );
              })}
            </div>

            <div className="space-y-2 border-t border-line-soft pt-4">
              <Meta label="Median latency">
                {secondsLabel(PROTOCOL_STATS.medianDischargeSeconds)}
              </Meta>
              <Meta label="Disputes">0</Meta>
            </div>
          </aside>
        </Reveal>

        {/* ── Right: the log ────────────────────────────────── */}
        <Reveal delay={60}>
          <div className="panel overflow-hidden">
            <div className="flex items-center justify-between gap-4 border-b border-line px-5 py-3.5 font-mono text-[0.625rem] tracking-[0.16em] text-mist-dim uppercase">
              <span>Event stream</span>
              <span className="tabular">{visible.length} events</span>
            </div>

            {visible.length === 0 ? (
              <p className="p-12 text-center text-mist-dim">No events match this filter.</p>
            ) : (
              <ul className="no-scrollbar max-h-[560px] divide-y divide-line-soft overflow-y-auto">
                {visible.map((ev) => (
                  <li
                    key={ev.id}
                    className={cn(
                      "group grid grid-cols-[auto_1fr_auto] items-start gap-4 px-5 py-4 transition-colors hover:bg-white/[0.02]",
                      ev.id.startsWith("live-") && "animate-rise",
                    )}
                  >
                    <span
                      className={cn(
                        "grid size-8 place-items-center rounded-lg",
                        SEVERITY_TONE[ev.severity],
                      )}
                    >
                      <KindIcon kind={ev.kind} />
                    </span>

                    <div className="min-w-0">
                      <p className="text-sm font-medium text-white">{ev.title}</p>
                      <p className="mt-0.5 text-[0.8125rem] leading-snug text-mist-dim text-pretty">
                        {ev.detail}
                      </p>
                      <div className="mt-2 flex flex-wrap items-center gap-x-1.5 gap-y-1 font-mono text-[0.625rem] text-mist-dim">
                        {ev.from && <span className="text-mist">{ev.from}</span>}
                        {ev.from && ev.to && <span aria-hidden="true">→</span>}
                        {ev.to && <span className="text-mist">{ev.to}</span>}
                        {(ev.from || ev.to) && ev.blockNumber !== undefined && (
                          <span aria-hidden="true">·</span>
                        )}
                        {ev.blockNumber !== undefined && (
                          <span className="tabular">#{ev.blockNumber}</span>
                        )}
                        {ev.txHash && (
                          <>
                            {(ev.from || ev.to || ev.blockNumber !== undefined) && (
                              <span aria-hidden="true">·</span>
                            )}
                            <a
                              href={basescanTx(ev.txHash)}
                              target="_blank"
                              rel="noreferrer"
                              className="transition-colors hover:text-lime"
                            >
                              {shortHash(ev.txHash)}
                            </a>
                          </>
                        )}
                      </div>
                    </div>

                    <div className="shrink-0 text-right">
                      {ev.amountUsd !== undefined && (
                        <p className={cn("tabular text-sm", amountClass(ev))}>
                          {money(ev.amountUsd)}
                        </p>
                      )}
                      <p className="mt-1 font-mono text-[0.625rem] whitespace-nowrap text-mist-dim">
                        {agoLabel(ev.agoSeconds + elapsed)}
                      </p>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </Reveal>
      </div>
    </Section>
  );
}
