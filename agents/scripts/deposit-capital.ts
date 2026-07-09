import { erc20Abi } from "viem";

import { policyPoolAbi } from "../src/lib/abi";
import { log, publicClient, send, signer, usd } from "../src/lib/chain";
import { needAddress, numberOr } from "../src/lib/env";

/**
 * `Deploy.s.sol` wires the roles but leaves both pools empty, because depositing
 * needs a USDC approval from the underwriter wallets and those keys have no business
 * in a deploy script.
 *
 * A pool with no capital will bind nothing: `bindDirect` requires free capital of at
 * least the full coverage, since the policy has no reinsurance yet at that moment.
 * So Pool A needs more than the coverage it intends to write, and Pool B needs more
 * than the ceded share of it.
 */
const usdc = needAddress("USDC_ADDRESS");

async function fund(scope: string, poolVar: string, keyVar: string, amountVar: string) {
  const amountUsd = numberOr(amountVar, 0);
  if (amountUsd <= 0) {
    log(scope, `${amountVar} is unset or zero — skipping`);
    return;
  }

  const pool = needAddress(poolVar);
  const amount = BigInt(Math.round(amountUsd * 1e6));
  const { account, wallet } = signer(keyVar);

  const balance = await publicClient.readContract({
    address: usdc,
    abi: erc20Abi,
    functionName: "balanceOf",
    args: [account.address],
  });
  if (balance < amount) {
    throw new Error(`${scope}: ${account.address} holds ${usd(balance)} but needs ${usd(amount)}`);
  }

  const allowance = await publicClient.readContract({
    address: usdc,
    abi: erc20Abi,
    functionName: "allowance",
    args: [account.address, pool],
  });
  if (allowance < amount) {
    await send<unknown>(
      scope,
      `approve ${usd(amount)}`,
      { address: usdc, abi: erc20Abi, functionName: "approve", args: [pool, amount] },
      wallet,
      account,
    );
  }

  await send<unknown>(
    scope,
    `depositCapital ${usd(amount)}`,
    { address: pool, abi: policyPoolAbi, functionName: "depositCapital", args: [amount] },
    wallet,
    account,
  );

  const [total, free] = await Promise.all([
    publicClient.readContract({ address: pool, abi: policyPoolAbi, functionName: "totalCapital" }),
    publicClient.readContract({ address: pool, abi: policyPoolAbi, functionName: "freeCapital" }),
  ]);
  log(scope, `capital ${usd(total)}, free ${usd(free)}`);
}

async function main() {
  await fund("sentinel", "POLICY_POOL_A", "UNDERWRITER_A_PRIVATE_KEY", "POOL_A_CAPITAL_USD");
  await fund("bastion-re", "POLICY_POOL_B", "UNDERWRITER_B_PRIVATE_KEY", "POOL_B_CAPITAL_USD");
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
