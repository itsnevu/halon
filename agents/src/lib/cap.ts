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

export type EventWaiter = (match: (e: Event) => boolean, timeoutMs?: number) => Promise<Event>;

/**
 * Wait for events of one type, any number of times, with **one** handler.
 *
 * `EventStream.on` appends a handler and the SDK offers no way to remove one. So a
 * `nextEvent()`-per-await leaks a handler for every policy the agent writes, and the
 * ones left behind keep firing into resolved promises. Sentinel is a long-lived
 * process; that is a slow leak, not a hypothetical.
 *
 * Register once. Fan the event out to whoever is waiting, and drop them as they go.
 */
export function eventWaiter(stream: EventStream, type: string): EventWaiter {
  interface Pending {
    match: (e: Event) => boolean;
    settle: (e: Event) => void;
  }
  const pending = new Set<Pending>();

  stream.on(type, (event) => {
    for (const waiter of [...pending]) {
      if (!waiter.match(event)) continue;
      pending.delete(waiter);
      waiter.settle(event);
    }
  });

  return (match, timeoutMs = 180_000) =>
    new Promise<Event>((resolve, reject) => {
      let timer: ReturnType<typeof setTimeout> | undefined;
      const waiter: Pending = {
        match,
        settle: (event) => {
          clearTimeout(timer);
          resolve(event);
        },
      };
      timer = setTimeout(() => {
        pending.delete(waiter);
        reject(new Error(`Timed out waiting for ${type}`));
      }, timeoutMs);
      pending.add(waiter);
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
