import { EventType } from "@croo-network/sdk";

import { riskEngineAbi } from "./lib/abi";
import { capClient, eventWaiter, reliabilityBpsOf } from "./lib/cap";
import { bps, log, publicClient } from "./lib/chain";
import { need, needAddress, numberOr } from "./lib/env";

/**
 * Give the Worker a history, because without one it cannot be insured.
 *
 * `reliabilityOf(0, 0, 0)` is zero — an agent with no completed orders is not prime,
 * it is unproven — and zero is far below the 60% underwriting floor. So on the day
 * you list a brand-new agent, `npm run demo` stops at step two with "declined by the
 * RiskEngine", and it is *right* to. There is no bug to fix. There is a wall to
 * notice before you are standing in front of judges.
 *
 * Run this after the contracts are deployed and the Worker is up with
 * `WORKER_FAIL_RATE=0`. Three completed jobs put the index at 100%. Then raise the
 * fail rate and run the demo, so the index has somewhere to fall to.
 */
const SCOPE = "seed";

async function main() {
  const cap = capClient("SDK_KEY_CLIENT");
  const riskEngine = needAddress("RISK_ENGINE");
  const workerServiceId = need("SERVICE_ID_WORKER");
  const workerAgentId = need("WORKER_AGENT_ID");
  const jobs = numberOr("SEED_JOBS", 3);

  const floor = await publicClient.readContract({
    address: riskEngine,
    abi: riskEngineAbi,
    functionName: "RELIABILITY_FLOOR_BPS",
  });
  const before = await reliabilityBpsOf(cap, workerAgentId);
  log(SCOPE, `${workerAgentId} sits at ${bps(before)}; the floor is ${bps(floor)}`);

  const stream = await cap.connectWebSocket();
  const orderCreated = eventWaiter(stream, EventType.OrderCreated);
  const orderCompleted = eventWaiter(stream, EventType.OrderCompleted);

  for (let i = 1; i <= jobs; i++) {
    const negotiation = await cap.negotiateOrder({
      serviceId: workerServiceId,
      requirements: JSON.stringify({ task: `seed job ${i}` }),
    });
    const created = await orderCreated((e) => e.negotiation_id === negotiation.negotiationId);
    const orderId = created.order_id!;

    await cap.payOrder(orderId);
    await orderCompleted((e) => e.order_id === orderId);
    log(SCOPE, `job ${i}/${jobs} completed — ${orderId}`);
  }

  const after = await reliabilityBpsOf(cap, workerAgentId);
  log(SCOPE, `${workerAgentId} is now at ${bps(after)}`);
  log(
    SCOPE,
    after < floor
      ? `still under the floor. Run more jobs, and check that the worker has WORKER_FAIL_RATE=0.`
      : `insurable. Raise WORKER_FAIL_RATE, then run \`npm run demo\`.`,
  );

  stream.close();
}

main().catch((error) => {
  log(SCOPE, "fatal:", error);
  process.exit(1);
});
