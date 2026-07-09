import { AgentClient, OrderStatus, type Event, type EventStream } from "@croo-network/sdk";

import { publicClient } from "./chain";
import { riskEngineAbi } from "./abi";
import { capConfig, need, needAddress } from "./env";

export function capClient(sdkKeyEnvVar: string): AgentClient {
  return new AgentClient(capConfig(), need(sdkKeyEnvVar));
}

/** Keep the process alive and close the socket on Ctrl-C, or the SDK leaks a timer. */
export function holdOpen(stream: EventStream, onClose?: () => void) {
  const shutdown = () => {
    stream.close();
    onClose?.();
    process.exit(0);
  };
  process.on("SIGINT", shutdown);
  process.on("SIGTERM", shutdown);
}

/** Resolve the first event of `type` that satisfies `match`. */
export function nextEvent(
  stream: EventStream,
  type: string,
  match: (e: Event) => boolean,
  timeoutMs = 180_000,
): Promise<Event> {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error(`Timed out waiting for ${type}`)), timeoutMs);
    stream.on(type, (event) => {
      if (!match(event)) return;
      clearTimeout(timer);
      resolve(event);
    });
  });
}

const PAGE_SIZE = 100;

async function countOrders(cap: AgentClient, agentId: string, status: string): Promise<number> {
  let total = 0;
  for (let page = 1; ; page++) {
    const orders = await cap.listOrders({ agentId, status, page, pageSize: PAGE_SIZE });
    total += orders.length;
    if (orders.length < PAGE_SIZE) return total;
  }
}

/**
 * The HALON Reliability Index. CAP has no `getMeritScore()` — there is no reputation
 * getter anywhere in the SDK — so we derive one from terminal order counts.
 *
 * The arithmetic is *not* reimplemented here. `RiskEngine.reliabilityOf` is the one
 * definition and we read it off the chain, so the number the agent quotes against is
 * the number the pool will price against.
 */
export async function reliabilityBpsOf(cap: AgentClient, agentId: string): Promise<bigint> {
  const [completed, rejected, expired] = await Promise.all([
    countOrders(cap, agentId, OrderStatus.Completed),
    countOrders(cap, agentId, OrderStatus.Rejected),
    countOrders(cap, agentId, OrderStatus.Expired),
  ]);

  return publicClient.readContract({
    address: needAddress("RISK_ENGINE"),
    abi: riskEngineAbi,
    functionName: "reliabilityOf",
    args: [BigInt(completed), BigInt(rejected), BigInt(expired)],
  });
}
