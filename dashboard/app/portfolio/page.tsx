"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { SiteHeader } from "@/components/site-header";
import { SiteFooter } from "@/components/cta-footer";
import { Skeleton } from "@/components/ui/skeleton";
import {
  useAccount,
  useBalance,
  useEnsName,
  useReadContract,
  useSendTransaction,
  useWaitForTransactionReceipt,
} from "wagmi";
import { useModal } from "connectkit";
import { cn } from "@/lib/cn";
import { formatUnits, parseEther, isAddress } from "viem";
import { ERC20_ABI } from "@/lib/pow-abis";
import { POW_CONFIG } from "@/lib/pow-config";
import { AGGREGATOR_V3_ABI } from "@/lib/onchain";
import { explorerTx, robinhoodChain } from "@/lib/robinhood-chain";

const TABS = ["Overview", "Tokens", "NFTs", "Activity"] as const;
type Tab = (typeof TABS)[number];

export default function PortfolioPage() {
  const { address, isConnected } = useAccount();
  const { data: balance } = useBalance({ address, chainId: robinhoodChain.id });
  const { data: ensName } = useEnsName({ address });
  const { setOpen } = useModal();

  const [activeTab, setActiveTab] = useState<Tab>("Overview");
  const [modal, setModal] = useState<null | "send" | "receive">(null);

  // Live ETH price + 24h change (CoinGecko, public/no-key).
  // 0 until the live price resolves — never a fabricated default.
  const [ethPrice, setEthPrice] = useState(0);
  const [ethChange, setEthChange] = useState(0);
  useEffect(() => {
    let alive = true;
    async function load() {
      try {
        const res = await fetch(
          "https://api.coingecko.com/api/v3/simple/price?ids=ethereum&vs_currencies=usd&include_24hr_change=true",
        );
        const d = await res.json();
        if (alive && d?.ethereum?.usd) {
          setEthPrice(d.ethereum.usd);
          setEthChange(d.ethereum.usd_24h_change ?? 0);
        }
      } catch (err) {
        console.error("ETH price fetch failed:", err);
      }
    }
    load();
    const t = setInterval(load, 30000);
    return () => { alive = false; clearInterval(t); };
  }, []);

  const { data: usdgBalance } = useReadContract({
    address: POW_CONFIG.mockUSDGAddress,
    abi: ERC20_ABI,
    functionName: "balanceOf",
    args: address ? [address] : undefined,
    chainId: robinhoodChain.id,
    query: { enabled: !!address }
  });

  const { data: aaplBalance } = useReadContract({
    address: POW_CONFIG.mockAAPLAddress,
    abi: ERC20_ABI,
    functionName: "balanceOf",
    args: address ? [address] : undefined,
    chainId: robinhoodChain.id,
    query: { enabled: !!address }
  });

  // Live AAPL stock-token price from the Chainlink feed (Robinhood Chain has a
  // real per-token, multiplier-adjusted feed). No hardcoded price.
  const { data: aaplRound } = useReadContract({
    address: POW_CONFIG.mockOracleAddress,
    abi: AGGREGATOR_V3_ABI,
    functionName: "latestRoundData",
    chainId: robinhoodChain.id,
  });
  const { data: aaplFeedDecimals } = useReadContract({
    address: POW_CONFIG.mockOracleAddress,
    abi: AGGREGATOR_V3_ABI,
    functionName: "decimals",
    chainId: robinhoodChain.id,
  });

  // Token amounts held.
  const usdgAmt = usdgBalance ? Number(formatUnits(usdgBalance, 18)) : 0;
  const aaplAmt = aaplBalance ? Number(formatUnits(aaplBalance, 18)) : 0;
  const ethAmt = balance ? Number(formatUnits(balance.value, balance.decimals)) : 0;
  const AAPL_PRICE =
    aaplRound && aaplFeedDecimals !== undefined
      ? Number(aaplRound[1]) / 10 ** Number(aaplFeedDecimals)
      : 0;

  const ethValue = ethAmt * ethPrice;
  const totalValueNum = usdgAmt + aaplAmt * AAPL_PRICE + ethValue;
  const totalValueStr = totalValueNum.toFixed(2);

  // Real portfolio allocation — proportions of what's actually held.
  const allocation = [
    { symbol: "USDG", value: usdgAmt, color: "#2775CA" },
    { symbol: "AAPL", value: aaplAmt * AAPL_PRICE, color: "#CDFF71" },
    { symbol: "ETH", value: ethValue, color: "#627EEA" },
  ].filter((a) => a.value > 0);

  // Donut geometry: cumulative arc segments around one circle.
  const DONUT_R = 54;
  const DONUT_C = 2 * Math.PI * DONUT_R;
  let _accFrac = 0;
  const donut = allocation.map((a) => {
    const frac = totalValueNum > 0 ? a.value / totalValueNum : 0;
    const seg = { ...a, frac, dash: frac * DONUT_C, offset: -_accFrac * DONUT_C };
    _accFrac += frac;
    return seg;
  });

  // Today's move is driven by ETH (the only volatile, market-priced holding).
  const ethPrev = ethValue / (1 + ethChange / 100);
  const todayDelta = ethValue - ethPrev;
  const todayPct = totalValueNum - todayDelta > 0 ? (todayDelta / (totalValueNum - todayDelta)) * 100 : 0;
  const todayPos = todayDelta >= 0;

  const realTokens = [
    {
      name: "USDG Stablecoin",
      symbol: "USDG",
      balance: usdgAmt.toFixed(2),
      value: `$${usdgAmt.toFixed(2)}`,
      change: "+0.00%",
      isPos: true,
      color: "#2775CA"
    },
    {
      name: "Tokenized Apple Stock",
      symbol: "AAPL",
      balance: aaplAmt.toFixed(2),
      value: `$${(aaplAmt * AAPL_PRICE).toFixed(2)}`,
      change: "+0.00%",
      isPos: true,
      color: "#CDFF71"
    },
    {
      name: "Ethereum",
      symbol: "ETH",
      balance: ethAmt.toFixed(4),
      value: `$${ethValue.toFixed(2)}`,
      change: `${ethChange >= 0 ? "+" : ""}${ethChange.toFixed(2)}%`,
      isPos: ethChange >= 0,
      color: "#627EEA"
    }
  ];

  const TokensList = (
    <div className="space-y-2">
      {realTokens.map((token, i) => (
        <div key={i} className="flex items-center justify-between p-4 bg-surface-2 rounded-2xl hover:bg-surface-3 transition-colors">
          <div className="flex items-center gap-4">
            <div className="w-10 h-10 rounded-full flex items-center justify-center text-fg font-medium" style={{ backgroundColor: token.color }}>
              {token.symbol.charAt(0)}
            </div>
            <div>
              <div className="text-fg font-medium">{token.name}</div>
              <div className="text-mist text-sm">{token.balance} {token.symbol}</div>
            </div>
          </div>
          <div className="text-right">
            <div className="text-fg font-medium">{token.value}</div>
            <div className={cn("text-sm", token.isPos ? "text-lime" : "text-danger")}>
              {token.change}
            </div>
          </div>
        </div>
      ))}
    </div>
  );

  return (
    <>
      <SiteHeader />

      <main className="flex-1 flex flex-col w-full relative pt-12 pb-24 overflow-x-hidden min-h-screen">
        <div className="max-w-5xl mx-auto w-full px-4 sm:px-6">

          {!isConnected ? (
            // DISCONNECTED STATE (Uniswap-style banner)
            <div className="mt-10 rounded-[40px] overflow-hidden relative min-h-[300px] flex flex-col items-center justify-center p-8 border border-line bg-surface-2 group">
              {/* Decorative background pattern matching Uniswap's aesthetic but HALON colored */}
              <div className="absolute inset-0 opacity-10 pointer-events-none" style={{ backgroundImage: 'radial-gradient(#CDFF71 1px, transparent 1px)', backgroundSize: '24px 24px' }}></div>

              {/* Decorative floating shapes */}
              <div className="absolute top-10 left-10 text-lime/20 rotate-12">
                <svg width="60" height="60" viewBox="0 0 24 24" fill="currentColor"><path d="M12 2L22 20H2L12 2Z" /></svg>
              </div>
              <div className="absolute bottom-10 right-20 text-lime/20 -rotate-12">
                <svg width="80" height="80" viewBox="0 0 24 24" fill="currentColor"><rect x="4" y="4" width="16" height="16" rx="4" /></svg>
              </div>

              <h2 className="text-2xl md:text-3xl font-medium text-fg mb-6 relative z-10 text-center">
                Connect a wallet to view your portfolio
              </h2>

              <button
                onClick={() => setOpen(true)}
                className="relative z-10 bg-lime text-ink font-semibold py-3 px-8 rounded-full text-lg hover:bg-lime/90 transition-all active:scale-95 shadow-[0_0_30px_rgba(205,255,113,0.3)]"
              >
                Connect
              </button>
            </div>
          ) : (
            // AUTHENTICATED STATE
            <div className="mt-4">

              {/* Header: Wallet ID and Network selector */}
              <div className="flex flex-col md:flex-row md:items-center justify-between mb-8 gap-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-gradient-to-tr from-lime to-emerald-400 flex items-center justify-center border-2 border-surface">
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-ink"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path><circle cx="12" cy="7" r="4"></circle></svg>
                  </div>
                  <h1 className="text-2xl font-medium text-fg">
                    {ensName || (address ? `${address.slice(0, 6)}...${address.slice(-4)}` : "Demo wallet")}
                  </h1>
                </div>

                <div className="flex items-center gap-3">
                  <button
                    onClick={() => setOpen(true)}
                    className="flex items-center gap-2 bg-surface-2 border border-line rounded-full px-4 py-2 hover:bg-surface-3 transition-colors text-sm font-medium text-fg"
                  >
                    <div className="flex -space-x-1">
                      <div className="w-4 h-4 rounded-full bg-blue-500"></div>
                      <div className="w-4 h-4 rounded-full bg-red-500"></div>
                      <div className="w-4 h-4 rounded-full bg-green-500"></div>
                    </div>
                    All networks
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M6 9l6 6 6-6"/></svg>
                  </button>
                </div>
              </div>

              {/* Tabs */}
              <div className="flex gap-6 border-b border-line mb-8 text-lg">
                {TABS.map((tab) => (
                  <button
                    key={tab}
                    onClick={() => setActiveTab(tab)}
                    className={cn(
                      "font-medium pb-2 transition-colors",
                      activeTab === tab
                        ? "text-fg border-b-2 border-white"
                        : "text-mist hover:text-fg",
                    )}
                  >
                    {tab}
                  </button>
                ))}
              </div>

              {activeTab === "NFTs" || activeTab === "Activity" ? (
                <div className="border border-dashed border-line rounded-2xl py-20 text-center text-mist bg-surface-2/40">
                  <div className="text-sm font-medium text-fg mb-1">No {activeTab.toLowerCase()} to show</div>
                  <div className="text-xs">Your {activeTab.toLowerCase()} will appear here once indexed on-chain.</div>
                </div>
              ) : activeTab === "Tokens" ? (
                <div className="max-w-2xl">{TokensList}</div>
              ) : (
              // Main Dashboard Layout (Overview)
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">

                {/* Left Column: Balance & Chart */}
                <div className="md:col-span-2 space-y-6">
                  <div>
                    {balance === undefined ? (
                      <>
                        <Skeleton className="mb-2 h-12 w-48 sm:h-14" />
                        <Skeleton className="h-5 w-32" />
                      </>
                    ) : (
                      <>
                        <h2 className="text-4xl sm:text-5xl font-display text-fg mb-2 break-words">
                          ${totalValueStr}
                        </h2>
                        <div className={cn("flex items-center gap-2 font-medium", todayPos ? "text-lime" : "text-danger")}>
                          {todayPos ? "▲" : "▼"} ${Math.abs(todayDelta).toFixed(2)} ({Math.abs(todayPct).toFixed(2)}%) today
                        </div>
                      </>
                    )}
                  </div>

                  {/* Allocation — a donut of real holdings (no fabricated price chart). */}
                  <div className="rounded-3xl border border-line bg-surface-2 p-5 sm:p-6">
                    <div className="mb-5 flex items-center justify-between">
                      <h3 className="font-mono text-xs uppercase tracking-wider text-mist">Allocation</h3>
                      <span className="text-xs text-mist">
                        {allocation.length} asset{allocation.length === 1 ? "" : "s"}
                      </span>
                    </div>

                    {allocation.length > 0 ? (
                      <div className="flex flex-col items-center gap-6 sm:flex-row sm:gap-8">
                        {/* Donut */}
                        <div className="relative size-[150px] shrink-0">
                          <svg viewBox="0 0 140 140" className="size-[150px] -rotate-90">
                            <circle
                              cx="70"
                              cy="70"
                              r={DONUT_R}
                              fill="none"
                              strokeWidth="16"
                              stroke="rgba(255,255,255,0.06)"
                            />
                            {donut.map((seg) => (
                              <circle
                                key={seg.symbol}
                                cx="70"
                                cy="70"
                                r={DONUT_R}
                                fill="none"
                                strokeWidth="16"
                                stroke={seg.color}
                                strokeDasharray={`${seg.dash} ${DONUT_C}`}
                                strokeDashoffset={seg.offset}
                              />
                            ))}
                          </svg>
                          <div className="absolute inset-0 flex flex-col items-center justify-center">
                            <span className="font-mono text-[0.625rem] uppercase tracking-wider text-mist">
                              Total
                            </span>
                            <span className="font-display text-lg tabular-nums text-fg">
                              ${totalValueStr}
                            </span>
                          </div>
                        </div>

                        {/* Legend */}
                        <div className="w-full flex-1 space-y-3">
                          {donut.map((seg) => (
                            <div key={seg.symbol} className="flex items-center justify-between gap-3">
                              <div className="flex min-w-0 items-center gap-2.5">
                                <span
                                  className="size-2.5 shrink-0 rounded-full"
                                  style={{ backgroundColor: seg.color }}
                                />
                                <span className="font-medium text-fg">{seg.symbol}</span>
                              </div>
                              <div className="flex items-center gap-3 text-sm">
                                <span className="tabular-nums text-mist">{(seg.frac * 100).toFixed(1)}%</span>
                                <span className="tabular-nums text-fg">
                                  ${seg.value.toLocaleString(undefined, { maximumFractionDigits: 2 })}
                                </span>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    ) : (
                      <p className="text-sm text-mist">
                        No assets held yet — receive tokens to see your allocation.
                      </p>
                    )}
                  </div>

                  {/* Tokens List */}
                  <div className="mt-8">
                    <h3 className="text-xl font-medium text-fg mb-4">Tokens</h3>
                    {TokensList}
                  </div>
                </div>

                {/* Right Column: Actions */}
                <div className="md:col-span-1">
                  <div className="grid grid-cols-2 gap-4">
                    <button
                      onClick={() => setModal("send")}
                      className="bg-surface-2 border border-line rounded-3xl p-6 flex flex-col items-center justify-center gap-3 hover:border-lime/40 hover:bg-surface-3 transition-colors group"
                    >
                      <div className="w-12 h-12 rounded-full bg-ink flex items-center justify-center text-lime group-hover:scale-110 transition-transform">
                        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M22 2L11 13M22 2l-7 20-4-9-9-4 20-7z"/></svg>
                      </div>
                      <span className="text-fg font-medium text-lg">Send</span>
                    </button>

                    <button
                      onClick={() => setModal("receive")}
                      className="bg-surface-2 border border-line rounded-3xl p-6 flex flex-col items-center justify-center gap-3 hover:border-lime/40 hover:bg-surface-3 transition-colors group"
                    >
                      <div className="w-12 h-12 rounded-full bg-ink flex items-center justify-center text-lime group-hover:scale-110 transition-transform">
                        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M20 12v6a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2v-6M12 4v12M8 12l4 4 4-4"/></svg>
                      </div>
                      <span className="text-fg font-medium text-lg">Receive</span>
                    </button>
                  </div>

                  {/* Promo Box */}
                  <div className="mt-6 panel p-6 rounded-3xl border border-lime/30 bg-lime/5">
                    <h3 className="text-lime font-medium mb-2">Protect your entire portfolio</h3>
                    <p className="text-mist text-sm mb-4">HALON can auto-execute SL/TP orders across all your L2 positions securely on-chain.</p>
                    <Link
                      href="/earn"
                      className="block w-full py-2 bg-lime text-ink font-medium rounded-xl hover:bg-lime/90 transition-colors text-center"
                    >
                      Learn more
                    </Link>
                  </div>
                </div>

              </div>
              )}

            </div>
          )}

        </div>
      </main>

      {modal && (
        <WalletModal
          mode={modal}
          address={address}
          onClose={() => setModal(null)}
        />
      )}

      <SiteFooter />
    </>
  );
}

/* ── Send / Receive modal ──────────────────────────────────────── */

function WalletModal({
  mode,
  address,
  onClose,
}: {
  mode: "send" | "receive";
  address?: `0x${string}`;
  onClose: () => void;
}) {
  const [to, setTo] = useState("");
  const [amount, setAmount] = useState("");
  const [copied, setCopied] = useState(false);

  const { data: hash, sendTransaction, isPending, error } = useSendTransaction();
  const { isLoading: isConfirming, isSuccess: isConfirmed } = useWaitForTransactionReceipt({ hash });

  const validTo = isAddress(to);
  const validAmount = Number(amount) > 0;

  const handleSend = () => {
    if (!validTo || !validAmount) return;
    sendTransaction({ to: to as `0x${string}`, value: parseEther(amount) });
  };

  const copyAddress = async () => {
    if (!address) return;
    try {
      await navigator.clipboard.writeText(address);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      /* clipboard unavailable */
    }
  };

  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center bg-black/70 backdrop-blur-sm p-4"
      onClick={onClose}
    >
      <div
        className="w-full max-w-md rounded-3xl border border-line bg-surface-2 p-6 shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl font-medium text-fg">{mode === "send" ? "Send ETH" : "Receive"}</h2>
          <button onClick={onClose} className="text-mist hover:text-fg transition-colors" aria-label="Close">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M18 6L6 18M6 6l12 12"/></svg>
          </button>
        </div>

        {mode === "receive" ? (
          <div className="space-y-4">
            <p className="text-sm text-mist">Your wallet address on {" "}
              <span className="text-fg">Base</span>. Share it to receive tokens.
            </p>
            <div className="flex items-center gap-2 rounded-2xl border border-line bg-surface p-4">
              <span className="font-mono text-sm text-fg break-all">{address}</span>
            </div>
            <button
              onClick={copyAddress}
              className="w-full py-3 rounded-full font-semibold bg-lime text-ink hover:bg-lime/90 transition-colors"
            >
              {copied ? "✓ Copied" : "Copy address"}
            </button>
          </div>
        ) : (
          <div className="space-y-4">
            <div>
              <label className="block text-xs font-mono text-mist uppercase mb-2">Recipient address</label>
              <input
                value={to}
                onChange={(e) => setTo(e.target.value)}
                placeholder="0x…"
                className="w-full bg-surface border border-line rounded-2xl p-4 text-fg text-sm font-mono outline-none focus:border-lime transition-colors"
              />
              {to && !validTo && <p className="mt-1 text-xs text-danger">Not a valid address.</p>}
            </div>
            <div>
              <label className="block text-xs font-mono text-mist uppercase mb-2">Amount (ETH)</label>
              <input
                type="number"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                placeholder="0.0"
                className="w-full bg-surface border border-line rounded-2xl p-4 text-fg text-sm font-mono outline-none focus:border-lime transition-colors"
              />
            </div>

            <button
              onClick={handleSend}
              disabled={!validTo || !validAmount || isPending || isConfirming}
              className="w-full py-3 rounded-full font-semibold bg-lime text-ink hover:bg-lime/90 disabled:opacity-40 transition-colors"
            >
              {isConfirming ? "Confirming…" : isPending ? "Confirm in wallet…" : "Send"}
            </button>

            {error && <p className="text-xs text-danger break-words">{error.message.split("\n")[0]}</p>}
            {hash && (
              <a
                href={explorerTx(hash)}
                target="_blank"
                rel="noreferrer"
                className="block text-center text-xs text-lime underline font-mono break-all"
              >
                Tx: {hash.slice(0, 10)}…{hash.slice(-8)}
              </a>
            )}
            {isConfirmed && <p className="text-center text-xs text-lime font-semibold">✓ Sent successfully</p>}
          </div>
        )}
      </div>
    </div>
  );
}
