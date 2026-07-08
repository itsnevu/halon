import { Fragment } from "react";

import { ButtonLink } from "@/components/ui/button";
import { Reveal } from "@/components/ui/reveal";
import { PROTOCOL_STATS } from "@/lib/data";
import { secondsLabel, usdCompact } from "@/lib/format";
import { INK, LIME, MINT } from "@/lib/brand";
import PlasmaWave from "@/components/ui/plasma-wave";

/* ── Background ───────────────────────────────────────────────── */

/**
 * Two orbs bleeding through the headline — one at each end of the brand ramp,
 * so the backdrop reads like the mark it sits under. The outer element owns the
 * position (Tailwind translate utilities) and the inner element owns the
 * `drift` animation — keyframes write `transform`, so they cannot share a node.
 *
 * `tint` is an inline colour rather than a `bg-*` class: the ramp lives in
 * `lib/brand.ts`, and hardcoding `bg-lime` here is how the two drifted apart.
 */
function Orb({
  className,
  size,
  opacity,
  delay,
  tint,
}: {
  className: string;
  size: string;
  opacity: number;
  delay: string;
  tint: string;
}) {
  return (
    <div className={className} style={{ width: size, height: size }}>
      <div
        className="size-full animate-drift rounded-full blur-[120px]"
        style={{ opacity, animationDelay: delay, backgroundColor: tint }}
      />
    </div>
  );
}

function HeroBackdrop() {
  return (
    <div aria-hidden="true" className="pointer-events-none absolute inset-0">
      {/* Backmost layer. Transparent wherever the shader discards, so every layer
          below still reads through it. 80% keeps it a backdrop, not a subject. */}
      <div className="absolute inset-0 opacity-80">
        <PlasmaWave
          colors={[LIME, MINT]}
          speed1={0.05}
          speed2={0.05}
          focalLength={0.8}
          bend1={1}
          bend2={0.5}
          dir2={1}
          rotationDeg={0}
        />
      </div>

      {/* Static two-tone wash under the moving orbs: lime up-left, mint down-right. */}
      <div className="aurora absolute inset-0" />

      <Orb
        className="absolute top-[34%] left-1/2 -translate-x-[78%] -translate-y-1/2"
        size="clamp(280px, 42vw, 620px)"
        opacity={0.16}
        delay="0s"
        tint={LIME}
      />
      <Orb
        className="absolute top-[46%] left-1/2 -translate-x-[26%] -translate-y-1/2"
        size="clamp(280px, 38vw, 560px)"
        opacity={0.12}
        delay="-7s"
        tint={MINT}
      />

      {/* Everything above this line is decoration; everything below is legibility. */}
      <div className="hero-scrim absolute inset-0" />

      <div className="grid-bg mask-fade-b absolute inset-0 opacity-60" />

      <div className="absolute inset-x-0 top-0 h-px w-full animate-scan bg-gradient-to-r from-transparent via-lime/40 to-transparent" />

      <div
        className="absolute inset-0"
        style={{
          background: `radial-gradient(120% 82% at 50% 34%, transparent 0%, transparent 42%, rgba(0,0,0,0.62) 76%, ${INK} 100%)`,
        }}
      />
    </div>
  );
}

/* ── Proof row ────────────────────────────────────────────────── */

const PROOF = [
  { value: usdCompact(PROTOCOL_STATS.tvlUsd), label: "Capital at risk" },
  { value: usdCompact(PROTOCOL_STATS.coverageInForceUsd), label: "Cover in force" },
  { value: secondsLabel(PROTOCOL_STATS.medianDischargeSeconds), label: "Median discharge" },
];

/* ── Chain strip ──────────────────────────────────────────────── */

const CHAIN = [
  { role: "Client", name: "Meridian Capital" },
  { role: "Underwriter", name: "Sentinel" },
  { role: "Reinsurer", name: "Bastion Re" },
];

const FLOWS = ["premium", "cede"];

function ChainNode({ role, name }: { role: string; name: string }) {
  return (
    <div className="relative shrink-0 rounded-xl border border-line bg-surface/80 px-4 py-3 text-left backdrop-blur">
      <div className="flex items-center gap-2">
        <span aria-hidden="true" className="size-1.5 shrink-0 rounded-full bg-lime" />
        <span className="font-mono text-[0.625rem] tracking-[0.16em] text-mist-dim uppercase">
          {role}
        </span>
      </div>
      <div className="mt-1 text-sm whitespace-nowrap text-white">{name}</div>
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
  return (
    <section
      id="top"
      className="noise relative flex min-h-[92svh] items-center overflow-hidden pt-28 pb-20"
    >
      <HeroBackdrop />

      <div className="relative z-10 mx-auto w-full max-w-6xl px-5 text-center sm:px-8">
        <Reveal delay={80}>
          <h1 className="text-shield font-display text-[clamp(2.6rem,8.4vw,7.5rem)] leading-[0.92] font-semibold tracking-[-0.045em] text-balance text-white">
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
                <div className="tabular font-display text-2xl whitespace-nowrap text-white sm:text-3xl">
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
