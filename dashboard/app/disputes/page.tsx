"use client";

import { SiteHeader } from "@/components/site-header";
import { SiteFooter } from "@/components/cta-footer";
import { useState } from "react";
import { useAccount, useWriteContract, useWaitForTransactionReceipt } from "wagmi";
import { CLAIMS_ADJUDICATOR_ABI } from "@/lib/pow-abis";

const CLAIMS_ADJUDICATOR_ADDRESS = "0xcf7ed3acca5a467e9e704c703e8d87f634fb0fc9" as const;
const POLICY_POOL_A = "0xe7f1725e7734ce288f8367e1bb143e90bb3f0512" as const;
const POLICY_POOL_B = "0x9fe46736679d2d9a65f0992f2272de9f3c7fa6e0" as const;

export default function DisputesPage() {
  const { isConnected } = useAccount();
  
  const [selectedPool, setSelectedPool] = useState<string>(POLICY_POOL_A);
  const [policyId, setPolicyId] = useState<string>("1");
  const [reason, setReason] = useState<string>("Disputed settlement: solver execution invalid.");

  const { data: hash, writeContract, isPending } = useWriteContract();
  const { isLoading: isConfirming, isSuccess: isConfirmed } = useWaitForTransactionReceipt({ hash });

  const handleResolve = () => {
    if (!policyId || !reason) return;
    writeContract({
      address: CLAIMS_ADJUDICATOR_ADDRESS,
      abi: CLAIMS_ADJUDICATOR_ABI,
      functionName: "dischargeDisputed",
      args: [selectedPool as `0x${string}`, BigInt(policyId), reason],
    });
  };

  return (
    <>
      <SiteHeader />
      <main className="flex-1 flex flex-col items-center pt-24 min-h-[80vh] px-4 relative">
        <div className="absolute top-0 w-[800px] h-[300px] bg-danger/10 blur-[120px] rounded-full pointer-events-none" />

        <div className="w-full max-w-2xl z-10">
          <h1 className="text-4xl font-display text-white mb-2">Dispute Resolution</h1>
          <p className="text-mist mb-12">Review and adjudicate claims where solver execution evidence is contested by the user.</p>

          {!isConnected ? (
            <div className="panel p-12 text-center text-mist">
              Please connect your DAO/Admin wallet to review disputes.
            </div>
          ) : (
            <div className="panel p-8 rounded-3xl bg-surface-2 border border-line space-y-6">
              <h2 className="text-xl text-white font-medium">Adjudicate Claim On-Chain</h2>
              
              <div className="space-y-4">
                <div>
                  <label className="block text-xs font-mono text-mist uppercase mb-2">Target Policy Pool</label>
                  <select 
                    value={selectedPool}
                    onChange={(e) => setSelectedPool(e.target.value)}
                    className="w-full bg-surface border border-line rounded-2xl p-4 text-white text-sm focus:border-danger outline-none transition-colors"
                  >
                    <option value={POLICY_POOL_A}>Policy Pool A (Sentinel Pool)</option>
                    <option value={POLICY_POOL_B}>Policy Pool B (Bastion Re Pool)</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-mono text-mist uppercase mb-2">Policy ID (Tokenized NFT ID)</label>
                  <input 
                    type="number" 
                    value={policyId}
                    onChange={(e) => setPolicyId(e.target.value)}
                    placeholder="1" 
                    className="w-full bg-surface border border-line rounded-2xl p-4 text-white text-sm focus:border-danger outline-none font-mono transition-colors" 
                  />
                </div>

                <div>
                  <label className="block text-xs font-mono text-mist uppercase mb-2">Resolution / Adjudication Reason</label>
                  <textarea 
                    value={reason}
                    onChange={(e) => setReason(e.target.value)}
                    placeholder="Describe why this dispute is resolved and discharged..."
                    className="w-full h-24 bg-surface border border-line rounded-2xl p-4 text-white text-sm focus:border-danger outline-none transition-colors resize-none" 
                  />
                </div>
              </div>

              <button 
                onClick={handleResolve}
                disabled={isPending || isConfirming || !policyId || !reason}
                className="w-full py-4 rounded-full font-semibold bg-danger text-white hover:bg-danger/90 disabled:opacity-40 transition-all text-sm"
              >
                {isConfirming ? "Confirming..." : isPending ? "Confirming in Wallet..." : "Discharge & Payout Policy"}
              </button>

              {hash && (
                <div className="mt-4 text-center">
                  <a 
                    href={`https://basescan.org/tx/${hash}`} 
                    target="_blank" 
                    rel="noreferrer"
                    className="text-xs text-danger underline break-all font-mono"
                  >
                    Tx: {hash.slice(0, 10)}...{hash.slice(-10)}
                  </a>
                </div>
              )}
              {isConfirmed && (
                <div className="mt-2 text-center text-xs text-danger font-semibold">
                  ✓ Dispute Discharged & User Paid Successfully!
                </div>
              )}
            </div>
          )}
        </div>
      </main>
      <SiteFooter />
    </>
  );
}

