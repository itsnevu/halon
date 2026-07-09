import { EventType } from "@croo-network/sdk";

import { policyPoolAbi } from "./lib/abi";
import { capClient, holdOpen } from "./lib/cap";
import { agentKey, log, orderKey, publicClient, send, signer, usd } from "./lib/chain";
import { need, needAddress } from "./lib/env";

/**
 * Bastion Re — the layer under the layer.
 *
 * It sells one thing: quota-share reinsurance on another pool's retention. A treaty
 * is an ordinary `PolicyPool` policy whose beneficiary is Pool A's address, and Pool
 * A ends up holding the treaty NFT.
 *
 * The premium that arrives is *not* Bastion's retail rate for that layer. The cedent
 * forwards `cededShare × (1 − commission)` of a premium that was already loaded once,
 * and it carries no second expense fee, so it lands below the shelf price. What it
 * must clear is Bastion's own expected loss — which is the same inequality
 * `RiskEngine`'s loading guard enforces on the cedent, read from this side. We check
 * it here before accepting, so a bad treaty is refused in the negotiation rather than
 * reverted in the bind.
 */
const SCOPE = "bastion-re";

interface TreatyTerms {
  cededCoverage: string;
  tenorHours: number;
  reliabilityBps: string;
  insuredAgentId: string;
}

async function main() {
  const cap = capClient("SDK_KEY_UNDERWRITER_B");
  const { account, wallet } = signer("UNDERWRITER_B_PRIVATE_KEY");

  const poolA = needAddress("POLICY_POOL_A");
  const poolB = needAddress("POLICY_POOL_B");
  const serviceId = need("SERVICE_ID_REINSURANCE_B");

  const accepted = new Map<string, TreatyTerms & { premium: bigint }>();
  const stream = await cap.connectWebSocket();

  stream.on(EventType.NegotiationCreated, (event) => {
    void (async () => {
      if (event.service_id !== serviceId) return;
      const negotiationId = event.negotiation_id!;
      try {
        const negotiation = await cap.getNegotiation(negotiationId);
        const terms = JSON.parse(negotiation.requirements) as TreatyTerms;
        const premium = BigInt(negotiation.fundAmount ?? "0");
        const coverage = BigInt(terms.cededCoverage);

        const quote = await publicClient.readContract({
          address: poolB,
          abi: policyPoolAbi,
          functionName: "quoteFor",
          args: [BigInt(terms.reliabilityBps), coverage, BigInt(terms.tenorHours)],
        });

        if (!quote.insurable) {
          await cap.rejectNegotiation(negotiationId, `declined: RiskEngine code ${quote.decline}`);
          return log(SCOPE, `declined ${negotiationId} — uninsurable layer`);
        }
        // The treaty must at least cover the loss we are taking on.
        if (premium < quote.expectedLoss) {
          await cap.rejectNegotiation(negotiationId, "ceded premium is below our expected loss");
          return log(SCOPE, `declined ${negotiationId} — ${usd(premium)} < ${usd(quote.expectedLoss)}`);
        }

        const { order } = await cap.acceptNegotiationWithFundAddress(negotiationId, poolB);
        accepted.set(order.orderId, { ...terms, premium });
        log(SCOPE, `accepted cede of ${usd(coverage)} for ${usd(premium)} → order ${order.orderId}`);
      } catch (error) {
        log(SCOPE, `negotiation ${negotiationId} failed:`, error);
      }
    })();
  });

  stream.on(EventType.OrderPaid, (event) => {
    void (async () => {
      const orderId = event.order_id!;
      const terms = accepted.get(orderId);
      if (!terms) return; // not ours
      accepted.delete(orderId);

      try {
        const treatyId = await send<bigint>(
          SCOPE,
          `bindTreaty(${orderId})`,
          {
            address: poolB,
            abi: policyPoolAbi,
            functionName: "bindTreaty",
            args: [
              {
                beneficiary: poolA, // the treaty NFT is minted to the cedent's pool
                coverage: BigInt(terms.cededCoverage),
                premium: terms.premium,
                tenorHours: BigInt(terms.tenorHours),
                reliabilityBps: BigInt(terms.reliabilityBps),
                insuredOrderId: orderKey(orderId),
                insuredAgentId: agentKey(terms.insuredAgentId),
              },
            ],
          },
          wallet,
          account,
        );
        log(SCOPE, `treaty #${treatyId} armed, ${usd(BigInt(terms.cededCoverage))} of cover for Sentinel`);
      } catch (error) {
        log(SCOPE, `bindTreaty failed for ${orderId}:`, error);
      }
    })();
  });

  holdOpen(stream);
  log(SCOPE, `online. pool ${poolB}`);
}

main().catch((error) => {
  log(SCOPE, "fatal:", error);
  process.exit(1);
});
