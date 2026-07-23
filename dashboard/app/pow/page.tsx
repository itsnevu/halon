"use client";

import Link from "next/link";

export default function PoWLandingPage() {
  return (
    <div className="py-12 md:py-20 px-5 sm:px-8 max-w-7xl mx-auto space-y-16">
      {/* Hero Header */}
      <div className="text-center space-y-6 max-w-4xl mx-auto">
        <h1 className="font-display text-4xl sm:text-6xl md:text-7xl font-extrabold tracking-tight text-fg leading-none">
          Proof of Work <br className="hidden sm:inline" />
          <span className="bg-gradient-to-r from-lime via-spring to-mint bg-clip-text text-transparent">
            RWA Escrow & AI Financing
          </span>
        </h1>

        <p className="text-mist text-lg sm:text-xl max-w-3xl mx-auto leading-relaxed font-sans">
          Eliminating payment friction for global freelancers by combining <strong className="text-fg">RWA Stock Collateral (AAPL/USDG)</strong>, <strong className="text-fg">FastAPI AI Verification</strong>, and <strong className="text-fg">Morpho DeFi Earn Pools</strong>.
        </p>
      </div>

      {/* 3 Core Portals Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-8 pt-4">
        {/* Client Portal Card */}
        <Link 
          href="/pow/client" 
          className="group relative rounded-3xl neu neu-raise border border-line bg-surface-2 p-8 transition-all duration-300 hover:border-lime/60 hover:-translate-y-1 hover:shadow-[0_0_40px_-10px_rgba(200,230,60,0.25)] flex flex-col justify-between"
        >
          <div className="space-y-4">
            <div className="size-12 rounded-2xl border border-line bg-surface flex items-center justify-center text-lime group-hover:bg-lime group-hover:text-black transition-colors">
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <rect x="2" y="7" width="20" height="14" rx="2" ry="2" />
                <path d="M16 21V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16" />
              </svg>
            </div>
            <div>
              <span className="text-xs font-mono text-lime uppercase tracking-wider">Client Escrow</span>
              <h3 className="text-2xl font-bold font-display text-fg group-hover:text-lime transition-colors">Client Portal</h3>
            </div>
            <p className="text-mist text-sm leading-relaxed">
              Lock tokenized RWA assets (AAPL, USDG) as escrow collateral. Manage milestone contracts and enable automated advance payouts for trusted talent.
            </p>
          </div>

          <div className="pt-6 mt-6 border-t border-line/60 flex items-center justify-between text-xs font-semibold text-lime">
            <span>Deploy Escrow</span>
            <svg viewBox="0 0 16 16" fill="none" className="size-4 transition-transform group-hover:translate-x-1">
              <path d="M2.5 8h11m0 0L9 3.5M13.5 8L9 12.5" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </div>
        </Link>

        {/* Freelancer Portal Card */}
        <Link 
          href="/pow/freelancer" 
          className="group relative rounded-3xl neu neu-raise border border-line bg-surface-2 p-8 transition-all duration-300 hover:border-mint/60 hover:-translate-y-1 hover:shadow-[0_0_40px_-10px_rgba(97,231,195,0.25)] flex flex-col justify-between"
        >
          <div className="space-y-4">
            <div className="size-12 rounded-2xl border border-line bg-surface flex items-center justify-center text-mint group-hover:bg-mint group-hover:text-black transition-colors">
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                <polyline points="14 2 14 8 20 8" />
                <line x1="16" y1="13" x2="8" y2="13" />
                <line x1="16" y1="17" x2="8" y2="17" />
                <polyline points="10 9 9 9 8 9" />
              </svg>
            </div>
            <div>
              <span className="text-xs font-mono text-mint uppercase tracking-wider">Freelance Payout</span>
              <h3 className="text-2xl font-bold font-display text-fg group-hover:text-mint transition-colors">Freelancer Portal</h3>
            </div>
            <p className="text-mist text-sm leading-relaxed">
              Upload deliverables for real-time AI Risk Scoring. Get instant 85% advance financing or full milestone release upon verification.
            </p>
          </div>

          <div className="pt-6 mt-6 border-t border-line/60 flex items-center justify-between text-xs font-semibold text-mint">
            <span>Upload Work Proof</span>
            <svg viewBox="0 0 16 16" fill="none" className="size-4 transition-transform group-hover:translate-x-1">
              <path d="M2.5 8h11m0 0L9 3.5M13.5 8L9 12.5" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </div>
        </Link>

        {/* Liquidity Provider Card */}
        <Link 
          href="/pow/lp" 
          className="group relative rounded-3xl neu neu-raise border border-line bg-surface-2 p-8 transition-all duration-300 hover:border-spring/60 hover:-translate-y-1 hover:shadow-[0_0_40px_-10px_rgba(186,233,94,0.25)] flex flex-col justify-between"
        >
          <div className="space-y-4">
            <div className="size-12 rounded-2xl border border-line bg-surface flex items-center justify-center text-spring group-hover:bg-spring group-hover:text-black transition-colors">
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <line x1="12" y1="1" x2="12" y2="23" />
                <path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6" />
              </svg>
            </div>
            <div>
              <span className="text-xs font-mono text-spring uppercase tracking-wider">Robinhood Earn Vault</span>
              <h3 className="text-2xl font-bold font-display text-fg group-hover:text-spring transition-colors">Liquidity Vault</h3>
            </div>
            <p className="text-mist text-sm leading-relaxed">
              Supply USDG liquidity to Morpho vaults and earn yield from advance financing repayments.
            </p>
          </div>

          <div className="pt-6 mt-6 border-t border-line/60 flex items-center justify-between text-xs font-semibold text-spring">
            <span>Deposit & Earn</span>
            <svg viewBox="0 0 16 16" fill="none" className="size-4 transition-transform group-hover:translate-x-1">
              <path d="M2.5 8h11m0 0L9 3.5M13.5 8L9 12.5" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </div>
        </Link>
      </div>

      {/* Protocol Architecture Workflow */}
      <div className="rounded-3xl neu neu-raise border border-line bg-surface-2 p-8 md:p-12 space-y-8">
        <div className="text-center max-w-2xl mx-auto space-y-2">
          <h2 className="text-2xl md:text-3xl font-bold font-display text-fg">How Proof of Work Operates</h2>
          <p className="text-mist text-sm">Automated tri-party workflow connecting clients, AI verifiers, and liquidity pools.</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 relative">
          <div className="p-5 rounded-2xl border border-line bg-surface space-y-3">
            <span className="size-8 rounded-full bg-lime/10 border border-lime/30 text-lime font-mono text-xs font-bold flex items-center justify-center">01</span>
            <h4 className="font-bold text-fg text-base">RWA Collateral Lock</h4>
            <p className="text-xs text-mist leading-relaxed">Client locks AAPL or USDG into <code className="text-lime">EscrowProject.sol</code>.</p>
          </div>

          <div className="p-5 rounded-2xl border border-line bg-surface space-y-3">
            <span className="size-8 rounded-full bg-mint/10 border border-mint/30 text-mint font-mono text-xs font-bold flex items-center justify-center">02</span>
            <h4 className="font-bold text-fg text-base">AI Proof Scoring</h4>
            <p className="text-xs text-mist leading-relaxed">FastAPI service parses deliverables via LLM OCR & anomaly detection.</p>
          </div>

          <div className="p-5 rounded-2xl border border-line bg-surface space-y-3">
            <span className="size-8 rounded-full bg-spring/10 border border-spring/30 text-spring font-mono text-xs font-bold flex items-center justify-center">03</span>
            <h4 className="font-bold text-fg text-base">Advance Payout</h4>
            <p className="text-xs text-mist leading-relaxed">If AI Score &gt; 80, Morpho Vault advances 85% funds instantly.</p>
          </div>

          <div className="p-5 rounded-2xl border border-line bg-surface space-y-3">
            <span className="size-8 rounded-full bg-lime/10 border border-lime/30 text-lime font-mono text-xs font-bold flex items-center justify-center">04</span>
            <h4 className="font-bold text-fg text-base">Net-30 Settlement</h4>
            <p className="text-xs text-mist leading-relaxed">Client settles contract, repaying Morpho Vault with added yield.</p>
          </div>
        </div>
      </div>
    </div>
  );
}
