import { onchainTable } from "@ponder/core";

export const IntentPolicy = onchainTable("IntentPolicy", (p) => ({
  id: p.text().primaryKey(),
  intentId: p.text(),
  beneficiary: p.text(),
  coverage: p.bigint(),
  premium: p.bigint(),
  status: p.text(),
  boundAt: p.integer(),
  expiresAt: p.integer(),
}));

export const Claim = onchainTable("Claim", (p) => ({
  id: p.text().primaryKey(),
  policyId: p.text(),
  outcome: p.integer(),
  dischargedAt: p.integer(),
  dischargedBy: p.text(),
}));
