/**
 * Domain types for HALON.
 *
 * These mirror what the real system will read from CAP (`listOrders`,
 * `getOrder`) and from our own contracts (PolicyPool, RiskEngine,
 * ClaimsAdjudicator). Today `lib/data.ts` fills them with a deterministic
 * fixture; swapping in viem/wagmi reads later should not change any component.
 */

export type Address = `0x${string}`;
export type TxHash = `0x${string}`;

/* ── Agents ─────────────────────────────────────────────────── */

export type AgentRole = "client" | "worker" | "underwriter" | "reinsurer";

export interface AgentService {
  /** CAP service id */
  id: string;
  name: string;
  priceUsd: number;
  /** CAP flag: pay-tx also transfers `fundAmount` to `providerFundAddress` */
  requiresFundTransfer: boolean;
}

export interface Agent {
  /** CAP agent id */
  id: string;
  name: string;
  handle: string;
  role: AgentRole;
  address: Address;
  blurb: string;
  service?: AgentService;

  /** Order counts pulled from CAP — the only reputation source that exists. */
  completed: number;
  rejected: number;
  expired: number;

  /**
   * HALON Reliability Index, 0..1. Derived, not read from CAP:
   *   completed / (completed + rejected + expired)
   * See `reliabilityOf()`.
   */
  reliability: number;
  /** Last 14 observations of the index, for the sparkline. */
  history: number[];

  online: boolean;
  /** Insured by one of our pools right now? */
  covered: boolean;
  /** "First party" = one of our 4 demo agents. Others are external buyers. */
  firstParty: boolean;
}

/* ── Pools ──────────────────────────────────────────────────── */

export interface PoolState {
  id: "A" | "B";
  name: string;
  /** Agent that operates this pool */
  operator: string;
  operatorAgentId: string;
  address: Address;
  tier: "underwriter" | "reinsurer";

  totalCapitalUsd: number;
  /** Capital locked against active policies */
  lockedUsd: number;
  claimsPaidUsd: number;
  premiumsEarnedUsd: number;
  /** Recovered from the layer above (Pool A only) */
  recoveredUsd: number;
  activePolicies: number;
  /** TVL over the last 14 periods */
  history: number[];
}

/* ── Policies ───────────────────────────────────────────────── */

export type PolicyStatus = "active" | "discharged" | "expired" | "settled";

export interface Policy {
  /** ERC-721 token id minted by PolicyPool */
  tokenId: number;
  buyer: string;
  buyerAddress: Address;
  /** The agent whose failure is being insured */
  insuredAgentId: string;
  insuredAgentName: string;

  coverageUsd: number;
  premiumUsd: number;
  tenorHours: number;
  /** Reliability of the insured agent at bind time — pricing is a snapshot */
  reliabilityAtBind: number;

  /** Seconds since bind. Relative so the fixture never goes stale and never
   *  triggers an SSR/CSR hydration mismatch. */
  boundAgoSeconds: number;
  /** Seconds of cover left. 0 once the policy leaves `active`. */
  remainingSeconds: number;
  status: PolicyStatus;

  /** Which pool wrote the policy */
  underwriter: "A" | "B";
  /** Quota-share ceded to the reinsurer, 0..1 */
  cededShare: number;
  cededPremiumUsd: number;
  /** Token id of the back-to-back reinsurance policy in Pool B */
  reinsurancePolicyId?: number;

  capOrderId: string;
  txHash: TxHash;
}

/* ── Events ─────────────────────────────────────────────────── */

export type EventKind =
  | "quote"
  | "policy_bound"
  | "reinsurance_bound"
  | "order_paid"
  | "order_completed"
  | "order_rejected"
  | "order_expired"
  | "claim_attested"
  | "discharge"
  | "cascade_recovery"
  | "capital_deposit"
  | "reprice";

export type Severity = "info" | "good" | "warn" | "bad";

export interface ChainEvent {
  id: string;
  kind: EventKind;
  /** Seconds before "now". Kept relative so the fixture never goes stale
   *  and never causes an SSR/CSR hydration mismatch. */
  agoSeconds: number;
  title: string;
  detail: string;
  amountUsd?: number;
  from?: string;
  to?: string;
  txHash?: TxHash;
  blockNumber?: number;
  severity: Severity;
}

/* ── Protocol-level rollup ──────────────────────────────────── */

export interface ProtocolStats {
  tvlUsd: number;
  activePolicies: number;
  coverageInForceUsd: number;
  claimsPaidUsd: number;
  premiumsEarnedUsd: number;
  agentsInsured: number;
  /** Distinct wallets that have bought coverage — the anti-sybil number */
  uniqueBuyers: number;
  /** Median seconds between `order_rejected` and payout landing */
  medianDischargeSeconds: number;
  cascadeRecoveryUsd: number;
  lossRatio: number;
}
