"use client";

import { useMemo } from "react";
import { useReadContract } from "wagmi";
import {
  AGENT_REGISTRY_ABI,
  AGENT_REGISTRY_ADDRESS,
  HALON_CHAIN_ID,
  HAS_AGENT_REGISTRY,
} from "./onchain";

export interface OnchainAgent {
  wallet: `0x${string}`;
  name: string;
  handle: string;
  category: string;
  reliabilityBps: number;
  firstParty: boolean;
  active: boolean;
  registeredAt: number;
}

/**
 * Read the whole AgentRegistry in one call. No fixtures: returns [] until the
 * registry is deployed (NEXT_PUBLIC_AGENT_REGISTRY) and has agents registered.
 */
export function useAgents() {
  const { data, isLoading } = useReadContract({
    address: AGENT_REGISTRY_ADDRESS,
    abi: AGENT_REGISTRY_ABI,
    functionName: "allAgents",
    chainId: HALON_CHAIN_ID,
    query: { enabled: HAS_AGENT_REGISTRY, refetchInterval: 30_000 },
  });

  const agents = useMemo<OnchainAgent[]>(() => {
    if (!data) return [];
    return (data as readonly {
      wallet: `0x${string}`;
      name: string;
      handle: string;
      category: string;
      reliabilityBps: bigint;
      firstParty: boolean;
      active: boolean;
      registeredAt: bigint;
    }[]).map((a) => ({
      wallet: a.wallet,
      name: a.name,
      handle: a.handle,
      category: a.category,
      reliabilityBps: Number(a.reliabilityBps),
      firstParty: a.firstParty,
      active: a.active,
      registeredAt: Number(a.registeredAt),
    }));
  }, [data]);

  return { agents, isLoading, live: HAS_AGENT_REGISTRY };
}
