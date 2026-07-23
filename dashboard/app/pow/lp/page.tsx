"use client";

import { useEffect, useState } from "react";
import { useAccount, useReadContract, useWriteContract, useWaitForTransactionReceipt } from "wagmi";
import { parseUnits, formatUnits } from "viem";
import { MORPHO_VAULT_ABI, ERC20_ABI } from "../../../lib/pow-abis";
import { POW_CONFIG } from "../../../lib/pow-config";
import { usePowProjects } from "../../../lib/use-pow-projects";
import { explorerTx, explorerAddr, robinhoodChain } from "../../../lib/robinhood-chain";

export default function LPDashboard() {
  const { address } = useAccount();
  const [depositAmount, setDepositAmount] = useState("");

  // Real Morpho vault TVL.
  const { data: totalAssets } = useReadContract({
    address: POW_CONFIG.mockMorphoVaultAddress,
    abi: MORPHO_VAULT_ABI,
    functionName: 'totalAssets',
    chainId: robinhoodChain.id,
  });

  // Real USDG wallet balance for the connected account.
  const { data: usdgBalance } = useReadContract({
    address: POW_CONFIG.mockUSDGAddress,
    abi: ERC20_ABI,
    functionName: 'balanceOf',
    args: address ? [address] : undefined,
    chainId: robinhoodChain.id,
    query: { enabled: !!address },
  });
  const usdgBalanceNum = usdgBalance ? Number(formatUnits(BigInt(usdgBalance), 18)) : 0;

  // Real allowance the vault holds over the user's USDG — decides whether the
  // next action must be an ERC20 approve before the vault can pull funds.
  const { data: allowance, refetch: refetchAllowance } = useReadContract({
    address: POW_CONFIG.mockUSDGAddress,
    abi: ERC20_ABI,
    functionName: 'allowance',
    args: address ? [address, POW_CONFIG.mockMorphoVaultAddress] : undefined,
    chainId: robinhoodChain.id,
    query: { enabled: !!address },
  });

  // Real deployed escrow projects the vault liquidity actually funds.
  const { allProjects, isLoading: projectsLoading } = usePowProjects();

  const { data: hash, writeContract, isPending } = useWriteContract();
  const { isLoading: isConfirming, isSuccess: isConfirmed } = useWaitForTransactionReceipt({ hash });

  const amountWei = depositAmount ? parseUnits(depositAmount, 18) : BigInt(0);
  const needsApproval =
    amountWei > BigInt(0) && (allowance === undefined || (allowance as bigint) < amountWei);

  const handleApprove = () => {
    if (!depositAmount || !address) return;
    writeContract({
      address: POW_CONFIG.mockUSDGAddress,
      abi: ERC20_ABI,
      functionName: 'approve',
      args: [POW_CONFIG.mockMorphoVaultAddress, amountWei],
    });
  };

  const handleDeposit = () => {
    if (!depositAmount || !address) return;
    writeContract({
      address: POW_CONFIG.mockMorphoVaultAddress,
      abi: MORPHO_VAULT_ABI,
      functionName: 'deposit',
      args: [amountWei, address], // Receiver is the depositor
    });
  };

  // After a tx confirms, re-read allowance so the button flips approve→deposit.
  useEffect(() => {
    if (isConfirmed) refetchAllowance();
  }, [isConfirmed, refetchAllowance]);

  return (
    <div className="py-10 px-5 sm:px-8 max-w-7xl mx-auto space-y-10">
      {/* Header Banner */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 pb-6 border-b border-line">
        <div>
          <div className="inline-flex items-center gap-2 rounded-full border border-spring/30 bg-spring/10 px-3 py-1 text-xs font-semibold text-spring mb-2">
            ROBINHOOD EARN & MORPHO VAULTS
          </div>
          <h1 className="font-display text-3xl md:text-4xl font-extrabold text-fg">Liquidity Vault (Earn)</h1>
          <p className="text-mist text-sm mt-1">Provide USDG liquidity to fund automated advance financing on AI-verified milestones.</p>
        </div>

        <div className="flex items-center gap-4">
          <div className="neu neu-raise px-5 py-3 rounded-2xl border border-line bg-surface-2 flex items-center gap-4">
            <div>
              <div className="text-xs text-mist font-mono uppercase">Morpho Vault TVL</div>
              <div className="text-lg font-bold text-fg font-display font-mono">
                {totalAssets !== undefined
                  ? `${Number(formatUnits(totalAssets as bigint, 18)).toLocaleString()} USDG`
                  : "— USDG"}
              </div>
            </div>
            <div className="h-8 w-px bg-line" />
            <div>
              <div className="text-xs text-mist font-mono uppercase">Escrows Funded</div>
              <div className="text-lg font-bold text-spring font-display font-mono">{allProjects.length}</div>
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        {/* Left Column: Deposit to Vault */}
        <div className="lg:col-span-5 rounded-3xl neu neu-raise border border-line bg-surface-2 p-6 md:p-8 space-y-6">
          <h2 className="text-xl font-bold font-display text-fg">Supply USDG Liquidity</h2>

          <div className="space-y-5">
            <div className="p-5 rounded-2xl border border-line bg-surface space-y-1">
              <span className="text-xs text-mist font-mono uppercase">Your Available Balance</span>
              <div className="text-2xl font-bold text-fg font-mono">
                {address
                  ? `${usdgBalanceNum.toLocaleString(undefined, { maximumFractionDigits: 2 })} USDG`
                  : "— USDG"}
              </div>
            </div>

            <div>
              <div className="flex items-center justify-between mb-2">
                <label className="block text-xs font-mono text-mist uppercase">Deposit Amount</label>
                <button
                  type="button"
                  onClick={() => setDepositAmount(String(usdgBalanceNum))}
                  disabled={!address || usdgBalanceNum <= 0}
                  className="text-xs font-mono text-spring hover:text-spring/80 disabled:opacity-40 transition-colors"
                >
                  MAX
                </button>
              </div>
              <input
                type="number"
                value={depositAmount}
                onChange={(e) => setDepositAmount(e.target.value)}
                placeholder="1,000"
                className="w-full bg-surface border border-line rounded-2xl p-4 text-fg text-sm focus:border-spring outline-none font-mono transition-colors"
              />
            </div>

            <button
              onClick={needsApproval ? handleApprove : handleDeposit}
              disabled={isPending || isConfirming || !depositAmount || !address}
              className={`w-full py-4 rounded-full font-semibold transition-all duration-200 text-sm shadow-lg text-black
                ${isConfirmed && !needsApproval ? "bg-mint" : (isPending || isConfirming) ? "bg-surface-3 text-mist cursor-wait" : "bg-spring hover:bg-spring/90 shadow-spring/20"}`}
            >
              {isConfirming ? "Confirming tx..." :
               isPending ? "Sign in wallet..." :
               needsApproval ? "Approve USDG" :
               isConfirmed ? "Liquidity Supplied!" : "Deposit to Morpho Earn Vault"}
            </button>

            {needsApproval && depositAmount && (
              <p className="text-center text-xs text-mist font-mono">
                One-time approval, then press again to deposit.
              </p>
            )}

            {hash && (
              <a
                href={explorerTx(hash)}
                target="_blank"
                rel="noreferrer"
                className="block text-center text-xs text-spring underline font-mono break-all"
              >
                Tx: {hash.slice(0, 10)}…{hash.slice(-8)}
              </a>
            )}
          </div>
        </div>

        {/* Right Column: Real deployed escrows this liquidity funds */}
        <div className="lg:col-span-7 rounded-3xl neu neu-raise border border-line bg-surface-2 p-6 md:p-8 space-y-6">
          <div>
            <h2 className="text-xl font-bold font-display text-fg">Funded Escrows</h2>
            <p className="text-xs text-mist mt-0.5">Live escrow projects backed by the vault&rsquo;s liquidity.</p>
          </div>

          <div className="space-y-4">
            {projectsLoading && (
              <div className="p-5 rounded-2xl border border-line bg-surface text-sm text-mist font-mono">
                Loading escrows…
              </div>
            )}

            {!projectsLoading && allProjects.length === 0 && (
              <div className="p-5 rounded-2xl border border-line bg-surface text-sm text-mist">
                No escrows deployed yet. Once clients create projects, they appear here.
              </div>
            )}

            {allProjects.map((p) => (
              <div
                key={p.address}
                className="p-5 rounded-2xl border border-line bg-surface flex items-center justify-between gap-4"
              >
                <div className="space-y-1 min-w-0">
                  <div className="font-bold text-fg text-base">Escrow #{p.index + 1}</div>
                  <a
                    href={explorerAddr(p.address)}
                    target="_blank"
                    rel="noreferrer"
                    className="text-xs text-mist font-mono hover:text-spring transition-colors break-all"
                  >
                    {p.address.slice(0, 10)}…{p.address.slice(-8)}
                  </a>
                </div>
                <div className="text-right shrink-0">
                  <div className="text-lg font-bold text-spring font-mono">
                    {Number(formatUnits(p.totalAmount, 18)).toLocaleString()} USDG
                  </div>
                  <div className="text-xs text-mist font-mono">Total escrowed</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* How your liquidity earns — mechanism overview (descriptive, no figures) */}
      <div className="rounded-3xl neu neu-raise border border-line bg-surface-2 p-6 md:p-8">
        <h2 className="text-xl font-bold font-display text-fg mb-6">How your liquidity earns</h2>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {[
            { n: "01", t: "Supply USDG", d: "Deposit into the Morpho vault and start earning from vault activity." },
            { n: "02", t: "Fund advances", d: "Idle liquidity fronts payouts on AI-verified milestones." },
            { n: "03", t: "Repaid + yield", d: "Clients settle, returning principal plus yield to the vault." },
          ].map((s) => (
            <div key={s.n} className="p-5 rounded-2xl border border-line bg-surface space-y-3">
              <span className="size-8 rounded-full bg-spring/10 border border-spring/30 text-spring font-mono text-xs font-bold flex items-center justify-center">
                {s.n}
              </span>
              <h4 className="font-bold text-fg text-base">{s.t}</h4>
              <p className="text-xs text-mist leading-relaxed">{s.d}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
