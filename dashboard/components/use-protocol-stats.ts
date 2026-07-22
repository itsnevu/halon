"use client";

import { useReadContracts } from "wagmi";
import { PROTOCOL_STATS } from "@/lib/data";
import type { ProtocolStats } from "@/lib/types";
import {
  HALON_CHAIN_ID,
  HAS_DEPLOYMENT,
  POLICY_POOL_ABI,
  POLICY_POOL_ADDRESS,
  fromUsdc,
} from "@/lib/onchain";

/**
 * Returns the protocol headline stats, read live from the PolicyPool when a
 * deployment is wired in (NEXT_PUBLIC_POLICY_POOL) and falling back to the
 * `lib/data.ts` fixture otherwise. `live` says which one you got, so the UI can
 * label itself honestly.
 *
 * Only the fields the contract actually stores are overlaid — TVL, cover in
 * force, policies, claims paid, premiums, and the derived loss ratio. Narrative
 * fields (agent names, unique buyers, median discharge) stay from the fixture.
 */
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
    ],
    query: { enabled: HAS_DEPLOYMENT, refetchInterval: 15_000 },
  });

  if (!HAS_DEPLOYMENT || !data || data.some((r) => r.status !== "success")) {
    return { stats: PROTOCOL_STATS, live: false };
  }

  const [total, locked, premiums, claims, nextId] = data.map(
    (r) => r.result as bigint,
  );

  const tvlUsd = fromUsdc(total) ?? PROTOCOL_STATS.tvlUsd;
  const coverageInForceUsd = fromUsdc(locked) ?? PROTOCOL_STATS.coverageInForceUsd;
  const premiumsEarnedUsd = fromUsdc(premiums) ?? PROTOCOL_STATS.premiumsEarnedUsd;
  const claimsPaidUsd = fromUsdc(claims) ?? PROTOCOL_STATS.claimsPaidUsd;
  const activePolicies = Number(nextId);
  const lossRatio = premiumsEarnedUsd > 0 ? claimsPaidUsd / premiumsEarnedUsd : 0;

  return {
    live: true,
    stats: {
      ...PROTOCOL_STATS,
      tvlUsd,
      coverageInForceUsd,
      premiumsEarnedUsd,
      claimsPaidUsd,
      activePolicies,
      lossRatio,
    },
  };
}
