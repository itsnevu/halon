import { defineChain } from "viem";

/**
 * Robinhood Chain — the network the HALON contracts run on.
 *
 * Robinhood Chain is an Arbitrum L2 on Ethereum (ETH as native gas token). It is
 * NOT in `viem/wagmi` chains, so we define it here from the official network
 * config: https://docs (Connecting to Robinhood Chain).
 *
 *   Property        Mainnet                              Testnet
 *   Chain ID        4663                                 46630
 *   Currency        ETH                                  ETH
 *   Explorer        robinhoodchain.blockscout.com        explorer.testnet.chain.robinhood.com
 *   Public RPC      rpc.mainnet.chain.robinhood.com      rpc.testnet.chain.robinhood.com
 *
 * Which network is used is env-driven, defaulting to TESTNET (hackathon target):
 *   NEXT_PUBLIC_RHC_NETWORK = "mainnet" | "testnet"   (default "testnet")
 *
 * The public RPCs below are rate-limited and NOT for production. For production
 * set an Alchemy (or other provider) endpoint — it overrides the public one:
 *   NEXT_PUBLIC_RHC_RPC_URL = https://robinhood-testnet.g.alchemy.com/v2/<KEY>
 */

type RhcNetwork = "mainnet" | "testnet";

const NETWORK: RhcNetwork =
  process.env.NEXT_PUBLIC_RHC_NETWORK === "mainnet" ? "mainnet" : "testnet";

const NETWORKS = {
  mainnet: {
    id: 4663,
    explorer: "https://robinhoodchain.blockscout.com",
    publicRpc: "https://rpc.mainnet.chain.robinhood.com",
  },
  testnet: {
    id: 46630,
    explorer: "https://explorer.testnet.chain.robinhood.com",
    publicRpc: "https://rpc.testnet.chain.robinhood.com",
  },
} as const;

const active = NETWORKS[NETWORK];

export const RHC_CHAIN_ID = Number(process.env.NEXT_PUBLIC_RHC_CHAIN_ID ?? active.id);
// Prefer a provider endpoint (Alchemy/QuickNode); fall back to the public RPC.
export const RHC_RPC_URL = process.env.NEXT_PUBLIC_RHC_RPC_URL ?? active.publicRpc;
export const RHC_EXPLORER_URL = process.env.NEXT_PUBLIC_RHC_EXPLORER_URL ?? active.explorer;

export const robinhoodChain = defineChain({
  id: RHC_CHAIN_ID,
  name: NETWORK === "mainnet" ? "Robinhood Chain" : "Robinhood Chain Testnet",
  nativeCurrency: { decimals: 18, name: "Ether", symbol: "ETH" },
  rpcUrls: {
    default: { http: [RHC_RPC_URL] },
  },
  blockExplorers: {
    default: { name: "Blockscout", url: RHC_EXPLORER_URL },
  },
  testnet: NETWORK === "testnet",
});

/** Explorer link helpers — the Robinhood Chain Blockscout instance. */
export const explorerTx = (hash: string) => `${RHC_EXPLORER_URL}/tx/${hash}`;
export const explorerAddr = (addr: string) => `${RHC_EXPLORER_URL}/address/${addr}`;
