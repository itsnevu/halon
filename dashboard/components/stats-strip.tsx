/**
 * StatsStrip — the metrics rail under the ticker.
 *
 * A Client Component: it reads the protocol headline numbers live from the
 * PolicyPool via `useProtocolStats` when a deployment is wired in
 * (NEXT_PUBLIC_POLICY_POOL), and falls back to the `lib/data.ts` fixture
 * otherwise — labelling itself LIVE or DEMO so the numbers are never dishonest.
 *
 * ── Hairline grid ────────────────────────────────────────────────────────
 * Every cell carries `border-t border-l` and the grid is shifted `-mt-px -ml-px`.
 * The first row's top borders and the first column's left borders land exactly
 * on the panel's own 1px border and are clipped away by `overflow-hidden`;
 * every interior boundary is drawn exactly once, by the cell below/right of it.
 * No cell has a trailing border, so nothing dangles on the last column or row
 * at any of the three column counts (2 / 3 / 6 — all of which divide 6 evenly).
 */

"use client";

import type { ReactNode } from "react";
import { POOL_B } from "@/lib/data";
import { pct, secondsLabel } from "@/lib/format";
import { cn } from "@/lib/cn";
import { LIME } from "@/lib/brand";
import { CountUp } from "@/components/ui/count-up";
import { Reveal } from "@/components/ui/reveal";
import { Sparkline } from "@/components/ui/sparkline";
import { useProtocolStats } from "@/components/use-protocol-stats";

function Cell({
  label,
  children,
  sub,
  danger = false,
}: {
  label: string;
  children: ReactNode;
  sub?: ReactNode;
  danger?: boolean;
}) {
  return (
    <div className="border-line border-t border-l p-5 sm:p-6">
      <dt className="font-mono text-[0.625rem] uppercase tracking-[0.16em] text-mist-dim">
        {label}
      </dt>
      {/* `sub` lives inside the <dd>: a <div> in a <dl> may only contain dt/dd. */}
      <dd className="mt-3">
        <div
          className={cn(
            "font-display text-[1.75rem] leading-none tabular sm:text-[2rem]",
            danger ? "text-danger" : "text-white",
          )}
        >
          {children}
        </div>
        {sub ? <div className="mt-3">{sub}</div> : null}
      </dd>
    </div>
  );
}

function SubLine({ children }: { children: ReactNode }) {
  return <p className="font-mono text-[0.625rem] text-mist-dim">{children}</p>;
}

function Dot() {
  return (
    <span className="mx-2 text-lime" aria-hidden="true">
      ·
    </span>
  );
}

export function StatsStrip() {
  const { stats, live } = useProtocolStats();
  /** Fraction of a cell's bar to fill — clamped so a >100% loss ratio can't overflow. */
  const lossBarWidth = pct(Math.min(1, Math.max(0, stats.lossRatio)), 1);

  return (
    <section
      aria-label="Protocol metrics"
      className="mx-auto max-w-7xl px-5 py-14 sm:px-8 sm:py-20"
    >
      <Reveal>
        <div className="mb-4 flex justify-end">
          <span
            className={cn(
              "inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 font-mono text-[0.625rem] uppercase tracking-[0.16em]",
              live
                ? "border-lime/30 bg-lime/10 text-lime"
                : "border-line bg-surface-2 text-mist-dim",
            )}
            title={
              live
                ? "Read live from the PolicyPool contract"
                : "Illustrative fixture — set NEXT_PUBLIC_POLICY_POOL to go live"
            }
          >
            <span className={cn("size-1.5 rounded-full", live ? "bg-lime" : "bg-mist-dim")} />
            {live ? "Live · on-chain" : "Demo data"}
          </span>
        </div>
        <div className="panel overflow-hidden">
          <dl className="-mt-px -ml-px grid grid-cols-2 md:grid-cols-3 xl:grid-cols-6">
            <Cell
              label="Total value locked"
              sub={
                <Sparkline
                  data={POOL_B.history}
                  width={220}
                  height={32}
                  stroke={LIME}
                  fill
                  id="tvl"
                  className="h-8 w-full"
                />
              }
            >
              <CountUp value={stats.tvlUsd} preset="usdCompact" />
            </Cell>

            <Cell label="Cover in force">
              <CountUp value={stats.coverageInForceUsd} preset="usdCompact" />
            </Cell>

            <Cell label="Active policies">
              <CountUp value={stats.activePolicies} preset="int" />
            </Cell>

            <Cell label="Discharged to clients" danger>
              <CountUp value={stats.claimsPaidUsd} preset="usdCompact" />
            </Cell>

            <Cell
              label="Median discharge"
              sub={<SubLine>order_rejected → USDC landed</SubLine>}
            >
              {secondsLabel(stats.medianDischargeSeconds)}
            </Cell>

            <Cell
              label="Loss ratio"
              sub={
                <>
                  <div
                    className="h-1 w-full overflow-hidden rounded-full bg-line"
                    aria-hidden="true"
                  >
                    <div className="h-full rounded-full bg-lime" style={{ width: lossBarWidth }} />
                  </div>
                  <div className="mt-2">
                    <SubLine>claims / premiums earned</SubLine>
                  </div>
                </>
              }
            >
              {pct(stats.lossRatio, 1)}
            </Cell>
          </dl>
        </div>
      </Reveal>

      <p className="mt-6 text-center font-mono text-[0.6875rem] text-mist-dim">
        <span className="tabular">{stats.uniqueBuyers}</span> unique buyer wallets
        <Dot />
        <span className="tabular">{stats.agentsInsured}</span> agents insured
        <Dot />
        <span className="tabular">3</span> counterparties
      </p>
    </section>
  );
}
