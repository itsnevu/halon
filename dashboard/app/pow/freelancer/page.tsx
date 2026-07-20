"use client";

import { useState } from "react";
import { useWriteContract, useWaitForTransactionReceipt } from "wagmi";
import { ESCROW_PROJECT_ABI } from "../../../lib/pow-abis";
import { POW_CONFIG } from "../../../lib/pow-config";

export default function FreelancerDashboard() {
  const [file, setFile] = useState<File | null>(null);
  const [status, setStatus] = useState<"idle" | "uploading" | "analyzing" | "approved" | "rejected">("idle");
  const [aiScore, setAiScore] = useState<number | null>(null);
  const [milestoneId] = useState(0); // Mock active milestone ID

  const { data: hash, writeContract, isPending } = useWriteContract();
  const { isLoading: isConfirming, isSuccess: isConfirmed } = useWaitForTransactionReceipt({ hash });

  const handleUpload = async () => {
    if (!file) return alert("Please select a file first");
    
    setStatus("uploading");
    
    const formData = new FormData();
    formData.append("file", file);
    formData.append("milestone_id", milestoneId.toString());
    formData.append("client_disputes", "0");
    formData.append("client_late_days", "0");

    try {
      setStatus("analyzing");
      
      const response = await fetch(`${POW_CONFIG.aiBackendUrl}/verify-milestone`, {
        method: "POST",
        body: formData,
      });
      
      const result = await response.json();
      setAiScore(result.ai_score);
      
      if (result.status === "approved_on_chain") {
        setStatus("approved");
      } else {
        setStatus("rejected");
      }
    } catch (e) {
      console.error(e);
      setStatus("idle");
      alert("AI Backend connection failed. Make sure the FastAPI server is running.");
    }
  };

  const handleClaim = () => {
    writeContract({
      address: "0x0000000000000000000000000000000000000000", // Will be replaced by actual project address from factory
      abi: ESCROW_PROJECT_ABI,
      functionName: 'releaseMilestone',
      args: [BigInt(milestoneId)],
    });
  };

  return (
    <div className="min-h-screen bg-[#0a0a0a] text-white p-8">
      <div className="max-w-5xl mx-auto space-y-8">
        <header className="flex justify-between items-center border-b border-gray-800 pb-4">
          <h1 className="text-3xl font-bold">Freelancer Dashboard</h1>
          <div className="flex items-center gap-4">
            <span className="px-4 py-2 bg-emerald-500/10 text-emerald-400 rounded-full font-medium">
              Available to Claim: {isConfirmed ? "$0.00" : (status === "approved" ? "$3,000.00" : "$0.00")}
            </span>
          </div>
        </header>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          <div className="p-6 rounded-2xl bg-gray-900 border border-gray-800">
            <h2 className="text-xl font-bold mb-4">Submit Work (Milestone #1)</h2>
            <div className="border-2 border-dashed border-gray-700 rounded-xl p-8 text-center bg-black/50">
              {status === "approved" || status === "rejected" ? (
                <div className={status === "approved" ? "text-emerald-400" : "text-red-400"}>
                  <svg className="w-12 h-12 mx-auto mb-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d={status === "approved" ? "M5 13l4 4L19 7" : "M6 18L18 6M6 6l12 12"} />
                  </svg>
                  <p className="font-bold">Work {status === "approved" ? "Approved!" : "Rejected"}</p>
                </div>
              ) : (
                <>
                  <div className="mb-4">
                    <svg className="w-12 h-12 text-gray-500 mx-auto" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
                    </svg>
                  </div>
                  <input type="file" onChange={(e) => setFile(e.target.files?.[0] || null)} className="mb-4 text-sm text-gray-400" />
                  <button 
                    onClick={handleUpload}
                    disabled={status !== "idle" || !file}
                    className="px-6 py-2 bg-emerald-600 hover:bg-emerald-500 disabled:bg-gray-700 rounded-lg font-bold w-full"
                  >
                    {status === "idle" ? "Upload Proof (PDF/Image)" : "AI Processing..."}
                  </button>
                </>
              )}
            </div>
          </div>

          <div className="space-y-6">
            <div className="p-6 rounded-2xl bg-gray-900 border border-gray-800">
              <h2 className="text-xl font-bold mb-4">AI Verification Status</h2>
              {aiScore === null ? (
                <div className="flex items-center gap-4 text-gray-500 h-24">
                  {status === "analyzing" ? (
                    <div className="flex items-center gap-2">
                      <div className="animate-spin h-5 w-5 border-t-2 border-emerald-500 rounded-full"></div>
                      AI is deeply analyzing document...
                    </div>
                  ) : "Waiting for submission..."}
                </div>
              ) : (
                <div className="space-y-4">
                  <div className={`flex items-center justify-between p-4 rounded-xl border ${status === "approved" ? "bg-emerald-500/10 border-emerald-500/20" : "bg-red-500/10 border-red-500/20"}`}>
                    <span className={`font-semibold ${status === "approved" ? "text-emerald-400" : "text-red-400"}`}>AI Risk Score</span>
                    <span className={`text-2xl font-bold ${status === "approved" ? "text-emerald-300" : "text-red-300"}`}>{aiScore}/100</span>
                  </div>
                  
                  {status === "approved" && (
                    <>
                      <p className="text-sm text-gray-400">
                        ✅ No duplicate invoices detected<br/>
                        ✅ Client reputation passed<br/>
                        ✅ Work parameters matched
                      </p>
                      <button 
                        onClick={handleClaim}
                        disabled={isPending || isConfirming || isConfirmed}
                        className={`w-full py-3 rounded-lg font-bold text-white transition-colors
                          ${isConfirmed ? "bg-gray-700" : (isPending || isConfirming) ? "bg-blue-800" : "bg-blue-600 hover:bg-blue-500"}`}
                      >
                        {isConfirmed ? "Claimed Successfully" : 
                         isConfirming ? "Confirming tx..." : 
                         isPending ? "Sign in wallet..." : "Claim $3,000 Milestone"}
                      </button>
                    </>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
