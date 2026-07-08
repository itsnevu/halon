/**
 * StatsStrip — the metrics rail under the ticker.
 *
 * Stays a Server Component: `CountUp` takes a serializable `preset` string
 * rather than a `format` function, so nothing has to cross the RSC boundary
 * that React refuses to serialize.
 *
 * ── Hairline grid ────────────────────────────────────────────────────────
 * Every cell carries `border-t border-l` and the grid is shifted `-mt-px -ml-px`.
 * The first row's top borders and the first column's left borders land exactly
 * on the panel's own 1px border and are clipped away by `overflow-hidden`;
 * every interior boundary is drawn exactly once, by the cell below/right of it.
 * No cell has a trailing border, so nothing dangles on the last column or row
 * at any of the three column counts (2 / 3 / 6 — all of which divide 6 evenly).
 */

import type { ReactNode } from "react";
import { PROTOCOL_STATS, POOL_B } from "@/lib/data";
import { pct, secondsLabel } from "@/lib/format";
import { cn } from "@/lib/cn";
import { LIME } from "@/lib/brand";
import { CountUp } from "@/components/ui/count-up";
import { Reveal } from "@/components/ui/reveal";
import { Sparkline } from "@/components/ui/sparkline";

/** Fraction of a cell's bar to fill — clamped so a >100% loss ratio can't overflow. */
const lossBarWidth = pct(Math.min(1, Math.max(0, PROTOCOL_STATS.lossRatio)), 1);

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
  return (
    <section
      aria-label="Protocol metrics"
      className="mx-auto max-w-7xl px-5 py-14 sm:px-8 sm:py-20"
    >
      <Reveal>
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
              <CountUp value={PROTOCOL_STATS.tvlUsd} preset="usdCompact" />
            </Cell>

            <Cell label="Cover in force">
              <CountUp value={PROTOCOL_STATS.coverageInForceUsd} preset="usdCompact" />
            </Cell>

            <Cell label="Active policies">
              <CountUp value={PROTOCOL_STATS.activePolicies} preset="int" />
            </Cell>

            <Cell label="Discharged to clients" danger>
              <CountUp value={PROTOCOL_STATS.claimsPaidUsd} preset="usdCompact" />
            </Cell>

            <Cell
              label="Median discharge"
              sub={<SubLine>order_rejected → USDC landed</SubLine>}
            >
              {secondsLabel(PROTOCOL_STATS.medianDischargeSeconds)}
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
              {pct(PROTOCOL_STATS.lossRatio, 1)}
            </Cell>
          </dl>
        </div>
      </Reveal>

      <p className="mt-6 text-center font-mono text-[0.6875rem] text-mist-dim">
        <span className="tabular">{PROTOCOL_STATS.uniqueBuyers}</span> unique buyer wallets
        <Dot />
        <span className="tabular">{PROTOCOL_STATS.agentsInsured}</span> agents insured
        <Dot />
        <span className="tabular">3</span> counterparties
      </p>
    </section>
  );
}
