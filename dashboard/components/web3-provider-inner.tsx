"use client";

import { WagmiProvider, createConfig, http } from "wagmi";
import { mainnet, sepolia, base, baseSepolia, optimism } from "wagmi/chains";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { ConnectKitProvider, getDefaultConfig } from "connectkit";
import { ReactNode } from "react";

const config = createConfig(
  getDefaultConfig({
    // Your dApps chains — baseSepolia is where the HALON testnet contracts live.
    chains: [base, baseSepolia, mainnet, sepolia, optimism],
    transports: {
      // RPC URL for each chain
      [base.id]: http(),
      [baseSepolia.id]: http(process.env.NEXT_PUBLIC_BASE_SEPOLIA_RPC_URL),
      [mainnet.id]: http(),
      [sepolia.id]: http(),
      [optimism.id]: http(),
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
