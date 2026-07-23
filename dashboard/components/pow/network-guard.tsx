"use client";

import { useAccount, useSwitchChain } from "wagmi";
import { robinhoodChain } from "@/lib/robinhood-chain";

/**
 * The wagmi config only knows one chain (Robinhood). Reads are pinned to it, so
 * balances render regardless of the wallet's active network — but WRITES go
 * through the wallet and must be on the right chain. This banner appears only
 * when the connected wallet is on the wrong network and offers a one-click
 * switch (which also adds the chain to the wallet if it is missing).
 */
export function NetworkGuard() {
  const { isConnected, chainId } = useAccount();
  const { switchChain, isPending } = useSwitchChain();

  if (!isConnected || chainId === robinhoodChain.id) return null;

  return (
    <div className="mx-auto max-w-7xl px-5 sm:px-8 pt-6">
      <div className="flex flex-col gap-3 rounded-2xl border border-danger/40 bg-danger/10 px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="text-sm text-fg">
          <span className="font-semibold text-danger">Wrong network.</span>{" "}
          Wallet is on chain {chainId ?? "?"} — switch to{" "}
          <span className="font-mono">{robinhoodChain.name}</span> (chain{" "}
          {robinhoodChain.id}) to lock collateral and release payouts.
        </div>
        <button
          onClick={() => switchChain({ chainId: robinhoodChain.id })}
          disabled={isPending}
          className="shrink-0 rounded-full bg-danger px-5 py-2.5 text-sm font-semibold text-fg transition-colors hover:bg-danger/90 disabled:opacity-50"
        >
          {isPending ? "Switching…" : "Switch to Robinhood Chain"}
        </button>
      </div>
    </div>
  );
}
