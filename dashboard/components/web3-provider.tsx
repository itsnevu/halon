"use client";

import { WagmiProvider, createConfig, http } from "wagmi";
import { mainnet, sepolia, base, optimism } from "wagmi/chains";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { ConnectKitProvider, getDefaultConfig } from "connectkit";
import { ReactNode } from "react";

const config = createConfig(
  getDefaultConfig({
    // Your dApps chains
    chains: [mainnet, sepolia, base, optimism],
    transports: {
      // RPC URL for each chain
      [mainnet.id]: http(),
      [sepolia.id]: http(),
      [base.id]: http(),
      [optimism.id]: http(),
    },

    // Required API Keys
    walletConnectProjectId: process.env.NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID || "demo_project_id",

    // Required App Info
    appName: "SafeBridge",
    appDescription: "Cross-chain intents with protection.",
    appUrl: "https://safebridge.local", 
    appIcon: "https://safebridge.local/logo.png",
  }),
);

const queryClient = new QueryClient();

export const Web3Provider = ({ children }: { children: ReactNode }) => {
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
