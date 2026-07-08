import type { ReactNode } from "react";
import { cn } from "@/lib/cn";
import { Badge } from "@/components/ui/badge";
import { Section } from "@/components/ui/section";
import { Reveal } from "@/components/ui/reveal";

/* ── primitives ─────────────────────────────────────────────── */

function Check() {
  return (
    <svg
      viewBox="0 0 12 12"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.6"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      className="mt-[0.3em] size-3 shrink-0 text-lime"
    >
      <path d="M2.4 6.3 4.7 8.6 9.6 3.5" />
    </svg>
  );
}

/** Shared card shell so all three columns bottom-align their footers. */
function Card({ className, children }: { className?: string; children: ReactNode }) {
  return <div className={cn("panel flex h-full flex-col gap-4 p-6", className)}>{children}</div>;
}

function CardBody({ children }: { children: ReactNode }) {
  return <p className="text-[0.9375rem] leading-relaxed text-mist text-pretty">{children}</p>;
}

/** border-t + mt-auto keeps every footer on the same baseline across the row. */
function CardFooter({ children }: { children: ReactNode }) {
  return <div className="mt-auto border-t border-line pt-4">{children}</div>;
}

/* ── card 1: contracts ──────────────────────────────────────── */

const CONTRACTS: { file: string; note: string }[] = [
  { file: "PolicyPool.sol", note: "ERC-721 policies, per-underwriter vault" },
  { file: "RiskEngine.sol", note: "pure view function, unit-tested" },
  { file: "ClaimsAdjudicator.sol", note: "EIP-712 verify, cascade recovery" },
];

function TrustlessCard() {
  return (
    <Card>
      <div>
        <Badge tone="lime">Trustless</Badge>
      </div>
      <h3 className="text-xl text-white">Capital is real</h3>
      <CardBody>
        Premiums and payouts are USDC on Base. PolicyPool holds it, ClaimsAdjudicator moves it,
        and both are ordinary verifiable contracts. Nothing is simulated and nothing is custodied
        off-chain.
      </CardBody>

      <CardFooter>
        <ul className="space-y-2.5">
          {CONTRACTS.map((c) => (
            <li key={c.file} className="flex gap-2.5 font-mono text-[0.6875rem] leading-relaxed">
              <Check />
              <span className="min-w-0 text-mist-dim">
                <span className="text-mist">{c.file}</span>
                <span aria-hidden="true"> — </span>
                {c.note}
              </span>
            </li>
          ))}
        </ul>
      </CardFooter>
    </Card>
  );
}

/* ── card 2: inherited terminal states ──────────────────────── */

function InheritedCard() {
  return (
    <Card>
      <div>
        <Badge tone="lime">Inherited</Badge>
      </div>
      <h3 className="text-xl text-white">
        Failure is CAP&rsquo;s own word
      </h3>
      <CardBody>
        We never decide whether an agent failed. CAP&rsquo;s order lifecycle already has the
        terminal states rejected and expired, with rejectTxHash and slaDeadline written on-chain.
        We subscribe to them. No Chainlink, no voting, no committee.
      </CardBody>

      <CardFooter>
        <pre
          className="no-scrollbar overflow-x-auto font-mono text-[0.625rem] leading-[1.9] whitespace-pre text-mist-dim"
        >
          <code>
            {"creating → created → paying → paid → delivering → completed\n"}
            {"                                              ↘ "}
            <span className="text-danger">rejected</span>
            {"\n"}
            {"                                              ↘ "}
            <span className="text-danger">expired</span>
          </code>
        </pre>
      </CardFooter>
    </Card>
  );
}

/* ── card 3: the honest one ─────────────────────────────────── */

function OracleCard() {
  return (
    <Card className="border-warn/25">
      {/* the tint rides on top of .panel's surface instead of replacing it */}
      <span
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 rounded-2xl bg-warn/[0.02]"
      />

      <div>
        <Badge tone="warn">Trusted — for now</Badge>
      </div>
      <h3 className="text-xl text-white">The watcher is an oracle</h3>
      <CardBody>
        For this build, one off-chain watcher signs the EIP-712 attestation that says
        &ldquo;order X is rejected&rdquo;. If it lies, it can trigger a payout. That is a real
        trust assumption and we are not going to pretend otherwise.
      </CardBody>

      <CardFooter>
        <p className="font-mono text-[0.625rem] tracking-[0.16em] text-mist-dim uppercase">
          Path to trustless
        </p>
        <p className="mt-2.5 text-sm leading-relaxed text-mist text-pretty">
          Read order status directly from CAP&rsquo;s escrow contract on Base and drop the signer
          entirely. Until then: one key, disclosed.
        </p>
      </CardFooter>
    </Card>
  );
}

const CARDS = [TrustlessCard, InheritedCard, OracleCard];

/* ── anti-sybil footer ──────────────────────────────────────── */

const SYBIL_STATS: { value: string; label: string }[] = [
  { value: "9", label: "unique buyers" },
  { value: "6", label: "external agents" },
  { value: "3", label: "counterparties" },
];

function AntiSybil() {
  return (
    <div className="panel-flat border-l-2 border-l-warn/50 p-6">
      <div className="flex flex-col gap-6 md:flex-row md:items-center md:justify-between md:gap-10">
        <div className="min-w-0">
          <p className="font-mono text-[0.625rem] tracking-[0.16em] text-warn uppercase">
            Anti-sybil note
          </p>
          <p className="mt-3 max-w-2xl text-[0.9375rem] leading-relaxed text-mist text-pretty">
            A market with four agents that all belong to us would look exactly like wash trading.
            So HALON is open: 9 distinct wallets have bought coverage, 6 of them belong to agents
            we did not build. Cover on your agent is free this week — that is not generosity, it
            is the only honest proof that the thing composes.
          </p>
        </div>

        <dl className="flex shrink-0 gap-8 sm:gap-10">
          {SYBIL_STATS.map((s) => (
            /* col-reverse: <dt> must precede <dd> in the DOM, value reads first on screen. */
            <div key={s.label} className="flex flex-col-reverse gap-1">
              <dt className="font-mono text-[0.625rem] tracking-wide text-mist-dim uppercase whitespace-nowrap">
                {s.label}
              </dt>
              <dd className="tabular font-display text-xl text-white">{s.value}</dd>
            </div>
          ))}
        </dl>
      </div>
    </div>
  );
}

/* ── section ────────────────────────────────────────────────── */

export function TrustModel() {
  return (
    <Section
      id="trust"
      eyebrow="Trust model"
      title="What you're trusting, stated plainly."
      lead="Most of this is enforced by contracts. One part is not, and we would rather tell you than have you find it."
    >
      <div className="grid gap-5 md:grid-cols-3">
        {CARDS.map((CardContent, i) => (
          <Reveal key={i} delay={i * 90} className="h-full">
            <CardContent />
          </Reveal>
        ))}
      </div>

      <Reveal delay={270} className="mt-5">
        <AntiSybil />
      </Reveal>
    </Section>
  );
}
