import { createSchema } from "@ponder/core";

export default createSchema((p) => ({
  IntentPolicy: p.createTable({
    id: p.string(), // policyId
    intentId: p.string(), // mapped from insuredOrderId -> intentId
    beneficiary: p.string(),
    coverage: p.bigint(),
    premium: p.bigint(),
    status: p.string(), // "Armed", "Discharged", "Settled"
    boundAt: p.int(),
    expiresAt: p.int(),
  }),
  
  Claim: p.createTable({
    id: p.string(), // attestation hash or unique claim ID
    policyId: p.string().references("IntentPolicy.id"),
    outcome: p.int(), // 0 = Failed, 1 = Expired
    dischargedAt: p.int(),
    dischargedBy: p.string(),
  }),
}));
