"use client";

import { SiteHeader } from "@/components/site-header";
import { SiteFooter } from "@/components/cta-footer";
import { useState } from "react";
import { useAccount } from "wagmi";

export default function EarnPage() {
  const { isConnected } = useAccount();
  const [amount, setAmount] = useState("");
  const [isDepositing, setIsDepositing] = useState(false);

  const handleDeposit = () => {
    if (!isConnected) return;
    setIsDepositing(true);
    setTimeout(() => {
      setIsDepositing(false);
      alert("Successfully deposited USDC to PolicyPool!");
      setAmount("");
    }, 2000);
  };

  return (
    <>
      <SiteHeader />
      <main className="flex-1 flex flex-col items-center pt-24 min-h-[80vh] px-4 relative">
        <div className="absolute top-0 w-[800px] h-[300px] bg-lime/10 blur-[120px] rounded-full pointer-events-none" />

        <div className="w-full max-w-4xl z-10 text-center">
          <h1 className="text-4xl md:text-5xl font-display text-white mb-4">Earn Yield from Intents</h1>
          <p className="text-mist text-lg mb-12 max-w-2xl mx-auto">
            Provide USDC liquidity to the SafeBridge pool. You earn a share of every premium paid by users bridging their assets.
          </p>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-12 text-left">
            <div className="panel p-6">
              <div className="text-mist text-sm mb-1 uppercase tracking-wider font-mono">Current APY</div>
              <div className="text-3xl text-lime font-display">12.4%</div>
            </div>
            <div className="panel p-6">
              <div className="text-mist text-sm mb-1 uppercase tracking-wider font-mono">Total Liquidity</div>
              <div className="text-3xl text-white font-display">$4.2M</div>
            </div>
            <div className="panel p-6">
              <div className="text-mist text-sm mb-1 uppercase tracking-wider font-mono">Total Premiums Paid</div>
              <div className="text-3xl text-white font-display">$142K</div>
            </div>
          </div>

          <div className="panel p-8 max-w-md mx-auto text-left neu-raise">
            <h2 className="text-xl text-white font-medium mb-6">Deposit Liquidity</h2>
            
            <div className="neu-inset p-4 rounded-xl mb-6">
              <div className="flex justify-between items-center">
                <input 
                  type="text" 
                  placeholder="0.00"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  className="bg-transparent text-2xl text-white outline-none w-2/3"
                />
                <span className="text-white text-lg font-medium">USDC</span>
              </div>
            </div>

            <button 
              className={`w-full py-3 rounded-lg font-semibold transition-colors ${isConnected ? 'bg-lime text-ink hover:bg-lime-soft' : 'bg-surface-3 text-mist cursor-not-allowed'}`}
              onClick={handleDeposit}
              disabled={!isConnected || isDepositing}
            >
              {!isConnected ? "Connect Wallet" : isDepositing ? "Depositing..." : "Deposit USDC"}
            </button>
          </div>
        </div>
      </main>
      <SiteFooter />
    </>
  );
}
