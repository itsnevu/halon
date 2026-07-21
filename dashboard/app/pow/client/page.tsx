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
    <div className="py-10 px-5 sm:px-8 max-w-7xl mx-auto space-y-10">
      {/* Header Banner */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 pb-6 border-b border-line">
        <div>
          <div className="inline-flex items-center gap-2 rounded-full border border-lime/30 bg-lime/10 px-3 py-1 text-xs font-semibold text-lime mb-2">
            RWA ESCROW FACTORY
          </div>
          <h1 className="font-display text-3xl md:text-4xl font-extrabold text-white">Client Portal</h1>
          <p className="text-mist text-sm mt-1">Lock collateral (Tokenized AAPL / USDG) and manage milestone releases.</p>
        </div>

        <div className="flex items-center gap-4">
          <div className="neu neu-raise px-5 py-3 rounded-2xl border border-line bg-surface-2 flex items-center gap-3">
            <div className="size-3 rounded-full bg-lime animate-pulse" />
            <div>
              <div className="text-xs text-mist font-mono uppercase">Client Credit Rating</div>
              <div className="text-lg font-bold text-lime font-display">95 / 100 <span className="text-xs font-normal text-mist">(Prime)</span></div>
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        {/* Left Column: Escrow Form */}
        <div className="lg:col-span-7 rounded-3xl neu neu-raise border border-line bg-surface-2 p-6 md:p-8 space-y-6">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-bold font-display text-white">Create New Escrow Project</h2>
            <span className="text-xs font-mono text-lime bg-lime/10 px-3 py-1 rounded-full border border-lime/20">Step 1 of 2</span>
          </div>

          {!isConnected ? (
            <div className="p-6 rounded-2xl border border-line bg-surface/50 text-center space-y-3">
              <div className="size-10 rounded-full bg-lime/10 text-lime flex items-center justify-center mx-auto">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M20 12V8H6a2 2 0 0 1-2-2c0-1.1.9-2 2-2h12v4"/><path d="M4 6v12c0 1.1.9 2 2 2h14v-4"/><path d="M18 12a2 2 0 0 0-2 2c0 1.1.9 2 2 2h4v-4h-4z"/></svg>
              </div>
              <p className="text-sm text-mist">Please connect your Web3 Wallet in the site header to lock collateral.</p>
            </div>
          ) : (
            <div className="space-y-5">
              <div>
                <label className="block text-xs font-mono text-mist uppercase mb-2">Freelancer Wallet Address</label>
                <input 
                  type="text" 
                  value={freelancerAddress}
                  onChange={(e) => setFreelancerAddress(e.target.value)}
                  placeholder="0x71C...8921" 
                  className="w-full bg-surface border border-line rounded-2xl p-4 text-white text-sm focus:border-lime outline-none font-mono transition-colors" 
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-mono text-mist uppercase mb-2 flex justify-between">
                    <span>Collateral Asset</span>
                    <span className="text-lime font-mono">Bal: {balance ? (Number(balance) / 1e18).toFixed(2) : "0.00"}</span>
                  </label>
                  <select 
                    value={tokenChoice}
                    onChange={(e) => setTokenChoice(e.target.value as "USDG" | "AAPL")}
                    className="w-full bg-surface border border-line rounded-2xl p-4 text-white text-sm focus:border-lime outline-none transition-colors"
                  >
                    <option value="AAPL">Tokenized AAPL (RWA)</option>
                    <option value="USDG">USDG Stablecoin</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-mono text-mist uppercase mb-2">Amount to Lock</label>
                  <input 
                    type="number" 
                    value={amountToLock}
                    onChange={(e) => setAmountToLock(e.target.value)}
                    className="w-full bg-surface border border-line rounded-2xl p-4 text-white text-sm focus:border-lime outline-none font-mono transition-colors" 
                  />
                </div>
              </div>

              <div className="pt-2">
                <button 
                  onClick={handleDeployEscrow}
                  disabled={isPending || isConfirming || isConfirmed}
                  className={`w-full py-4 rounded-full font-semibold transition-all duration-200 flex items-center justify-center gap-2 text-sm shadow-lg
                    ${isConfirmed ? 'bg-mint text-black' : 
                      (isPending || isConfirming) ? 'bg-surface-3 text-mist cursor-wait' : 'bg-lime text-lime-ink hover:bg-lime-soft glow-lime-sm'}`}
                >
                  {(isPending || isConfirming) && (
                    <svg className="animate-spin h-5 w-5 text-current" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                  )}
                  {isConfirmed ? "Collateral Locked On-Chain!" : 
                   isConfirming ? "Confirming Transaction..." : 
                   isPending ? "Signature Requested..." : "Lock Collateral & Deploy Escrow"}
                </button>

                {hash && <div className="mt-3 text-xs text-mist font-mono text-center truncate">Tx: {hash}</div>}
              </div>
            </div>
          )}
        </div>

        {/* Right Column: Active Milestones & Financing */}
        <div className="lg:col-span-5 space-y-6">
          <div className="rounded-3xl neu neu-raise border border-line bg-surface-2 p-6 md:p-8 space-y-4">
            <h2 className="text-xl font-bold font-display text-white">Active Milestones</h2>
            <div className="p-5 rounded-2xl border border-line bg-surface space-y-4">
              <div className="flex justify-between items-start">
                <div>
                  <h4 className="font-bold text-white text-base">Milestone #1: Core UI Implementation</h4>
                  <div className="text-xs text-mist mt-0.5 font-mono">ID: #MS-00912</div>
                </div>
                <span className="text-lime font-mono font-bold text-lg">$3,000 USDG</span>
              </div>

              <div className="flex items-center gap-2 text-xs font-semibold text-spring bg-spring/10 px-3 py-1.5 rounded-full border border-spring/20 w-fit">
                <span className="size-2 rounded-full bg-spring animate-pulse" />
                Awaiting Freelancer Work Submission
              </div>
            </div>
          </div>

          {/* Advance Financing Option Banner */}
          <div className="rounded-3xl border border-lime/30 bg-gradient-to-br from-lime/10 via-surface-2 to-mint/10 p-6 md:p-8 space-y-4">
            <div className="flex items-center gap-2 text-lime font-mono text-xs font-bold uppercase tracking-wider">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/></svg>
              Robinhood Advance Financing
            </div>
            <h3 className="text-lg font-bold font-display text-white">Offer Instant 85% Upfront Payout</h3>
            <p className="text-xs text-mist leading-relaxed">
              Because your Client Credit Score is &gt; 80, your projects qualify for Morpho DeFi Earn Pool advance liquidity.
            </p>
            <button className="w-full py-3 rounded-full bg-lime/20 border border-lime/40 text-lime text-xs font-bold hover:bg-lime/30 transition-colors">
              Enable Advance Liquidity Option
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
