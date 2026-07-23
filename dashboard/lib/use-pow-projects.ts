"use client";

import { useMemo } from "react";
import { useAccount, useReadContract, useReadContracts } from "wagmi";
import { ESCROW_FACTORY_ABI, ESCROW_PROJECT_ABI } from "./pow-abis";
import { POW_CONFIG } from "./pow-config";

export type PowRole = "client" | "freelancer";

export interface PowProject {
  address: `0x${string}`;
  index: number;
  client: `0x${string}`;
  freelancer: `0x${string}`;
  totalAmount: bigint;
}

/**
 * Enumerate every escrow the factory has deployed and (optionally) narrow to the
 * ones where the connected wallet is the `client` or the `freelancer`.
 *
 * Replaces the old "read only the last deployed project" shortcut, which broke
 * the moment a second project existed. Reads are batched through
 * `useReadContracts` (one multicall for the addresses, one for the metadata).
 */
export function usePowProjects(role?: PowRole) {
  const { address } = useAccount();

  const { data: countData } = useReadContract({
    address: POW_CONFIG.escrowFactoryAddress,
    abi: ESCROW_FACTORY_ABI,
    functionName: "getDeployedProjectsCount",
  });
  const count = countData ? Number(countData) : 0;

  // 1) resolve every project address from the factory's array.
  const { data: addressData } = useReadContracts({
    contracts: Array.from({ length: count }, (_, i) => ({
      address: POW_CONFIG.escrowFactoryAddress,
      abi: ESCROW_FACTORY_ABI,
      functionName: "deployedProjects",
      args: [BigInt(i)],
    })),
    query: { enabled: count > 0 },
  });

  const addresses = useMemo(
    () =>
      (addressData ?? [])
        .map((r) => (r.status === "success" ? (r.result as unknown as `0x${string}`) : undefined))
        .filter((a): a is `0x${string}` => Boolean(a)),
    [addressData],
  );

  // 2) read client / freelancer / totalAmount for each project.
  const { data: metaData, isLoading } = useReadContracts({
    contracts: addresses.flatMap((addr) => [
      { address: addr, abi: ESCROW_PROJECT_ABI, functionName: "client" },
      { address: addr, abi: ESCROW_PROJECT_ABI, functionName: "freelancer" },
      { address: addr, abi: ESCROW_PROJECT_ABI, functionName: "totalAmount" },
    ]),
    query: { enabled: addresses.length > 0 },
  });

  const allProjects = useMemo<PowProject[]>(() => {
    if (!metaData) return [];
    const out: PowProject[] = [];
    for (let i = 0; i < addresses.length; i++) {
      const c = metaData[i * 3];
      const f = metaData[i * 3 + 1];
      const t = metaData[i * 3 + 2];
      if (c?.status === "success" && f?.status === "success" && t?.status === "success") {
        out.push({
          address: addresses[i],
          index: i,
          client: c.result as `0x${string}`,
          freelancer: f.result as `0x${string}`,
          totalAmount: t.result as bigint,
        });
      }
    }
    return out;
  }, [metaData, addresses]);

  const projects = useMemo(() => {
    if (!role || !address) return allProjects;
    return allProjects.filter((p) => p[role].toLowerCase() === address.toLowerCase());
  }, [allProjects, role, address]);

  return { projects, allProjects, count, isLoading };
}
