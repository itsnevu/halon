import { createConfig, factory } from "@ponder/core";
import { http, parseAbiItem } from "viem";

import PolicyPoolAbi from "./abis/PolicyPool.json" with { type: "json" };
import ClaimsAdjudicatorAbi from "./abis/ClaimsAdjudicator.json" with { type: "json" };
import EscrowFactoryAbi from "./abis/EscrowFactory.json" with { type: "json" };
import EscrowProjectAbi from "./abis/EscrowProject.json" with { type: "json" };
import PaymentDistributorAbi from "./abis/PaymentDistributor.json" with { type: "json" };

const ZERO = "0x0000000000000000000000000000000000000000" as const;

/** Read a contract address from the environment, falling back to the zero
 *  address so `ponder codegen` still type-checks before a deployment exists. */
const addr = (key: string) => (process.env[key] ?? ZERO) as `0x${string}`;
const block = (key: string) => Number(process.env[key] ?? 0);

const ESCROW_FACTORY = addr("PONDER_ESCROW_FACTORY");

export default createConfig({
  networks: {
    baseSepolia: {
      chainId: 84532,
      transport: http(process.env.PONDER_RPC_URL_84532),
    },
  },
  contracts: {
    PolicyPool: {
      network: "baseSepolia",
      abi: PolicyPoolAbi,
      address: addr("PONDER_POLICY_POOL"),
      startBlock: block("PONDER_START_BLOCK"),
    },
    ClaimsAdjudicator: {
      network: "baseSepolia",
      abi: ClaimsAdjudicatorAbi,
      address: addr("PONDER_CLAIMS_ADJUDICATOR"),
      startBlock: block("PONDER_START_BLOCK"),
    },

    // ── ProofOfWork ────────────────────────────────────────────
    EscrowFactory: {
      network: "baseSepolia",
      abi: EscrowFactoryAbi,
      address: ESCROW_FACTORY,
      startBlock: block("PONDER_POW_START_BLOCK"),
    },
    // Each escrow is deployed by the factory, so its address isn't known ahead
    // of time — Ponder discovers them from the factory's ProjectCreated event.
    EscrowProject: {
      network: "baseSepolia",
      abi: EscrowProjectAbi,
      address: factory({
        address: ESCROW_FACTORY,
        event: parseAbiItem(
          "event ProjectCreated(address indexed projectAddress, address indexed client, address indexed freelancer, uint256 amount)",
        ),
        parameter: "projectAddress",
      }),
      startBlock: block("PONDER_POW_START_BLOCK"),
    },
    PaymentDistributor: {
      network: "baseSepolia",
      abi: PaymentDistributorAbi,
      address: addr("PONDER_PAYMENT_DISTRIBUTOR"),
      startBlock: block("PONDER_POW_START_BLOCK"),
    },
  },
});
