"use client";

import { SiteHeader } from "@/components/site-header";
import { SiteFooter } from "@/components/cta-footer";
import { useState } from "react";
import { useAccount } from "wagmi";

export default function DisputesPage() {
  const { isConnected } = useAccount();
  const [resolving, setResolving] = useState<string | null>(null);

  const disputes = [
    {
      id: "0x8f4d92a1b3c4e5f67890abcdef12345678903a2b",
      relayer: "Across v3",
      amount: "500 USDC",
      status: "Disputed",
      reason: "User claims non-delivery, Relayer provided invalid proofHash."
    }
  ];

  const handleResolve = (id: string, decision: 'payout' | 'reject') => {
    setResolving(id);
    setTimeout(() => {
      alert(`Dispute ${id} resolved with decision: ${decision}`);
      setResolving(null);
    }, 1500);
  };

  return (
    <>
      <SiteHeader />
      <main className="flex-1 flex flex-col items-center pt-24 min-h-[80vh] px-4 relative">
        <div className="absolute top-0 w-[800px] h-[300px] bg-danger/10 blur-[120px] rounded-full pointer-events-none" />

        <div className="w-full max-w-4xl z-10">
          <h1 className="text-4xl font-display text-white mb-2">Dispute Resolution</h1>
          <p className="text-mist mb-12">Review claims where solver execution evidence is contested by the user.</p>

          {!isConnected ? (
            <div className="panel p-12 text-center text-mist">
              Please connect your DAO/Admin wallet to review disputes.
            </div>
          ) : (
            <div className="panel p-0 overflow-hidden">
              <table className="w-full text-left text-sm">
                <thead className="bg-surface-2 border-b border-line text-mist">
                  <tr>
                    <th className="px-6 py-4 font-medium">Intent ID</th>
                    <th className="px-6 py-4 font-medium">Relayer</th>
                    <th className="px-6 py-4 font-medium">Claim Amount</th>
                    <th className="px-6 py-4 font-medium">Reason</th>
                    <th className="px-6 py-4 font-medium">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-line text-white">
                  {disputes.map((dispute) => (
                    <tr key={dispute.id} className="hover:bg-white/[0.02]">
                      <td className="px-6 py-4 font-mono text-mist">
                        {dispute.id.substring(0, 6)}...{dispute.id.substring(dispute.id.length - 4)}
                      </td>
                      <td className="px-6 py-4">{dispute.relayer}</td>
                      <td className="px-6 py-4">{dispute.amount}</td>
                      <td className="px-6 py-4 text-xs text-danger">{dispute.reason}</td>
                      <td className="px-6 py-4 flex gap-2">
                        <button 
                          className="bg-danger/20 text-danger hover:bg-danger/30 px-3 py-1 rounded-md text-xs transition"
                          onClick={() => handleResolve(dispute.id, 'payout')}
                          disabled={resolving === dispute.id}
                        >
                          Payout User
                        </button>
                        <button 
                          className="bg-surface-3 text-mist hover:bg-line px-3 py-1 rounded-md text-xs transition"
                          onClick={() => handleResolve(dispute.id, 'reject')}
                          disabled={resolving === dispute.id}
                        >
                          Reject Claim
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </main>
      <SiteFooter />
    </>
  );
}
