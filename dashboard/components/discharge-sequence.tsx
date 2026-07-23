/**
 * DischargeSequence — the five-minute demo, told as a timeline.
 *
 * Pure Server Component: static copy, no state, no effects, no clock reads.
 * Nothing here calls `Date.now()` or `Math.random()`, so SSR and CSR agree.
 *
 * ── The rail ─────────────────────────────────────────────────────────────
 * One continuous 1px line is absolutely positioned behind the `<ol>` rather
 * than drawn per-step, so it never breaks across the `space-y-10` gaps. Its
 * `left` matches the node radius (size-8 → 16px, size-10 → 20px at `sm`).
 * The nodes are opaque (`bg-ink`) and come later in DOM order, so they paint
 * over the rail without needing a z-index.
 *
 * ── Tone ─────────────────────────────────────────────────────────────────
 * Tone is a property of each step, not a computed index, so the copy and its
 * colour can never drift apart. `danger` is reserved for the one step where
 * something actually fails; `money` marks the two steps where capital moves.
 */

import { Reveal } from "@/components/ui/reveal";
import { Section } from "@/components/ui/section";

type Tone = "neutral" | "money" | "fail";

interface Step {
  /** Elapsed time into the demo. */
  clock: string;
  title: string;
  body: string;
  /** Mono trace of the call(s) the step maps to. */
  footnote: string;
  tone: Tone;
}

const STEPS: readonly Step[] = [
  {
    clock: "0:00",
    title: "Four live agents",
    body: "Meridian Capital, Aurora Analytics, Sentinel Underwriting and Bastion Re are all real CAP agents with their own wallets, their own SDK keys and their own listed services.",
    footnote: "listOrders() · getOrder()",
    tone: "neutral",
  },
  {
    clock: "0:45",
    title: "The price is a function",
    body: "Meridian asks Sentinel for a quote on Aurora. RiskEngine returns a premium derived from Aurora's on-chain reliability. Move Aurora from 80% to 95% and the premium collapses. Nothing here is hardcoded.",
    footnote: "RiskEngine.quote(reliability, coverage, tenor, utilization)",
    tone: "neutral",
  },
  {
    clock: "1:30",
    title: "Premium lands inside the pay-tx",
    body: "Sentinel accepts the negotiation with its PolicyPool as providerFundAddress. CAP moves the fundAmount to the pool in the same transaction that pays the order. There is no second transfer that can fail.",
    footnote: "negotiateOrder() → acceptNegotiationWithFundAddress() → payOrder()",
    tone: "neutral",
  },
  {
    clock: "2:00",
    title: "The underwriter hires its own underwriter",
    body: "Unprompted, Sentinel opens a CAP order against Bastion Re and cedes 50% of the risk. Sentinel is a provider and a requester in the same breath. This is the composability the track is asking for, and it is structural, not decorative.",
    footnote: "the same primitive, one layer up",
    tone: "neutral",
  },
  {
    clock: "2:45",
    title: "The worker misses",
    body: "Meridian hires Aurora. Aurora fails to deliver. Meridian calls rejectOrder and the CAP order enters its terminal rejected state. That state, not an oracle we wrote, is the definition of failure.",
    footnote: "OrderStatus: delivering → rejected",
    tone: "fail",
  },
  {
    clock: "3:15",
    title: "The pool discharges",
    body: "The watcher, listening on connectWebSocket, sees order_rejected, signs an EIP-712 attestation, and submits it to ClaimsAdjudicator. The contract verifies the signature, checks the policy is live, and pays the client in full. Median: 4.2 seconds.",
    footnote: "PolicyPool.discharge(policyId, attestation)",
    tone: "money",
  },
  {
    clock: "3:45",
    title: "The cascade",
    body: "ClaimsAdjudicator then bills Bastion Re's pool for its quota share. Three layers of agents, one line of settlement, zero human approvals.",
    footnote: "policyId → reinsurancePolicyId",
    tone: "money",
  },
  {
    clock: "4:15",
    title: "The market learns",
    body: "Aurora's reliability index falls. The next quote on Aurora is more expensive for everyone, not just Meridian. Reputation stops being a badge and starts being a price.",
    footnote: "reliability 82.0% → 80.0% · premium +18%",
    tone: "neutral",
  },
];

const NODE_TONE: Record<Tone, string> = {
  neutral: "border-line bg-ink text-mist",
  money: "border-lime/40 bg-lime/10 text-lime glow-lime-sm",
  fail: "border-danger/40 bg-danger/10 text-danger glow-danger-sm",
};

const CHIP_TONE: Record<Tone, string> = {
  neutral: "border-lime/20 bg-lime/10 text-lime",
  money: "border-lime/20 bg-lime/10 text-lime",
  fail: "border-danger/20 bg-danger/10 text-danger",
};

export function DischargeSequence() {
  return (
    <Section
      id="how"
      eyebrow="How a claim runs"
      index="07"
      title="Failure to payout in 4.2 seconds."
      lead="No dispute window, no committee, no multisig. CAP declares the order dead, a watcher signs it, and the contract moves the money."
    >
      <div className="mx-auto max-w-3xl">
        <div className="relative">
          {/* One rail for the whole list — never breaks across the step gaps. */}
          <span
            aria-hidden="true"
            className="absolute inset-y-0 left-[15px] w-px bg-gradient-to-b from-lime/60 via-line to-transparent sm:left-[19px]"
          />

          <ol className="list-none space-y-10">
            {STEPS.map((step, i) => (
              <li key={step.title} className="relative pl-12 sm:pl-16">
                {/* Ordinal is decorative — the <ol> already conveys position. */}
                <span
                  aria-hidden="true"
                  className={`absolute top-1 left-0 grid size-8 place-items-center rounded-full border font-mono text-xs sm:size-10 ${NODE_TONE[step.tone]}`}
                >
                  <span className="tabular">{i + 1}</span>
                </span>

                <Reveal delay={i * 80}>
                  <span
                    className={`inline-block rounded border px-1.5 py-0.5 font-mono text-[0.625rem] tabular ${CHIP_TONE[step.tone]}`}
                  >
                    {step.clock}
                  </span>

                  <h3 className="mt-2 text-lg text-fg sm:text-xl">{step.title}</h3>

                  <p className="mt-1.5 text-[0.9375rem] leading-relaxed text-mist text-pretty">
                    {step.body}
                  </p>

                  <p className="mt-2 font-mono text-[0.6875rem] break-words text-mist-dim">
                    <span className="text-lime">└─ </span>
                    {step.footnote}
                  </p>
                </Reveal>
              </li>
            ))}
          </ol>
        </div>

        <Reveal>
          <figure className="panel mt-14 border-l-2 border-l-lime p-6 sm:mt-16 sm:p-8">
            <blockquote className="font-display text-xl leading-snug text-fg text-balance sm:text-2xl">
              We did not build an agent that sells a service. We built the market that makes
              every other agent worth hiring.
            </blockquote>
          </figure>
        </Reveal>
      </div>
    </Section>
  );
}
