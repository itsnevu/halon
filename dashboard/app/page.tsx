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
