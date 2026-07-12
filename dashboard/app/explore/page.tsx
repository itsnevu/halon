"use client";

import { SiteHeader } from "@/components/site-header";
import { SiteFooter } from "@/components/cta-footer";
import { cn } from "@/lib/cn";

// Simulated Market Data
const TOP_TOKENS = [
  { rank: 1, name: "Ethereum", symbol: "ETH", price: "$3,422.69", change1H: "+0.81%", change1D: "-0.05%", fdv: "$224.0B", vol: "$1.3B", color: "#627EEA", isPos1h: true, isPos1d: false },
  { rank: 2, name: "Tether USD", symbol: "USDT", price: "$1.00", change1H: "0.00%", change1D: "+0.01%", fdv: "$189.6B", vol: "$1.1B", color: "#26A17B", isPos1h: true, isPos1d: true },
  { rank: 3, name: "USD Coin", symbol: "USDC", price: "$1.00", change1H: "0.00%", change1D: "0.00%", fdv: "$32.4B", vol: "$900M", color: "#2775CA", isPos1h: true, isPos1d: true },
  { rank: 4, name: "Solana", symbol: "SOL", price: "$145.20", change1H: "+1.20%", change1D: "+4.50%", fdv: "$68.2B", vol: "$850M", color: "#14F195", isPos1h: true, isPos1d: true },
  { rank: 5, name: "Wrapped BTC", symbol: "WBTC", price: "$64,210.00", change1H: "-0.12%", change1D: "+1.40%", fdv: "$9.8B", vol: "$320M", color: "#F7931A", isPos1h: false, isPos1d: true },
];

function MiniSparkline({ color, isPositive }: { color: string, isPositive: boolean }) {
  // Simple SVG mock of a price chart
  const pathData = isPositive 
    ? "M 0 20 Q 5 15, 10 18 T 20 10 T 30 12 T 40 5 L 40 20 L 0 20 Z" 
    : "M 0 5 Q 5 10, 10 8 T 20 15 T 30 12 T 40 20 L 40 20 L 0 20 Z";
    
  const strokePath = isPositive 
    ? "M 0 20 Q 5 15, 10 18 T 20 10 T 30 12 T 40 5" 
    : "M 0 5 Q 5 10, 10 8 T 20 15 T 30 12 T 40 20";

  return (
    <svg width="60" height="25" viewBox="0 0 40 25" className="overflow-visible">
      <defs>
        <linearGradient id={`grad-${color}`} x1="0" x2="0" y1="0" y2="1">
          <stop offset="0%" stopColor={isPositive ? "#CDFF71" : "#FF4A4A"} stopOpacity="0.2" />
          <stop offset="100%" stopColor={isPositive ? "#CDFF71" : "#FF4A4A"} stopOpacity="0" />
        </linearGradient>
      </defs>
      <path d={pathData} fill={`url(#grad-${color})`} />
      <path d={strokePath} fill="none" stroke={isPositive ? "#CDFF71" : "#FF4A4A"} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

export default function ExplorePage() {
  return (
    <>
      <SiteHeader />

      <main className="flex-1 flex flex-col w-full relative pt-12 pb-24 overflow-x-hidden min-h-screen">
        
        <div className="max-w-6xl mx-auto w-full px-4 sm:px-6">
          
          {/* TOP STATS ROW */}
          <div className="flex flex-wrap gap-10 md:gap-20 py-8 border-b border-line mb-8">
            <div>
              <div className="text-mist text-sm mb-2 font-medium">1D volume</div>
              <div className="text-3xl font-display text-white">$2.63B</div>
              <div className="text-xs text-danger mt-1 flex items-center gap-1">
                <span>▼</span> 10.28% today
              </div>
            </div>
            
            <div className="hidden sm:block w-px h-16 bg-line" />

            <div>
              <div className="text-mist text-sm mb-2 font-medium">Total HALON TVL</div>
              <div className="text-3xl font-display text-white">$2.36B</div>
              <div className="text-xs text-danger mt-1 flex items-center gap-1">
                <span>▼</span> 0.58% today
              </div>
            </div>

            <div className="hidden md:block w-px h-16 bg-line" />

            <div className="hidden md:block">
              <div className="text-mist text-sm mb-2 font-medium">Base TVL</div>
              <div className="text-2xl font-display text-white">$752.59M</div>
              <div className="text-xs text-lime mt-1 flex items-center gap-1">
                <span>▲</span> 1.42% today
              </div>
            </div>

            <div className="hidden lg:block w-px h-16 bg-line" />

            <div className="hidden lg:block">
              <div className="text-mist text-sm mb-2 font-medium">OP TVL</div>
              <div className="text-2xl font-display text-white">$1.05B</div>
              <div className="text-xs text-danger mt-1 flex items-center gap-1">
                <span>▼</span> 0.77% today
              </div>
            </div>
          </div>

          {/* STOCKS CARDS */}
          <div className="mb-12">
            <div className="flex justify-between items-end mb-6">
              <div className="flex items-center gap-3">
                <h2 className="text-2xl font-medium text-white">Stocks</h2>
                <span className="bg-lime/10 text-lime text-xs px-2 py-1 rounded font-medium border border-lime/20">New</span>
              </div>
              <button className="text-mist hover:text-white text-sm font-medium transition-colors">View all</button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {/* Card 1 */}
              <div className="panel p-5 rounded-2xl bg-surface-2 hover:bg-surface-3 transition-colors border border-line cursor-pointer">
                <div className="flex justify-between items-start mb-6">
                  <div className="w-10 h-10 rounded-full bg-ink flex items-center justify-center border border-line">
                    <span className="text-white font-serif">][</span>
                  </div>
                  <MiniSparkline color="green" isPositive={true} />
                </div>
                <div>
                  <div className="text-white font-medium mb-1">BOT <span className="text-mist text-sm font-normal">Backpack</span></div>
                  <div className="flex items-center gap-2">
                    <span className="text-white">$33.07</span>
                    <span className="text-lime text-xs">▲ 0.78%</span>
                  </div>
                </div>
              </div>

              {/* Card 2 */}
              <div className="panel p-5 rounded-2xl bg-surface-2 hover:bg-surface-3 transition-colors border border-line cursor-pointer">
                <div className="flex justify-between items-start mb-6">
                  <div className="w-10 h-10 rounded-full bg-ink flex items-center justify-center border border-line">
                    <span className="text-white font-serif italic text-lg">X</span>
                  </div>
                  <MiniSparkline color="red" isPositive={false} />
                </div>
                <div>
                  <div className="text-white font-medium mb-1">SpaceX <span className="text-mist text-sm font-normal">Bstocks</span></div>
                  <div className="flex items-center gap-2">
                    <span className="text-white">$145.69</span>
                    <span className="text-danger text-xs">▼ 0.16%</span>
                  </div>
                </div>
              </div>

              {/* Card 3 */}
              <div className="panel p-5 rounded-2xl bg-surface-2 hover:bg-surface-3 transition-colors border border-line cursor-pointer hidden md:block">
                <div className="flex justify-between items-start mb-6">
                  <div className="w-10 h-10 rounded-full bg-ink flex items-center justify-center border border-line">
                    <span className="text-info font-display text-xl font-bold">M</span>
                  </div>
                  <MiniSparkline color="red" isPositive={false} />
                </div>
                <div>
                  <div className="text-white font-medium mb-1">Micron Technology <span className="text-mist text-sm font-normal">Bstocks</span></div>
                  <div className="flex items-center gap-2">
                    <span className="text-white">$979.55</span>
                    <span className="text-danger text-xs">▼ 0.27%</span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* TOKENS TABLE */}
          <div>
            <div className="flex gap-6 mb-8 text-lg">
              <button className="text-white font-medium border-b-2 border-white pb-1">Tokens</button>
              <button className="text-mist hover:text-white font-medium pb-1 transition-colors">Auctions</button>
              <button className="text-mist hover:text-white font-medium pb-1 transition-colors">Pools</button>
              <button className="text-mist hover:text-white font-medium pb-1 transition-colors">Transactions</button>
            </div>

            <div className="flex flex-wrap gap-3 mb-6">
              <button className="bg-surface-3 text-white px-4 py-2 rounded-full text-sm flex items-center gap-2 border border-line">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M12 2v20M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/></svg>
                Popular
              </button>
              <button className="bg-surface-2 text-mist hover:text-white hover:bg-surface-3 transition-colors px-4 py-2 rounded-full text-sm border border-transparent">Stocks</button>
              <button className="bg-surface-2 text-mist hover:text-white hover:bg-surface-3 transition-colors px-4 py-2 rounded-full text-sm border border-transparent">Commodities</button>
              <button className="bg-surface-2 text-mist hover:text-white hover:bg-surface-3 transition-colors px-4 py-2 rounded-full text-sm border border-transparent">ETFs</button>
            </div>

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
                  {TOP_TOKENS.map((token) => (
                    <tr key={token.rank} className="border-b border-line/50 hover:bg-white/[0.02] transition-colors group cursor-pointer">
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
                      <td className="py-5 px-4 text-right text-white">{token.price}</td>
                      <td className={cn("py-5 px-4 text-right", token.isPos1h ? "text-lime" : "text-danger")}>
                        {token.isPos1h ? "▲" : "▼"} {token.change1H.replace(/[+-]/, '')}
                      </td>
                      <td className={cn("py-5 px-4 text-right", token.isPos1d ? "text-lime" : "text-danger")}>
                        {token.isPos1d ? "▲" : "▼"} {token.change1D.replace(/[+-]/, '')}
                      </td>
                      <td className="py-5 px-4 text-right text-mist">{token.fdv}</td>
                      <td className="py-5 px-4 text-right text-white font-medium">{token.vol}</td>
                      <td className="py-5 px-4 text-right">
                        <div className="flex justify-end opacity-70 group-hover:opacity-100 transition-opacity">
                          <MiniSparkline color={token.isPos1d ? "green" : "red"} isPositive={token.isPos1d} />
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
          
        </div>
      </main>

      <SiteFooter />
    </>
  );
}
