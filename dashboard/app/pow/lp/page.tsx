"use client";

import { useState } from "react";
import { useReadContract, useWriteContract, useWaitForTransactionReceipt } from "wagmi";
import { parseUnits } from "viem";
import { MORPHO_VAULT_ABI } from "../../../lib/pow-abis";
import { POW_CONFIG } from "../../../lib/pow-config";

export default function LPDashboard() {
  const [depositAmount, setDepositAmount] = useState("");

  const { data: totalAssets } = useReadContract({
    address: POW_CONFIG.mockMorphoVaultAddress,
    abi: MORPHO_VAULT_ABI,
    functionName: 'totalAssets',
  });

  const { data: hash, writeContract, isPending } = useWriteContract();
  const { isLoading: isConfirming, isSuccess: isConfirmed } = useWaitForTransactionReceipt({ hash });

  const handleDeposit = () => {
    if (!depositAmount) return;
    
    writeContract({
      address: POW_CONFIG.mockMorphoVaultAddress,
      abi: MORPHO_VAULT_ABI,
      functionName: 'deposit',
      args: [parseUnits(depositAmount, 18), "0x0000000000000000000000000000000000000000"], // Receiver (mock to zero or own address)
    });
  };

  return (
    <div className="min-h-screen bg-[#0a0a0a] text-white p-8">
      <div className="max-w-6xl mx-auto space-y-8">
        <header className="flex justify-between items-center border-b border-gray-800 pb-4">
          <h1 className="text-3xl font-bold">Liquidity Provider (Earn)</h1>
          <div className="flex items-center gap-4 text-sm">
            <div className="px-4 py-2 bg-gray-900 border border-gray-700 rounded-lg">
              TVL: <span className="text-purple-400 font-bold">${totalAssets ? (Number(totalAssets) / 1e18).toLocaleString() : "0"}</span>
            </div>
            <div className="px-4 py-2 bg-gray-900 border border-gray-700 rounded-lg">
              Base APY: <span className="text-green-400 font-bold">7.2%</span>
            </div>
          </div>
        </header>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <div className="lg:col-span-1 p-6 rounded-2xl bg-gray-900 border border-gray-800 shadow-2xl">
            <h2 className="text-xl font-bold mb-6">Deposit to Pool</h2>
            <div className="space-y-4">
              <div className="p-4 bg-black rounded-xl border border-gray-800">
                <span className="text-sm text-gray-500 block mb-1">Your Balance</span>
                <span className="text-2xl font-bold">50,000 USDG</span>
              </div>
              <div>
                <input 
                  type="number" 
                  value={depositAmount}
                  onChange={(e) => setDepositAmount(e.target.value)}
                  placeholder="Amount to deposit" 
                  className="w-full bg-black border border-gray-700 rounded-lg p-3 text-white focus:border-purple-500 outline-none" 
                />
              </div>
              
              <button 
                onClick={handleDeposit}
                disabled={isPending || isConfirming || isConfirmed || !depositAmount}
                className={`w-full py-3 rounded-lg font-bold shadow-lg transition-colors
                  ${isConfirmed ? "bg-green-600 shadow-green-500/20" : 
                    (isPending || isConfirming) ? "bg-purple-800 cursor-wait" : "bg-purple-600 hover:bg-purple-500 shadow-purple-500/20"}`}
              >
                {isConfirmed ? "Liquidity Supplied!" : 
                 isConfirming ? "Confirming tx..." : 
                 isPending ? "Please sign in wallet..." : "Supply Liquidity"}
              </button>
            </div>
          </div>

          <div className="lg:col-span-2 p-6 rounded-2xl bg-gray-900 border border-gray-800 shadow-2xl">
            <h2 className="text-xl font-bold mb-6">Advance Financing Opportunities</h2>
            <p className="text-gray-400 text-sm mb-4">
              These invoices are verified by AI and backed by highly reputable clients. Providing upfront liquidity earns you additional yield on top of the base APY.
            </p>
            
            <div className="space-y-4">
              <div className="p-4 rounded-xl bg-black border border-gray-800 flex items-center justify-between">
                <div>
                  <div className="font-bold text-lg">Invoice #INV-928</div>
                  <div className="text-sm text-gray-400">Client Score: 95/100 | AI Verified</div>
                </div>
                <div className="text-right">
                  <div className="text-xl font-bold text-green-400">$20,000</div>
                  <div className="text-xs text-purple-400">+1.5% Yield (30 days)</div>
                </div>
                <button className="px-6 py-2 bg-blue-600 hover:bg-blue-500 rounded-lg font-bold transition-colors">
                  Fund Advance
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
