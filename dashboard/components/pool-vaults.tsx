"use client";

/**
 * PoolVaults — the stacked capital layers, read live from PolicyPool contracts.
 *
 * Pool A (underwriter) is NEXT_PUBLIC_POLICY_POOL; Pool B (reinsurer) is the
 * optional NEXT_PUBLIC_POLICY_POOL_B. Every figure is an on-chain read — no
 * fixtures, no sparklines (chain stores no time-series).
 */

import { useReadContracts } from "wagmi";
import { CEDED_SHARE } from "@/lib/risk-engine";
import { explorerAddr, multiple, pct, shortAddr, usdCompact } from "@/lib/format";
import { cn } from "@/lib/cn";
import { Meta } from "@/components/ui/badge";
import { Panel } from "@/components/ui/panel";
import { Reveal } from "@/components/ui/reveal";
import { Section } from "@/components/ui/section";
import { SectionArt } from "@/components/ui/section-art";
import iconLattice from "@/public/icon-lattice.png";
import artVaultTiles from "@/public/art-vault-tiles.png";
import {
  HALON_CHAIN_ID,
  POLICY_POOL_ABI,
  POLICY_POOL_ADDRESS,
  POLICY_POOL_B_ADDRESS,
  fromUsdc,
} from "@/lib/onchain";
import { useProtocolStats } from "@/components/use-protocol-stats";

interface LayerChrome {
  chip: string;
  chipClass: string;
  layerNote: string;
}

const CHROME: Record<"A" | "B", LayerChrome> = {
  A: { chip: "Layer 1 · Underwriter", chipClass: "text-lime", layerNote: `Retains ${pct(1 - CEDED_SHARE, 0)}` },
  B: { chip: "Layer 2 · Reinsurer", chipClass: "text-info", layerNote: `Assumes ${pct(CEDED_SHARE, 0)}` },
};

interface PoolStats {
  totalCapital: number;
  lockedCapital: number;
  freeCapital: number;
  premiumsEarned: number;
  claimsPaid: number;
  utilizationBps: number;
  policies: number;
}

function usePoolStats(address?: `0x${string}`) {
  const base = { address, abi: POLICY_POOL_ABI, chainId: HALON_CHAIN_ID } as const;
  const { data } = useReadContracts({
    contracts: [
      { ...base, functionName: "totalCapital" },
      { ...base, functionName: "lockedCapital" },
      { ...base, functionName: "freeCapital" },
      { ...base, functionName: "premiumsEarned" },
      { ...base, functionName: "claimsPaid" },
      { ...base, functionName: "utilizationBps" },
      { ...base, functionName: "nextPolicyId" },
    ],
    query: { enabled: !!address, refetchInterval: 15_000 },
  });
  if (!data || data.some((r) => r.status !== "success")) return undefined;
  const [total, locked, free, premiums, claims, util, next] = data.map((r) => r.result as bigint);
  return {
    totalCapital: fromUsdc(total) ?? 0,
    lockedCapital: fromUsdc(locked) ?? 0,
    freeCapital: fromUsdc(free) ?? 0,
    premiumsEarned: fromUsdc(premiums) ?? 0,
    claimsPaid: fromUsdc(claims) ?? 0,
    utilizationBps: Number(util),
    policies: Number(next),
  } satisfies PoolStats;
}

function SummaryItem({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-baseline gap-2.5">
      <span>{label}</span>
      <span className="tabular text-fg">{value}</span>
    </div>
  );
}

function PoolCard({
  layer,
  address,
  stats,
}: {
  layer: "A" | "B";
  address: `0x${string}`;
  stats?: PoolStats;
}) {
  const chrome = CHROME[layer];
  const util = stats ? stats.utilizationBps / 10000 : 0;

  return (
    <Panel className="h-full p-6 md:p-8">
      <div className="flex items-center justify-between gap-3">
        <span className={`font-mono text-[0.625rem] tracking-[0.16em] uppercase ${chrome.chipClass}`}>
          {chrome.chip}
        </span>
        <a
          href={explorerAddr(address)}
          target="_blank"
          rel="noreferrer"
          className="font-mono text-xs text-mist-dim hover:text-lime"
        >
          {shortAddr(address)}
        </a>
      </div>

      <div className="mt-4 grid grid-cols-2 gap-4">
        <div>
          <p className="font-mono text-[0.625rem] tracking-wide text-mist-dim uppercase">Total capital</p>
          <p className="tabular mt-1.5 font-display text-2xl text-fg">
            {stats ? usdCompact(stats.totalCapital) : "—"}
          </p>
        </div>
        <div>
          <p className="font-mono text-[0.625rem] tracking-wide text-mist-dim uppercase">Free capital</p>
          <p className="tabular mt-1.5 font-display text-2xl text-lime">
            {stats ? usdCompact(stats.freeCapital) : "—"}
          </p>
        </div>
      </div>

      <div className="mt-5">
        <div className="mb-1 flex items-baseline justify-between font-mono text-[0.625rem] text-mist-dim uppercase">
          <span>Utilization</span>
          <span className="tabular text-fg">{stats ? pct(util, 1) : "—"}</span>
        </div>
        <div className="h-1.5 w-full overflow-hidden rounded-full bg-line" aria-hidden="true">
          <div className="h-full rounded-full bg-lime" style={{ width: `${Math.min(1, util) * 100}%` }} />
        </div>
      </div>

      <div className="mt-5 space-y-2.5">
        <Meta label="Locked capital">{stats ? usdCompact(stats.lockedCapital) : "—"}</Meta>
        <Meta label="Premiums earned">{stats ? usdCompact(stats.premiumsEarned) : "—"}</Meta>
        <Meta label="Claims paid">{stats ? usdCompact(stats.claimsPaid) : "—"}</Meta>
        <Meta label="Policies written">{stats ? String(stats.policies) : "—"}</Meta>
        <Meta label="Layer">
          <span className="text-mist">{chrome.layerNote}</span>
        </Meta>
      </div>
    </Panel>
  );
}

export function PoolVaults() {
  const { stats } = useProtocolStats();
  const poolA = usePoolStats(POLICY_POOL_ADDRESS);
  const poolB = usePoolStats(POLICY_POOL_B_ADDRESS);

  const leverage = stats.tvlUsd > 0 ? stats.coverageInForceUsd / stats.tvlUsd : 0;
  const configured =
    (POLICY_POOL_ADDRESS ? 1 : 0) + (POLICY_POOL_B_ADDRESS ? 1 : 0);

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
      lead="The underwriter writes the policy; the reinsurer stands behind it. Premiums land in these vaults atomically inside the CAP pay-tx — every figure below is read straight from the pool contracts."
    >
      <Reveal className="mb-6 flex flex-wrap gap-x-8 gap-y-2 font-mono text-[0.6875rem] tracking-wide text-mist-dim uppercase p-4 neu rounded-xl">
        <SummaryItem label="Total value locked" value={usdCompact(stats.tvlUsd)} />
        <SummaryItem label="Cover in force" value={usdCompact(stats.coverageInForceUsd)} />
        <SummaryItem label="Cascade recoveries" value={usdCompact(stats.cascadeRecoveryUsd)} />
        <SummaryItem label="Leverage" value={multiple(leverage, 2)} />
      </Reveal>

      {configured === 0 ? (
        <div className="panel p-10 text-center text-sm text-mist">
          Connect deployed pools (NEXT_PUBLIC_POLICY_POOL, NEXT_PUBLIC_POLICY_POOL_B) to read live capital.
        </div>
      ) : (
        // One pool → single full-width card (no empty second column). Two → 2-up.
        <div className={cn("grid gap-6", configured > 1 && "lg:grid-cols-2")}>
          {POLICY_POOL_ADDRESS && (
            <Reveal className="h-full">
              <PoolCard layer="A" address={POLICY_POOL_ADDRESS} stats={poolA} />
            </Reveal>
          )}
          {POLICY_POOL_B_ADDRESS && (
            <Reveal delay={100} className="h-full">
              <PoolCard layer="B" address={POLICY_POOL_B_ADDRESS} stats={poolB} />
            </Reveal>
          )}
        </div>
      )}
    </Section>
  );
}
