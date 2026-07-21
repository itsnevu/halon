"use client";

import { useState } from "react";
import { useAccount, useReadContract, useWriteContract, useWaitForTransactionReceipt } from "wagmi";
import { parseUnits } from "viem";
import { MORPHO_VAULT_ABI } from "../../../lib/pow-abis";
import { POW_CONFIG } from "../../../lib/pow-config";

export default function LPDashboard() {
  const { address } = useAccount();
  const [depositAmount, setDepositAmount] = useState("");

  const { data: totalAssets } = useReadContract({
    address: POW_CONFIG.mockMorphoVaultAddress,
    abi: MORPHO_VAULT_ABI,
    functionName: 'totalAssets',
  });

  const { data: hash, writeContract, isPending } = useWriteContract();
  const { isLoading: isConfirming, isSuccess: isConfirmed } = useWaitForTransactionReceipt({ hash });

  const handleDeposit = () => {
    if (!depositAmount || !address) return;
    
    writeContract({
      address: POW_CONFIG.mockMorphoVaultAddress,
      abi: MORPHO_VAULT_ABI,
      functionName: 'deposit',
      args: [parseUnits(depositAmount, 18), address], // Receiver is the depositor
    });
  };

  return (
    <div className="py-10 px-5 sm:px-8 max-w-7xl mx-auto space-y-10">
      {/* Header Banner */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 pb-6 border-b border-line">
        <div>
          <div className="inline-flex items-center gap-2 rounded-full border border-spring/30 bg-spring/10 px-3 py-1 text-xs font-semibold text-spring mb-2">
            ROBINHOOD EARN & MORPHO VAULTS
          </div>
          <h1 className="font-display text-3xl md:text-4xl font-extrabold text-white">Liquidity Vault (Earn)</h1>
          <p className="text-mist text-sm mt-1">Provide USDG liquidity to fund automated advance financing & earn enhanced APY.</p>
        </div>

        <div className="flex items-center gap-4">
          <div className="neu neu-raise px-5 py-3 rounded-2xl border border-line bg-surface-2 flex items-center gap-4">
            <div>
              <div className="text-xs text-mist font-mono uppercase">Morpho Vault TVL</div>
              <div className="text-lg font-bold text-white font-display font-mono">
                ${totalAssets ? (Number(totalAssets) / 1e18).toLocaleString() : "125,000"} USDG
              </div>
            </div>
            <div className="h-8 w-px bg-line" />
            <div>
              <div className="text-xs text-mist font-mono uppercase">Base APY</div>
              <div className="text-lg font-bold text-spring font-display">7.2%</div>
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        {/* Left Column: Deposit to Vault */}
        <div className="lg:col-span-5 rounded-3xl neu neu-raise border border-line bg-surface-2 p-6 md:p-8 space-y-6">
          <h2 className="text-xl font-bold font-display text-white">Supply USDG Liquidity</h2>

          <div className="space-y-5">
            <div className="p-5 rounded-2xl border border-line bg-surface space-y-1">
              <span className="text-xs text-mist font-mono uppercase">Your Available Balance</span>
              <div className="text-2xl font-bold text-white font-mono">50,000 USDG</div>
            </div>

            <div>
              <label className="block text-xs font-mono text-mist uppercase mb-2">Deposit Amount</label>
              <input 
                type="number" 
                value={depositAmount}
                onChange={(e) => setDepositAmount(e.target.value)}
                placeholder="1,000" 
                className="w-full bg-surface border border-line rounded-2xl p-4 text-white text-sm focus:border-spring outline-none font-mono transition-colors" 
              />
            </div>

            <button 
              onClick={handleDeposit}
              disabled={isPending || isConfirming || isConfirmed || !depositAmount}
              className={`w-full py-4 rounded-full font-semibold transition-all duration-200 text-sm shadow-lg text-black
                ${isConfirmed ? "bg-mint" : (isPending || isConfirming) ? "bg-surface-3 text-mist cursor-wait" : "bg-spring hover:bg-spring/90 shadow-spring/20"}`}
            >
              {isConfirmed ? "Liquidity Supplied!" : 
               isConfirming ? "Confirming tx..." : 
               isPending ? "Sign in wallet..." : "Deposit to Morpho Earn Vault"}
            </button>

            {hash && <div className="text-xs text-mist font-mono text-center truncate">Tx: {hash}</div>}
          </div>
        </div>

        {/* Right Column: Advance Financing Yield Opportunities */}
        <div className="lg:col-span-7 rounded-3xl neu neu-raise border border-line bg-surface-2 p-6 md:p-8 space-y-6">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-xl font-bold font-display text-white">Advance Financing Yield Queue</h2>
              <p className="text-xs text-mist mt-0.5">Verified milestone payouts earning extra return from client repayments.</p>
            </div>
            <span className="text-xs font-mono text-spring bg-spring/10 px-3 py-1 rounded-full border border-spring/20">+1.5% Bonus Yield</span>
          </div>

          <div className="space-y-4">
            <div className="p-5 rounded-2xl border border-line bg-surface flex items-center justify-between gap-4">
              <div className="space-y-1">
                <div className="font-bold text-white text-base">Invoice #INV-928 (Frontend Core)</div>
                <div className="text-xs text-mist font-mono">Client Credit: 95/100 | AI Verified</div>
              </div>
              <div className="text-right">
                <div className="text-lg font-bold text-spring font-mono">$3,000 USDG</div>
                <div className="text-xs text-lime font-semibold">+1.5% Yield (30 Days)</div>
              </div>
            </div>

            <div className="p-5 rounded-2xl border border-line bg-surface flex items-center justify-between gap-4">
              <div className="space-y-1">
                <div className="font-bold text-white text-base">Invoice #INV-929 (Smart Contracts Audit)</div>
                <div className="text-xs text-mist font-mono">Client Credit: 98/100 | AI Verified</div>
              </div>
              <div className="text-right">
                <div className="text-lg font-bold text-spring font-mono">$12,500 USDG</div>
                <div className="text-xs text-lime font-semibold">+1.8% Yield (30 Days)</div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
