"use client";

import { SiteHeader } from "@/components/site-header";
import { SiteFooter } from "@/components/cta-footer";
import { useState } from "react";
import { useAccount, useWriteContract, useReadContract, useWaitForTransactionReceipt } from "wagmi";
import { parseUnits, formatUnits } from "viem";
import { ERC20_ABI, POLICY_POOL_ABI } from "@/lib/pow-abis";
import { SITE } from "@/lib/site";

const POLICY_POOL_A = "0xe7f1725e7734ce288f8367e1bb143e90bb3f0512" as const;

export default function EarnPage() {
  const { address, isConnected } = useAccount();
  const [amount, setAmount] = useState("");

  const { data: balance } = useReadContract({
    address: SITE.usdc as `0x${string}`,
    abi: ERC20_ABI,
    functionName: "balanceOf",
    args: address ? [address] : undefined,
    query: { enabled: !!address }
  });

  const { data: allowance, refetch: refetchAllowance } = useReadContract({
    address: SITE.usdc as `0x${string}`,
    abi: ERC20_ABI,
    functionName: "allowance",
    args: address ? [address, POLICY_POOL_A] : undefined,
    query: { enabled: !!address }
  });

  const { data: totalAssets } = useReadContract({
    address: POLICY_POOL_A,
    abi: POLICY_POOL_ABI,
    functionName: "totalCapital",
  });

  const { data: hash, writeContract, isPending } = useWriteContract();
  const { isLoading: isConfirming, isSuccess: isConfirmed } = useWaitForTransactionReceipt({ hash });

  const needsApproval = allowance !== undefined && amount
    ? BigInt(allowance) < parseUnits(amount, 6) // USDC is 6 decimals on-chain
    : true;

  const handleApprove = () => {
    if (!amount) return;
    writeContract({
      address: SITE.usdc as `0x${string}`,
      abi: ERC20_ABI,
      functionName: "approve",
      args: [POLICY_POOL_A, parseUnits(amount, 6)],
    });
  };

  const handleDeposit = () => {
    if (!amount) return;
    writeContract({
      address: POLICY_POOL_A,
      abi: POLICY_POOL_ABI,
      functionName: "depositCapital",
      args: [parseUnits(amount, 6)],
    });
  };

  return (
    <>
      <SiteHeader />
      <main className="flex-1 flex flex-col items-center pt-24 min-h-[80vh] px-4 relative">
        <div className="absolute top-0 w-[800px] h-[300px] bg-lime/10 blur-[120px] rounded-full pointer-events-none" />

        <div className="w-full max-w-4xl z-10 text-center">
          <h1 className="text-4xl md:text-5xl font-display text-white mb-4">Earn Yield from Intents</h1>
          <p className="text-mist text-lg mb-12 max-w-2xl mx-auto">
            Provide USDC liquidity to the SafeBridge pool. You earn a share of every premium paid by users bridging their assets.
          </p>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-12 text-left">
            <div className="panel p-6">
              <div className="text-mist text-sm mb-1 uppercase tracking-wider font-mono">Current APY</div>
              <div className="text-3xl text-lime font-display">12.4%</div>
            </div>
            <div className="panel p-6">
              <div className="text-mist text-sm mb-1 uppercase tracking-wider font-mono">Total Liquidity</div>
              <div className="text-3xl text-white font-display">
                ${totalAssets ? (Number(formatUnits(totalAssets, 6))).toLocaleString(undefined, { maximumFractionDigits: 2 }) : "0.00"}
              </div>
            </div>
            <div className="panel p-6">
              <div className="text-mist text-sm mb-1 uppercase tracking-wider font-mono">Total Premiums Paid</div>
              <div className="text-3xl text-white font-display">$142K</div>
            </div>
          </div>

          <div className="panel p-8 max-w-md mx-auto text-left neu-raise">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-xl text-white font-medium">Deposit Liquidity</h2>
              {balance !== undefined && (
                <span className="text-xs text-mist font-mono">
                  Bal: {Number(formatUnits(balance, 6)).toFixed(2)} USDC
                </span>
              )}
            </div>
            
            <div className="neu-inset p-4 rounded-xl mb-6">
              <div className="flex justify-between items-center">
                <input 
                  type="number" 
                  placeholder="0.00"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  className="bg-transparent text-2xl text-white outline-none w-2/3"
                />
                <span className="text-white text-lg font-medium">USDC</span>
              </div>
            </div>

            {!isConnected ? (
              <button 
                className="w-full py-3 rounded-lg font-semibold bg-surface-3 text-mist cursor-not-allowed"
                disabled
              >
                Connect Wallet
              </button>
            ) : needsApproval ? (
              <button 
                className="w-full py-3 rounded-lg font-semibold bg-lime text-ink hover:bg-lime-soft transition-colors"
                onClick={handleApprove}
                disabled={isPending || isConfirming}
              >
                {isConfirming ? "Confirming..." : isPending ? "Confirming in Wallet..." : "Approve USDC"}
              </button>
            ) : (
              <button 
                className="w-full py-3 rounded-lg font-semibold bg-mint text-black hover:bg-mint/90 transition-colors"
                onClick={handleDeposit}
                disabled={isPending || isConfirming}
              >
                {isConfirming ? "Confirming..." : isPending ? "Confirming in Wallet..." : "Deposit USDC"}
              </button>
            )}

            {hash && (
              <div className="mt-4 text-center">
                <a 
                  href={`https://basescan.org/tx/${hash}`} 
                  target="_blank" 
                  rel="noreferrer"
                  className="text-xs text-lime underline break-all font-mono"
                >
                  Tx: {hash.slice(0, 10)}...{hash.slice(-10)}
                </a>
              </div>
            )}
            {isConfirmed && (
              <div className="mt-2 text-center text-xs text-mint font-semibold">
                ✓ Deposit Successful!
              </div>
            )}
          </div>
        </div>
      </main>
      <SiteFooter />
    </>
  );
}

