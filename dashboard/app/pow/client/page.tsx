"use client";

import { useState } from "react";
import { useAccount, useWriteContract, useReadContract, useWaitForTransactionReceipt } from "wagmi";
import { parseUnits } from "viem";
import { ESCROW_FACTORY_ABI, ERC20_ABI } from "../../../lib/pow-abis";
import { POW_CONFIG } from "../../../lib/pow-config";

export default function ClientDashboard() {
  const { address, isConnected } = useAccount();
  const [freelancerAddress, setFreelancerAddress] = useState("");
  const [amountToLock, setAmountToLock] = useState("50");
  const [tokenChoice, setTokenChoice] = useState<"USDG" | "AAPL">("AAPL");

  const { data: hash, writeContract, isPending } = useWriteContract();
  const { isLoading: isConfirming, isSuccess: isConfirmed } = useWaitForTransactionReceipt({ hash });

  // Get User Balance
  const tokenAddress = tokenChoice === "AAPL" ? POW_CONFIG.mockAAPLAddress : POW_CONFIG.mockUSDGAddress;
  const { data: balance } = useReadContract({
    address: tokenAddress,
    abi: ERC20_ABI,
    functionName: 'balanceOf',
    args: [address as `0x${string}`],
    query: { enabled: !!address }
  });

  const handleDeployEscrow = async () => {
    if (!freelancerAddress || !amountToLock) return alert("Please fill all fields");
    
    try {
      const amountWei = parseUnits(amountToLock, 18);
      
      writeContract({
        address: POW_CONFIG.escrowFactoryAddress,
        abi: ESCROW_FACTORY_ABI,
        functionName: 'createProject',
        args: [
          freelancerAddress as `0x${string}`,
          tokenAddress,
          POW_CONFIG.mockOracleAddress, // Oracle
          amountWei
        ],
      });
    } catch (e) {
      console.error(e);
      alert("Error initiating transaction");
    }
  };

  return (
    <div className="min-h-screen bg-[#0a0a0a] text-white p-8">
      <div className="max-w-5xl mx-auto space-y-8">
        <header className="flex justify-between items-center border-b border-gray-800 pb-4">
          <h1 className="text-3xl font-bold">Client Dashboard</h1>
          <div className="flex items-center gap-4">
            <span className="px-4 py-2 bg-blue-500/10 text-blue-400 rounded-full font-medium">
              Reputation Score: 95/100
            </span>
          </div>
        </header>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          <div className="p-6 rounded-2xl bg-gray-900 border border-gray-800 shadow-2xl">
            <h2 className="text-xl font-bold mb-4">Create Escrow Project</h2>
            {!isConnected ? (
              <div className="p-4 bg-red-500/10 text-red-400 border border-red-500/20 rounded-lg">
                Please connect your wallet first via the layout header.
              </div>
            ) : (
              <div className="space-y-4">
                <div>
                  <label className="block text-sm text-gray-400 mb-1">Freelancer Address</label>
                  <input 
                    type="text" 
                    value={freelancerAddress}
                    onChange={(e) => setFreelancerAddress(e.target.value)}
                    placeholder="0x..." 
                    className="w-full bg-black border border-gray-700 rounded-lg p-3 text-gray-300 focus:border-blue-500 outline-none" 
                  />
                </div>
                <div>
                  <label className="block text-sm text-gray-400 mb-1 flex justify-between">
                    <span>Collateral (RWA)</span>
                    <span className="text-blue-400">Bal: {balance ? (Number(balance) / 1e18).toFixed(2) : "0.00"}</span>
                  </label>
                  <select 
                    value={tokenChoice}
                    onChange={(e) => setTokenChoice(e.target.value as "USDG" | "AAPL")}
                    className="w-full bg-black border border-gray-700 rounded-lg p-3 text-gray-300"
                  >
                    <option value="AAPL">Tokenized AAPL</option>
                    <option value="USDG">USDG Stablecoin</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm text-gray-400 mb-1">Amount to Lock</label>
                  <input 
                    type="number" 
                    value={amountToLock}
                    onChange={(e) => setAmountToLock(e.target.value)}
                    className="w-full bg-black border border-gray-700 rounded-lg p-3 text-white focus:border-blue-500 outline-none" 
                  />
                </div>
                
                <button 
                  onClick={handleDeployEscrow}
                  disabled={isPending || isConfirming || isConfirmed}
                  className={`w-full py-3 rounded-lg font-bold transition-all flex items-center justify-center gap-2 
                    ${isConfirmed ? 'bg-green-600 text-white' : 
                      (isPending || isConfirming) ? 'bg-blue-800 text-blue-200 cursor-wait' : 'bg-blue-600 hover:bg-blue-500 text-white'}`}
                >
                  {(isPending || isConfirming) && (
                    <svg className="animate-spin h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                  )}
                  {isConfirmed ? "Collateral Locked On-Chain" : 
                   isConfirming ? "Confirming Transaction..." : 
                   isPending ? "Please sign in wallet..." : "Lock Collateral (Deploy Escrow)"}
                </button>

                {hash && <div className="text-xs text-gray-500 truncate">Tx: {hash}</div>}
              </div>
            )}
          </div>

          <div className="space-y-6">
            <div className="p-6 rounded-2xl bg-gray-900 border border-gray-800 shadow-2xl">
              <h2 className="text-xl font-bold mb-4">Active Milestones</h2>
              <div className="p-4 border border-gray-800 rounded-xl bg-black/50">
                <div className="flex justify-between items-center mb-2">
                  <span className="font-semibold">Milestone #1: Frontend Mockup</span>
                  <span className="text-blue-400 font-bold">$3,000</span>
                </div>
                <div className="flex items-center gap-2 text-sm text-gray-400 mb-4">
                  <div className="w-2 h-2 rounded-full bg-yellow-500"></div>
                  Pending AI Verification
                </div>
                <button className="w-full py-2 bg-gray-800 hover:bg-gray-700 rounded-lg text-sm text-white font-medium" disabled>
                  Awaiting Freelancer Submission
                </button>
              </div>
            </div>

            <div className="p-6 rounded-2xl bg-gradient-to-br from-purple-900/40 to-blue-900/40 border border-purple-500/30">
              <h3 className="text-lg font-bold text-purple-300 mb-2">Advance Financing Available</h3>
              <p className="text-sm text-gray-400 mb-4">
                Your reputation is &gt; 80. You can offer Advance Financing to freelancers directly from the Robinhood Earn liquidity pool!
              </p>
              <button className="px-4 py-2 bg-purple-600 hover:bg-purple-500 rounded-lg text-sm font-bold shadow-lg shadow-purple-500/20">
                Enable Advance Financing
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
