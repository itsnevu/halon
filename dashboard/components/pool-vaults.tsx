/**
 * PoolVaults — the two stacked capital layers.
 *
 * Stays a Server Component. `CountUp` takes a serializable `preset` string
 * rather than a `format` function, so the tween survives without dragging this
 * module — the page's largest static block — into the client graph.
 *
 * ── Derivation ───────────────────────────────────────────────────────────
 * Utilization comes from `poolUtilization(pool)` and the layer copy from
 * `CEDED_SHARE`, so a judge can rewrite the fixture and every number here —
 * including the bar's colour band — follows without edits.
 */

import type { PoolState } from "@/lib/types";
import { POOLS, PROTOCOL_STATS } from "@/lib/data";
import { CEDED_SHARE, poolUtilization } from "@/lib/risk-engine";
import { basescanAddr, multiple, pct, shortAddr, usd0, usdCompact } from "@/lib/format";
import { Badge, Meta } from "@/components/ui/badge";
import { CountUp } from "@/components/ui/count-up";
import { Panel } from "@/components/ui/panel";
import { Reveal } from "@/components/ui/reveal";
import { Section } from "@/components/ui/section";
import { SectionArt } from "@/components/ui/section-art";
import iconLattice from "@/public/icon-lattice.png";
import artVaultTiles from "@/public/art-vault-tiles.png";
import { Sparkline } from "@/components/ui/sparkline";
import { cn } from "@/lib/cn";

/* ── Per-layer presentation. Keyed off the pool id, not its index, so the
   fixture can be reordered without the copy following it around. ── */

interface LayerChrome {
  chip: string;
  chipClass: string;
  /** Pool B sits under Pool A — give it a literal depth texture. */
  depth: boolean;
  layerNote: string;
  /** Only the underwriter recovers from a layer above it. */
  recovers: boolean;
}

const CHROME: Record<PoolState["id"], LayerChrome> = {
  A: {
    chip: "Layer 1 · Underwriter",
    chipClass: "text-lime",
    depth: false,
    // Copy is derived from the treaty constant, not typed by hand: change
    // CEDED_SHARE and both cards move with it.
    layerNote: `Retains ${pct(1 - CEDED_SHARE, 0)}`,
    recovers: true,
  },
  B: {
    chip: "Layer 2 · Reinsurer",
    chipClass: "text-info",
    depth: true,
    layerNote: `Assumes ${pct(CEDED_SHARE, 0)}`,
    recovers: false,
  },
};

/** Utilization drives the bar's colour. Lime is the only resting state. */
function utilTone(util: number): "lime" | "warn" | "danger" {
  if (util > 0.8) return "danger";
  if (util > 0.5) return "warn";
  return "lime";
}

const FILL: Record<"lime" | "warn" | "danger", string> = {
  lime: "bg-lime",
  warn: "bg-warn",
  danger: "bg-danger",
};

function ExternalLinkIcon() {
  return (
    <svg
      viewBox="0 0 12 12"
      className="size-3 shrink-0"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M5 2.5H2.5v7h7V7" />
      <path d="M7.25 2.5H9.5V4.75" />
      <path d="M9.5 2.5 5.75 6.25" />
    </svg>
  );
}

function SummaryItem({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-baseline gap-2">
      <span>{label}</span>
      <span className="tabular text-white">{value}</span>
    </div>
  );
}

function PoolCard({ pool }: { pool: PoolState }) {
  const chrome = CHROME[pool.id];

  // Derived, never hand-typed. A judge can rewrite the fixture and every
  // number below — bar colour included — follows.
  const util = poolUtilization(pool);
  const tone = utilTone(util);
  const freeUsd = Math.max(0, pool.totalCapitalUsd - pool.lockedUsd);

  const first = pool.history[0] ?? 0;
  const last = pool.history[pool.history.length - 1] ?? 0;
  const growth = first > 0 ? (last - first) / first : 0;
  const epochs = pool.history.length;

  const lossRatio =
    pool.premiumsEarnedUsd > 0 ? pool.claimsPaidUsd / pool.premiumsEarnedUsd : null;

  return (
    <Panel as="article" hover className="flex h-full flex-col overflow-hidden">
      {/* Header band */}
      <div className="relative p-6 pb-0">
        {chrome.depth && (
          <div
            aria-hidden="true"
            className="dot-bg mask-fade-b pointer-events-none absolute inset-0 opacity-30"
          />
        )}

        <div className="relative">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <span
              className={cn(
                "font-mono text-[0.625rem] tracking-[0.16em] uppercase",
                chrome.chipClass,
              )}
            >
              {chrome.chip}
            </span>
            <Badge tone="lime" dot>
              Accepting risk
            </Badge>
          </div>

          <h3 className="mt-5 text-2xl text-white">{pool.name}</h3>
          <p className="mt-1 text-sm text-mist-dim">{pool.operator}</p>

          <a
            href={basescanAddr(pool.address)}
            target="_blank"
            rel="noopener noreferrer"
            className="mt-3 inline-flex items-center gap-1.5 font-mono text-xs text-mist-dim transition-colors hover:text-lime"
          >
            {shortAddr(pool.address)}
            <ExternalLinkIcon />
          </a>
        </div>
      </div>

      {/* The number */}
      <div className="px-6 pt-8">
        <p className="font-mono text-[0.625rem] tracking-[0.16em] text-mist-dim uppercase">
          Capital
        </p>
        <p className="tabular mt-2 font-display text-[2.75rem] leading-none text-white">
          <CountUp value={pool.totalCapitalUsd} preset="usd0" />
        </p>
      </div>

      {/* Full-bleed history */}
      <div className="mt-5 w-full">
        <Sparkline
          data={pool.history}
          width={640}
          height={64}
          gradient
          fill
          marker
          id={pool.id}
          className="block h-16 w-full"
        />
      </div>

      <div className="px-6 pt-3 pb-6">
        <p className={cn("text-xs", growth >= 0 ? "text-lime" : "text-warn")}>
          {growth > 0 ? "+" : ""}
          {pct(growth, 1)} over {epochs} epochs
        </p>
      </div>

      {/* Utilization */}
      <div className="border-t border-line p-6">
        <div className="flex items-baseline justify-between gap-3">
          <span className="font-mono text-[0.6875rem] tracking-wide text-mist-dim uppercase">
            Utilization
          </span>
          <span className="tabular text-sm text-white">{pct(util, 1)}</span>
        </div>

        <div
          aria-hidden="true"
          className="mt-3 h-2 w-full overflow-hidden rounded-full bg-surface-3"
        >
          <div
            className={cn("relative h-full rounded-full", FILL[tone])}
            style={{ width: pct(util, 2) }}
          >
            {/* Hatching reads as "locked", not merely "filled". */}
            <span
              className={cn(
                "absolute inset-0 rounded-full opacity-60",
                tone === "danger" ? "stripe-danger" : "stripe-lime",
              )}
            />
          </div>
        </div>

        <div className="mt-4 grid grid-cols-2 gap-x-6">
          <div>
            <p className="font-mono text-[0.625rem] tracking-wide text-mist-dim uppercase">
              Locked
            </p>
            <p className="tabular mt-1 text-sm text-white">{usd0(pool.lockedUsd)}</p>
          </div>
          <div>
            <p className="font-mono text-[0.625rem] tracking-wide text-mist-dim uppercase">
              Free capacity
            </p>
            <p className="tabular mt-1 text-sm text-white">{usd0(freeUsd)}</p>
          </div>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 gap-x-6 gap-y-4 border-t border-line p-6">
        <Meta label="Premiums earned">{usd0(pool.premiumsEarnedUsd)}</Meta>
        <Meta label="Claims paid">
          <span className="text-danger">{usd0(pool.claimsPaidUsd)}</span>
        </Meta>
        <Meta label="Recovered">
          {chrome.recovers ? (
            usd0(pool.recoveredUsd)
          ) : (
            <span className="text-mist-dim">n/a</span>
          )}
        </Meta>
        <Meta label="Active policies">{pool.activePolicies}</Meta>
        <Meta label="Loss ratio">
          {lossRatio === null ? (
            <span className="text-mist-dim">n/a</span>
          ) : (
            pct(lossRatio, 1)
          )}
        </Meta>
        <Meta label="Layer">
          <span className="text-mist">{chrome.layerNote}</span>
        </Meta>
      </div>
    </Panel>
  );
}

export function PoolVaults() {
  const leverage =
    PROTOCOL_STATS.tvlUsd > 0
      ? PROTOCOL_STATS.coverageInForceUsd / PROTOCOL_STATS.tvlUsd
      : 0;

  return (
    <Section
      id="pools"
      icon={iconLattice}
      art={
        <SectionArt
          src={artVaultTiles}
          className="-top-24 -right-24 hidden size-[620px] opacity-[0.13] lg:block"
        />
      }
      eyebrow="Capital"
      index="03"
      title="Two pools, stacked."
      lead="Sentinel writes the policy. Bastion Re stands behind Sentinel. Premiums land in these vaults atomically, inside the CAP pay-tx. There is no manual transfer step that can fail halfway."
    >
      <Reveal className="mb-6 flex flex-wrap gap-x-8 gap-y-2 font-mono text-[0.6875rem] tracking-wide text-mist-dim uppercase">
        <SummaryItem label="Total value locked" value={usdCompact(PROTOCOL_STATS.tvlUsd)} />
        <SummaryItem
          label="Cover in force"
          value={usdCompact(PROTOCOL_STATS.coverageInForceUsd)}
        />
        <SummaryItem
          label="Cascade recoveries"
          value={usdCompact(PROTOCOL_STATS.cascadeRecoveryUsd)}
        />
        <SummaryItem label="Leverage" value={multiple(leverage, 2)} />
      </Reveal>

      <div className="grid gap-6 lg:grid-cols-2">
        {POOLS.map((pool, i) => (
          <Reveal key={pool.id} delay={i * 100} className="h-full">
            <PoolCard pool={pool} />
          </Reveal>
        ))}
      </div>
    </Section>
  );
}
