"use client";

import { SiteHeader } from "@/components/site-header";
import { SiteFooter } from "@/components/cta-footer";
import { useAccount, useBalance, useEnsName, useReadContract } from "wagmi";
import { useModal } from "connectkit";
import { cn } from "@/lib/cn";
import { formatUnits } from "viem";
import { ERC20_ABI } from "@/lib/pow-abis";
import { POW_CONFIG } from "@/lib/pow-config";

export default function PortfolioPage() {
  const { address, isConnected } = useAccount();
  const { data: balance } = useBalance({ address });
  const { data: ensName } = useEnsName({ address });
  const { setOpen } = useModal();

  const { data: usdgBalance } = useReadContract({
    address: POW_CONFIG.mockUSDGAddress,
    abi: ERC20_ABI,
    functionName: "balanceOf",
    args: address ? [address] : undefined,
    query: { enabled: !!address }
  });

  const { data: aaplBalance } = useReadContract({
    address: POW_CONFIG.mockAAPLAddress,
    abi: ERC20_ABI,
    functionName: "balanceOf",
    args: address ? [address] : undefined,
    query: { enabled: !!address }
  });

  const realTokens = [
    {
      name: "USDG Stablecoin",
      symbol: "USDG",
      balance: usdgBalance ? Number(formatUnits(usdgBalance, 18)).toFixed(2) : "0.00",
      value: usdgBalance ? `$${Number(formatUnits(usdgBalance, 18)).toFixed(2)}` : "$0.00",
      change: "+0.00%",
      isPos: true,
      color: "#2775CA"
    },
    {
      name: "Tokenized Apple Stock",
      symbol: "AAPL",
      balance: aaplBalance ? Number(formatUnits(aaplBalance, 18)).toFixed(2) : "0.00",
      value: aaplBalance ? `$${(Number(formatUnits(aaplBalance, 18)) * 150).toFixed(2)}` : "$0.00",
      change: "+1.20%",
      isPos: true,
      color: "#CDFF71"
    },
    {
      name: "Ethereum",
      symbol: "ETH",
      balance: balance ? Number(formatUnits(balance.value, balance.decimals)).toFixed(4) : "0.0000",
      value: balance ? `$${(Number(formatUnits(balance.value, balance.decimals)) * 3400).toFixed(2)}` : "$0.00",
      change: "-0.50%",
      isPos: false,
      color: "#627EEA"
    }
  ];

  const totalValueStr = (
    (usdgBalance ? Number(formatUnits(usdgBalance, 18)) : 0) +
    (aaplBalance ? Number(formatUnits(aaplBalance, 18)) * 150 : 0) +
    (balance ? Number(formatUnits(balance.value, balance.decimals)) * 3400 : 0)
  ).toFixed(2);


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
              
              <h2 className="text-2xl md:text-3xl font-medium text-white mb-6 relative z-10 text-center">
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
                  <h1 className="text-2xl font-medium text-white">
                    {ensName || (address ? `${address.slice(0, 6)}...${address.slice(-4)}` : "Demo wallet")}
                  </h1>
                </div>
                
                <div className="flex items-center gap-3">
                  <button className="flex items-center gap-2 bg-surface-2 border border-line rounded-full px-4 py-2 hover:bg-surface-3 transition-colors text-sm font-medium text-white">
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
                <button className="text-white font-medium border-b-2 border-white pb-2">Overview</button>
                <button className="text-mist hover:text-white font-medium pb-2 transition-colors">Tokens</button>
                <button className="text-mist hover:text-white font-medium pb-2 transition-colors">NFTs</button>
                <button className="text-mist hover:text-white font-medium pb-2 transition-colors">Activity</button>
              </div>

              {/* Main Dashboard Layout */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                
                {/* Left Column: Balance & Chart */}
                <div className="md:col-span-2 space-y-6">
                  <div>
                    <h2 className="text-5xl font-display text-white mb-2">${totalValueStr}</h2>
                    <div className="text-danger flex items-center gap-2 font-medium">
                      ▼ $3.50 (0.36%) today
                    </div>
                  </div>

                  {/* Simulated Chart */}
                  <div className="h-[250px] w-full border-b border-line relative flex items-end">
                    {/* Grid lines */}
                    <div className="absolute inset-0 flex flex-col justify-between opacity-10 pointer-events-none">
                      <div className="border-b border-dashed w-full h-0"></div>
                      <div className="border-b border-dashed w-full h-0"></div>
                      <div className="border-b border-dashed w-full h-0"></div>
                      <div className="border-b border-dashed w-full h-0"></div>
                    </div>
                    {/* SVG Chart Line */}
                    <svg className="w-full h-[80%] overflow-visible" preserveAspectRatio="none" viewBox="0 0 100 100">
                      <defs>
                        <linearGradient id="chartGrad" x1="0" x2="0" y1="0" y2="1">
                          <stop offset="0%" stopColor="#FF4A4A" stopOpacity="0.2" />
                          <stop offset="100%" stopColor="#FF4A4A" stopOpacity="0" />
                        </linearGradient>
                      </defs>
                      <path d="M0,50 C20,40 30,80 50,60 C70,40 80,90 100,80 L100,100 L0,100 Z" fill="url(#chartGrad)" />
                      <path d="M0,50 C20,40 30,80 50,60 C70,40 80,90 100,80" fill="none" stroke="#FF4A4A" strokeWidth="2" vectorEffect="non-scaling-stroke" />
                    </svg>
                  </div>
                  
                  {/* Time filters */}
                  <div className="flex gap-2 text-sm">
                    <button className="px-3 py-1 bg-surface-3 text-white rounded-full">1D</button>
                    <button className="px-3 py-1 text-mist hover:text-white transition-colors">1W</button>
                    <button className="px-3 py-1 text-mist hover:text-white transition-colors">1M</button>
                    <button className="px-3 py-1 text-mist hover:text-white transition-colors">1Y</button>
                  </div>
                  
                  {/* Tokens List */}
                  <div className="mt-8">
                    <h3 className="text-xl font-medium text-white mb-4">Tokens</h3>
                    <div className="space-y-2">
                      {realTokens.map((token, i) => (
                        <div key={i} className="flex items-center justify-between p-4 bg-surface-2 rounded-2xl hover:bg-surface-3 transition-colors">
                          <div className="flex items-center gap-4">
                            <div className="w-10 h-10 rounded-full flex items-center justify-center text-white font-medium" style={{ backgroundColor: token.color }}>
                              {token.symbol.charAt(0)}
                            </div>
                            <div>
                              <div className="text-white font-medium">{token.name}</div>
                              <div className="text-mist text-sm">{token.balance} {token.symbol}</div>
                            </div>
                          </div>
                          <div className="text-right">
                            <div className="text-white font-medium">{token.value}</div>
                            <div className={cn("text-sm", token.isPos ? "text-lime" : "text-danger")}>
                              {token.change}
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>

                {/* Right Column: Actions */}
                <div className="md:col-span-1">
                  <div className="grid grid-cols-2 gap-4">
                    <button className="bg-surface-2 border border-line rounded-3xl p-6 flex flex-col items-center justify-center gap-3 hover:border-lime/40 hover:bg-surface-3 transition-colors group">
                      <div className="w-12 h-12 rounded-full bg-ink flex items-center justify-center text-lime group-hover:scale-110 transition-transform">
                        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M22 2L11 13M22 2l-7 20-4-9-9-4 20-7z"/></svg>
                      </div>
                      <span className="text-white font-medium text-lg">Send</span>
                    </button>
                    
                    <button className="bg-surface-2 border border-line rounded-3xl p-6 flex flex-col items-center justify-center gap-3 hover:border-lime/40 hover:bg-surface-3 transition-colors group">
                      <div className="w-12 h-12 rounded-full bg-ink flex items-center justify-center text-lime group-hover:scale-110 transition-transform">
                        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M20 12v6a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2v-6M12 4v12M8 12l4 4 4-4"/></svg>
                      </div>
                      <span className="text-white font-medium text-lg">Receive</span>
                    </button>
                  </div>
                  
                  {/* Promo Box */}
                  <div className="mt-6 panel p-6 rounded-3xl border border-lime/30 bg-lime/5">
                    <h3 className="text-lime font-medium mb-2">Protect your entire portfolio</h3>
                    <p className="text-mist text-sm mb-4">HALON can auto-execute SL/TP orders across all your L2 positions securely on-chain.</p>
                    <button className="w-full py-2 bg-lime text-ink font-medium rounded-xl hover:bg-lime/90 transition-colors">
                      Learn more
                    </button>
                  </div>
                </div>

              </div>

            </div>
          )}

        </div>
      </main>

      <SiteFooter />
    </>
  );
}
