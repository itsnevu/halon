import { EventType, DeliverableType } from "@croo-network/sdk";
import { capClient, holdOpen } from "./lib/cap";
import { log } from "./lib/chain";
import { need } from "./lib/env";

/**
 * SafeBridge Relayer (Solver Bot)
 * 
 * This agent listens to the CAP network for newly negotiated cross-chain intents.
 * When a user funds an intent (OrderPaid), the relayer simulates the cross-chain 
 * execution and submits a proof.
 * 
 * In 10% of cases, the relayer simulates a failure by not submitting the proof,
 * which will naturally trigger the Watcher agent to slash and refund the user.
 */
const SCOPE = "relayer";

async function main() {
  const cap = capClient("SDK_KEY_WORKER"); // using the worker key since the relayer is the solver
  const serviceId = need("SERVICE_ID_WORKER");

  const stream = await cap.connectWebSocket();

  // Listen for intents that users want us to execute
  stream.on(EventType.NegotiationCreated, (event) => {
    void (async () => {
      if (event.service_id !== serviceId) return;
      const negotiationId = event.negotiation_id!;
      try {
        const negotiation = await cap.getNegotiation(negotiationId);
        log(SCOPE, `received intent request: ${negotiation.requirements}`);
        
        // Relayer always accepts the negotiation to generate the Order ID
        const { order } = await cap.acceptNegotiation(negotiationId);
        log(SCOPE, `accepted intent request → intent ID ${order.orderId}`);
      } catch (error) {
        log(SCOPE, `failed to accept intent ${negotiationId}:`, error);
      }
    })();
  });

  // Execute the bridge when the user actually funds the intent
  stream.on(EventType.OrderPaid, (event) => {
    void (async () => {
      const intentId = event.order_id!;
      log(SCOPE, `intent ${intentId} funded. Starting cross-chain execution...`);

      // Simulate bridge execution time (2-5 seconds)
      const executionTime = Math.floor(Math.random() * 3000) + 2000;
      await new Promise(resolve => setTimeout(resolve, executionTime));

      // Simulate a 10% failure rate (e.g. liquidity ran out, gas spiked)
      const isFailure = Math.random() < 0.1;

      if (isFailure) {
        log(SCOPE, `🔥 FAILURE: Intent ${intentId} failed during execution. No proof will be submitted. Watcher should trigger.`);
        return; // Do nothing, causing the intent to eventually fail and Watcher to step in
      }

      // Success: Submit proof
      try {
        log(SCOPE, `✅ SUCCESS: Intent ${intentId} executed. Submitting cryptographic proof.`);
        await cap.deliverOrder(intentId, {
          deliverableType: DeliverableType.Text,
          deliverableText: "https://basescan.org/tx/mock_proof",
        });
      } catch (error) {
        log(SCOPE, `failed to submit proof for ${intentId}:`, error);
      }
    })();
  });

  holdOpen(stream);
  log(SCOPE, `online. Listening for cross-chain intents...`);
}

main().catch((error) => {
  log(SCOPE, "fatal:", error);
  process.exit(1);
});
