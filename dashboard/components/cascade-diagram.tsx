"use client";

import { useEffect, useId, useMemo, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Reveal } from "@/components/ui/reveal";
import { Section } from "@/components/ui/section";
import { SectionArt } from "@/components/ui/section-art";
import LottiePlayer from "@/components/ui/lottie-player";
import iconCascade from "@/public/icon-cascade.png";
import artChain from "@/public/art-chain.png";
import {
  DEMO_COVERAGE_USD,
  DEMO_QUOTE,
  POOL_A,
  POOL_B,
  UTIL_A,
  UTIL_B,
} from "@/lib/data";
import { pct, usd, usdCompact } from "@/lib/format";
import { cn } from "@/lib/cn";
import { DANGER, INK, LIME, LINE, MINT, MIST_DIM, SURFACE } from "@/lib/brand";

type Mode = "happy" | "discharge";
type Tone = "lime" | "danger";
/** `payout` = the discharge leg: leaves the pool red, lands on the client green. */
type EdgeTone = "lime" | "danger" | "payout";
type NodeKey = "client" | "underwriter" | "reinsurer" | "worker";

/* ── Geometry ────────────────────────────────────────────────
   Node boxes are 200×74. Every edge starts and ends ~4px clear of a
   border so the arrowhead reads as arriving, not embedded. Label
   positions are the visual midpoint of each curve, precomputed —
   nothing here is measured at runtime. */

const NODE_W = 200;
const NODE_H = 74;
/** Capital bar sits 18px under the underwriter / reinsurer boxes. */
const BAR_Y = 152;

interface NodeDef {
  key: NodeKey;
  x: number;
  y: number;
  role: string;
  name: string;
  pool?: { util: number; totalUsd: number };
}

const NODES: NodeDef[] = [
  { key: "client", x: 30, y: 60, role: "Requester", name: "Meridian Capital" },
  {
    key: "underwriter",
    x: 360,
    y: 60,
    role: "Layer 1",
    name: "Sentinel Underwriting",
    pool: { util: UTIL_A, totalUsd: POOL_A.totalCapitalUsd },
  },
  {
    key: "reinsurer",
    x: 690,
    y: 60,
    role: "Layer 2",
    name: "Bastion Re",
    pool: { util: UTIL_B, totalUsd: POOL_B.totalCapitalUsd },
  },
  { key: "worker", x: 360, y: 300, role: "Insured", name: "Aurora Analytics" },
];

interface EdgeDef {
  id: string;
  d: string;
  tone: EdgeTone;
  label: string;
  /** Chip centre. */
  lx: number;
  ly: number;
  from: NodeKey;
  to: NodeKey;
}

const RECOVERY_USD = DEMO_COVERAGE_USD * DEMO_QUOTE.cededShare;

const EDGES: EdgeDef[] = [
  {
    id: "e1",
    from: "client",
    to: "underwriter",
    tone: "lime",
    d: "M 234 88 C 280 66, 310 66, 356 88",
    label: `premium ${usd(DEMO_QUOTE.premiumUsd)}`,
    lx: 295,
    ly: 72,
  },
  {
    id: "e2",
    from: "underwriter",
    to: "reinsurer",
    tone: "lime",
    d: "M 564 88 C 610 66, 640 66, 686 88",
    label: `cede ${usd(DEMO_QUOTE.cededPremiumUsd)}`,
    lx: 625,
    ly: 72,
  },
  {
    id: "e3",
    from: "client",
    to: "worker",
    tone: "lime",
    d: "M 170 138 Q 170 330, 356 330",
    label: `job ${usd(DEMO_COVERAGE_USD)}`,
    lx: 216,
    ly: 282,
  },
  {
    id: "e4",
    from: "worker",
    to: "client",
    tone: "lime",
    d: "M 356 352 C 210 380, 62 320, 90 140",
    label: "delivered",
    lx: 158,
    ly: 324,
  },
  {
    id: "e5",
    from: "worker",
    to: "worker",
    tone: "danger",
    // Self-loop: long clockwise arc off the worker's right edge.
    d: "M 562 312 A 30 30 0 1 1 562 360",
    label: "rejected",
    lx: 655,
    ly: 336,
  },
  {
    id: "e6",
    from: "underwriter",
    to: "client",
    tone: "payout",
    d: "M 356 120 Q 295 158, 234 120",
    label: `discharge ${usd(DEMO_COVERAGE_USD)}`,
    lx: 295,
    ly: 139,
  },
  {
    id: "e7",
    from: "reinsurer",
    to: "underwriter",
    tone: "lime",
    d: "M 686 120 Q 625 158, 564 120",
    label: `recovery ${usd(RECOVERY_USD)}`,
    lx: 625,
    ly: 139,
  },
];

const EDGE_BY_ID = new Map(EDGES.map((e) => [e.id, e]));

/* ── Script ──────────────────────────────────────────────────── */

interface Step {
  id: string;
  t: string;
  title: string;
  detail: string;
  edges: string[];
  tone: Tone;
}

const STEPS: Record<Mode, Step[]> = {
  happy: [
    {
      id: "bind",
      t: "T+0.0s",
      title: "Cover bound",
      detail:
        "Meridian pays the premium. It lands in Sentinel's PolicyPool inside the CAP pay-tx: atomically, not as a follow-up transfer.",
      edges: ["e1"],
      tone: "lime",
    },
    {
      id: "cede",
      t: "T+4.1s",
      title: "Auto-hedge",
      detail:
        "Unprompted, Sentinel opens its own CAP order against Bastion Re and cedes half the risk. The underwriter just became a requester.",
      edges: ["e2"],
      tone: "lime",
    },
    {
      id: "hire",
      t: "T+9.6s",
      title: "Worker hired",
      detail: "Only now does Meridian hire Aurora. The policy already exists.",
      edges: ["e3"],
      tone: "lime",
    },
    {
      id: "deliver",
      t: "T+312s",
      title: "Delivered",
      detail:
        "Aurora delivers. Nobody claims. Sentinel keeps its net premium, Bastion keeps its cede.",
      edges: ["e4"],
      tone: "lime",
    },
  ],
  discharge: [
    {
      id: "bind",
      t: "T+0.0s",
      title: "Cover bound",
      detail: "Same as before. Premium in the pool, ERC-721 in the client's wallet.",
      edges: ["e1"],
      tone: "lime",
    },
    {
      id: "cede",
      t: "T+4.1s",
      title: "Auto-hedge",
      detail: "Sentinel cedes 50% quota-share to Bastion Re. Its own worst case is now half.",
      edges: ["e2"],
      tone: "lime",
    },
    {
      id: "hire",
      t: "T+9.6s",
      title: "Worker hired",
      detail: "Meridian hires Aurora for the job it actually wanted done.",
      edges: ["e3"],
      tone: "lime",
    },
    {
      id: "fail",
      t: "T+287s",
      title: "Worker fails",
      detail:
        "Aurora misses the SLA. CAP moves the order to terminal status rejected. That status is the whole oracle.",
      edges: ["e5"],
      tone: "danger",
    },
    {
      id: "discharge",
      t: "T+291s",
      title: "Pool discharges",
      detail:
        "The watcher signs an EIP-712 attestation, ClaimsAdjudicator verifies it, and PolicyPool pays the client in full.",
      edges: ["e6"],
      tone: "danger",
    },
    {
      id: "cascade",
      t: "T+295s",
      title: "Cascade recovery",
      detail:
        "Bastion Re reimburses Sentinel for its share. Loss lands split across two balance sheets. The client never felt it.",
      edges: ["e7"],
      tone: "lime",
    },
  ],
};

/** Edges that exist at all in a given scenario. */
const MODE_EDGES: Record<Mode, string[]> = {
  happy: ["e1", "e2", "e3", "e4"],
  discharge: ["e1", "e2", "e3", "e5", "e6", "e7"],
};

const MODE_LABEL: Record<Mode, string> = {
  happy: "Happy path",
  discharge: "Discharge",
};

const TICK_MS = 2400;

/** Chip width from character count — mono at 10px is ~5.9px/char. */
const chipWidth = (label: string) => label.length * 5.9 + 14;

const toneColor = (tone: Tone) => (tone === "danger" ? DANGER : LIME);

export function CascadeDiagram() {
  const [mode, setMode] = useState<Mode>("happy");
  const [step, setStep] = useState(0);
  const [paused, setPaused] = useState(false);
  const [tabHidden, setTabHidden] = useState(false);
  const [reduced, setReduced] = useState(false);

  const rawId = useId();
  // useId() emits colons, which are illegal inside url(#…) references.
  const gid = `cascade${rawId.replace(/[^a-zA-Z0-9]/g, "")}`;

  const steps = STEPS[mode];
  const active = Math.min(step, steps.length - 1);
  const current = steps[active];

  useEffect(() => {
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    const sync = () => setReduced(mq.matches);
    sync();
    mq.addEventListener("change", sync);
    return () => mq.removeEventListener("change", sync);
  }, []);

  useEffect(() => {
    const sync = () => setTabHidden(document.hidden);
    sync();
    document.addEventListener("visibilitychange", sync);
    return () => document.removeEventListener("visibilitychange", sync);
  }, []);

  useEffect(() => {
    if (reduced || paused || tabHidden) return;
    // `step` in the deps restarts the clock whenever the user jumps a step,
    // so a manual pick always gets a full dwell.
    const id = setInterval(() => setStep((s) => (s + 1) % steps.length), TICK_MS);
    return () => clearInterval(id);
  }, [reduced, paused, tabHidden, steps.length, step]);

  const modeEdges = useMemo(
    () => MODE_EDGES[mode].map((id) => EDGE_BY_ID.get(id)!),
    [mode],
  );

  /** Reduced motion never auto-advances, so it lights the whole scenario at once. */
  const liveIds = useMemo(
    () => new Set(reduced ? MODE_EDGES[mode] : current.edges),
    [reduced, mode, current],
  );

  const liveEdges = modeEdges.filter((e) => liveIds.has(e.id));
  const idleEdges = modeEdges.filter((e) => !liveIds.has(e.id));

  /** A node is hot if a live edge touches it. Failure wins over flow. */
  const nodeTone = useMemo(() => {
    const map = new Map<NodeKey, Tone>();
    for (const e of liveEdges) {
      const tone: Tone = e.tone === "danger" ? "danger" : "lime";
      for (const key of [e.from, e.to]) {
        if (map.get(key) !== "danger") map.set(key, tone);
      }
    }
    return map;
  }, [liveEdges]);

  const strokeOf = (tone: EdgeTone) =>
    tone === "danger" ? DANGER : tone === "payout" ? `url(#${gid}-payout)` : LIME;
  const markerOf = (tone: EdgeTone) =>
    `url(#${gid}-arrow-${tone === "danger" ? "danger" : "lime"})`;
  /** Payout chips read lime: the money arrives, it does not burn. */
  const labelColorOf = (tone: EdgeTone) => (tone === "danger" ? DANGER : LIME);

  const statusText = reduced
    ? "all layers shown"
    : paused
      ? "paused"
      : tabHidden
        ? "idle"
        : "auto-advancing";

  const selectMode = (next: Mode) => {
    setMode(next);
    setStep(0);
  };

  const hold = { onMouseEnter: () => setPaused(true), onMouseLeave: () => setPaused(false) };

  return (
    <Section
      id="cascade"
      wide
      clip={false}
      icon={iconCascade}
      art={
        <div className="absolute inset-x-0 -top-48 -z-10 h-[760px] flex justify-center opacity-40 mix-blend-screen pointer-events-none">
          <LottiePlayer animationPath="/lottie/stack.json" className="w-[1000px] h-[1000px]" />
        </div>
      }
      eyebrow="The cascade"
      index="01"
      title="One failure, three layers, zero humans."
      lead="A client buys cover from an underwriter. The underwriter immediately buys its own cover from a reinsurer. When the worker misses its deadline, capital moves back down the chain, automatically."
    >
      <div
        className="grid gap-6 lg:grid-cols-[1fr_360px]"
        {...hold}
        onFocus={() => setPaused(true)}
        onBlur={() => setPaused(false)}
      >
        {/* ── Diagram ─────────────────────────────────────────── */}
        {/* min-w-0: let the track shrink so the inner scroller can do its job. */}
        <Reveal className="min-w-0">
          <div className="panel p-4 sm:p-6">
            <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
              <div
                role="tablist"
                aria-label="Cascade scenario"
                className="inline-flex rounded-full bg-surface-2 p-1"
              >
                {(["happy", "discharge"] as const).map((m) => (
                  <button
                    key={m}
                    type="button"
                    role="tab"
                    id={`${gid}-tab-${m}`}
                    aria-selected={mode === m}
                    aria-controls={`${gid}-panel`}
                    onClick={() => selectMode(m)}
                    className={cn(
                      "rounded-full px-4 py-1.5 font-mono text-[0.6875rem] tracking-wider uppercase",
                      "transition-colors duration-200",
                      mode === m
                        ? m === "happy"
                          ? "bg-lime text-lime-ink"
                          : "bg-danger text-white"
                        : "text-mist-dim hover:text-mist",
                    )}
                  >
                    {MODE_LABEL[m]}
                  </button>
                ))}
              </div>
              <p className="font-mono text-[0.625rem] tracking-wider text-mist-dim uppercase">
                {statusText}
              </p>
            </div>

            <div
              id={`${gid}-panel`}
              role="tabpanel"
              aria-labelledby={`${gid}-tab-${mode}`}
              className="overflow-x-auto no-scrollbar"
            >
              <div className="min-w-[720px]">
                <svg
                  viewBox="0 0 920 440"
                  width="100%"
                  height="auto"
                  className="block"
                  aria-hidden="true"
                >
                  <defs>
                    <marker
                      id={`${gid}-arrow-lime`}
                      markerWidth="9"
                      markerHeight="9"
                      refX="7.5"
                      refY="4.5"
                      orient="auto"
                      markerUnits="userSpaceOnUse"
                    >
                      <path d="M0 0 L9 4.5 L0 9 Z" fill={LIME} />
                    </marker>
                    <marker
                      id={`${gid}-arrow-danger`}
                      markerWidth="9"
                      markerHeight="9"
                      refX="7.5"
                      refY="4.5"
                      orient="auto"
                      markerUnits="userSpaceOnUse"
                    >
                      <path d="M0 0 L9 4.5 L0 9 Z" fill={DANGER} />
                    </marker>
                    {/* Leaves the pool as a loss, lands on the client as an indemnity. */}
                    <linearGradient
                      id={`${gid}-payout`}
                      gradientUnits="userSpaceOnUse"
                      x1="356"
                      y1="120"
                      x2="234"
                      y2="120"
                    >
                      <stop offset="0%" stopColor={DANGER} />
                      <stop offset="100%" stopColor={MINT} />
                    </linearGradient>
                  </defs>

                  {/* Idle edges — the paths that exist but carry nothing right now. */}
                  {idleEdges.map((e) => (
                    <path
                      key={e.id}
                      d={e.d}
                      fill="none"
                      stroke={LINE}
                      strokeWidth={1.5}
                      strokeDasharray="6 6"
                    />
                  ))}

                  {/* Live edges — dashes crawl toward the arrowhead. */}
                  {liveEdges.map((e) => (
                    <path
                      key={e.id}
                      d={e.d}
                      fill="none"
                      stroke={strokeOf(e.tone)}
                      strokeWidth={2}
                      strokeDasharray="6 6"
                      strokeLinecap="round"
                      markerEnd={markerOf(e.tone)}
                      className="animate-flow"
                    />
                  ))}

                  {/* Nodes */}
                  {NODES.map((n) => {
                    const tone = nodeTone.get(n.key);
                    const accent = tone ? toneColor(tone) : LINE;
                    return (
                      <g key={n.key}>
                        {tone && (
                          <rect
                            x={n.x}
                            y={n.y}
                            width={NODE_W}
                            height={NODE_H}
                            rx={14}
                            fill="none"
                            stroke={accent}
                            strokeWidth={6}
                            opacity={0.12}
                          />
                        )}
                        <rect
                          x={n.x}
                          y={n.y}
                          width={NODE_W}
                          height={NODE_H}
                          rx={14}
                          fill={SURFACE}
                          stroke={accent}
                          strokeWidth={tone ? 1.5 : 1}
                        />
                        <text
                          x={n.x + 16}
                          y={n.y + 26}
                          className="font-mono"
                          fontSize={10}
                          fill={MIST_DIM}
                          letterSpacing={1}
                        >
                          {n.role.toUpperCase()}
                        </text>
                        <text
                          x={n.x + 16}
                          y={n.y + 50}
                          fontSize={15}
                          fontWeight={500}
                          fill="#fff"
                        >
                          {n.name}
                        </text>

                        {n.pool && (
                          <g>
                            <rect
                              x={n.x}
                              y={BAR_Y}
                              width={NODE_W}
                              height={6}
                              rx={3}
                              fill={LINE}
                            />
                            <rect
                              x={n.x}
                              y={BAR_Y}
                              width={Math.max(6, NODE_W * n.pool.util)}
                              height={6}
                              rx={3}
                              fill={LIME}
                              opacity={0.85}
                            />
                            <text
                              x={n.x}
                              y={BAR_Y + 22}
                              className="font-mono"
                              fontSize={10}
                              fill={MIST_DIM}
                            >
                              {`${pct(n.pool.util, 0)} utilized · ${usdCompact(n.pool.totalUsd)}`}
                            </text>
                          </g>
                        )}
                      </g>
                    );
                  })}

                  {/* Chips last — the ink fill knocks the dashes out behind them. */}
                  {liveEdges.map((e) => {
                    const color = labelColorOf(e.tone);
                    const w = chipWidth(e.label);
                    return (
                      <g key={`${e.id}-chip`}>
                        <rect
                          x={e.lx - w / 2}
                          y={e.ly - 9}
                          width={w}
                          height={18}
                          rx={5}
                          fill={INK}
                          stroke={color}
                          strokeOpacity={0.22}
                        />
                        <text
                          x={e.lx}
                          y={e.ly}
                          textAnchor="middle"
                          dominantBaseline="central"
                          className="font-mono tabular"
                          fontSize={10}
                          fill={color}
                        >
                          {e.label}
                        </text>
                      </g>
                    );
                  })}
                </svg>
              </div>
            </div>
          </div>
        </Reveal>

        {/* ── Sequence ────────────────────────────────────────── */}
        <Reveal delay={60}>
          {/* `sticky` is itself a positioned ancestor — no `relative` (they'd fight for `position`). */}
          <div className="panel-flat sticky overflow-hidden p-5 pb-7 lg:top-24">
            <div className="flex items-center justify-between gap-3">
              <h3 className="text-base font-semibold text-white">Sequence</h3>
              <Badge tone={mode === "discharge" ? "danger" : "lime"} dot>
                {MODE_LABEL[mode]}
              </Badge>
            </div>

            <ol className="mt-5 space-y-1">
              {steps.map((s, i) => {
                const on = i === active;
                return (
                  <li key={s.id}>
                    <button
                      type="button"
                      onClick={() => setStep(i)}
                      aria-current={on ? "step" : undefined}
                      className={cn(
                        "w-full py-3 pl-4 text-left transition-colors duration-200",
                        on
                          ? cn(
                              "border-l-2 bg-white/[0.03]",
                              s.tone === "danger" ? "border-danger" : "border-lime",
                            )
                          : "border-l border-line text-mist-dim hover:text-mist",
                      )}
                    >
                      <span
                        className={cn(
                          "tabular block font-mono text-[0.625rem] tracking-wider",
                          on
                            ? s.tone === "danger"
                              ? "text-danger"
                              : "text-lime"
                            : "text-current",
                        )}
                      >
                        {s.t}
                      </span>
                      <span className={cn("mt-1 block text-sm", on ? "text-white" : "text-current")}>
                        {s.title}
                      </span>
                      <span
                        className={cn(
                          "mt-1 block text-[0.8125rem] leading-snug",
                          on ? "text-mist-dim" : "text-current opacity-75",
                        )}
                      >
                        {s.detail}
                      </span>
                    </button>
                  </li>
                );
              })}
            </ol>

            <p className="mt-5 font-mono text-[0.625rem] leading-relaxed text-mist-dim">
              Steps 5–6 are contract calls. No human signs them.
            </p>

            <div className="absolute inset-x-0 bottom-0 h-0.5 bg-line" aria-hidden="true">
              <div
                className="h-full bg-lime transition-[width] duration-500 ease-out"
                style={{ width: `${((active + 1) / steps.length) * 100}%` }}
              />
            </div>
          </div>
        </Reveal>
      </div>
    </Section>
  );
}
