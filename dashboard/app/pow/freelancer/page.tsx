"use client";

import { useEffect, useMemo, useState } from "react";
import { useAccount, useWriteContract, useReadContract, useWaitForTransactionReceipt } from "wagmi";
import { formatUnits } from "viem";
import { ESCROW_PROJECT_ABI } from "../../../lib/pow-abis";
import { POW_CONFIG } from "../../../lib/pow-config";
import { usePowProjects } from "../../../lib/use-pow-projects";
import { FlowSteps } from "@/components/ui/flow-steps";

export default function FreelancerDashboard() {
  const { isConnected } = useAccount();
  const [file, setFile] = useState<File | null>(null);
  const [status, setStatus] = useState<"idle" | "uploading" | "analyzing" | "approved" | "rejected">("idle");
  const [aiScore, setAiScore] = useState<number | null>(null);

  // Every escrow where the connected wallet is the freelancer.
  const { projects, isLoading: projectsLoading } = usePowProjects("freelancer");

  const [projectAddr, setProjectAddr] = useState<`0x${string}` | undefined>(undefined);
  const [milestoneId, setMilestoneId] = useState(0);

  // Default to the first project once they load (or when the set changes).
  useEffect(() => {
    if (!projectAddr && projects.length > 0) setProjectAddr(projects[0].address);
  }, [projects, projectAddr]);

  const { data: hash, writeContract, isPending } = useWriteContract();
  const { isLoading: isConfirming } = useWaitForTransactionReceipt({ hash });

  // How many milestones does the selected project have?
  const { data: milestoneCountData } = useReadContract({
    address: projectAddr,
    abi: ESCROW_PROJECT_ABI,
    functionName: "milestoneCount",
    query: { enabled: !!projectAddr },
  });
  const milestoneCount = milestoneCountData ? Number(milestoneCountData) : 0;

  // The selected milestone tuple: [id, amount, description, aiApproved, aiScore, clientApproved, isPaid]
  const { data: milestone, refetch: refetchMilestone } = useReadContract({
    address: projectAddr,
    abi: ESCROW_PROJECT_ABI,
    functionName: "milestones",
    args: [BigInt(milestoneId)],
    query: { enabled: !!projectAddr && milestoneCount > 0 },
  });

  const aiApproved = milestone ? (milestone[3] as boolean) : false;
  const clientApproved = milestone ? (milestone[5] as boolean) : false;
  const isPaid = milestone ? (milestone[6] as boolean) : false;
  const onchainScore = milestone ? Number(milestone[4]) : null;

  const milestoneAmountStr = milestone
    ? `${Number(formatUnits(BigInt(milestone[1] as bigint), 18)).toLocaleString()} USDG`
    : "$0.00 USDG";

  const showApproved = status === "approved" || aiApproved;
  const showResult = status === "approved" || status === "rejected" || aiApproved;

  const handleUpload = async () => {
    if (!file) return alert("Please select a file first");
    if (!projectAddr) return alert("No active project escrow selected.");

    setStatus("uploading");

    const formData = new FormData();
    formData.append("project_address", projectAddr);
    formData.append("file", file);
    formData.append("milestone_id", milestoneId.toString());
    // Client reputation is derived server-side / on-chain; these are placeholders.
    formData.append("client_disputes", "0");
    formData.append("client_late_days", "0");

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 60_000);
    try {
      setStatus("analyzing");
      const response = await fetch(`${POW_CONFIG.aiBackendUrl}/verify-milestone`, {
        method: "POST",
        body: formData,
        signal: controller.signal,
      });
      if (!response.ok) throw new Error(`Backend returned ${response.status}`);
      const result = await response.json();
      setAiScore(typeof result.ai_score === "number" ? result.ai_score : null);

      if (result.status === "approved_on_chain") {
        setStatus("approved");
        setTimeout(() => refetchMilestone(), 3000);
      } else {
        setStatus("rejected");
      }
    } catch (e) {
      console.error(e);
      setStatus("idle");
      alert("AI Backend request failed. Is the FastAPI server reachable?");
    } finally {
      clearTimeout(timeout);
    }
  };

  const handleClaim = () => {
    if (!projectAddr) return;
    writeContract({
      address: projectAddr,
      abi: ESCROW_PROJECT_ABI,
      functionName: "releaseMilestone",
      args: [BigInt(milestoneId)],
    });
  };

  const milestoneOptions = useMemo(
    () => Array.from({ length: Math.max(milestoneCount, 1) }, (_, i) => i),
    [milestoneCount],
  );

  return (
    <div className="py-10 px-5 sm:px-8 max-w-7xl mx-auto space-y-10">
      {/* Header Banner */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 pb-6 border-b border-line">
        <div>
          <div className="inline-flex items-center gap-2 rounded-full border border-mint/30 bg-mint/10 px-3 py-1 text-xs font-semibold text-mint mb-2">
            AI WORK VERIFIER & PAYOUT
          </div>
          <h1 className="font-display text-3xl md:text-4xl font-extrabold text-white">Freelancer Portal</h1>
          <p className="text-mist text-sm mt-1">Upload proof of work for automated LLM scoring and instant payout release.</p>
        </div>

        <div className="flex items-center gap-4">
          <div className="neu neu-raise px-5 py-3 rounded-2xl border border-line bg-surface-2 flex items-center gap-3">
            <div className="size-2.5 rounded-full bg-mint" />
            <div>
              <div className="text-xs text-mist font-mono uppercase">Available Payout</div>
              <div className="text-lg font-bold text-mint font-display font-mono">
                {isPaid ? "Claimed" : showApproved && clientApproved ? milestoneAmountStr : "$0.00 USDG"}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Project + milestone selectors */}
      <div className="flex flex-col sm:flex-row gap-4">
        <label className="flex-1 space-y-1">
          <span className="text-xs font-mono uppercase text-mist">Escrow Project</span>
          <select
            value={projectAddr ?? ""}
            onChange={(e) => {
              setProjectAddr(e.target.value as `0x${string}`);
              setMilestoneId(0);
              setStatus("idle");
              setAiScore(null);
            }}
            disabled={projects.length === 0}
            className="w-full rounded-2xl border border-line bg-surface-2 px-4 py-3 text-sm text-white font-mono disabled:opacity-40"
          >
            {projects.length === 0 ? (
              <option value="">
                {projectsLoading ? "Loading projects…" : "No escrow assigned to this wallet"}
              </option>
            ) : (
              projects.map((p) => (
                <option key={p.address} value={p.address}>
                  #{p.index} · {p.address.slice(0, 10)}…{p.address.slice(-4)}
                </option>
              ))
            )}
          </select>
        </label>

        <label className="sm:w-56 space-y-1">
          <span className="text-xs font-mono uppercase text-mist">Milestone</span>
          <select
            value={milestoneId}
            onChange={(e) => {
              setMilestoneId(Number(e.target.value));
              setStatus("idle");
              setAiScore(null);
            }}
            disabled={!projectAddr || milestoneCount === 0}
            className="w-full rounded-2xl border border-line bg-surface-2 px-4 py-3 text-sm text-white font-mono disabled:opacity-40"
          >
            {milestoneOptions.map((i) => (
              <option key={i} value={i}>
                Milestone #{i}
              </option>
            ))}
          </select>
        </label>
      </div>

      {!isConnected && (
        <div className="rounded-2xl border border-line bg-surface-2 px-5 py-3 text-sm text-mist">
          Connect your wallet to load the escrows assigned to you.
        </div>
      )}

      {projectAddr && (
        <div className="rounded-2xl border border-line bg-surface-2 px-5 py-4">
          <FlowSteps
            accent="#61E7C3"
            steps={["Upload", "AI score", "Approve", "Claim"]}
            current={
              [
                status !== "idle",
                aiApproved || status === "approved",
                clientApproved,
                isPaid,
              ].filter(Boolean).length
            }
          />
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        {/* Left Column: Upload Work Proof */}
        <div className="lg:col-span-7 rounded-3xl neu neu-raise border border-line bg-surface-2 p-6 md:p-8 space-y-6">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-bold font-display text-white">Submit Work Proof</h2>
            <span className="text-xs font-mono text-mint bg-mint/10 px-3 py-1 rounded-full border border-mint/20">
              {projectAddr ? `Active: ${projectAddr.slice(0, 8)}… · M#${milestoneId}` : "No Project Selected"}
            </span>
          </div>

          <div className="border-2 border-dashed border-line rounded-3xl p-8 text-center bg-surface/50 space-y-5">
            {showResult ? (
              <div className={showApproved ? "text-mint space-y-3" : "text-danger space-y-3"}>
                <div className={`size-16 rounded-full mx-auto flex items-center justify-center ${showApproved ? "bg-mint/10 border border-mint/30" : "bg-danger/10 border border-danger/30"}`}>
                  <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d={showApproved ? "M5 13l4 4L19 7" : "M6 18L18 6M6 6l12 12"} />
                  </svg>
                </div>
                <h3 className="text-2xl font-bold font-display">
                  {showApproved ? "Verification Approved!" : "Submission Rejected"}
                </h3>
                <p className="text-xs text-mist">
                  {showApproved
                    ? "On-chain milestone release authorization signed by AI relayer."
                    : "Risk score below threshold."}
                </p>
              </div>
            ) : (
              <div className="space-y-4">
                <div className="size-16 rounded-full bg-mint/10 border border-mint/20 text-mint flex items-center justify-center mx-auto">
                  <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
                  </svg>
                </div>
                <div>
                  <h4 className="text-base font-bold text-white">Upload Document / Invoice / Code Archive</h4>
                  <p className="text-xs text-mist mt-1">PDF, PNG, JPG, or TXT formats supported for AI OCR.</p>
                </div>

                <input
                  type="file"
                  onChange={(e) => setFile(e.target.files?.[0] || null)}
                  className="block w-full text-xs text-mist file:mr-4 file:py-2.5 file:px-4 file:rounded-full file:border-0 file:text-xs file:font-semibold file:bg-surface-3 file:text-white hover:file:bg-surface cursor-pointer"
                />

                <button
                  onClick={handleUpload}
                  disabled={status !== "idle" || !file || !projectAddr}
                  className="w-full py-4 rounded-full font-semibold bg-mint text-black hover:bg-mint/90 disabled:opacity-40 disabled:pointer-events-none transition-all duration-200 text-sm shadow-lg shadow-mint/20"
                >
                  {status === "idle" ? "Upload Work & Run AI Verification" : "AI Agent Processing..."}
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Right Column: AI Risk Meter & Payout Claim */}
        <div className="lg:col-span-5 space-y-6">
          <div className="rounded-3xl neu neu-raise border border-line bg-surface-2 p-6 md:p-8 space-y-6">
            <h2 className="text-xl font-bold font-display text-white">AI Telemetry & Verification</h2>

            {aiScore === null && !aiApproved ? (
              <div className="flex flex-col items-center justify-center h-48 border border-line/60 rounded-2xl bg-surface/30 text-center p-6 space-y-3">
                {status === "analyzing" ? (
                  <>
                    <div className="animate-spin size-8 border-2 border-mint border-t-transparent rounded-full"></div>
                    <div className="text-sm font-semibold text-mint">Analyzing document via FastAPI backend...</div>
                    <div className="text-xs text-mist font-mono">Checking duplication, client reputation & anomaly score...</div>
                  </>
                ) : (
                  <div className="text-xs text-mist">Upload work proof on the left to start AI risk verification.</div>
                )}
              </div>
            ) : (
              <div className="space-y-6">
                <div className={`p-6 rounded-2xl border ${showApproved ? "bg-mint/10 border-mint/30" : "bg-danger/10 border-danger/30"} space-y-3`}>
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-mono uppercase tracking-wider text-mist">AI Risk Score</span>
                    <span className={`text-3xl font-extrabold font-display ${showApproved ? "text-mint" : "text-danger"}`}>
                      {aiScore !== null ? aiScore : onchainScore} / 100
                    </span>
                  </div>
                  <div className="h-2 w-full rounded-full bg-ink-2 overflow-hidden border border-line">
                    <div className={`h-full ${showApproved ? "bg-mint" : "bg-danger"}`} style={{ width: `${aiScore !== null ? aiScore : onchainScore ?? 0}%` }} />
                  </div>
                </div>

                {showApproved && (
                  <div className="space-y-4">
                    <div className="space-y-2 text-xs text-mist border-l-2 border-mint pl-4 py-1">
                      <div className="text-white font-semibold">✅ Document OCR parsed cleanly</div>
                      <div>✅ No duplicate submission detected</div>
                      <div>✅ Client credit score verified (&gt;80)</div>
                    </div>

                    <button
                      onClick={handleClaim}
                      disabled={isPending || isConfirming || isPaid || !clientApproved}
                      className={`w-full py-4 rounded-full font-bold text-sm transition-all duration-200 shadow-lg
                        ${isPaid ? "bg-surface-3 text-mist border border-line" : isPending || isConfirming ? "bg-surface-3 text-mist cursor-wait" : "bg-lime text-lime-ink hover:bg-lime-soft glow-lime-sm"}`}
                    >
                      {isPaid
                        ? "Milestone Claimed On-Chain!"
                        : !clientApproved
                          ? "Awaiting Client Approval"
                          : isConfirming
                            ? "Confirming tx..."
                            : isPending
                              ? "Sign in wallet..."
                              : "Claim Milestone Payout"}
                    </button>

                    {hash && (
                      <a
                        href={`https://basescan.org/tx/${hash}`}
                        target="_blank"
                        rel="noreferrer"
                        className="block text-center text-xs text-lime underline font-mono break-all"
                      >
                        Tx: {hash.slice(0, 10)}…{hash.slice(-8)}
                      </a>
                    )}
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
