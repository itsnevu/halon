"use client";

import { SiteHeader } from "@/components/site-header";
import { SiteFooter } from "@/components/cta-footer";
import { useState, useEffect } from "react";
import { useAccount } from "wagmi";
import { useModal } from "connectkit";

interface Intent {
  id: string;
  route: string;
  amount: string;
  protection: string;
  status: string;
}

export default function Page() {
  const { isConnected } = useAccount();
  const { setOpen } = useModal();
  const [protectedSwap, setProtectedSwap] = useState(true);
  const [amount, setAmount] = useState("1000");
  const [intents, setIntents] = useState<Intent[]>([]);
  const [isBridging, setIsBridging] = useState(false);

  const handleAction = () => {
    if (!isConnected) {
      setOpen(true);
      return;
    }
    
    setIsBridging(true);
    // Mock the smart contract write to SafeBridgeRouter
    setTimeout(() => {
      setIsBridging(false);
      alert("Bridge transaction submitted!");
    }, 2000);
  };

  useEffect(() => {
    // Fetch real-time intent statuses from our new backend API
    fetch('/api/intents')
      .then(res => res.json())
      .then(data => setIntents(data))
      .catch(err => console.error("Failed to load intents", err));
  }, []);

  return (
    <>
      <SiteHeader />

      <main className="flex-1 flex flex-col items-center justify-center min-h-[80vh] px-4 relative">
        {/* Glow Effects */}
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-lime/10 rounded-full blur-[120px] pointer-events-none" />

        <div className="text-center mb-10 z-10">
          <h1 className="text-5xl md:text-6xl font-display tracking-tight text-white mb-4">
            Cross-chain without <span className="text-gradient">compromise</span>.
          </h1>
          <p className="text-mist text-lg md:text-xl max-w-2xl mx-auto">
            Bridge your assets securely. If the solver fails or misses the SLA, you are automatically compensated from the SafeBridge Liquidity Pool.
          </p>
        </div>

        {/* Bridge Widget */}
        <div className="panel p-6 w-full max-w-md z-10 neu-raise">
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-white font-medium">Bridge</h2>
            <div className="text-xs text-mist bg-surface-2 px-2 py-1 rounded-full border border-line">SLA: 15 mins</div>
          </div>

          <div className="neu-inset p-4 rounded-xl mb-4">
            <div className="text-sm text-mist mb-1">From</div>
            <div className="flex justify-between items-center">
              <span className="text-white text-lg font-medium">Base</span>
              <input 
                type="text" 
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                className="bg-transparent text-right text-2xl text-white outline-none w-1/2"
              />
            </div>
            <div className="text-xs text-mist text-right mt-1">USDC</div>
          </div>

          <div className="flex justify-center -my-3 relative z-10">
            <button className="bg-surface-2 border border-line p-2 rounded-full hover:bg-surface-3 transition">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 5v14M19 12l-7 7-7-7"/></svg>
            </button>
          </div>

          <div className="neu-inset p-4 rounded-xl mt-4 mb-6">
            <div className="text-sm text-mist mb-1">To</div>
            <div className="flex justify-between items-center">
              <span className="text-white text-lg font-medium">Optimism</span>
              <span className="text-white text-2xl">{amount}</span>
            </div>
            <div className="text-xs text-mist text-right mt-1">USDC</div>
          </div>

          {/* Insurance Toggle */}
          <div 
            className={`p-4 rounded-xl border cursor-pointer transition-all duration-200 ${protectedSwap ? 'bg-lime/5 border-lime/30 glow-lime-sm' : 'bg-surface-2 border-line'}`}
            onClick={() => setProtectedSwap(!protectedSwap)}
          >
            <div className="flex justify-between items-center">
              <div className="flex items-center gap-2">
                <span className="text-xl">🛡️</span>
                <div>
                  <div className="text-white text-sm font-medium">Protect this execution</div>
                  <div className="text-xs text-mist">Automatic claim if solver fails</div>
                </div>
              </div>
              <div className={`w-10 h-6 rounded-full transition-colors flex items-center px-1 ${protectedSwap ? 'bg-lime' : 'bg-surface-3'}`}>
                <div className={`w-4 h-4 rounded-full bg-white transition-transform ${protectedSwap ? 'translate-x-4 bg-ink' : ''}`} />
              </div>
            </div>
            {protectedSwap && (
              <div className="mt-3 pt-3 border-t border-lime/20 flex justify-between text-xs">
                <span className="text-lime-soft">Premium: {(parseFloat(amount) || 0) * 0.00125} USDC</span>
                <span className="text-mist">Cover: {amount || 0} USDC</span>
              </div>
            )}
          </div>

          <button 
            className="w-full mt-6 py-3 rounded-lg bg-white text-ink font-semibold hover:bg-mist transition-colors"
            onClick={handleAction}
            disabled={isBridging}
          >
            {isBridging ? "Confirming..." : (!isConnected ? "Connect Wallet" : "Confirm Bridge")}
          </button>
        </div>

        {/* Active Intents Dashboard */}
        <div className="w-full max-w-4xl mt-16 z-10">
          <h3 className="text-white text-xl font-medium mb-4 pl-2 border-l-2 border-lime">Active Intents</h3>
          <div className="panel p-0 overflow-hidden">
            <table className="w-full text-left text-sm">
              <thead className="bg-surface-2 border-b border-line text-mist">
                <tr>
                  <th className="px-6 py-4 font-medium">Intent ID</th>
                  <th className="px-6 py-4 font-medium">Route</th>
                  <th className="px-6 py-4 font-medium">Amount</th>
                  <th className="px-6 py-4 font-medium">Protection</th>
                  <th className="px-6 py-4 font-medium">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-line text-white">
                {intents.map((intent) => (
                  <tr key={intent.id} className="hover:bg-white/[0.02]">
                    <td className="px-6 py-4 font-mono text-mist">
                      {intent.id.substring(0, 6)}...{intent.id.substring(intent.id.length - 4)}
                    </td>
                    <td className="px-6 py-4">{intent.route}</td>
                    <td className="px-6 py-4">{intent.amount} USDC</td>
                    <td className="px-6 py-4">
                      {intent.protection === "Active" ? (
                        <span className="text-lime text-xs px-2 py-1 rounded-full bg-lime/10 border border-lime/20">Active</span>
                      ) : (
                        <span className="text-mist text-xs px-2 py-1 rounded-full bg-surface-3 border border-line">Inactive</span>
                      )}
                    </td>
                    <td className="px-6 py-4">
                      {intent.status === "Routing" ? (
                        <span className="text-info text-xs px-2 py-1 rounded-full bg-info/10 border border-info/20">Routing</span>
                      ) : intent.status === "Expired" ? (
                        <span className="text-danger text-xs px-2 py-1 rounded-full bg-danger/10 border border-danger/20">Expired</span>
                      ) : (
                        <span className="text-mist text-xs px-2 py-1 rounded-full bg-surface-3 border border-line">Settled</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

      </main>

      <SiteFooter />
    </>
  );
}
