"use client";

import { useState } from "react";
import { useAccount, useWriteContract, useReadContract, useWaitForTransactionReceipt } from "wagmi";
import { parseUnits, formatUnits } from "viem";
import { ESCROW_FACTORY_ABI, ESCROW_PROJECT_ABI, ERC20_ABI } from "../../../lib/pow-abis";
import { POW_CONFIG } from "../../../lib/pow-config";

export default function ClientDashboard() {
  const { address, isConnected } = useAccount();
  const [freelancerAddress, setFreelancerAddress] = useState("");
  const [amountToLock, setAmountToLock] = useState("50");
  const [tokenChoice, setTokenChoice] = useState<"USDG" | "AAPL">("AAPL");

  // Milestone creation form state
  const [milestoneDesc, setMilestoneDesc] = useState("Milestone #1: Frontend Mockup");
  const [milestoneAmt, setMilestoneAmt] = useState("30");

  const { data: hash, writeContract, isPending } = useWriteContract();
  const { isLoading: isConfirming, isSuccess: isConfirmed } = useWaitForTransactionReceipt({ hash });

  // Get User Balance and Allowance
  const tokenAddress = tokenChoice === "AAPL" ? POW_CONFIG.mockAAPLAddress : POW_CONFIG.mockUSDGAddress;
  
  const { data: balance, refetch: refetchBalance } = useReadContract({
    address: tokenAddress,
    abi: ERC20_ABI,
    functionName: 'balanceOf',
    args: [address as `0x${string}`],
    query: { enabled: !!address }
  });

  const { data: allowance, refetch: refetchAllowance } = useReadContract({
    address: tokenAddress,
    abi: ERC20_ABI,
    functionName: 'allowance',
    args: [address as `0x${string}`, POW_CONFIG.escrowFactoryAddress],
    query: { enabled: !!address }
  });

  // Get Deployed Projects Count from Factory
  const { data: projectCount, refetch: refetchProjectCount } = useReadContract({
    address: POW_CONFIG.escrowFactoryAddress,
    abi: ESCROW_FACTORY_ABI,
    functionName: 'getDeployedProjectsCount',
  });

  // Get Last Deployed Project Address
  const lastProjectIndex = projectCount ? Number(projectCount) - 1 : -1;
  const { data: lastProjectAddress } = useReadContract({
    address: POW_CONFIG.escrowFactoryAddress,
    abi: ESCROW_FACTORY_ABI,
    functionName: 'deployedProjects',
    args: [BigInt(lastProjectIndex >= 0 ? lastProjectIndex : 0)],
    query: { enabled: lastProjectIndex >= 0 }
  });

  // Get Last Deployed Project's Milestone 0 Details
  const { data: milestone0, refetch: refetchMilestone } = useReadContract({
    address: lastProjectAddress as `0x${string}`,
    abi: ESCROW_PROJECT_ABI,
    functionName: 'milestones',
    args: [BigInt(0)],
    query: { enabled: !!lastProjectAddress }
  });

  // Get Last Deployed Project's Total Collateral Value in USD
  const { data: collateralValueUSD, refetch: refetchCollateral } = useReadContract({
    address: lastProjectAddress as `0x${string}`,
    abi: ESCROW_PROJECT_ABI,
    functionName: 'getCollateralValueUSD',
    query: { enabled: !!lastProjectAddress }
  });

  const needsApproval = allowance !== undefined && amountToLock 
    ? BigInt(allowance) < parseUnits(amountToLock, 18) 
    : true;

  const handleApprove = async () => {
    if (!amountToLock) return;
    try {
      writeContract({
        address: tokenAddress,
        abi: ERC20_ABI,
        functionName: 'approve',
        args: [POW_CONFIG.escrowFactoryAddress, parseUnits(amountToLock, 18)],
      });
    } catch (e) {
      console.error(e);
    }
  };

  const handleDeployEscrow = async () => {
    if (!freelancerAddress || !amountToLock) return alert("Please fill all fields");
    try {
      writeContract({
        address: POW_CONFIG.escrowFactoryAddress,
        abi: ESCROW_FACTORY_ABI,
        functionName: 'createProject',
        args: [
          freelancerAddress as `0x${string}`,
          tokenAddress,
          POW_CONFIG.mockOracleAddress,
          parseUnits(amountToLock, 18)
        ],
      });
    } catch (e) {
      console.error(e);
    }
  };

  const handleAddMilestone = async () => {
    if (!lastProjectAddress || !milestoneAmt || !milestoneDesc) return;
    try {
      writeContract({
        address: lastProjectAddress as `0x${string}`,
        abi: ESCROW_PROJECT_ABI,
        functionName: 'addMilestone',
        args: [parseUnits(milestoneAmt, 18), milestoneDesc],
      });
    } catch (e) {
      console.error(e);
    }
  };

  const handleApproveMilestoneClient = async () => {
    if (!lastProjectAddress) return;
    try {
      writeContract({
        address: lastProjectAddress as `0x${string}`,
        abi: ESCROW_PROJECT_ABI,
        functionName: 'approveMilestoneClient',
        args: [BigInt(0)],
      });
    } catch (e) {
      console.error(e);
    }
  };

  const handleReleaseMilestone = async () => {
    if (!lastProjectAddress) return;
    try {
      writeContract({
        address: lastProjectAddress as `0x${string}`,
        abi: ESCROW_PROJECT_ABI,
        functionName: 'releaseMilestone',
        args: [BigInt(0)],
      });
    } catch (e) {
      console.error(e);
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
            <span className="text-xs font-mono text-lime bg-lime/10 px-3 py-1 rounded-full border border-lime/20">
              Projects Count: {projectCount ? Number(projectCount) : 0}
            </span>
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
                  placeholder="0x70997970C51812dc3A010C7d01b50e0d17dc79C8" 
                  className="w-full bg-surface border border-line rounded-2xl p-4 text-white text-sm focus:border-lime outline-none font-mono transition-colors" 
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-mono text-mist uppercase mb-2 flex justify-between">
                    <span>Collateral Asset</span>
                    <span className="text-lime font-mono">Bal: {balance ? Number(formatUnits(BigInt(balance), 18)).toFixed(2) : "0.00"}</span>
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
                {needsApproval ? (
                  <button 
                    onClick={handleApprove}
                    disabled={isPending || isConfirming}
                    className="w-full py-4 rounded-full font-semibold bg-lime text-lime-ink hover:bg-lime-soft glow-lime-sm transition-all text-sm"
                  >
                    Approve {tokenChoice} Collateral
                  </button>
                ) : (
                  <button 
                    onClick={handleDeployEscrow}
                    disabled={isPending || isConfirming}
                    className="w-full py-4 rounded-full font-semibold bg-mint text-black hover:bg-mint/90 transition-all text-sm"
                  >
                    Lock Collateral & Deploy Escrow
                  </button>
                )}

                {hash && <div className="mt-3 text-xs text-mist font-mono text-center truncate">Tx: {hash}</div>}
              </div>
            </div>
          )}

          {lastProjectAddress && (
            <div className="p-4 rounded-2xl border border-line bg-surface/30 space-y-2">
              <div className="text-xs text-mist font-mono uppercase">Last Deployed Project Contract:</div>
              <div className="text-sm font-mono text-white truncate">{lastProjectAddress}</div>
              {collateralValueUSD !== undefined && (
                <div className="text-xs text-lime">
                  Oracle Collateral Valuation: ${Number(formatUnits(BigInt(collateralValueUSD), 18)).toLocaleString()} USD
                </div>
              )}
            </div>
          )}
        </div>

        {/* Right Column: Active Milestones & Financing */}
        <div className="lg:col-span-5 space-y-6">
          <div className="rounded-3xl neu neu-raise border border-line bg-surface-2 p-6 md:p-8 space-y-4">
            <h2 className="text-xl font-bold font-display text-white">Project Milestones</h2>
            
            {lastProjectAddress ? (
              <div className="space-y-4">
                {milestone0 ? (
                  <div className="p-5 rounded-2xl border border-line bg-surface space-y-4">
                    <div className="flex justify-between items-start">
                      <div>
                        <h4 className="font-bold text-white text-base">{milestone0[2]}</h4>
                        <div className="text-xs text-mist mt-0.5 font-mono">Index: 0</div>
                      </div>
                      <span className="text-lime font-mono font-bold text-lg">
                        {Number(formatUnits(BigInt(milestone0[1]), 18)).toLocaleString()} USDG
                      </span>
                    </div>

                    <div className="flex flex-wrap gap-2 text-xs">
                      {milestone0[3] ? (
                        <span className="px-2.5 py-1 bg-mint/10 text-mint rounded-full border border-mint/20">
                          AI Approved ({Number(milestone0[4])}/100)
                        </span>
                      ) : (
                        <span className="px-2.5 py-1 bg-danger/10 text-danger rounded-full border border-danger/20">
                          Awaiting AI verification
                        </span>
                      )}

                      {milestone0[5] ? (
                        <span className="px-2.5 py-1 bg-mint/10 text-mint rounded-full border border-mint/20">
                          Client Approved
                        </span>
                      ) : (
                        <span className="px-2.5 py-1 bg-danger/10 text-danger rounded-full border border-danger/20">
                          Awaiting Client Approval
                        </span>
                      )}
                    </div>

                    {/* Actions */}
                    {!milestone0[5] && (
                      <button 
                        onClick={handleApproveMilestoneClient}
                        className="w-full py-2.5 rounded-full border border-lime/30 text-lime text-xs font-semibold hover:bg-lime/10 transition-colors"
                      >
                        Approve Milestone On-Chain
                      </button>
                    )}

                    {milestone0[3] && milestone0[5] && !milestone0[6] && (
                      <button 
                        onClick={handleReleaseMilestone}
                        className="w-full py-2.5 rounded-full bg-mint text-black text-xs font-semibold hover:bg-mint/90 transition-colors"
                      >
                        Release Milestone Payout
                      </button>
                    )}

                    {milestone0[6] && (
                      <div className="w-full py-2 text-center text-xs text-mist bg-surface-3 rounded-full border border-line">
                        ✓ Milestone Paid to Freelancer
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="space-y-4">
                    <p className="text-xs text-mist">No milestones created yet for this project contract. Create one below:</p>
                    <div className="space-y-3 p-4 border border-line rounded-2xl bg-surface/50">
                      <input 
                        type="text" 
                        value={milestoneDesc} 
                        onChange={(e) => setMilestoneDesc(e.target.value)} 
                        className="w-full bg-surface border border-line rounded-xl p-3 text-xs text-white" 
                      />
                      <input 
                        type="number" 
                        value={milestoneAmt} 
                        onChange={(e) => setMilestoneAmt(e.target.value)} 
                        className="w-full bg-surface border border-line rounded-xl p-3 text-xs text-white" 
                      />
                      <button 
                        onClick={handleAddMilestone}
                        className="w-full py-2 bg-lime text-black rounded-full text-xs font-bold"
                      >
                        Add Milestone #1 On-Chain
                      </button>
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <p className="text-xs text-mist">Deploy an escrow contract to manage project milestones.</p>
            )}
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
