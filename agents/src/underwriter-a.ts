import { EventType } from "@croo-network/sdk";

import { policyPoolAbi } from "./lib/abi";
import { capClient, holdOpen, nextEvent, reliabilityBpsOf } from "./lib/cap";
import { agentKey, bps, log, orderKey, publicClient, send, signer, usd, waitFor } from "./lib/chain";
import { need, needAddress } from "./lib/env";

/**
 * Sentinel Underwriting — provider and requester in the same breath.
 *
 * It sells coverage to a client, and then, seconds later and with nobody asking, it
 * opens a CAP order of its own and buys reinsurance from Bastion Re. That is where
 * the A2A story actually lives: not an agent that sells a service, but an agent that
 * hires another agent to protect itself.
 *
 * The money path is worth following, because it is the part that is easy to get
 * wrong. The client's premium lands in `PolicyPool A` directly, inside CAP's pay-tx.
 * The ceded premium then has to leave that pool and reach Bastion — but CAP's pay
 * transaction is signed by *this agent's custodial CAP wallet*, not by the pool and
 * not by the key that holds `UNDERWRITER_ROLE`. So `drawCededPremium` pushes exactly
 * the cedeable amount to that wallet — an address the pool's admin set, which this
 * process cannot change — and the CAP order spends it from there.
 */
const SCOPE = "sentinel";

interface CoverRequest {
  /** The CAP order the client wants insured: the job, not this purchase. */
  insuredOrderId: string;
  insuredAgentId: string;
  /** USDC base units. */
  coverage: string;
  tenorHours: number;
}

async function main() {
  const cap = capClient("SDK_KEY_UNDERWRITER_A");
  const { account, wallet } = signer("UNDERWRITER_A_PRIVATE_KEY");

  const poolA = needAddress("POLICY_POOL_A");
  const poolB = needAddress("POLICY_POOL_B");
  const usdc = needAddress("USDC_ADDRESS");
  const coverageServiceId = need("SERVICE_ID_COVERAGE_A");
  const reinsuranceServiceId = need("SERVICE_ID_REINSURANCE_B");

  const quoted = new Map<string, { request: CoverRequest; reliabilityBps: bigint }>();
  const stream = await cap.connectWebSocket();

  /* ── Quote and accept ─────────────────────────────────────── */

  stream.on(EventType.NegotiationCreated, (event) => {
    void (async () => {
      if (event.service_id !== coverageServiceId) return;
      const negotiationId = event.negotiation_id!;
      try {
        const negotiation = await cap.getNegotiation(negotiationId);
        const request = JSON.parse(negotiation.requirements) as CoverRequest;
        const offered = BigInt(negotiation.fundAmount ?? "0");
        const coverage = BigInt(request.coverage);

        const reliabilityBps = await reliabilityBpsOf(cap, request.insuredAgentId);
        const quote = await publicClient.readContract({
          address: poolA,
          abi: policyPoolAbi,
          functionName: "quoteFor",
          args: [reliabilityBps, coverage, BigInt(request.tenorHours)],
        });

        if (!quote.insurable) {
          await cap.rejectNegotiation(negotiationId, `declined: RiskEngine code ${quote.decline}`);
          return log(SCOPE, `declined ${negotiationId} — reliability ${bps(reliabilityBps)}, code ${quote.decline}`);
        }
        // The pool would revert on this anyway. Say so in the negotiation instead.
        if (offered < quote.premium) {
          await cap.rejectNegotiation(negotiationId, `premium below the technical rate of ${quote.premium}`);
          return log(SCOPE, `declined ${negotiationId} — ${usd(offered)} < ${usd(quote.premium)}`);
        }

        const { order } = await cap.acceptNegotiationWithFundAddress(negotiationId, poolA);
        quoted.set(order.orderId, { request, reliabilityBps });
        log(
          SCOPE,
          `quoted ${usd(coverage)} on ${request.insuredAgentId} at ${bps(reliabilityBps)} → ` +
            `premium ${usd(quote.premium)} (${quote.rateBps} bps)`,
        );
      } catch (error) {
        log(SCOPE, `negotiation ${negotiationId} failed:`, error);
      }
    })();
  });

  /* ── Bind, then hedge ─────────────────────────────────────── */

  stream.on(EventType.OrderPaid, (event) => {
    void (async () => {
      const orderId = event.order_id!;
      const context = quoted.get(orderId);
      if (!context) return; // not one of ours

      const { request, reliabilityBps } = context;
      const coverage = BigInt(request.coverage);
      const startedAt = Date.now();

      try {
        const order = await cap.getOrder(orderId);
        const premium = BigInt(order.fundAmount ?? "0");

        // 1 — Write the policy. The premium is already sitting in the pool; the
        //     pool checks that for itself before it will mint anything.
        const policyId = await send<bigint>(
          SCOPE,
          "bindDirect",
          {
            address: poolA,
            abi: policyPoolAbi,
            functionName: "bindDirect",
            args: [
              {
                beneficiary: order.requesterWalletAddress as `0x${string}`,
                coverage,
                premium,
                tenorHours: BigInt(request.tenorHours),
                reliabilityBps,
                insuredOrderId: orderKey(request.insuredOrderId),
                insuredAgentId: agentKey(request.insuredAgentId),
              },
            ],
          },
          wallet,
          account,
        );
        log(SCOPE, `policy #${policyId} armed — ${usd(coverage)} of cover, ${usd(premium)} premium`);

        // 2 — Release exactly the cedeable premium into this agent's CAP wallet.
        const cededPremium = await send<bigint>(
          SCOPE,
          "drawCededPremium",
          { address: poolA, abi: policyPoolAbi, functionName: "drawCededPremium", args: [policyId] },
          wallet,
          account,
        );

        // 3 — Become a requester. Nobody told us to do this.
        const cededCoverage = coverage / 2n; // CEDED_SHARE_BPS = 5_000
        const negotiation = await cap.negotiateOrder({
          serviceId: reinsuranceServiceId,
          fundAmount: cededPremium.toString(),
          fundToken: usdc,
          requirements: JSON.stringify({
            cededCoverage: cededCoverage.toString(),
            tenorHours: request.tenorHours,
            reliabilityBps: reliabilityBps.toString(),
            insuredAgentId: request.insuredAgentId,
          }),
        });

        const created = await nextEvent(
          stream,
          EventType.OrderCreated,
          (e) => e.negotiation_id === negotiation.negotiationId,
        );
        const reinsuranceOrderId = created.order_id!;
        await cap.payOrder(reinsuranceOrderId);
        log(SCOPE, `ceded ${usd(cededCoverage)} to Bastion Re for ${usd(cededPremium)}`);

        // 4 — Wait for Bastion to arm the treaty, then verify it on chain and
        //     release our own capital. `attachReinsurance` reads Pool B's storage;
        //     it does not take this process's word for anything.
        const treatyId = await waitFor("Bastion Re to arm the treaty", async () => {
          const id = await publicClient.readContract({
            address: poolB,
            abi: policyPoolAbi,
            functionName: "policyByInsuredOrder",
            args: [orderKey(reinsuranceOrderId)],
          });
          return id === 0n ? undefined : id;
        });

        await send<void>(
          SCOPE,
          "attachReinsurance",
          {
            address: poolA,
            abi: policyPoolAbi,
            functionName: "attachReinsurance",
            args: [policyId, poolB, treatyId],
          },
          wallet,
          account,
        );

        const seconds = ((Date.now() - startedAt) / 1000).toFixed(1);
        log(SCOPE, `auto-hedged policy #${policyId} into treaty #${treatyId} in ${seconds}s`);
      } catch (error) {
        // The policy is armed and the client is covered even if the hedge failed.
        // Sentinel simply carries the whole risk until someone retries the cede.
        log(SCOPE, `hedge failed for order ${orderId} — the client is still covered:`, error);
      }
    })();
  });

  holdOpen(stream);
  log(SCOPE, `online. pool ${poolA}, reinsurer ${poolB}`);
}

main().catch((error) => {
  log(SCOPE, "fatal:", error);
  process.exit(1);
});
