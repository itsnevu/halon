import { createConfig } from "@ponder/core";
import { http } from "viem";

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
      abi: "./abis/PolicyPool.json", // Reference to the compiled ABI
      address: "0xMockAddressForPolicyPool",
      startBlock: 10000000,
    },
    ClaimsAdjudicator: {
      network: "baseSepolia",
      abi: "./abis/ClaimsAdjudicator.json",
      address: "0xMockAddressForClaimsAdjudicator",
      startBlock: 10000000,
    },
  },
});
