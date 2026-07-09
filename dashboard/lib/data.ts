/**
 * Deterministic fixture for the HALON dashboard.
 *
 * Nothing here is random and nothing depends on `Date.now()` — every timestamp
 * is stored as "seconds ago" — so server and client render identical markup.
 *
 * Premiums are NOT typed in by hand: they come out of `lib/risk-engine.ts`,
 * the same pure function `RiskEngine.sol` implements. If the model changes,
 * every number on the page moves with it. That is the point.
 *
 * Replace this module with viem/wagmi reads (PolicyPool + CAP `listOrders`)
 * and no component needs to change.
 */

import type {
  Address,
  Agent,
  ChainEvent,
  Policy,
  PoolState,
  ProtocolStats,
  TxHash,
} from "./types";
import { RELIABILITY_FLOOR, poolUtilization, quote, reliabilityOf } from "./risk-engine";
import { pct, usd } from "./format";

/* ── deterministic pseudo-hex, so hashes look real and never change ── */

function hex(seed: number, chars: number): string {
  let x = seed >>> 0 || 0x9e3779b9;
  let out = "";
  while (out.length < chars) {
    x ^= x << 13;
    x >>>= 0;
    x ^= x >>> 17;
    x ^= x << 5;
    x >>>= 0;
    out += x.toString(16).padStart(8, "0");
  }
  return out.slice(0, chars);
}

const txHash = (seed: number) => `0x${hex(seed, 64)}` as TxHash;
const address = (seed: number) => `0x${hex(seed, 40)}` as Address;

/* ── Agents ─────────────────────────────────────────────────── */

type AgentSeed = Omit<Agent, "reliability">;

const agentSeeds: AgentSeed[] = [
  {
    id: "cap:agent:meridian",
    name: "Meridian Capital",
    handle: "@meridian",
    role: "client",
    address: address(1001),
    blurb: "Treasury agent. Hires workers, never wants to eat their failure.",
    completed: 31,
    rejected: 0,
    expired: 0,
    history: [1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1],
    online: true,
    covered: false,
    firstParty: true,
  },
  {
    id: "cap:agent:aurora",
    name: "Aurora Analytics",
    handle: "@aurora",
    role: "worker",
    address: address(1002),
    blurb: "Data analysis. Fast, cheap, and drops one job in five.",
    service: {
      id: "svc_aurora_data_analysis",
      name: "Data Analysis",
      priceUsd: 100,
      requiresFundTransfer: false,
    },
    completed: 48,
    rejected: 10,
    expired: 2,
    history: [0.86, 0.85, 0.87, 0.84, 0.83, 0.85, 0.82, 0.84, 0.83, 0.81, 0.82, 0.82, 0.79, 0.8],
    online: true,
    covered: true,
    firstParty: true,
  },
  {
    id: "cap:agent:sentinel",
    name: "Sentinel Underwriting",
    handle: "@sentinel",
    role: "underwriter",
    address: address(1003),
    blurb:
      "Writes coverage on worker agents, then immediately buys its own cover from Bastion Re. Provider and requester in the same breath.",
    service: {
      id: "svc_sentinel_coverage",
      name: "Buy Coverage",
      priceUsd: 0,
      requiresFundTransfer: true,
    },
    completed: 34,
    rejected: 0,
    expired: 1,
    history: [0.96, 0.96, 0.97, 0.97, 0.96, 0.97, 0.97, 0.98, 0.97, 0.97, 0.97, 0.97, 0.97, 0.97],
    online: true,
    covered: true,
    firstParty: true,
  },
  {
    id: "cap:agent:bastion",
    name: "Bastion Re",
    handle: "@bastion",
    role: "reinsurer",
    address: address(1004),
    blurb: "Deep pool. Takes quota-share off underwriters. The layer under the layer.",
    service: {
      id: "svc_bastion_reinsurance",
      name: "Reinsurance",
      priceUsd: 0,
      requiresFundTransfer: true,
    },
    completed: 61,
    rejected: 0,
    expired: 0,
    history: [1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1],
    online: true,
    covered: false,
    firstParty: true,
  },
  {
    id: "cap:agent:kite",
    name: "Kite Search",
    handle: "@kite",
    role: "worker",
    address: address(1005),
    blurb: "Web retrieval. Reliable enough to be boring.",
    service: {
      id: "svc_kite_search",
      name: "Deep Search",
      priceUsd: 25,
      requiresFundTransfer: false,
    },
    completed: 94,
    rejected: 5,
    expired: 1,
    history: [0.91, 0.92, 0.92, 0.93, 0.92, 0.93, 0.94, 0.93, 0.94, 0.94, 0.95, 0.94, 0.94, 0.94],
    online: true,
    covered: true,
    firstParty: false,
  },
  {
    id: "cap:agent:foundry",
    name: "Foundry Ops",
    handle: "@foundry",
    role: "worker",
    address: address(1006),
    blurb: "Contract deploys and verification. Ambitious. Occasionally reverts.",
    service: {
      id: "svc_foundry_deploy",
      name: "Contract Deploy",
      priceUsd: 300,
      requiresFundTransfer: false,
    },
    completed: 67,
    rejected: 30,
    expired: 3,
    history: [0.74, 0.73, 0.72, 0.74, 0.71, 0.7, 0.71, 0.69, 0.7, 0.68, 0.69, 0.67, 0.68, 0.67],
    online: true,
    covered: true,
    firstParty: false,
  },
  {
    id: "cap:agent:lumen",
    name: "Lumen Translate",
    handle: "@lumen",
    role: "worker",
    address: address(1007),
    blurb: "42 languages. Has failed three jobs in its life and remembers each one.",
    service: {
      id: "svc_lumen_translate",
      name: "Translation",
      priceUsd: 40,
      requiresFundTransfer: false,
    },
    completed: 97,
    rejected: 2,
    expired: 1,
    history: [0.95, 0.96, 0.96, 0.96, 0.97, 0.96, 0.97, 0.97, 0.97, 0.98, 0.97, 0.97, 0.97, 0.97],
    online: true,
    covered: true,
    firstParty: false,
  },
  {
    id: "cap:agent:ferry",
    name: "Ferry Bridge Router",
    handle: "@ferry",
    role: "worker",
    address: address(1008),
    blurb: "Cross-chain routing. Fails when the bridge does, which is not never.",
    service: {
      id: "svc_ferry_route",
      name: "Bridge Route",
      priceUsd: 800,
      requiresFundTransfer: false,
    },
    completed: 88,
    rejected: 9,
    expired: 3,
    history: [0.9, 0.9, 0.89, 0.9, 0.88, 0.89, 0.88, 0.89, 0.87, 0.88, 0.88, 0.87, 0.88, 0.88],
    online: true,
    covered: true,
    firstParty: false,
  },
  {
    id: "cap:agent:cinder",
    name: "Cinder Vision",
    handle: "@cinder",
    role: "worker",
    address: address(1009),
    blurb: "Image understanding at scale. Prime risk, prices like it.",
    service: {
      id: "svc_cinder_vision",
      name: "Vision Inference",
      priceUsd: 2000,
      requiresFundTransfer: false,
    },
    completed: 96,
    rejected: 3,
    expired: 1,
    history: [0.94, 0.95, 0.95, 0.96, 0.95, 0.96, 0.96, 0.96, 0.97, 0.96, 0.96, 0.96, 0.96, 0.96],
    online: false,
    covered: true,
    firstParty: false,
  },
  {
    id: "cap:agent:nomad",
    name: "Nomad Scraper",
    handle: "@nomad",
    role: "worker",
    address: address(1010),
    blurb: "Wants coverage. Cannot have it. Fails more than half the jobs it takes.",
    service: {
      id: "svc_nomad_scrape",
      name: "Bulk Scrape",
      priceUsd: 15,
      requiresFundTransfer: false,
    },
    completed: 41,
    rejected: 49,
    expired: 10,
    history: [0.52, 0.5, 0.51, 0.48, 0.49, 0.47, 0.46, 0.45, 0.44, 0.45, 0.43, 0.42, 0.42, 0.41],
    online: true,
    covered: false,
    firstParty: false,
  },
];

export const AGENTS: Agent[] = agentSeeds.map((a) => ({
  ...a,
  reliability: reliabilityOf(a),
}));

export const agentById = (id: string) => AGENTS.find((a) => a.id === id);

export const WORKERS = AGENTS.filter((a) => a.role === "worker");
/** The four agents we operate. The rest are other teams' agents buying cover. */
export const FIRST_PARTY = AGENTS.filter((a) => a.firstParty);

/* ── Pools ──────────────────────────────────────────────────── */

export const POOL_A: PoolState = {
  id: "A",
  name: "Sentinel Pool",
  operator: "Sentinel Underwriting",
  operatorAgentId: "cap:agent:sentinel",
  address: address(2001),
  tier: "underwriter",
  totalCapitalUsd: 48_200,
  lockedUsd: 12_400,
  claimsPaidUsd: 3_100,
  premiumsEarnedUsd: 5_860,
  recoveredUsd: 1_550,
  activePolicies: 18,
  history: [
    38_000, 39_200, 40_100, 41_800, 41_200, 43_600, 44_100, 43_200, 45_800, 46_400, 45_100,
    47_300, 47_900, 48_200,
  ],
};

export const POOL_B: PoolState = {
  id: "B",
  name: "Bastion Re Pool",
  operator: "Bastion Re",
  operatorAgentId: "cap:agent:bastion",
  address: address(2002),
  tier: "reinsurer",
  totalCapitalUsd: 210_000,
  lockedUsd: 31_900,
  claimsPaidUsd: 9_450,
  premiumsEarnedUsd: 14_220,
  recoveredUsd: 0,
  activePolicies: 29,
  history: [
    166_000, 171_000, 174_500, 178_000, 176_400, 182_000, 186_500, 189_000, 188_200, 194_000,
    199_500, 203_000, 207_400, 210_000,
  ],
};

export const POOLS: PoolState[] = [POOL_A, POOL_B];

export const UTIL_A = poolUtilization(POOL_A);
export const UTIL_B = poolUtilization(POOL_B);

/* ── Policies ───────────────────────────────────────────────── */

interface PolicySeed {
  tokenId: number;
  buyer: string;
  buyerSeed: number;
  insuredAgentId: string;
  coverageUsd: number;
  tenorHours: number;
  reliabilityAtBind: number;
  boundAgoSeconds: number;
  remainingSeconds: number;
  status: Policy["status"];
  reinsurancePolicyId?: number;
  txSeed: number;
}

const policySeeds: PolicySeed[] = [
  {
    tokenId: 1042,
    buyer: "Meridian Capital",
    buyerSeed: 1001,
    insuredAgentId: "cap:agent:aurora",
    coverageUsd: 100,
    tenorHours: 24,
    reliabilityAtBind: 0.8,
    boundAgoSeconds: 64_800,
    remainingSeconds: 21_600,
    status: "active",
    reinsurancePolicyId: 77,
    txSeed: 3101,
  },
  {
    tokenId: 1041,
    buyer: "Meridian Capital",
    buyerSeed: 1001,
    insuredAgentId: "cap:agent:aurora",
    coverageUsd: 250,
    tenorHours: 12,
    reliabilityAtBind: 0.82,
    boundAgoSeconds: 620,
    remainingSeconds: 0,
    status: "discharged",
    reinsurancePolicyId: 76,
    txSeed: 3102,
  },
  {
    tokenId: 1039,
    buyer: "Helios Ops",
    buyerSeed: 1101,
    insuredAgentId: "cap:agent:kite",
    coverageUsd: 500,
    tenorHours: 48,
    reliabilityAtBind: 0.94,
    boundAgoSeconds: 118_000,
    remainingSeconds: 54_800,
    status: "active",
    reinsurancePolicyId: 74,
    txSeed: 3103,
  },
  {
    tokenId: 1036,
    buyer: "Tessellate Labs",
    buyerSeed: 1102,
    insuredAgentId: "cap:agent:foundry",
    coverageUsd: 300,
    tenorHours: 24,
    reliabilityAtBind: 0.67,
    boundAgoSeconds: 40_100,
    remainingSeconds: 46_300,
    status: "active",
    reinsurancePolicyId: 73,
    txSeed: 3104,
  },
  {
    tokenId: 1031,
    buyer: "Orbit Guild",
    buyerSeed: 1103,
    insuredAgentId: "cap:agent:lumen",
    coverageUsd: 1_200,
    tenorHours: 72,
    reliabilityAtBind: 0.97,
    boundAgoSeconds: 3_900,
    remainingSeconds: 255_300,
    status: "active",
    reinsurancePolicyId: 71,
    txSeed: 3105,
  },
  {
    tokenId: 1028,
    buyer: "Meridian Capital",
    buyerSeed: 1001,
    insuredAgentId: "cap:agent:ferry",
    coverageUsd: 800,
    tenorHours: 24,
    reliabilityAtBind: 0.88,
    boundAgoSeconds: 190_000,
    remainingSeconds: 0,
    status: "settled",
    reinsurancePolicyId: 69,
    txSeed: 3106,
  },
  {
    tokenId: 1024,
    buyer: "Vector Studio",
    buyerSeed: 1104,
    insuredAgentId: "cap:agent:cinder",
    coverageUsd: 2_000,
    tenorHours: 168,
    reliabilityAtBind: 0.96,
    boundAgoSeconds: 302_400,
    remainingSeconds: 302_400,
    status: "active",
    reinsurancePolicyId: 66,
    txSeed: 3107,
  },
  {
    tokenId: 1019,
    buyer: "Northwind Bots",
    buyerSeed: 1105,
    insuredAgentId: "cap:agent:foundry",
    coverageUsd: 400,
    tenorHours: 24,
    reliabilityAtBind: 0.71,
    boundAgoSeconds: 431_000,
    remainingSeconds: 0,
    status: "discharged",
    reinsurancePolicyId: 63,
    txSeed: 3108,
  },
];

export const POLICIES: Policy[] = policySeeds.map((s) => {
  const q = quote({
    reliability: s.reliabilityAtBind,
    coverageUsd: s.coverageUsd,
    tenorHours: s.tenorHours,
    utilization: UTIL_A,
  });
  const insured = agentById(s.insuredAgentId);
  return {
    tokenId: s.tokenId,
    buyer: s.buyer,
    buyerAddress: address(s.buyerSeed),
    insuredAgentId: s.insuredAgentId,
    insuredAgentName: insured?.name ?? "Unknown agent",
    coverageUsd: s.coverageUsd,
    premiumUsd: q.premiumUsd,
    tenorHours: s.tenorHours,
    reliabilityAtBind: s.reliabilityAtBind,
    boundAgoSeconds: s.boundAgoSeconds,
    remainingSeconds: s.remainingSeconds,
    status: s.status,
    underwriter: "A",
    cededShare: q.cededShare,
    cededPremiumUsd: q.cededPremiumUsd,
    reinsurancePolicyId: s.reinsurancePolicyId,
    capOrderId: `ord_${hex(s.txSeed, 12)}`,
    txHash: txHash(s.txSeed),
  };
});

export const ACTIVE_POLICIES = POLICIES.filter((p) => p.status === "active");

/* ── The live sequence ──────────────────────────────────────────
   Every amount below is derived from the same quote the contract
   would return for policy #1041, so the feed can't drift from the
   pricing model. */

const DEMO = quote({
  reliability: 0.82,
  coverageUsd: 250,
  tenorHours: 12,
  utilization: UTIL_A,
});

/**
 * The one agent the book refuses. Both its reliability and the floor it misses
 * are read from the model, so the prose in the feed cannot drift away from what
 * `quote()` would actually do to it.
 */
const DECLINED = AGENTS.find((a) => a.id === "cap:agent:nomad")!;

const BLOCK = 24_918_400;

export const EVENTS: ChainEvent[] = [
  {
    id: "e-01",
    kind: "cascade_recovery",
    agoSeconds: 8,
    title: "Cascade recovery settled",
    detail: `Bastion Re Pool reimbursed Sentinel Pool for its ${(DEMO.cededShare * 100).toFixed(0)}% quota share.`,
    amountUsd: 250 * DEMO.cededShare,
    from: "Bastion Re Pool",
    to: "Sentinel Pool",
    txHash: txHash(4101),
    blockNumber: BLOCK + 6,
    severity: "good",
  },
  {
    id: "e-02",
    kind: "discharge",
    agoSeconds: 12,
    title: "Policy #1041 discharged",
    detail: "Full indemnity paid to the client. No human approved this.",
    amountUsd: 250,
    from: "Sentinel Pool",
    to: "Meridian Capital",
    txHash: txHash(4102),
    blockNumber: BLOCK + 5,
    severity: "good",
  },
  {
    id: "e-03",
    kind: "claim_attested",
    agoSeconds: 16,
    title: "Watcher attested the failure",
    detail: "EIP-712 attestation accepted by ClaimsAdjudicator: order rejected, tx confirmed.",
    from: "Watcher",
    to: "ClaimsAdjudicator",
    txHash: txHash(4103),
    blockNumber: BLOCK + 4,
    severity: "info",
  },
  {
    id: "e-04",
    kind: "order_rejected",
    agoSeconds: 21,
    title: "Aurora Analytics failed to deliver",
    detail: "CAP order moved to terminal status `rejected`. This is the trigger. Nothing else is.",
    amountUsd: 250,
    from: "Meridian Capital",
    to: "Aurora Analytics",
    txHash: txHash(4104),
    blockNumber: BLOCK + 3,
    severity: "bad",
  },
  {
    id: "e-05",
    kind: "reprice",
    agoSeconds: 180,
    title: "Aurora Analytics repriced",
    detail: "Reliability Index 82.0% → 80.0% after the loss. New cover costs more. The market learns.",
    from: "RiskEngine",
    severity: "warn",
  },
  {
    id: "e-06",
    kind: "order_paid",
    agoSeconds: 240,
    title: "Job order paid into CAP escrow",
    detail: "Meridian hired Aurora for a $250 analysis run, protected by policy #1041.",
    amountUsd: 250,
    from: "Meridian Capital",
    to: "CAP Escrow",
    txHash: txHash(4106),
    blockNumber: BLOCK - 40,
    severity: "info",
  },
  {
    id: "e-07",
    kind: "reinsurance_bound",
    agoSeconds: 522,
    title: "Sentinel auto-hedged into Bastion Re",
    detail: `Ceded ${(DEMO.cededShare * 100).toFixed(0)}% of the risk 4.1s after binding. The underwriter became a requester.`,
    amountUsd: DEMO.cededPremiumUsd,
    from: "Sentinel Underwriting",
    to: "Bastion Re",
    txHash: txHash(4107),
    blockNumber: BLOCK - 62,
    severity: "good",
  },
  {
    id: "e-08",
    kind: "policy_bound",
    agoSeconds: 526,
    title: "Policy #1041 bound",
    detail: `ERC-721 minted to Meridian. Premium ${usd(DEMO.premiumUsd)} landed in Sentinel Pool atomically, in the pay-tx.`,
    amountUsd: DEMO.premiumUsd,
    from: "Meridian Capital",
    to: "Sentinel Pool",
    txHash: txHash(4108),
    blockNumber: BLOCK - 63,
    severity: "good",
  },
  {
    id: "e-09",
    kind: "quote",
    agoSeconds: 601,
    title: "Quote requested",
    detail: `$250 cover on Aurora Analytics · 12h tenor · reliability 82.0% → ${usd(DEMO.premiumUsd)}`,
    from: "Meridian Capital",
    to: "RiskEngine",
    severity: "info",
  },
  {
    id: "e-10",
    kind: "order_completed",
    agoSeconds: 1_340,
    title: "Lumen Translate delivered",
    detail: "Policy #1031 stays live. No claim. Reliability ticks up.",
    amountUsd: 40,
    from: "Orbit Guild",
    to: "Lumen Translate",
    txHash: txHash(4110),
    blockNumber: BLOCK - 220,
    severity: "good",
  },
  {
    id: "e-11",
    kind: "capital_deposit",
    agoSeconds: 2_460,
    title: "Bastion Re topped up its pool",
    detail: "Reinsurer capital deepens as more underwriters cede into it.",
    amountUsd: 25_000,
    from: "Bastion Re",
    to: "Bastion Re Pool",
    txHash: txHash(4111),
    blockNumber: BLOCK - 410,
    severity: "info",
  },
  {
    id: "e-12",
    kind: "policy_bound",
    agoSeconds: 3_900,
    title: "Policy #1031 bound",
    detail: "Orbit Guild, an agent we have never met, insured Lumen Translate for 72 hours.",
    amountUsd: 1_200,
    from: "Orbit Guild",
    to: "Sentinel Pool",
    txHash: txHash(4112),
    blockNumber: BLOCK - 650,
    severity: "good",
  },
  {
    id: "e-13",
    kind: "order_expired",
    agoSeconds: 10_800,
    title: "Nomad Scraper blew its SLA deadline",
    detail: `Uninsured. Declined at bind, reliability ${pct(DECLINED.reliability)} is under the ${pct(RELIABILITY_FLOOR, 0)} floor. The client eats it.`,
    amountUsd: 15,
    from: "Nomad Scraper",
    txHash: txHash(4113),
    blockNumber: BLOCK - 1_800,
    severity: "warn",
  },
  {
    id: "e-14",
    kind: "order_completed",
    agoSeconds: 14_400,
    title: "Kite Search delivered",
    detail: "Policy #1039 remains in force with 15h to run.",
    amountUsd: 25,
    from: "Helios Ops",
    to: "Kite Search",
    txHash: txHash(4114),
    blockNumber: BLOCK - 2_400,
    severity: "good",
  },
  {
    id: "e-15",
    kind: "cascade_recovery",
    agoSeconds: 32_400,
    title: "Cascade recovery settled",
    detail: "Policy #1019 · Foundry Ops failed a deploy. Two layers absorbed it, the client felt nothing.",
    amountUsd: 200,
    from: "Bastion Re Pool",
    to: "Sentinel Pool",
    txHash: txHash(4115),
    blockNumber: BLOCK - 5_400,
    severity: "good",
  },
  {
    id: "e-16",
    kind: "capital_deposit",
    agoSeconds: 61_200,
    title: "Sentinel Underwriting deposited capital",
    detail: "Writing capacity expanded to $48,200.",
    amountUsd: 8_000,
    from: "Sentinel Underwriting",
    to: "Sentinel Pool",
    txHash: txHash(4116),
    blockNumber: BLOCK - 10_100,
    severity: "info",
  },
];

/** The exact quote behind the live sequence — handy for the cascade diagram. */
export const DEMO_QUOTE = DEMO;
export const DEMO_COVERAGE_USD = 250;

/* ── Rollup ─────────────────────────────────────────────────────
   Two layers, two books — and they are not additive.

   Every policy Pool A writes is ceded to Pool B, so A's 18 covers appear a
   second time inside B's 29. Adding them counts the same risk twice. Likewise
   only Pool A ever pays a *client*; what Pool B pays goes to an underwriter.

   The fixture is internally consistent about this: `POOL_A.recoveredUsd`
   ($1,550) is exactly the 50% quota share of `POOL_A.claimsPaidUsd` ($3,100).
   B's remaining claims went to the other underwriters that cede into it — B
   reinsures more books than ours, which is why it carries 29 treaties to A's 18.

   A loss ratio *is* additive: it is a ratio over two gross books, not a count
   of the same risk twice. Everything else here has to pick a layer. */

/** Gross across both books — only meaningful as the numerator/denominator of a ratio. */
const GROSS_CLAIMS_PAID_USD = POOL_A.claimsPaidUsd + POOL_B.claimsPaidUsd;
const GROSS_PREMIUMS_EARNED_USD = POOL_A.premiumsEarnedUsd + POOL_B.premiumsEarnedUsd;

export const PROTOCOL_STATS: ProtocolStats = {
  tvlUsd: POOL_A.totalCapitalUsd + POOL_B.totalCapitalUsd,
  /** Client-facing policies only. B's 29 are reinsurance treaties on these same risks. */
  activePolicies: POOL_A.activePolicies,
  /** The whole book. `POLICIES` above enumerates only the most recent few. */
  coverageInForceUsd: 186_400,
  /** Only Pool A discharges to a client. B discharges to an underwriter. */
  claimsPaidUsd: POOL_A.claimsPaidUsd,
  premiumsEarnedUsd: GROSS_PREMIUMS_EARNED_USD,
  agentsInsured: 23,
  uniqueBuyers: 9,
  medianDischargeSeconds: 4.2,
  /** Everything the reinsurance layer has cascaded back up into underwriter pools. */
  cascadeRecoveryUsd: POOL_B.claimsPaidUsd,
  lossRatio: GROSS_CLAIMS_PAID_USD / GROSS_PREMIUMS_EARNED_USD,
};
