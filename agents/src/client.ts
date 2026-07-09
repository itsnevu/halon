import { EventType } from "@croo-network/sdk";
import { erc20Abi } from "viem";

import { policyPoolAbi, PolicyStatus } from "./lib/abi";
import { capClient, nextEvent, reliabilityBpsOf } from "./lib/cap";
import { bps, log, orderKey, publicClient, usd, waitFor } from "./lib/chain";
import { boolOr, need, needAddress, numberOr } from "./lib/env";

/**
 * Meridian Capital — the buyer, and the demo driver.
 *
 * Note the order of operations, which is not the order the pitch usually implies:
 * the job is **negotiated first**, so that its CAP order id exists, and only then is
 * coverage bought *naming that order*. `PolicyPool.insuredOrderId` is the job order,
 * because that is what `ClaimsAdjudicator` matches a claim against. Buy cover naming
 * the wrong order and no claim can ever pay.
 *
 * The job is paid last. Cover is armed before a cent of it is at risk.
 */
const SCOPE = "meridian";

async function main() {
  const cap = capClient("SDK_KEY_CLIENT");

  const poolA = needAddress("POLICY_POOL_A");
  const usdc = needAddress("USDC_ADDRESS");
  const workerServiceId = need("SERVICE_ID_WORKER");
  const workerAgentId = need("WORKER_AGENT_ID");
  const coverageServiceId = need("SERVICE_ID_COVERAGE_A");

  const coverage = BigInt(Math.round(numberOr("DEMO_COVERAGE_USD", 1) * 1e6));
  const tenorHours = numberOr("DEMO_TENOR_HOURS", 24);
  const rejectAfter = numberOr("DEMO_REJECT_AFTER_SECONDS", 0);
  const shouldReject = boolOr("DEMO_REJECT", false);

  const stream = await cap.connectWebSocket();

  /* 1 ── Negotiate the hire. The worker accepts; the order id now exists. */
  const jobNegotiation = await cap.negotiateOrder({
    serviceId: workerServiceId,
    requirements: JSON.stringify({ task: "quarterly revenue analysis" }),
  });
  const jobCreated = await nextEvent(
    stream,
    EventType.OrderCreated,
    (e) => e.negotiation_id === jobNegotiation.negotiationId,
  );
  const jobOrderId = jobCreated.order_id!;
  log(SCOPE, `job order ${jobOrderId} created (unpaid)`);

  /* 2 ── Price the risk, from the same contract the pool will price against. */
  const reliabilityBps = await reliabilityBpsOf(cap, workerAgentId);
  const quote = await publicClient.readContract({
    address: poolA,
    abi: policyPoolAbi,
    functionName: "quoteFor",
    args: [reliabilityBps, coverage, BigInt(tenorHours)],
  });
  log(
    SCOPE,
    `${workerAgentId} is ${bps(reliabilityBps)} reliable → ${usd(coverage)} of cover for ` +
      `${usd(quote.premium)} (${quote.rateBps} bps), expected loss ${usd(quote.expectedLoss)}`,
  );
  if (!quote.insurable) {
    log(SCOPE, `declined by the RiskEngine (code ${quote.decline}). Nothing to buy.`);
    stream.close();
    return;
  }

  /* 3 ── Buy the cover. `fundAmount` lands in PolicyPool A inside the pay-tx. */
  const coverNegotiation = await cap.negotiateOrder({
    serviceId: coverageServiceId,
    fundAmount: quote.premium.toString(),
    fundToken: usdc,
    requirements: JSON.stringify({
      insuredOrderId: jobOrderId,
      insuredAgentId: workerAgentId,
      coverage: coverage.toString(),
      tenorHours,
    }),
  });
  const coverCreated = await nextEvent(
    stream,
    EventType.OrderCreated,
    (e) => e.negotiation_id === coverNegotiation.negotiationId,
  );
  await cap.payOrder(coverCreated.order_id!);
  log(SCOPE, `paid ${usd(quote.premium)} — premium is now in the pool`);

  /* 4 ── Watch Sentinel arm the policy, then hedge itself. Nobody asked it to. */
  const policyId = await waitFor("Sentinel to arm the policy", async () => {
    const id = await publicClient.readContract({
      address: poolA,
      abi: policyPoolAbi,
      functionName: "policyByInsuredOrder",
      args: [orderKey(jobOrderId)],
    });
    return id === 0n ? undefined : id;
  });
  log(SCOPE, `policy #${policyId} armed`);

  const hedged = await waitFor("Sentinel to cede into Bastion Re", async () => {
    const policy = await publicClient.readContract({
      address: poolA,
      abi: policyPoolAbi,
      functionName: "policy",
      args: [policyId],
    });
    return policy.reinsurer === "0x0000000000000000000000000000000000000000" ? undefined : policy;
  });
  log(SCOPE, `auto-hedged: ${usd(hedged.cededCoverage)} ceded to ${hedged.reinsurer}, treaty #${hedged.reinsurancePolicyId}`);

  /* 5 ── Only now is the job funded. */
  await cap.payOrder(jobOrderId);
  log(SCOPE, `job order paid. ${usd(coverage)} of exposure, fully covered.`);

  if (!shouldReject) {
    stream.close();
    return;
  }

  /* 6 ── The demo's failure. Reject a job the worker never delivered.
         If it *did* deliver, the Watcher will refuse to attest — see watcher.ts. */
  if (rejectAfter > 0) {
    log(SCOPE, `waiting ${rejectAfter}s before rejecting…`);
    await new Promise((resolve) => setTimeout(resolve, rejectAfter * 1000));
  }
  const before = await publicClient.readContract({
    address: usdc,
    abi: erc20Abi,
    functionName: "balanceOf",
    args: [(await cap.getOrder(jobOrderId)).requesterWalletAddress as `0x${string}`],
  });

  await cap.rejectOrder(jobOrderId, "no deliverable was ever submitted");
  log(SCOPE, `rejected ${jobOrderId}. The Watcher should discharge within seconds.`);

  const discharged = await waitFor(
    "the pool to discharge",
    async () => {
      const policy = await publicClient.readContract({
        address: poolA,
        abi: policyPoolAbi,
        functionName: "policy",
        args: [policyId],
      });
      return policy.status === PolicyStatus.Discharged ? policy : undefined;
    },
    { timeoutMs: 120_000, intervalMs: 1_500 },
  );

  const after = await publicClient.readContract({
    address: usdc,
    abi: erc20Abi,
    functionName: "balanceOf",
    args: [(await cap.getOrder(jobOrderId)).requesterWalletAddress as `0x${string}`],
  });

  log(SCOPE, `discharged ${usd(discharged.coverage)}. Wallet moved ${usd(after - before)}. Nobody approved it.`);
  stream.close();
}

main().catch((error) => {
  log(SCOPE, "fatal:", error);
  process.exit(1);
});
