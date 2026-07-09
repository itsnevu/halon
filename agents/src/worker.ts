import { DeliverableType, EventType } from "@croo-network/sdk";

import { capClient, holdOpen } from "./lib/cap";
import { log } from "./lib/chain";
import { numberOr } from "./lib/env";

/**
 * Aurora Analytics — the risky agent everyone else is insuring.
 *
 * `WORKER_FAIL_RATE` rigs the demo, but it does not *simulate* a failure. The agent
 * simply does not deliver, the order runs past its `slaDeadline`, and CAP marks it
 * `expired` on its own. The claim trigger is CAP's terminal status, never ours.
 */
const SCOPE = "worker";
const FAIL_RATE = numberOr("WORKER_FAIL_RATE", 0);

async function main() {
  const cap = capClient("SDK_KEY_WORKER");
  const stream = await cap.connectWebSocket();

  stream.on(EventType.NegotiationCreated, (event) => {
    void (async () => {
      try {
        const { order } = await cap.acceptNegotiation(event.negotiation_id!);
        log(SCOPE, `accepted ${event.negotiation_id} → order ${order.orderId}`);
      } catch (error) {
        log(SCOPE, `could not accept ${event.negotiation_id}:`, error);
      }
    })();
  });

  stream.on(EventType.OrderPaid, (event) => {
    void (async () => {
      const orderId = event.order_id!;
      if (Math.random() < FAIL_RATE) {
        log(SCOPE, `dropping ${orderId} on purpose — it will expire at its slaDeadline`);
        return;
      }
      try {
        await cap.deliverOrder(orderId, {
          deliverableType: DeliverableType.Text,
          deliverableText: JSON.stringify({ analysis: "complete", score: 95 }),
        });
        log(SCOPE, `delivered ${orderId}`);
      } catch (error) {
        log(SCOPE, `delivery failed for ${orderId}:`, error);
      }
    })();
  });

  holdOpen(stream);
  log(SCOPE, `online. fail rate ${(FAIL_RATE * 100).toFixed(0)}%`);
}

main().catch((error) => {
  log(SCOPE, "fatal:", error);
  process.exit(1);
});
