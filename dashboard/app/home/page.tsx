import { SiteHeader } from "@/components/site-header";
import { Hero } from "@/components/hero";
import { Ticker, TickerReverse } from "@/components/ticker";
import { StatsStrip } from "@/components/stats-strip";
import { CascadeDiagram } from "@/components/cascade-diagram";
import { QuoteEngine } from "@/components/quote-engine";
import { PoolVaults } from "@/components/pool-vaults";
import { AgentRegistry } from "@/components/agent-registry";
import { PolicyBook } from "@/components/policy-book";
import { ClaimsFeed } from "@/components/claims-feed";
import { DischargeSequence } from "@/components/discharge-sequence";
import { TrustModel } from "@/components/trust-model";
import { CtaBand, SiteFooter } from "@/components/cta-footer";
import Link from "next/link";

export default function Page() {
  return (
    <>
      <SiteHeader />

      <main className="flex-1">
        <Hero />
        <Ticker />
        <StatsStrip />

        {/* Featured HALON Proof of Work Milestone & Advance Financing Banner */}
        <section className="relative py-16 px-5 sm:px-8 border-y border-line bg-surface/80 backdrop-blur-md overflow-hidden">
          <div aria-hidden="true" className="pointer-events-none absolute -top-40 left-1/2 -translate-x-1/2 size-[600px] rounded-full bg-lime/10 blur-[120px]" />
          <div className="relative mx-auto max-w-7xl">
            <div className="flex flex-col lg:flex-row items-center justify-between gap-8 rounded-3xl neu neu-raise border border-line p-8 md:p-12 bg-surface-2/90">
              <div className="space-y-4 max-w-2xl text-left">
                <div className="inline-flex items-center gap-2 rounded-full border border-lime/30 bg-lime/10 px-3.5 py-1 text-xs font-semibold text-lime">
                  <span className="relative flex size-2">
                    <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-lime opacity-75"></span>
                    <span className="relative inline-flex size-2 rounded-full bg-lime"></span>
                  </span>
                  ROBINHOOD CHAIN HACKATHON 2026
                </div>
                <h2 className="font-display text-3xl md:text-4xl lg:text-5xl font-semibold tracking-tight text-white">
                  Proof of Work <span className="bg-gradient-to-r from-lime via-spring to-mint bg-clip-text text-transparent">RWA Escrow & AI Financing</span>
                </h2>
                <p className="text-mist text-base md:text-lg leading-relaxed">
                  Combine tokenized real-world assets (AAPL, USDG) with automated LLM work verification & instant advance payouts powered by Morpho liquidity pools.
                </p>
                <div className="flex flex-wrap items-center gap-4 pt-2">
                  <Link
                    href="/pow/client"
                    className="group relative inline-flex items-center justify-center gap-2 rounded-full bg-lime px-6 py-3.5 text-sm font-semibold text-lime-ink transition-all hover:bg-lime-soft glow-lime-sm"
                  >
                    Client Escrow Portal
                    <svg viewBox="0 0 16 16" fill="none" className="size-4 transition-transform group-hover:translate-x-1">
                      <path d="M2.5 8h11m0 0L9 3.5M13.5 8L9 12.5" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                  </Link>
                  <Link
                    href="/pow/freelancer"
                    className="inline-flex items-center justify-center rounded-full neu neu-raise border border-line bg-surface-3 px-6 py-3.5 text-sm font-semibold text-white transition-all hover:border-lime/40 hover:bg-surface"
                  >
                    Freelancer Portal
                  </Link>
                  <Link
                    href="/pow/lp"
                    className="inline-flex items-center justify-center rounded-full neu neu-raise border border-line/60 bg-transparent px-6 py-3.5 text-sm font-semibold text-mist hover:text-white hover:border-lime/30"
                  >
                    Liquidity Earn Vault
                  </Link>
                </div>
              </div>

              {/* Stat Card Preview */}
              <div className="w-full lg:w-80 shrink-0 space-y-3 rounded-2xl border border-line bg-surface p-5 shadow-2xl">
                <div className="flex items-center justify-between text-xs text-mist font-mono uppercase tracking-wider">
                  <span>AI Verification</span>
                  <span className="text-lime">Active</span>
                </div>
                <div className="space-y-1">
                  <div className="text-2xl font-bold font-display text-white">95/100</div>
                  <div className="text-xs text-mist">FastAPI LLM Anomaly Score</div>
                </div>
                <div className="h-2 w-full rounded-full bg-ink-2 overflow-hidden border border-line">
                  <div className="h-full bg-gradient-to-r from-lime to-mint w-[95%]" />
                </div>
                <div className="pt-2 border-t border-line/60 flex items-center justify-between text-xs">
                  <span className="text-mist">Advance Financing</span>
                  <span className="text-spring font-semibold">85% Instant Payout</span>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* The pitch: what the three layers do to one failing order. */}
        <CascadeDiagram />

        {/* The proof: pricing is a function you can move with your own hands. */}
        <QuoteEngine />

        <div className="bg-ink-2">
          <PoolVaults />
        </div>

        <TickerReverse />

        <AgentRegistry />

        <div className="bg-ink-2">
          <PolicyBook />
        </div>

        <ClaimsFeed />
        <DischargeSequence />

        <div className="bg-ink-2">
          <TrustModel />
        </div>

        <CtaBand />
      </main>

      <SiteFooter />
    </>
  );
}
