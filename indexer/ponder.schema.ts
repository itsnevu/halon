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

/* ── ProofOfWork ─────────────────────────────────────────────── */

/** One escrow contract deployed by the factory. `id` is the escrow address. */
export const Project = onchainTable("Project", (p) => ({
  id: p.text().primaryKey(),
  client: p.text(),
  freelancer: p.text(),
  totalAmount: p.bigint(),
  createdAt: p.integer(),
}));

/** A milestone inside an escrow. `id` is `${project}-${milestoneId}`. */
export const Milestone = onchainTable("Milestone", (p) => ({
  id: p.text().primaryKey(),
  project: p.text(),
  milestoneId: p.bigint(),
  amount: p.bigint(),
  description: p.text(),
  aiApproved: p.boolean(),
  aiScore: p.bigint(),
  clientApproved: p.boolean(),
  isPaid: p.boolean(),
  paidTo: p.text(),
  createdAt: p.integer(),
}));

/** An advance-financing invoice in the PaymentDistributor. `id` is the invoice id. */
export const Invoice = onchainTable("Invoice", (p) => ({
  id: p.text().primaryKey(),
  client: p.text(),
  freelancer: p.text(),
  amount: p.bigint(),
  advancedAmount: p.bigint(),
  payout: p.bigint(),
  fee: p.bigint(),
  lpYield: p.bigint(),
  isFunded: p.boolean(),
  isRepaid: p.boolean(),
  createdAt: p.integer(),
}));
