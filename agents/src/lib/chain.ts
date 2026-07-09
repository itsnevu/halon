import {
  createPublicClient,
  createWalletClient,
  http,
  keccak256,
  toBytes,
  type Address,
  type Hex,
} from "viem";
import { privateKeyToAccount } from "viem/accounts";
import { base } from "viem/chains";

import { needPrivateKey } from "./env";

/**
 * The SDK defaults its RPC to Base *mainnet* and there is no testnet in the bundle,
 * so everything here spends real money. Demo with $1 of coverage, not $100.
 */
export const rpcUrl = () => process.env.CROO_RPC_URL?.trim() || "https://mainnet.base.org";

export const publicClient = createPublicClient({ chain: base, transport: http(rpcUrl()) });

export function signer(privateKeyEnvVar: string) {
  const account = privateKeyToAccount(needPrivateKey(privateKeyEnvVar));
  const wallet = createWalletClient({ account, chain: base, transport: http(rpcUrl()) });
  return { account, wallet };
}

/**
 * CAP order and agent ids are opaque strings; the contracts key on `bytes32`.
 * One definition, imported by the binder and by the Watcher — if these two ever
 * disagree, no claim can ever match its policy and nothing will tell you why.
 */
export const orderKey = (capOrderId: string): Hex => keccak256(toBytes(capOrderId));
export const agentKey = (capAgentId: string): Hex => keccak256(toBytes(capAgentId));

/** A CAP `contentHash` may already be a 32-byte hex digest. If not, make one. */
export function contentKey(raw: string): Hex {
  return /^0x[0-9a-fA-F]{64}$/.test(raw) ? (raw as Hex) : keccak256(toBytes(raw));
}

export const USDC_UNIT = 1_000_000n;
export const usd = (micro: bigint) => `$${(Number(micro) / 1e6).toFixed(4)}`;
export const bps = (n: bigint) => `${(Number(n) / 100).toFixed(2)}%`;

export function log(scope: string, message: string, ...rest: unknown[]) {
  console.log(`[${new Date().toISOString()}] ${scope.padEnd(14)} ${message}`, ...rest);
}

/**
 * Simulate, send, wait. Simulation is not politeness: it is how we read the return
 * value of a state-changing call (`bindDirect` gives back the policy id), and it
 * surfaces a custom-error revert *before* we spend gas on it.
 */
export async function send<T>(
  scope: string,
  label: string,
  params: {
    address: Address;
    abi: readonly unknown[];
    functionName: string;
    args: readonly unknown[];
  },
  wallet: ReturnType<typeof signer>["wallet"],
  account: ReturnType<typeof signer>["account"],
): Promise<T> {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { request, result } = await publicClient.simulateContract({ ...(params as any), account });
  const hash = await wallet.writeContract(request);
  const receipt = await publicClient.waitForTransactionReceipt({ hash });
  if (receipt.status !== "success") throw new Error(`${label} reverted on chain: ${hash}`);
  log(scope, `${label} → ${hash}`);
  return result as T;
}

export async function waitFor<T>(
  what: string,
  poll: () => Promise<T | undefined>,
  { timeoutMs = 120_000, intervalMs = 2_000 } = {},
): Promise<T> {
  const deadline = Date.now() + timeoutMs;
  for (;;) {
    const value = await poll();
    if (value !== undefined) return value;
    if (Date.now() > deadline) throw new Error(`Timed out waiting for ${what}`);
    await new Promise((resolve) => setTimeout(resolve, intervalMs));
  }
}
