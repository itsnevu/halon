"use client";

import { Fragment } from "react";

import { ButtonLink } from "@/components/ui/button";
import { Reveal } from "@/components/ui/reveal";
import { secondsLabel, usdCompact } from "@/lib/format";
import { useProtocolStats } from "@/components/use-protocol-stats";
import HyperspeedBackground from "@/components/ui/hyperspeed-background";

/* ── Background ───────────────────────────────────────────────── */

function HeroBackdrop() {
  return (
    <div aria-hidden="true" className="pointer-events-none absolute inset-0">
      {/* Backmost layer. A Hyperspeed road streaking toward the horizon —
          lime-green under the dark theme, monochrome under the light theme.
          Full-bleed: the road converges at centre and its lights live in the
          lower third, so the type above it already sits over the dark fog. */}
      <div className="absolute inset-0">
        <HyperspeedBackground />
      </div>

      {/* Everything above this line is the road; everything below is legibility.
          Far softer than the old plasma scrim — the road's own fog keeps the
          upper hero dark, so we only need to protect the headline band and
          feather the road into the page at top and bottom. */}

      {/* Vertical wash: dim the nav strip and the very bottom, leave the road
          brightest through the middle-lower band where it actually reads. */}
      <div
        className="absolute inset-0"
        style={{
          background: `linear-gradient(to bottom, var(--color-ink) 0%, transparent 22%, transparent 82%, color-mix(in srgb, var(--color-ink) 70%, transparent) 100%)`,
        }}
      />

      {/* A gentle pool behind the headline so white type never fights a light
          streak — a fraction of the old 88% ellipse. */}
      <div
        className="absolute inset-0"
        style={{
          background: `radial-gradient(58% 44% at 50% 40%, color-mix(in srgb, var(--color-ink) 55%, transparent) 0%, transparent 72%)`,
        }}
      />
    </div>
  );
}

/* ── Proof row ────────────────────────────────────────────────── */

/** Built inside the component from live PolicyPool reads — no fixtures. */
function useProofRow() {
  const { stats } = useProtocolStats();
  return [
    { value: usdCompact(stats.tvlUsd), label: "Capital at risk" },
    { value: usdCompact(stats.coverageInForceUsd), label: "Cover in force" },
    {
      value: stats.medianDischargeSeconds > 0 ? secondsLabel(stats.medianDischargeSeconds) : "—",
      label: "Median discharge",
    },
  ];
}

/* ── Chain strip ──────────────────────────────────────────────── */

const CHAIN = [
  { role: "Client", name: "Buys cover" },
  { role: "Underwriter", name: "Writes cover" },
  { role: "Reinsurer", name: "Backs the pool" },
];

const FLOWS = ["premium", "cede"];

function ChainNode({ role, name }: { role: string; name: string }) {
  return (
    <div className="relative shrink-0 rounded-xl border border-line bg-surface/80 px-4 py-3 text-left backdrop-blur transition-colors duration-200 hover:border-lime/40">
      <div className="flex items-center gap-2">
        <span aria-hidden="true" className="size-1.5 shrink-0 rounded-full bg-lime" />
        <span className="font-mono text-[0.625rem] tracking-[0.16em] text-mist-dim uppercase">
          {role}
        </span>
      </div>
      <div className="mt-1 text-sm whitespace-nowrap text-fg">{name}</div>
    </div>
  );
}

function Caption({ children }: { children: string }) {
  return (
    <span className="bg-ink px-2 font-mono text-[0.5625rem] tracking-[0.16em] whitespace-nowrap text-mist-dim uppercase">
      {children}
    </span>
  );
}

function Connector({ label }: { label: string }) {
  return (
    <>
      {/* ≥ sm — horizontal rail with dashed capital crawling along it */}
      <div className="relative hidden h-px min-w-16 flex-1 bg-line sm:block">
        <svg
          aria-hidden="true"
          className="absolute inset-0 size-full overflow-visible"
          preserveAspectRatio="none"
        >
          <line
            x1="0"
            y1="0.5"
            x2="100%"
            y2="0.5"
            className="animate-flow stroke-lime"
            strokeWidth="1"
            strokeDasharray="5 5"
            vectorEffect="non-scaling-stroke"
          />
        </svg>
        <svg
          aria-hidden="true"
          viewBox="0 0 6 8"
          className="absolute top-1/2 right-0 size-2 -translate-y-1/2 fill-lime"
        >
          <path d="M0 0l6 4-6 4z" />
        </svg>
        <span className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2">
          <Caption>{label}</Caption>
        </span>
      </div>

      {/* < sm — the same rail, stood on its end */}
      <div className="relative mx-auto h-12 w-px bg-line sm:hidden">
        <svg
          aria-hidden="true"
          className="absolute inset-0 size-full overflow-visible"
          preserveAspectRatio="none"
        >
          <line
            x1="0.5"
            y1="0"
            x2="0.5"
            y2="100%"
            className="animate-flow stroke-lime"
            strokeWidth="1"
            strokeDasharray="5 5"
            vectorEffect="non-scaling-stroke"
          />
        </svg>
        <svg
          aria-hidden="true"
          viewBox="0 0 8 6"
          className="absolute bottom-0 left-1/2 size-2 -translate-x-1/2 fill-lime"
        >
          <path d="M0 0l4 6 4-6z" />
        </svg>
        <span className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2">
          <Caption>{label}</Caption>
        </span>
      </div>
    </>
  );
}

/* ── Hero ─────────────────────────────────────────────────────── */

export function Hero() {
  const PROOF = useProofRow();
  return (
    <section
      id="top"
      className="noise relative flex min-h-[92svh] items-center overflow-hidden pt-28 pb-20"
    >
      <HeroBackdrop />

      <div className="relative z-10 mx-auto w-full max-w-6xl px-5 text-center sm:px-8">
        <Reveal delay={80}>
          <h1 className="text-shield font-display text-[clamp(2.6rem,8.4vw,7.5rem)] leading-[0.92] font-semibold tracking-[-0.045em] text-balance text-fg">
            Agents insure agents<span className="text-lime">.</span>
          </h1>
        </Reveal>

        <Reveal delay={140}>
          <p className="text-shield mx-auto mt-7 max-w-2xl text-[clamp(1rem,1.6vw,1.2rem)] leading-relaxed text-pretty text-mist">
            Buy coverage before you hire. When the worker agent fails, the pool discharges
            automatically, and the underwriter&rsquo;s own reinsurance cascades in behind it.
            Nobody pulls the trigger.
          </p>
        </Reveal>

        <Reveal delay={200}>
          <div className="mt-10 flex flex-col justify-center gap-3 sm:flex-row">
            <ButtonLink href="#quote" variant="primary" size="lg" arrow>
              Get a quote
            </ButtonLink>
            <ButtonLink href="#cascade" variant="ghost" size="lg">
              See the cascade
            </ButtonLink>
          </div>
        </Reveal>

        <Reveal delay={260}>
          <div className="mt-14 flex justify-center divide-x divide-line">
            {PROOF.map((stat) => (
              <div key={stat.label} className="px-3 sm:px-8 lg:px-10">
                <div className="tabular font-display text-2xl whitespace-nowrap text-fg sm:text-3xl">
                  {stat.value}
                </div>
                <div className="mt-1.5 font-mono text-[0.625rem] tracking-[0.16em] text-mist-dim uppercase">
                  {stat.label}
                </div>
              </div>
            ))}
          </div>
        </Reveal>

        <Reveal delay={340}>
          <div className="mx-auto mt-20 flex max-w-3xl flex-col items-stretch sm:flex-row sm:items-center">
            {CHAIN.map((node, i) => (
              <Fragment key={node.role}>
                <ChainNode role={node.role} name={node.name} />
                {i < FLOWS.length && <Connector label={FLOWS[i]} />}
              </Fragment>
            ))}
          </div>
        </Reveal>
      </div>
    </section>
  );
}
