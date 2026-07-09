/**
 * Does the TypeScript actually agree with the contracts?
 *
 * Two things in `src/lib/abi.ts` are written by hand and cannot be type-checked
 * against the Solidity: the ABI signatures, and the EIP-712 struct. Both fail
 * *quietly*. A reordered field still encodes, still signs, and still submits — the
 * contract simply recovers a stranger's address and reverts with `NotAnAttestor`,
 * three hours into a demo.
 *
 * So we ask a live deployment instead of trusting either by eye.
 *
 *   anvil &
 *   cd contracts && forge script script/Deploy.s.sol --rpc-url http://127.0.0.1:8545 --broadcast
 *   cd agents   && npm run verify-wiring
 *
 * The numbers below are the README's reference policy, priced on an empty book.
 */
import { createPublicClient, hashTypedData, http, keccak256, toBytes, type Address, type Hex } from "viem";

import {
  ATTESTATION_TYPES,
  claimsAdjudicatorAbi,
  halonDomain,
  policyPoolAbi,
  riskEngineAbi,
} from "../src/lib/abi";

const RPC = process.env.VERIFY_RPC_URL ?? "http://127.0.0.1:8545";
const address = (name: string): Address => {
  const value = process.env[name];
  if (!value) throw new Error(`Set ${name} to the deployed address.`);
  return value as Address;
};

let failures = 0;
function check(what: string, actual: unknown, expected: unknown) {
  const ok = actual === expected;
  if (!ok) failures++;
  const mark = ok ? "ok  " : "FAIL";
  console.log(`  ${mark}  ${what}${ok ? ` = ${actual}` : `\n        expected ${expected}\n        got      ${actual}`}`);
}

async function main() {
  const client = createPublicClient({ transport: http(RPC) });
  const chainId = await client.getChainId();

  const riskEngine = address("RISK_ENGINE");
  const poolA = address("POLICY_POOL_A");
  const adjudicator = address("CLAIMS_ADJUDICATOR");

  console.log(`\nchain ${chainId} via ${RPC}\n`);

  /* ── The ABI decodes what Solidity encoded ─────────────────── */

  console.log("RiskEngine — the README's reference policy, 80% reliable, $100, 24h, empty book");
  const quote = await client.readContract({
    address: riskEngine,
    abi: riskEngineAbi,
    functionName: "quote",
    args: [8_000n, 100_000_000n, 24n, 0n],
  });
  check("insurable", quote.insurable, true);
  check("expectedLoss ($23.00)", quote.expectedLoss, 23_000_000n);
  check("premium ($27.45)", quote.premium, 27_450_000n);
  check("rateBps", quote.rateBps, 2_745n);
  check("cededPremium ($12.3525)", quote.cededPremium, 12_352_500n);
  check("netRetention ($50.00)", quote.netRetention, 50_000_000n);

  const nomad = await client.readContract({
    address: riskEngine,
    abi: riskEngineAbi,
    functionName: "reliabilityOf",
    args: [41n, 49n, 10n],
  });
  check("reliabilityOf(41, 49, 10) — Nomad Scraper", nomad, 4_100n);

  console.log("\nPolicyPool — struct decoding and the cede destination");
  const poolQuote = await client.readContract({
    address: poolA,
    abi: policyPoolAbi,
    functionName: "quoteFor",
    args: [8_000n, 100_000_000n, 24n],
  });
  check("quoteFor agrees with the engine", poolQuote.premium, quote.premium);
  check("utilizationBps on an empty pool", await client.readContract({ address: poolA, abi: policyPoolAbi, functionName: "utilizationBps" }), 0n);
  check(
    "cedeRecipient is the admin-set CAP wallet",
    (await client.readContract({ address: poolA, abi: policyPoolAbi, functionName: "cedeRecipient" })).toLowerCase(),
    (process.env.UNDERWRITER_A_CAP_WALLET ?? "").toLowerCase(),
  );

  /* ── The signature the Watcher makes is the one the contract expects ── */

  console.log("\nClaimsAdjudicator — EIP-712");
  const attestation = {
    pool: poolA,
    policyId: 42n,
    insuredOrderId: keccak256(toBytes("ord_meridian_hires_aurora")),
    outcome: 0,
    deliverySubmitted: false,
    contentHash: `0x${"0".repeat(64)}` as Hex,
    observedAt: 1_700_000_000n,
  };

  const onChain = await client.readContract({
    address: adjudicator,
    abi: claimsAdjudicatorAbi,
    functionName: "hashAttestation",
    args: [attestation],
  });
  const local = hashTypedData({
    domain: halonDomain(chainId, adjudicator),
    types: ATTESTATION_TYPES,
    primaryType: "Attestation",
    message: attestation,
  });
  check("hashTypedData(watcher) == hashAttestation(contract)", local, onChain);

  check("threshold", await client.readContract({ address: adjudicator, abi: claimsAdjudicatorAbi, functionName: "threshold" }), 1n);

  // Easy to forget, and its absence is invisible until a claim silently reverts.
  for (const [label, pool] of [["Pool A", poolA], ["Pool B", address("POLICY_POOL_B")]] as const) {
    check(
      `${label} is registered with the adjudicator`,
      await client.readContract({ address: adjudicator, abi: claimsAdjudicatorAbi, functionName: "isRegisteredPool", args: [pool] }),
      true,
    );
  }

  console.log("\nClaimsAdjudicator — the moral-hazard gate");
  const autoPayable = (outcome: number, deliverySubmitted: boolean, contentHash: Hex) =>
    client.readContract({
      address: adjudicator,
      abi: claimsAdjudicatorAbi,
      functionName: "isAutoPayable",
      args: [{ ...attestation, outcome, deliverySubmitted, contentHash }],
    });
  const someHash = keccak256(toBytes("the analysis Aurora actually delivered"));
  check("expired → pays", await autoPayable(1, false, attestation.contentHash), true);
  check("rejected, nothing delivered → pays", await autoPayable(0, false, attestation.contentHash), true);
  check("rejected, but delivered → refused", await autoPayable(0, true, someHash), false);

  console.log(failures === 0 ? "\nAll wiring checks passed.\n" : `\n${failures} check(s) FAILED.\n`);
  process.exit(failures === 0 ? 0 : 1);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
