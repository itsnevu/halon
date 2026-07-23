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
 *   NEXT_PUBLIC_RHC_CHAIN_ID=…             ← Robinhood Chain id (see docs)
 *   NEXT_PUBLIC_RHC_RPC_URL=…              ← Robinhood Chain RPC endpoint
 *
 * Until NEXT_PUBLIC_POLICY_POOL is set, everything falls back to the fixture and
 * the UI honestly labels itself "demo data".
 */

import { RHC_CHAIN_ID } from "./robinhood-chain";

export const POLICY_POOL_ADDRESS = process.env.NEXT_PUBLIC_POLICY_POOL as
  | `0x${string}`
  | undefined;

/** Optional second layer (reinsurer pool). Only rendered when configured. */
export const POLICY_POOL_B_ADDRESS = process.env.NEXT_PUBLIC_POLICY_POOL_B as
  | `0x${string}`
  | undefined;

/** ClaimsAdjudicator — holds ADJUDICATOR_ROLE, discharges disputed claims. */
export const CLAIMS_ADJUDICATOR_ADDRESS = process.env.NEXT_PUBLIC_CLAIMS_ADJUDICATOR as
  | `0x${string}`
  | undefined;

export const HALON_CHAIN_ID = RHC_CHAIN_ID;

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
  { type: "function", name: "recoveredTotal", stateMutability: "view", inputs: [], outputs: [{ type: "uint256" }] },
  { type: "function", name: "cededPremiumsPaid", stateMutability: "view", inputs: [], outputs: [{ type: "uint256" }] },
  { type: "function", name: "nextPolicyId", stateMutability: "view", inputs: [], outputs: [{ type: "uint256" }] },
  { type: "function", name: "freeCapital", stateMutability: "view", inputs: [], outputs: [{ type: "uint256" }] },
  { type: "function", name: "utilizationBps", stateMutability: "view", inputs: [], outputs: [{ type: "uint256" }] },
  { type: "function", name: "underReserved", stateMutability: "view", inputs: [], outputs: [{ type: "bool" }] },
  { type: "function", name: "depositCapital", stateMutability: "nonpayable", inputs: [{ name: "amount", type: "uint256" }], outputs: [] },
  { type: "function", name: "ownerOf", stateMutability: "view", inputs: [{ name: "tokenId", type: "uint256" }], outputs: [{ type: "address" }] },
  {
    type: "function",
    name: "policy",
    stateMutability: "view",
    inputs: [{ name: "policyId", type: "uint256" }],
    outputs: [
      {
        type: "tuple",
        components: [
          { name: "status", type: "uint8" },
          { name: "kind", type: "uint8" },
          { name: "beneficiary", type: "address" },
          { name: "coverage", type: "uint256" },
          { name: "premium", type: "uint256" },
          { name: "cededCoverage", type: "uint256" },
          { name: "reinsurer", type: "address" },
          { name: "reinsurancePolicyId", type: "uint256" },
          { name: "cededPremiumDrawn", type: "bool" },
          { name: "boundAt", type: "uint256" },
          { name: "expiresAt", type: "uint256" },
          { name: "reliabilityAtBindBps", type: "uint256" },
          { name: "intentId", type: "bytes32" },
          { name: "relayerId", type: "bytes32" },
        ],
      },
    ],
  },
] as const;

/** AgentRegistry — on-chain source of truth for agent identity + reliability. */
export const AGENT_REGISTRY_ADDRESS = process.env.NEXT_PUBLIC_AGENT_REGISTRY as
  | `0x${string}`
  | undefined;
export const HAS_AGENT_REGISTRY = Boolean(AGENT_REGISTRY_ADDRESS);

export const AGENT_REGISTRY_ABI = [
  { type: "function", name: "agentCount", stateMutability: "view", inputs: [], outputs: [{ type: "uint256" }] },
  {
    type: "function",
    name: "allAgents",
    stateMutability: "view",
    inputs: [],
    outputs: [
      {
        type: "tuple[]",
        components: [
          { name: "wallet", type: "address" },
          { name: "name", type: "string" },
          { name: "handle", type: "string" },
          { name: "category", type: "string" },
          { name: "reliabilityBps", type: "uint256" },
          { name: "firstParty", type: "bool" },
          { name: "active", type: "bool" },
          { name: "registeredAt", type: "uint256" },
        ],
      },
    ],
  },
] as const;

/** Minimal Chainlink AggregatorV3 ABI — reads a live price feed on-chain. */
export const AGGREGATOR_V3_ABI = [
  {
    type: "function",
    name: "latestRoundData",
    stateMutability: "view",
    inputs: [],
    outputs: [
      { name: "roundId", type: "uint80" },
      { name: "answer", type: "int256" },
      { name: "startedAt", type: "uint256" },
      { name: "updatedAt", type: "uint256" },
      { name: "answeredInRound", type: "uint80" },
    ],
  },
  { type: "function", name: "decimals", stateMutability: "view", inputs: [], outputs: [{ type: "uint8" }] },
] as const;

/** Policy status enum, mirroring PolicyPool.Status. */
export const POLICY_STATUS = ["None", "Armed", "Discharged", "Settled"] as const;
/** Policy kind enum, mirroring PolicyPool.Kind. */
export const POLICY_KIND = ["Direct", "Treaty"] as const;

/** Convert a 6-decimal on-chain USDC amount to a plain float for the UI. */
export function fromUsdc(value: bigint | undefined): number | undefined {
  if (value === undefined) return undefined;
  return Number(value) / 10 ** USDC_DECIMALS;
}
