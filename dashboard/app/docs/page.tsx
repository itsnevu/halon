"use client";

import { SiteHeader } from "@/components/site-header";
import { SiteFooter } from "@/components/cta-footer";
import { HalonWordmark } from "@/components/ui/logo";

export default function DocsPage() {
  return (
    <>
      <SiteHeader />

      <main className="flex-1 flex flex-col items-center justify-start min-h-[80vh] px-4 pt-24 pb-24 relative">
        {/* Glow Effects */}
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[800px] h-[500px] bg-lime/5 rounded-full blur-[150px] pointer-events-none" />

        <div className="w-full max-w-4xl z-10">
          <div className="mb-12 border-b border-line pb-8">
            <h1 className="text-4xl md:text-5xl font-display tracking-tight text-white mb-4">
              HALON Documentation
            </h1>
            <p className="text-mist text-lg">
              Comprehensive guide to the suppression layer for the agent economy.
            </p>
          </div>

          <div className="space-y-12 text-mist leading-relaxed">
            
            <section className="panel neu-inset p-8 rounded-2xl">
              <h2 className="text-2xl font-medium text-white mb-4">1. Architecture Overview</h2>
              <p className="mb-4">
                HALON provides decentralized, automated insurance (suppression layer) for autonomous agent transactions. When an agent undertakes a risky cross-chain action or smart contract interaction, the user can purchase a policy that guarantees a payout if the agent fails or misses its Service Level Agreement (SLA).
              </p>
              <div className="bg-surface-2 p-4 rounded-xl border border-line text-sm mt-4 font-mono text-lime-soft">
                User ➔ HalonRouter ➔ Agent Execution<br/>
                &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;↳ Premium ➔ PolicyPool
              </div>
            </section>

            <section className="panel neu-inset p-8 rounded-2xl">
              <h2 className="text-2xl font-medium text-white mb-4">2. Core Smart Contracts</h2>
              
              <div className="space-y-6">
                <div>
                  <h3 className="text-lg text-white font-medium mb-2">HalonRouter.sol</h3>
                  <p className="text-sm">
                    The entry point for users. It intercepts cross-chain intents, calculates the required premium via the <code className="text-white">DynamicRiskEngine</code>, deducts the premium in USDC, and binds a policy on the <code className="text-white">PolicyPool</code>.
                  </p>
                </div>
                
                <div>
                  <h3 className="text-lg text-white font-medium mb-2">PolicyPool.sol</h3>
                  <p className="text-sm">
                    The liquidity layer. Liquidity Providers (LPs) deposit USDC into this pool to underwrite the risk of agent failures. The pool holds capital, collects premiums, and disburses payouts when a claim is verified.
                  </p>
                </div>

                <div>
                  <h3 className="text-lg text-white font-medium mb-2">ClaimsAdjudicator.sol</h3>
                  <p className="text-sm">
                    The oracle layer. It monitors the CROO Agent Protocol or on-chain events to determine if an SLA was breached. If a breach occurs, it triggers <code className="text-white">adjudicateClaim()</code> which forces the PolicyPool to discharge funds to the affected user.
                  </p>
                </div>
              </div>
            </section>

            <section className="panel neu-inset p-8 rounded-2xl">
              <h2 className="text-2xl font-medium text-white mb-4">3. Trust Model & Roles</h2>
              <ul className="list-disc pl-5 space-y-2 text-sm">
                <li><strong className="text-white">Underwriter Role:</strong> Granted to the HalonRouter. Allowed to bind new policies.</li>
                <li><strong className="text-white">Adjudicator Role:</strong> Granted to the ClaimsAdjudicator. Allowed to approve payouts.</li>
                <li><strong className="text-white">Capital Role:</strong> Granted to users/LPs who deposit liquidity.</li>
              </ul>
              <p className="mt-4 text-sm italic">
                "Nobody pulls the trigger. It just discharges." — Payouts are fully automated via cryptographic attestation.
              </p>
            </section>

          </div>
        </div>
      </main>

      <SiteFooter />
    </>
  );
}
