import { ponder } from "ponder:registry";
import { Project, Milestone, Invoice } from "ponder:schema";

/* ── ProofOfWork escrows ─────────────────────────────────────── */

ponder.on("EscrowFactory:ProjectCreated", async ({ event, context }) => {
  await context.db.insert(Project).values({
    id: event.args.projectAddress,
    client: event.args.client,
    freelancer: event.args.freelancer,
    totalAmount: event.args.amount,
    createdAt: Number(event.block.timestamp),
  });
});

// Milestone id is namespaced by its escrow, since ids restart at 0 per project.
const milestoneKey = (project: string, id: bigint) => `${project}-${id}`;

ponder.on("EscrowProject:MilestoneCreated", async ({ event, context }) => {
  await context.db.insert(Milestone).values({
    id: milestoneKey(event.log.address, event.args.id),
    project: event.log.address,
    milestoneId: event.args.id,
    amount: event.args.amount,
    description: event.args.description,
    aiApproved: false,
    aiScore: 0n,
    clientApproved: false,
    isPaid: false,
    paidTo: "",
    createdAt: Number(event.block.timestamp),
  });
});

ponder.on("EscrowProject:MilestoneAIApproved", async ({ event, context }) => {
  await context.db
    .update(Milestone, { id: milestoneKey(event.log.address, event.args.id) })
    .set({ aiApproved: true, aiScore: event.args.score });
});

ponder.on("EscrowProject:MilestoneClientApproved", async ({ event, context }) => {
  await context.db
    .update(Milestone, { id: milestoneKey(event.log.address, event.args.id) })
    .set({ clientApproved: true });
});

ponder.on("EscrowProject:MilestonePaid", async ({ event, context }) => {
  await context.db
    .update(Milestone, { id: milestoneKey(event.log.address, event.args.id) })
    .set({ isPaid: true, paidTo: event.args.to });
});

/* ── Advance-financing invoices ──────────────────────────────── */

ponder.on("PaymentDistributor:InvoiceCreated", async ({ event, context }) => {
  await context.db.insert(Invoice).values({
    id: event.args.id.toString(),
    client: event.args.client,
    freelancer: event.args.freelancer,
    amount: event.args.amount,
    advancedAmount: 0n,
    payout: 0n,
    fee: 0n,
    lpYield: 0n,
    isFunded: false,
    isRepaid: false,
    createdAt: Number(event.block.timestamp),
  });
});

ponder.on("PaymentDistributor:AdvanceFunded", async ({ event, context }) => {
  await context.db
    .update(Invoice, { id: event.args.id.toString() })
    .set({
      advancedAmount: event.args.advancedAmount,
      payout: event.args.payout,
      fee: event.args.fee,
      isFunded: true,
    });
});

ponder.on("PaymentDistributor:InvoiceRepaid", async ({ event, context }) => {
  await context.db
    .update(Invoice, { id: event.args.id.toString() })
    .set({ lpYield: event.args.lpYield, isRepaid: true });
});
