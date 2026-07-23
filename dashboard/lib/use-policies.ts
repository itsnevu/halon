"use client";

import { useMemo } from "react";
import { useReadContract, useReadContracts } from "wagmi";
import {
  HALON_CHAIN_ID,
  HAS_DEPLOYMENT,
  POLICY_POOL_ABI,
  POLICY_POOL_ADDRESS,
  POLICY_STATUS,
  POLICY_KIND,
  USDC_DECIMALS,
} from "./onchain";

export interface OnchainPolicy {
  id: number;
  status: (typeof POLICY_STATUS)[number];
  kind: (typeof POLICY_KIND)[number];
  beneficiary: `0x${string}`;
  holder: `0x${string}`;
  coverageUsd: number;
  premiumUsd: number;
  cededCoverageUsd: number;
  reinsurer: `0x${string}`;
  boundAt: number; // unix seconds
  expiresAt: number; // unix seconds
  reliabilityBps: number;
  intentId: `0x${string}`;
}

const toNum = (v: bigint) => Number(v) / 10 ** USDC_DECIMALS;

/**
 * Enumerate every policy the PolicyPool has ever bound, straight from chain —
 * one multicall for the `policy(id)` tuples, one for `ownerOf(id)` (the current
 * holder, who is paid on discharge). No fixtures: returns [] until a deployment
 * exists and has bound policies.
 */
export function usePolicies() {
  const base = {
    address: POLICY_POOL_ADDRESS,
    abi: POLICY_POOL_ABI,
    chainId: HALON_CHAIN_ID,
  } as const;

  const { data: nextIdData } = useReadContract({
    ...base,
    functionName: "nextPolicyId",
    query: { enabled: HAS_DEPLOYMENT, refetchInterval: 15_000 },
  });
  const count = nextIdData ? Number(nextIdData) : 0;

  // Policy ids start at 1 and run through nextPolicyId inclusive.
  const ids = useMemo(() => Array.from({ length: count }, (_, i) => i + 1), [count]);

  const { data: policyData, isLoading } = useReadContracts({
    contracts: ids.map((id) => ({ ...base, functionName: "policy", args: [BigInt(id)] })),
    query: { enabled: HAS_DEPLOYMENT && count > 0, refetchInterval: 15_000 },
  });

  const { data: ownerData } = useReadContracts({
    contracts: ids.map((id) => ({ ...base, functionName: "ownerOf", args: [BigInt(id)] })),
    query: { enabled: HAS_DEPLOYMENT && count > 0, refetchInterval: 15_000 },
  });

  const policies = useMemo<OnchainPolicy[]>(() => {
    if (!policyData) return [];
    const out: OnchainPolicy[] = [];
    for (let i = 0; i < ids.length; i++) {
      const r = policyData[i];
      if (r?.status !== "success" || !r.result) continue;
      const p = r.result as {
        status: number;
        kind: number;
        beneficiary: `0x${string}`;
        coverage: bigint;
        premium: bigint;
        cededCoverage: bigint;
        reinsurer: `0x${string}`;
        boundAt: bigint;
        expiresAt: bigint;
        reliabilityAtBindBps: bigint;
        intentId: `0x${string}`;
      };
      const owner = ownerData?.[i];
      out.push({
        id: ids[i],
        status: POLICY_STATUS[p.status] ?? "None",
        kind: POLICY_KIND[p.kind] ?? "Direct",
        beneficiary: p.beneficiary,
        holder: owner?.status === "success" ? (owner.result as `0x${string}`) : p.beneficiary,
        coverageUsd: toNum(p.coverage),
        premiumUsd: toNum(p.premium),
        cededCoverageUsd: toNum(p.cededCoverage),
        reinsurer: p.reinsurer,
        boundAt: Number(p.boundAt),
        expiresAt: Number(p.expiresAt),
        reliabilityBps: Number(p.reliabilityAtBindBps),
        intentId: p.intentId,
      });
    }
    return out;
  }, [policyData, ownerData, ids]);

  return { policies, count, isLoading, live: HAS_DEPLOYMENT };
}
