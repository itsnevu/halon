"use client";

import { SiteHeader } from "@/components/site-header";
import { SiteFooter } from "@/components/cta-footer";
import { useState } from "react";
import { useAccount, useWriteContract, useWaitForTransactionReceipt } from "wagmi";
import { CLAIMS_ADJUDICATOR_ABI } from "@/lib/pow-abis";
import { explorerTx } from "@/lib/robinhood-chain";
import {
  CLAIMS_ADJUDICATOR_ADDRESS,
  POLICY_POOL_ADDRESS,
  POLICY_POOL_B_ADDRESS,
} from "@/lib/onchain";

// Env-driven pool options — no hardcoded addresses. Only configured pools show.
const POOL_OPTIONS = [
  POLICY_POOL_ADDRESS ? { addr: POLICY_POOL_ADDRESS, label: "Policy Pool A (Underwriter)" } : null,
  POLICY_POOL_B_ADDRESS ? { addr: POLICY_POOL_B_ADDRESS, label: "Policy Pool B (Reinsurer)" } : null,
].filter((o): o is { addr: `0x${string}`; label: string } => o !== null);

export default function DisputesPage() {
  const { isConnected } = useAccount();

  const [selectedPool, setSelectedPool] = useState<string>(POOL_OPTIONS[0]?.addr ?? "");
  const [policyId, setPolicyId] = useState<string>("1");
  const [reason, setReason] = useState<string>("Disputed settlement: solver execution invalid.");

  const { data: hash, writeContract, isPending } = useWriteContract();
  const { isLoading: isConfirming, isSuccess: isConfirmed } = useWaitForTransactionReceipt({ hash });

  const handleResolve = () => {
    if (!policyId || !reason || !selectedPool || !CLAIMS_ADJUDICATOR_ADDRESS) return;
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
          <h1 className="text-4xl font-display text-fg mb-2">Dispute Resolution</h1>
          <p className="text-mist mb-12">Review and adjudicate claims where solver execution evidence is contested by the user.</p>

          {!isConnected ? (
            <div className="panel p-12 text-center text-mist">
              Please connect your DAO/Admin wallet to review disputes.
            </div>
          ) : (
            <div className="panel p-8 rounded-3xl bg-surface-2 border border-line space-y-6">
              <h2 className="text-xl text-fg font-medium">Adjudicate Claim On-Chain</h2>
              
              <div className="space-y-4">
                <div>
                  <label className="block text-xs font-mono text-mist uppercase mb-2">Target Policy Pool</label>
                  <select
                    value={selectedPool}
                    onChange={(e) => setSelectedPool(e.target.value)}
                    className="w-full bg-surface border border-line rounded-2xl p-4 text-fg text-sm focus:border-danger outline-none transition-colors"
                  >
                    {POOL_OPTIONS.length === 0 ? (
                      <option value="">No pools configured</option>
                    ) : (
                      POOL_OPTIONS.map((o) => (
                        <option key={o.addr} value={o.addr}>
                          {o.label} · {o.addr.slice(0, 8)}…
                        </option>
                      ))
                    )}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-mono text-mist uppercase mb-2">Policy ID (Tokenized NFT ID)</label>
                  <input 
                    type="number" 
                    value={policyId}
                    onChange={(e) => setPolicyId(e.target.value)}
                    placeholder="1" 
                    className="w-full bg-surface border border-line rounded-2xl p-4 text-fg text-sm focus:border-danger outline-none font-mono transition-colors" 
                  />
                </div>

                <div>
                  <label className="block text-xs font-mono text-mist uppercase mb-2">Resolution / Adjudication Reason</label>
                  <textarea 
                    value={reason}
                    onChange={(e) => setReason(e.target.value)}
                    placeholder="Describe why this dispute is resolved and discharged..."
                    className="w-full h-24 bg-surface border border-line rounded-2xl p-4 text-fg text-sm focus:border-danger outline-none transition-colors resize-none" 
                  />
                </div>
              </div>

              <button 
                onClick={handleResolve}
                disabled={isPending || isConfirming || !policyId || !reason}
                className="w-full py-4 rounded-full font-semibold bg-danger text-fg hover:bg-danger/90 disabled:opacity-40 transition-all text-sm"
              >
                {isConfirming ? "Confirming..." : isPending ? "Confirming in Wallet..." : "Discharge & Payout Policy"}
              </button>

              {hash && (
                <div className="mt-4 text-center">
                  <a 
                    href={explorerTx(hash)}
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

