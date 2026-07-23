"use client";

import { useReadContracts } from "wagmi";
import type { ProtocolStats } from "@/lib/types";
import {
  HALON_CHAIN_ID,
  HAS_DEPLOYMENT,
  POLICY_POOL_ABI,
  POLICY_POOL_ADDRESS,
  fromUsdc,
} from "@/lib/onchain";

/**
 * Protocol headline stats, read live from the PolicyPool contract. NO fixtures:
 * before a deployment is wired in (NEXT_PUBLIC_POLICY_POOL) or before the pool
 * has any activity, every figure is a real zero — never a fabricated number.
 * `live` is true once the contract reads succeed.
 *
 * Only fields the contract actually stores are populated. Narrative-only fields
 * (agentsInsured, uniqueBuyers, medianDischargeSeconds) have no on-chain source
 * yet and are reported as 0 until a registry/indexer backs them.
 */
const EMPTY_STATS: ProtocolStats = {
  tvlUsd: 0,
  activePolicies: 0,
  coverageInForceUsd: 0,
  claimsPaidUsd: 0,
  premiumsEarnedUsd: 0,
  agentsInsured: 0,
  uniqueBuyers: 0,
  medianDischargeSeconds: 0,
  cascadeRecoveryUsd: 0,
  lossRatio: 0,
};

export function useProtocolStats(): { stats: ProtocolStats; live: boolean } {
  const contract = {
    address: POLICY_POOL_ADDRESS,
    abi: POLICY_POOL_ABI,
    chainId: HALON_CHAIN_ID,
  } as const;

  const { data } = useReadContracts({
    contracts: [
      { ...contract, functionName: "totalCapital" },
      { ...contract, functionName: "lockedCapital" },
      { ...contract, functionName: "premiumsEarned" },
      { ...contract, functionName: "claimsPaid" },
      { ...contract, functionName: "nextPolicyId" },
      { ...contract, functionName: "recoveredTotal" },
    ],
    query: { enabled: HAS_DEPLOYMENT, refetchInterval: 15_000 },
  });

  if (!HAS_DEPLOYMENT || !data || data.some((r) => r.status !== "success")) {
    return { stats: EMPTY_STATS, live: false };
  }

  const [total, locked, premiums, claims, nextId, recovered] = data.map(
    (r) => r.result as bigint,
  );

  const premiumsEarnedUsd = fromUsdc(premiums) ?? 0;
  const claimsPaidUsd = fromUsdc(claims) ?? 0;

  return {
    live: true,
    stats: {
      tvlUsd: fromUsdc(total) ?? 0,
      coverageInForceUsd: fromUsdc(locked) ?? 0,
      premiumsEarnedUsd,
      claimsPaidUsd,
      activePolicies: Number(nextId),
      cascadeRecoveryUsd: fromUsdc(recovered) ?? 0,
      lossRatio: premiumsEarnedUsd > 0 ? claimsPaidUsd / premiumsEarnedUsd : 0,
      // No on-chain source yet — honest zeros, not fixtures.
      agentsInsured: 0,
      uniqueBuyers: 0,
      medianDischargeSeconds: 0,
    },
  };
}
