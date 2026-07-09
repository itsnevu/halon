import { EventType, isNotFound, type AgentClient } from "@croo-network/sdk";
import { hashTypedData, type Hex } from "viem";

import {
  ATTESTATION_TYPES,
  claimsAdjudicatorAbi,
  halonDomain,
  Outcome,
  policyPoolAbi,
  PolicyStatus,
} from "./lib/abi";
import { capClient, holdOpen } from "./lib/cap";
import { contentKey, log, orderKey, publicClient, send, signer, usd } from "./lib/chain";
import { needAddress } from "./lib/env";

/**
 * The Watcher. CAP's WebSocket says an order reached a terminal failure state; this
 * process signs that observation and hands it to `ClaimsAdjudicator`.
 *
 * **It is a trusted oracle, and that is written down rather than hidden.** If it
 * lies or goes down, the system misbehaves. The roadmap is to read order status
 * straight from CAP's escrow contract, which removes this process from the trust
 * path entirely.
 *
 * ── Why it calls `getDelivery` ───────────────────────────────────────────────
 *
 * The Client buys the policy, the Client calls `rejectOrder`, and the Client
 * collects the discharge. The beneficiary controls the trigger. So a `rejected`
 * order is not automatically a claim: if the worker actually submitted a delivery,
 * this is a quality dispute and the pool must not pay on a signature alone.
 *
 * `getDelivery(orderId)` is the discriminator, and it costs one request:
 *
 *   expired                          → pay. The client cannot cause an slaDeadline.
 *   rejected, no Delivery row        → pay. The worker never submitted anything.
 *   rejected, Delivery submitted     → refuse, loudly. A human resolves this one.
 *
 * `ClaimsAdjudicator` enforces all three on chain regardless of what this process
 * sends. The check here exists so we do not burn gas on a transaction that would
 * revert, and so the refusal is visible in the logs instead of silent.
 */
const SCOPE = "watcher";

interface DeliveryEvidence {
  deliverySubmitted: boolean;
  contentHash: Hex;
}

const ZERO_HASH = `0x${"0".repeat(64)}` as Hex;

/** Did the worker ever put anything on the table? */
async function deliveryEvidence(cap: AgentClient, orderId: string): Promise<DeliveryEvidence> {
  try {
    const delivery = await cap.getDelivery(orderId);
    // A delivery with no content hash still happened. Hash its id so the on-chain
    // consistency check (`submitted ⇔ hash != 0`) holds either way.
    const raw = delivery.contentHash || delivery.deliveryId;
    return { deliverySubmitted: true, contentHash: contentKey(raw) };
  } catch (error) {
    if (isNotFound(error)) return { deliverySubmitted: false, contentHash: ZERO_HASH };
    throw error;
  }
}

async function main() {
  // An SDK-Key that is a *party* to the insured orders — in the demo, the Client's.
  // CAP's WebSocket appears to scope events to the key's own agent, and Sentinel is
  // not a party to the job order it insures. Whether a third party can observe an
  // order it is not part of is one of the open questions in the README; if it can,
  // this becomes the underwriter's own key and the Watcher stops leaning on the
  // insured party to notice its own loss.
  const cap = capClient("WATCHER_SDK_KEY");
  const { account, wallet } = signer("ATTESTOR_PRIVATE_KEY");

  const pool = needAddress("POLICY_POOL_A");
  const adjudicator = needAddress("CLAIMS_ADJUDICATOR");
  const chainId = await publicClient.getChainId();

  async function handle(orderId: string, outcome: number) {
    const insuredOrderId = orderKey(orderId);

    const policyId = await publicClient.readContract({
      address: pool,
      abi: policyPoolAbi,
      functionName: "policyByInsuredOrder",
      args: [insuredOrderId],
    });
    if (policyId === 0n) return log(SCOPE, `order ${orderId} failed, but nobody insured it`);

    const policy = await publicClient.readContract({
      address: pool,
      abi: policyPoolAbi,
      functionName: "policy",
      args: [policyId],
    });
    if (policy.status !== PolicyStatus.Armed) {
      return log(SCOPE, `policy #${policyId} is not armed (status ${policy.status})`);
    }

    const evidence = await deliveryEvidence(cap, orderId);

    if (outcome === Outcome.Rejected && evidence.deliverySubmitted) {
      log(
        SCOPE,
        `REFUSING to attest policy #${policyId}: order ${orderId} was rejected, but the worker ` +
          `delivered (contentHash ${evidence.contentHash}). The beneficiary does not get to ` +
          `declare its own loss. This needs a DISPUTE_RESOLVER, not a signature.`,
      );
      return;
    }

    const attestation = {
      pool,
      policyId,
      insuredOrderId,
      outcome,
      deliverySubmitted: evidence.deliverySubmitted,
      contentHash: evidence.contentHash,
      observedAt: BigInt(Math.floor(Date.now() / 1000)),
    };

    const domain = halonDomain(chainId, adjudicator);
    const localDigest = hashTypedData({
      domain,
      types: ATTESTATION_TYPES,
      primaryType: "Attestation",
      message: attestation,
    });

    // If the struct here ever drifts from ATTESTATION_TYPEHASH, the signature would
    // recover to a stranger and the revert would say `NotAnAttestor` — which is a
    // maddening thing to debug. Ask the contract what it expects, and refuse to sign
    // anything else.
    const onChainDigest = await publicClient.readContract({
      address: adjudicator,
      abi: claimsAdjudicatorAbi,
      functionName: "hashAttestation",
      args: [attestation],
    });
    if (localDigest !== onChainDigest) {
      throw new Error(`EIP-712 drift: local ${localDigest} vs contract ${onChainDigest}`);
    }

    const signature = await account.signTypedData({
      domain,
      types: ATTESTATION_TYPES,
      primaryType: "Attestation",
      message: attestation,
    });

    const indemnity = await send<bigint>(
      SCOPE,
      `discharge(policy #${policyId})`,
      {
        address: adjudicator,
        abi: claimsAdjudicatorAbi,
        functionName: "discharge",
        args: [attestation, [signature]],
      },
      wallet,
      account,
    );
    // Paid to whoever holds the policy NFT now, which need not be the original buyer.
    log(SCOPE, `policy #${policyId} discharged: ${usd(indemnity)} paid out`);
  }

  const stream = await cap.connectWebSocket();

  stream.on(EventType.OrderRejected, (event) => {
    void handle(event.order_id!, Outcome.Rejected).catch((error) =>
      log(SCOPE, `rejected-order handling failed for ${event.order_id}:`, error),
    );
  });

  stream.on(EventType.OrderExpired, (event) => {
    void handle(event.order_id!, Outcome.Expired).catch((error) =>
      log(SCOPE, `expired-order handling failed for ${event.order_id}:`, error),
    );
  });

  holdOpen(stream);
  log(SCOPE, `online. attestor ${account.address}, adjudicator ${adjudicator}, chain ${chainId}`);
}

main().catch((error) => {
  log(SCOPE, "fatal:", error);
  process.exit(1);
});
