"use client";

import { Suspense, useEffect, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import { SiteHeader } from "@/components/site-header";
import { SiteFooter } from "@/components/cta-footer";
import { useProtocolStats } from "@/components/use-protocol-stats";
import { cn } from "@/lib/cn";
import { usdCompact } from "@/lib/format";

/* ── live data sources (public, no key, CORS-open) ─────────────────
 * Tokens:  CoinGecko  /coins/markets  → price, FDV, 24h vol, 1h/24h %, sparkline
 * Chains:  DefiLlama  /v2/chains      → Base + OP TVL
 * HALON TVL: PolicyPool contract via useProtocolStats (fixture until deployed)
 * ------------------------------------------------------------------ */

const CG_MARKETS =
  "https://api.coingecko.com/api/v3/coins/markets?vs_currency=usd" +
  "&ids=ethereum,wrapped-bitcoin,solana,usd-coin,tether,chainlink,uniswap,aave" +
  "&order=market_cap_desc&price_change_percentage=1h,24h&sparkline=true";
const LLAMA_CHAINS = "https://api.llama.fi/v2/chains";

const SYMBOL_COLORS: Record<string, string> = {
  ETH: "#627EEA", WBTC: "#F7931A", SOL: "#14F195", USDC: "#2775CA",
  USDT: "#26A17B", LINK: "#2A5ADA", UNI: "#FF007A", AAVE: "#B6509E",
};

type Token = {
  rank: number; name: string; symbol: string; price: number;
  fdv: number | null; vol: number; ch1h: number; ch24h: number;
  spark: number[]; color: string; cgSlug: string;
};

// Seed shown instantly on first paint / if a fetch fails — replaced by live data.
const SEED_TOKENS: Token[] = [
  { rank: 1, name: "Ethereum", symbol: "ETH", price: 3422.69, fdv: 224e9, vol: 1.3e9, ch1h: 0.81, ch24h: -0.05, spark: [], color: "#627EEA", cgSlug: "ethereum" },
  { rank: 2, name: "Wrapped BTC", symbol: "WBTC", price: 64210, fdv: 9.8e9, vol: 320e6, ch1h: -0.12, ch24h: 1.4, spark: [], color: "#F7931A", cgSlug: "wrapped-bitcoin" },
  { rank: 3, name: "Solana", symbol: "SOL", price: 145.2, fdv: 68.2e9, vol: 850e6, ch1h: 1.2, ch24h: 4.5, spark: [], color: "#14F195", cgSlug: "solana" },
  { rank: 4, name: "USD Coin", symbol: "USDC", price: 1, fdv: 32.4e9, vol: 900e6, ch1h: 0, ch24h: 0, spark: [], color: "#2775CA", cgSlug: "usd-coin" },
  { rank: 5, name: "Tether USD", symbol: "USDT", price: 1, fdv: 189.6e9, vol: 1.1e9, ch1h: 0, ch24h: 0.01, spark: [], color: "#26A17B", cgSlug: "tether" },
];

/* ── formatting ────────────────────────────────────────────────── */

function compactUsd(n: number | null | undefined): string {
  if (n == null || !Number.isFinite(n)) return "—";
  const a = Math.abs(n);
  if (a >= 1e12) return `$${(n / 1e12).toFixed(2)}T`;
  if (a >= 1e9) return `$${(n / 1e9).toFixed(1)}B`;
  if (a >= 1e6) return `$${(n / 1e6).toFixed(1)}M`;
  if (a >= 1e3) return `$${(n / 1e3).toFixed(1)}K`;
  return `$${n.toFixed(2)}`;
}

function priceUsd(n: number): string {
  return `$${n.toLocaleString("en-US", {
    minimumFractionDigits: 2,
    maximumFractionDigits: n < 1 ? 4 : 2,
  })}`;
}

/* ── sparkline from a real price series ────────────────────────── */

function Sparkline({ prices, positive, seed }: { prices: number[]; positive: boolean; seed?: boolean }) {
  const w = 40, h = 25;
  if (seed || !prices || prices.length < 2) {
    // Fallback squiggle before live data arrives.
    const d = positive ? "M 0 20 Q 10 18 20 10 T 40 5" : "M 0 5 Q 10 8 20 15 T 40 20";
    return (
      <svg width="60" height="25" viewBox="0 0 40 25" className="overflow-visible">
        <path d={d} fill="none" stroke={positive ? "#CDFF71" : "#FF4A4A"} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" opacity="0.5" />
      </svg>
    );
  }
  const min = Math.min(...prices), max = Math.max(...prices), range = max - min || 1;
  const pt = (p: number, i: number): [number, number] => [
    (i / (prices.length - 1)) * w,
    h - 2 - ((p - min) / range) * (h - 4),
  ];
  const pts = prices.map(pt);
  const line = pts.map(([x, y], i) => `${i ? "L" : "M"}${x.toFixed(2)},${y.toFixed(2)}`).join("");
  const area = `${line}L${w},${h}L0,${h}Z`;
  const color = positive ? "#CDFF71" : "#FF4A4A";
  const gid = `spk-${color}-${prices.length}-${Math.round(prices[0])}`;
  return (
    <svg width="60" height="25" viewBox="0 0 40 25" className="overflow-visible">
      <defs>
        <linearGradient id={gid} x1="0" x2="0" y1="0" y2="1">
          <stop offset="0%" stopColor={color} stopOpacity="0.25" />
          <stop offset="100%" stopColor={color} stopOpacity="0" />
        </linearGradient>
      </defs>
      <path d={area} fill={`url(#${gid})`} />
      <path d={line} fill="none" stroke={color} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function EmptyPanel({ label }: { label: string }) {
  return (
    <div className="border border-dashed border-line rounded-2xl py-16 text-center text-mist bg-surface-2/40">
      <div className="text-sm font-medium text-white mb-1">No live {label} yet</div>
      <div className="text-xs">This feed connects to on-chain data once the indexer is deployed.</div>
    </div>
  );
}

function ExploreContent() {
  const params = useSearchParams();
  const query = (params.get("q") || "").trim().toLowerCase();

  const { stats: protocol } = useProtocolStats();

  const [tokens, setTokens] = useState<Token[]>(SEED_TOKENS);
  const [live, setLive] = useState(false);
  const [chains, setChains] = useState<{ base: number | null; op: number | null }>({ base: null, op: null });

  useEffect(() => {
    let alive = true;

    async function load() {
      // Tokens (CoinGecko)
      try {
        const res = await fetch(CG_MARKETS);
        const data = await res.json();
        if (alive && Array.isArray(data) && data.length) {
          setTokens(
            data.map((c: any, i: number): Token => {
              const symbol = String(c.symbol).toUpperCase();
              return {
                rank: i + 1,
                name: c.name,
                symbol,
                price: c.current_price ?? 0,
                fdv: c.fully_diluted_valuation ?? c.market_cap ?? null,
                vol: c.total_volume ?? 0,
                ch1h: c.price_change_percentage_1h_in_currency ?? 0,
                ch24h: c.price_change_percentage_24h_in_currency ?? 0,
                spark: (c.sparkline_in_7d?.price ?? []).slice(-24),
                color: SYMBOL_COLORS[symbol] ?? "#7A7A7A",
                cgSlug: c.id,
              };
            }),
          );
          setLive(true);
        }
      } catch (err) {
        console.error("CoinGecko markets failed:", err);
      }

      // Chain TVL (DefiLlama)
      try {
        const res = await fetch(LLAMA_CHAINS);
        const arr = await res.json();
        if (alive && Array.isArray(arr)) {
          const find = (n: string) => arr.find((x: any) => x.name === n)?.tvl ?? null;
          setChains({ base: find("Base"), op: find("OP Mainnet") });
        }
      } catch (err) {
        console.error("DefiLlama chains failed:", err);
      }
    }

    load();
    const interval = setInterval(load, 30000);
    return () => {
      alive = false;
      clearInterval(interval);
    };
  }, []);

  const totalVol = useMemo(() => tokens.reduce((s, t) => s + (t.vol || 0), 0), [tokens]);

  const visibleTokens = useMemo(() => {
    if (!query) return tokens;
    return tokens.filter(
      (t) => t.name.toLowerCase().includes(query) || t.symbol.toLowerCase().includes(query),
    );
  }, [tokens, query]);

  // Top movers, derived live from the feed — biggest gainer, loser, most volume.
  const movers = useMemo(() => {
    const withData = tokens.filter((t) => Number.isFinite(t.ch24h));
    if (withData.length === 0) return [];
    const byChange = [...withData].sort((a, b) => b.ch24h - a.ch24h);
    const byVol = [...withData].sort((a, b) => b.vol - a.vol);
    return [
      { tag: "Top gainer · 24h", token: byChange[0] },
      { tag: "Top loser · 24h", token: byChange[byChange.length - 1] },
      { tag: "Most volume", token: byVol[0] },
    ];
  }, [tokens]);

  return (
    <>
      <SiteHeader />

      <main className="flex-1 flex flex-col w-full relative pt-12 pb-24 overflow-x-hidden min-h-screen">
        <div className="max-w-6xl mx-auto w-full px-4 sm:px-6">

          {/* Live indicator — a whisper, not a button. */}
          <div className="flex items-center justify-end gap-1.5 mb-3">
            <span
              className={cn("size-1.5 rounded-full", live ? "bg-lime" : "bg-mist")}
              title={live ? "CoinGecko + DefiLlama live feeds" : "Loading live market data…"}
            />
            <span className="font-mono text-[0.625rem] uppercase tracking-[0.16em] text-mist-dim">
              {live ? "Live" : "Loading"}
            </span>
          </div>

          {/* TOP STATS ROW */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 mb-10">
            {[
              { label: "Tracked 24h volume", value: compactUsd(totalVol), sub: `across ${tokens.length} assets`, accent: "#CDFF71" },
              { label: "HALON TVL", value: usdCompact(protocol.tvlUsd), sub: "PolicyPool reserves", accent: "#61E7C3" },
              { label: "Base TVL", value: compactUsd(chains.base), sub: "DefiLlama", accent: "#627EEA" },
              { label: "OP TVL", value: compactUsd(chains.op), sub: "DefiLlama", accent: "#FF0420" },
            ].map((s) => (
              <div
                key={s.label}
                className="panel relative overflow-hidden rounded-2xl border border-line bg-surface-2 p-4 sm:p-5"
              >
                <span className="absolute inset-x-0 top-0 h-0.5" style={{ backgroundColor: s.accent }} />
                <div className="mb-2 text-xs font-medium text-mist sm:text-sm">{s.label}</div>
                <div className="font-display text-2xl tabular-nums text-white sm:text-3xl">{s.value}</div>
                <div className="mt-1 text-xs text-mist">{s.sub}</div>
              </div>
            ))}
          </div>

          {/* TOP MOVERS — derived live from the token feed, no hardcoded prices. */}
          {movers.length > 0 && (
            <div className="mb-12">
              <h2 className="text-2xl font-medium text-white mb-6">Top movers</h2>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {movers.map((m) => {
                  const t = m.token;
                  const pos = t.ch24h >= 0;
                  return (
                    <button
                      key={m.tag}
                      onClick={() =>
                        window.open(`https://www.coingecko.com/en/coins/${t.cgSlug}`, "_blank", "noopener")
                      }
                      className="panel p-5 rounded-2xl bg-surface-2 hover:bg-surface-3 transition-colors border border-line text-left"
                    >
                      <div className="flex items-center justify-between mb-4">
                        <span className="text-xs font-mono uppercase tracking-wider text-mist">{m.tag}</span>
                        <Sparkline prices={t.spark} positive={pos} />
                      </div>
                      <div className="flex items-center gap-3">
                        <div
                          className="w-9 h-9 rounded-full flex items-center justify-center text-white font-medium text-xs shrink-0"
                          style={{ backgroundColor: t.color }}
                        >
                          {t.symbol.charAt(0)}
                        </div>
                        <div className="min-w-0">
                          <div className="text-white font-medium truncate">{t.name}</div>
                          <div className="text-mist text-xs">{t.symbol}</div>
                        </div>
                      </div>
                      <div className="mt-4 flex items-center justify-between">
                        <span className="text-white font-medium">{priceUsd(t.price)}</span>
                        <span className={cn("text-sm", pos ? "text-lime" : "text-danger")}>
                          {pos ? "▲" : "▼"} {Math.abs(t.ch24h).toFixed(2)}%
                        </span>
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* TOKENS TABLE */}
          <div id="tokens-table">
            <div className="flex flex-wrap items-center justify-between gap-3 mb-8">
              <h2 className="text-2xl font-medium text-white">Tokens</h2>
              <span className="text-sm text-mist">
                {tokens.length} assets{live ? " · refreshes every 30s" : ""}
              </span>
            </div>

            {query && (
                  <div className="mb-4 text-sm text-mist">
                    Showing results for <span className="text-white font-medium">“{query}”</span>
                    {" · "}
                    {visibleTokens.length} match{visibleTokens.length === 1 ? "" : "es"}
                  </div>
                )}

                {visibleTokens.length === 0 ? (
                  <EmptyPanel label={`tokens matching “${query}”`} />
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse min-w-[800px]">
                      <thead>
                        <tr className="text-mist text-sm border-b border-line">
                          <th className="py-4 px-4 font-normal w-12">#</th>
                          <th className="py-4 px-4 font-normal">Token</th>
                          <th className="py-4 px-4 font-normal text-right">Price</th>
                          <th className="py-4 px-4 font-normal text-right">1H</th>
                          <th className="py-4 px-4 font-normal text-right">1D</th>
                          <th className="py-4 px-4 font-normal text-right">FDV</th>
                          <th className="py-4 px-4 font-normal text-right text-white">↓ Volume</th>
                          <th className="py-4 px-4 font-normal text-right w-32">1D chart</th>
                        </tr>
                      </thead>
                      <tbody>
                        {visibleTokens.map((token) => {
                          const pos1h = token.ch1h >= 0;
                          const pos1d = token.ch24h >= 0;
                          return (
                            <tr
                              key={token.cgSlug}
                              onClick={() => window.open(`https://www.coingecko.com/en/coins/${token.cgSlug}`, "_blank", "noopener")}
                              className="border-b border-line/50 hover:bg-white/[0.02] transition-colors group cursor-pointer"
                            >
                              <td className="py-5 px-4 text-mist">{token.rank}</td>
                              <td className="py-5 px-4">
                                <div className="flex items-center gap-3">
                                  <div
                                    className="w-8 h-8 rounded-full flex items-center justify-center text-white font-medium text-xs shrink-0"
                                    style={{ backgroundColor: token.color }}
                                  >
                                    {token.symbol.charAt(0)}
                                  </div>
                                  <div>
                                    <div className="text-white font-medium">{token.name}</div>
                                    <div className="text-mist text-xs">{token.symbol}</div>
                                  </div>
                                </div>
                              </td>
                              <td className="py-5 px-4 text-right text-white">{priceUsd(token.price)}</td>
                              <td className={cn("py-5 px-4 text-right", pos1h ? "text-lime" : "text-danger")}>
                                {pos1h ? "▲" : "▼"} {Math.abs(token.ch1h).toFixed(2)}%
                              </td>
                              <td className={cn("py-5 px-4 text-right", pos1d ? "text-lime" : "text-danger")}>
                                {pos1d ? "▲" : "▼"} {Math.abs(token.ch24h).toFixed(2)}%
                              </td>
                              <td className="py-5 px-4 text-right text-mist">{compactUsd(token.fdv)}</td>
                              <td className="py-5 px-4 text-right text-white font-medium">{compactUsd(token.vol)}</td>
                              <td className="py-5 px-4 text-right">
                                <div className="flex justify-end opacity-70 group-hover:opacity-100 transition-opacity">
                                  <Sparkline prices={token.spark} positive={pos1d} />
                                </div>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                )}
          </div>

        </div>
      </main>

      <SiteFooter />
    </>
  );
}

export default function ExplorePage() {
  return (
    <Suspense fallback={null}>
      <ExploreContent />
    </Suspense>
  );
}
