import { parseAbi } from "viem";

/**
 * Hand-written rather than imported from `contracts/out/`, which is gitignored and
 * only exists after `forge build`. Every signature here must match the Solidity;
 * `forge inspect <Contract> abi` is the check if one ever drifts.
 */

const QUOTE =
  "struct Quote { bool insurable; uint8 decline; uint256 rejectionHazardBps; uint256 expiryHazardBps; uint256 totalHazardBps; uint256 baseLoss; uint256 expectedLoss; uint256 riskLoadBps; uint256 tenorFactorBps; uint256 utilFactorBps; uint256 expenseFee; uint256 premium; uint256 rateBps; uint256 loading; bool rateCapped; uint256 cededShareBps; uint256 cededPremium; uint256 netRetention; uint256 netPremium; int256 underwriterMargin; int256 reinsurerMargin; }";

export const riskEngineAbi = parseAbi([
  QUOTE,
  "function quote(uint256 reliabilityBps, uint256 coverage, uint256 tenorHours, uint256 utilizationBps) view returns (Quote)",
  "function reliabilityOf(uint256 completed, uint256 rejected, uint256 expired) view returns (uint256)",
  "function poolUtilization(uint256 lockedUsd, uint256 totalCapitalUsd) view returns (uint256)",
  "function RELIABILITY_FLOOR_BPS() view returns (uint256)",
]);

export const policyPoolAbi = parseAbi([
  QUOTE,
  "struct BindParams { address beneficiary; uint256 coverage; uint256 premium; uint256 tenorHours; uint256 reliabilityBps; bytes32 insuredOrderId; bytes32 insuredAgentId; }",
  "struct Policy { uint8 status; uint8 kind; address beneficiary; uint256 coverage; uint256 premium; uint256 cededCoverage; address reinsurer; uint256 reinsurancePolicyId; bool cededPremiumDrawn; uint256 boundAt; uint256 expiresAt; uint256 reliabilityAtBindBps; bytes32 insuredOrderId; bytes32 insuredAgentId; }",
  "function bindDirect(BindParams p) returns (uint256)",
  "function bindTreaty(BindParams p) returns (uint256)",
  "function drawCededPremium(uint256 policyId) returns (uint256)",
  "function attachReinsurance(uint256 policyId, address reinsurer, uint256 treatyId)",
  "function policy(uint256 policyId) view returns (Policy)",
  "function policyByInsuredOrder(bytes32 insuredOrderId) view returns (uint256)",
  "function quoteFor(uint256 reliabilityBps, uint256 coverage, uint256 tenorHours) view returns (Quote)",
  "function utilizationBps() view returns (uint256)",
  "function totalCapital() view returns (uint256)",
  "function lockedCapital() view returns (uint256)",
  "function freeCapital() view returns (uint256)",
  "function pendingInflow() view returns (uint256)",
  "function underReserved() view returns (bool)",
  "function cedeRecipient() view returns (address)",
  "function sync()",
  "function depositCapital(uint256 amount)",
]);

export const claimsAdjudicatorAbi = parseAbi([
  "struct Attestation { address pool; uint256 policyId; bytes32 insuredOrderId; uint8 outcome; bool deliverySubmitted; bytes32 contentHash; uint256 observedAt; }",
  "function discharge(Attestation a, bytes[] signatures) returns (uint256)",
  "function hashAttestation(Attestation a) view returns (bytes32)",
  "function isAutoPayable(Attestation a) pure returns (bool)",
  "function threshold() view returns (uint256)",
]);

/** `PolicyPool.Status`. Zero is "no such policy", which is why `Armed` is 1. */
export const PolicyStatus = { None: 0, Armed: 1, Discharged: 2, Settled: 3 } as const;

/** `ClaimsAdjudicator.Outcome`. The two terminal failure states CAP gives an order. */
export const Outcome = { Rejected: 0, Expired: 1 } as const;

/**
 * Field-for-field `ATTESTATION_TYPEHASH`. Order matters: EIP-712 hashes the encoded
 * struct positionally, so a reordering here signs a different message and the
 * contract recovers a stranger's address. `scripts/verify-wiring.ts` checks this
 * against `hashAttestation()` on a live chain rather than trusting it by eye.
 */
export const ATTESTATION_TYPES = {
  Attestation: [
    { name: "pool", type: "address" },
    { name: "policyId", type: "uint256" },
    { name: "insuredOrderId", type: "bytes32" },
    { name: "outcome", type: "uint8" },
    { name: "deliverySubmitted", type: "bool" },
    { name: "contentHash", type: "bytes32" },
    { name: "observedAt", type: "uint256" },
  ],
} as const;

/** Must match `EIP712("HALON", "1")` in the constructor. */
export const halonDomain = (chainId: number, verifyingContract: `0x${string}`) =>
  ({ name: "HALON", version: "1", chainId, verifyingContract }) as const;
