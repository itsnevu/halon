/**
 * On-chain wiring for the live protocol reads.
 *
 * The landing page renders `lib/data.ts` fixtures by default. The moment a
 * PolicyPool address is present in the environment, `useProtocolStats` overlays
 * real values read straight from that contract — no component changes, no
 * redeploy of the app. Set these in Vercel (or `.env.local`) after running
 * `contracts/script/DeployTestnet.s.sol`:
 *
 *   NEXT_PUBLIC_POLICY_POOL=0x…            ← PolicyPool address from the deploy
 *   NEXT_PUBLIC_HALON_CHAIN_ID=84532       ← Base Sepolia (default)
 *   NEXT_PUBLIC_BASE_SEPOLIA_RPC_URL=…     ← optional custom RPC
 *
 * Until NEXT_PUBLIC_POLICY_POOL is set, everything falls back to the fixture and
 * the UI honestly labels itself "demo data".
 */

import { baseSepolia } from "wagmi/chains";

export const POLICY_POOL_ADDRESS = process.env.NEXT_PUBLIC_POLICY_POOL as
  | `0x${string}`
  | undefined;

export const HALON_CHAIN_ID = Number(
  process.env.NEXT_PUBLIC_HALON_CHAIN_ID ?? baseSepolia.id,
);

/** MockERC20 USDC (and the pool's accounting) use 6 decimals. */
export const USDC_DECIMALS = 6;

/** True once a deployment address is wired in. */
export const HAS_DEPLOYMENT = Boolean(POLICY_POOL_ADDRESS);

/**
 * Just the public getters the landing needs. All are `uint256` and denominated
 * in USDC's 6 decimals, except `nextPolicyId` which is a plain count.
 */
export const POLICY_POOL_ABI = [
  { type: "function", name: "totalCapital", stateMutability: "view", inputs: [], outputs: [{ type: "uint256" }] },
  { type: "function", name: "lockedCapital", stateMutability: "view", inputs: [], outputs: [{ type: "uint256" }] },
  { type: "function", name: "premiumsEarned", stateMutability: "view", inputs: [], outputs: [{ type: "uint256" }] },
  { type: "function", name: "claimsPaid", stateMutability: "view", inputs: [], outputs: [{ type: "uint256" }] },
  { type: "function", name: "nextPolicyId", stateMutability: "view", inputs: [], outputs: [{ type: "uint256" }] },
] as const;

/** Convert a 6-decimal on-chain USDC amount to a plain float for the UI. */
export function fromUsdc(value: bigint | undefined): number | undefined {
  if (value === undefined) return undefined;
  return Number(value) / 10 ** USDC_DECIMALS;
}
