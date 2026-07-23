"use client";

import { WagmiProvider, createConfig, http } from "wagmi";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { ConnectKitProvider, getDefaultConfig } from "connectkit";
import { ReactNode } from "react";
import { robinhoodChain, RHC_RPC_URL } from "../lib/robinhood-chain";

const config = createConfig(
  getDefaultConfig({
    // HALON ProofOfWork contracts run on Robinhood Chain — the only chain here.
    chains: [robinhoodChain],
    transports: {
      [robinhoodChain.id]: http(RHC_RPC_URL || undefined),
    },

    // Required API Keys
    walletConnectProjectId: process.env.NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID || "demo_project_id",

    // Required App Info
    appName: "HALON",
    appDescription: "Suppression layer for the agent economy.",
    appUrl: "https://halon.finance",
    appIcon: "/halon-mark.png",
  }),
);

const queryClient = new QueryClient();

export const Web3ProviderInner = ({ children }: { children: ReactNode }) => {
  return (
    <WagmiProvider config={config}>
      <QueryClientProvider client={queryClient}>
        <ConnectKitProvider 
          theme="midnight"
          customTheme={{
            "--ck-font-family": "var(--font-sans)",
            "--ck-border-radius": "12px",
            "--ck-body-background": "#0b0e0a", // SafeBridge surface color
          }}
        >
          {children}
        </ConnectKitProvider>
      </QueryClientProvider>
    </WagmiProvider>
  );
};
