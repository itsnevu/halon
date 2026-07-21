import { createConfig } from "@ponder/core";
import { http } from "viem";

import PolicyPoolAbi from "./abis/PolicyPool.json" with { type: "json" };
import ClaimsAdjudicatorAbi from "./abis/ClaimsAdjudicator.json" with { type: "json" };

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
      address: "0xMockAddressForPolicyPool",
      startBlock: 10000000,
    },
    ClaimsAdjudicator: {
      network: "baseSepolia",
      abi: ClaimsAdjudicatorAbi,
      address: "0xMockAddressForClaimsAdjudicator",
      startBlock: 10000000,
    },
  },
});
