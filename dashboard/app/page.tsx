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

        {/* Collateral band: the ETH forge reads as capital assembling on-chain — the
            thing every policy in the book is actually backed by. */}
        <section className="relative overflow-hidden border-y border-line bg-ink-2 px-5 py-20 sm:px-8">
          <div className="mx-auto grid max-w-7xl items-center gap-10 lg:grid-cols-[1fr_1.1fr]">
            <div className="max-w-xl space-y-5 text-left">
              <div className="font-mono text-[0.625rem] tracking-[0.16em] text-lime uppercase">
                On-chain collateral
              </div>
              <h2 className="font-display text-3xl leading-[1.05] font-semibold tracking-tight text-balance text-white md:text-4xl lg:text-5xl">
                Every policy is backed by{" "}
                <span className="bg-gradient-to-r from-lime via-spring to-mint bg-clip-text text-transparent">
                  capital that settles itself
                </span>
                .
              </h2>
              <p className="text-base leading-relaxed text-pretty text-mist md:text-lg">
                Premiums, cover and reinsurance are held as tokenized collateral on Base. When
                a worker agent misses its deadline, the pool discharges from that reserve
                automatically — no custodian, no manual claim, no human in the loop.
              </p>
            </div>

            <div className="relative aspect-[4/3] w-full overflow-hidden rounded-3xl border border-line bg-black neu neu-raise">
              <video
                className="size-full object-cover"
                src="/video/eth-forge.webm"
                poster="/video/eth-forge-poster.jpg"
                autoPlay
                muted
                loop
                playsInline
                aria-hidden="true"
              />
              {/* seat the blue clip into the band's palette without hiding the render */}
              <div
                aria-hidden="true"
                className="pointer-events-none absolute inset-0"
                style={{
                  background:
                    "radial-gradient(120% 90% at 50% 100%, rgba(0,0,0,0.55) 0%, transparent 55%)",
                }}
              />
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
