"use client";

import Link from "next/link";
import { HalonMark } from "@/components/ui/logo";
import { useState } from "react";

/* ── data ─────────────────────────────────────────────────────── */

const NAV_GROUPS = [
  {
    title: "Get Started",
    items: [
      { label: "Quick Start", href: "#quick-start" },
      { label: "Concepts", href: "#concepts" },
    ],
  },
  {
    title: "Trade",
    items: [
      { label: "Trading Overview", href: "#trading" },
      { label: "Swapping", href: "#swapping" },
      { label: "Custom Linking", href: "#linking" },
    ],
  },
  {
    title: "Liquidity",
    items: [
      { label: "Liquidity Overview", href: "#liquidity" },
      { label: "Liquidity Provisioning", href: "#provisioning" },
      { label: "Liquidity Launchpad", href: "#launchpad" },
      { label: "HalonX", href: "#halonx" },
    ],
  },
  {
    title: "Reference",
    items: [{ label: "SDK Reference", href: "#sdk" }],
  },
] as const;

const CONCEPTS = [
  {
    title: "Coverage binding",
    body: "A client buys cover from an underwriter before hiring a worker agent. Premium lands in the PolicyPool inside the same pay-tx — atomically, not as a follow-up transfer.",
  },
  {
    title: "Discharge cascade",
    body: "When a worker misses its deadline, the pool discharges to the client automatically and the underwriter's own reinsurance cascades in behind it. Nobody pulls the trigger.",
  },
  {
    title: "Reliability index",
    body: "Every score is derived from on-chain order history — completed against rejected and expired. It is the only input the pricing model needs, and anyone can recompute it.",
  },
  {
    title: "Capital & yield",
    body: "Underwriters deposit into a PolicyPool, earn premiums on the cover they write, and withdraw their share on demand. All collateral is tokenized on Base.",
  },
];

const SDK_REFERENCE = [
  {
    name: "getPremium",
    signature: "getPremium(request)",
    desc: "Quote the premium for a coverage request before you bind. Pricing is a pure function of the worker's reliability index.",
    params: [
      { name: "request.worker", type: "Address", desc: "Worker agent being covered." },
      { name: "request.coverage", type: "string", desc: "Payout size, e.g. \"5000_USDC\"." },
      { name: "request.deadline", type: "number", desc: "SLA window in seconds." },
    ],
    returns: "Quote — { id, premium, expiry }",
    example: `const quote = await halon.getPremium({
  worker: "0xAgent…",
  coverage: "5000_USDC",
  deadline: 3600,
});`,
  },
  {
    name: "bindDirect",
    signature: "bindDirect(params)",
    desc: "Bind cover directly to a worker agent without a separate quote step. Use when you already trust the on-chain price.",
    params: [
      { name: "params.worker", type: "Address", desc: "Worker agent being covered." },
      { name: "params.coverage", type: "string", desc: "Payout size." },
      { name: "params.deadline", type: "number", desc: "SLA window in seconds." },
    ],
    returns: "Policy — { id, status }",
    example: `const policy = await halon.bindDirect({
  worker: "0xAgent…",
  coverage: "5000_USDC",
  deadline: 3600,
});`,
  },
  {
    name: "bindWithPremium",
    signature: "bindWithPremium(params)",
    desc: "Quote, bind, and pay the premium in a single transaction. The premium settles into the PolicyPool atomically.",
    params: [{ name: "params.quoteId", type: "string", desc: "Id returned by getPremium." }],
    returns: "Policy — { id, status, txHash }",
    example: `const policy = await halon.bindWithPremium({
  quoteId: quote.id,
});`,
  },
  {
    name: "verifySLA",
    signature: "verifySLA(orderId)",
    desc: "Read a worker agent's SLA outcome from on-chain order history — completed against rejected and expired.",
    params: [{ name: "orderId", type: "string", desc: "Order to check." }],
    returns: "SLAResult — { met, completed, rejected, expired }",
    example: `const sla = await halon.verifySLA("order_123");
if (!sla.met) {
  await halon.adjudicateClaim({ orderId: "order_123" });
}`,
  },
  {
    name: "adjudicateClaim",
    signature: "adjudicateClaim(params)",
    desc: "Resolve a claim against on-chain SLA proof. No custodian and no human in the loop — the pool discharges on a valid proof.",
    params: [
      { name: "params.orderId", type: "string", desc: "Order the claim is against." },
      { name: "params.proof", type: "bytes?", desc: "Optional SLA proof; derived on-chain if omitted." },
    ],
    returns: "Claim — { id, payout, status }",
    example: `const claim = await halon.adjudicateClaim({
  orderId: "order_123",
});`,
  },
  {
    name: "executeBridge",
    signature: "executeBridge(policyId)",
    desc: "Cascade capital down the reinsurance layers. Called automatically on discharge; exposed for manual settlement.",
    params: [{ name: "policyId", type: "string", desc: "Policy whose reinsurance should cascade." }],
    returns: "BridgeReceipt — { layers, total }",
    example: `await halon.executeBridge(policy.id);`,
  },
  {
    name: "depositCapital",
    signature: "depositCapital(params)",
    desc: "Provide liquidity to a PolicyPool as an underwriter and start earning premiums on the cover it writes.",
    params: [
      { name: "params.pool", type: "Address", desc: "Target PolicyPool." },
      { name: "params.amount", type: "string", desc: "Deposit size, e.g. \"10000_USDC\"." },
    ],
    returns: "Position — { shares, poolId }",
    example: `const pos = await halon.depositCapital({
  pool: "0xPool…",
  amount: "10000_USDC",
});`,
  },
  {
    name: "withdrawCapital",
    signature: "withdrawCapital(params)",
    desc: "Redeem your share of pool capital and accrued premiums. Subject to cover currently in force.",
    params: [
      { name: "params.pool", type: "Address", desc: "PolicyPool to withdraw from." },
      { name: "params.shares", type: "string", desc: "Share amount to redeem." },
    ],
    returns: "Withdrawal — { amount, txHash }",
    example: `await halon.withdrawCapital({
  pool: "0xPool…",
  shares: pos.shares,
});`,
  },
  {
    name: "claimYield",
    signature: "claimYield(pool)",
    desc: "Collect the premiums your provided cover has earned, without unwinding your capital position.",
    params: [{ name: "pool", type: "Address", desc: "PolicyPool to claim from." }],
    returns: "Yield — { claimed, txHash }",
    example: `const y = await halon.claimYield("0xPool…");`,
  },
];

/* ── reusable code block with copy ────────────────────────────── */

function CodeBlock({ code, lang = "typescript" }: { code: string; lang?: string }) {
  const [copied, setCopied] = useState(false);
  const copy = () => {
    navigator.clipboard.writeText(code);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };
  return (
    <div className="relative my-4 overflow-hidden rounded-xl border border-line bg-surface-2">
      <div className="flex items-center justify-between border-b border-line bg-surface-3 px-4 py-2">
        <span className="font-mono text-[0.7rem] uppercase tracking-wider text-[#777]">{lang}</span>
        <button
          onClick={copy}
          className="font-mono text-[0.7rem] text-[#777] transition-colors hover:text-lime"
        >
          {copied ? "Copied" : "Copy"}
        </button>
      </div>
      <pre className="overflow-x-auto p-4 font-mono text-[0.8rem] leading-relaxed text-[#d4d4d4]">
        <code>{code}</code>
      </pre>
    </div>
  );
}

function SectionHeading({ id, kicker, title }: { id: string; kicker?: string; title: string }) {
  return (
    <div className="mb-6 scroll-mt-24" id={id}>
      {kicker && (
        <div className="mb-2 font-mono text-[0.7rem] uppercase tracking-[0.16em] text-lime">
          {kicker}
        </div>
      )}
      <h2 className="text-2xl font-medium text-fg md:text-3xl">{title}</h2>
    </div>
  );
}

/* ── page ─────────────────────────────────────────────────────── */

export default function DocsPage() {
  const [copied, setCopied] = useState(false);

  const handleCopy = () => {
    navigator.clipboard.writeText("npx skills add halon/halon-ai --skill swap-protection");
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="min-h-screen bg-surface font-sans text-mist overflow-x-hidden selection:bg-lime/30">
      {/* DEVELOPER HEADER */}
      <header className="sticky top-0 z-50 flex h-16 items-center justify-between border-b border-line bg-surface px-6">
        <div className="flex items-center gap-3">
          <Link href="/" className="flex items-center gap-2 transition-opacity hover:opacity-80">
            <HalonMark eager className="h-6 w-auto" />
            <span className="text-lg font-medium tracking-tight text-fg">Developers</span>
          </Link>
        </div>

        <nav className="absolute left-1/2 hidden -translate-x-1/2 items-center gap-8 text-sm font-medium md:flex">
          <a href="#top" className="text-fg">Docs</a>
          <a href="#sdk" className="transition-colors hover:text-fg">API Reference</a>
          <a href="#concepts" className="transition-colors hover:text-fg">Resources</a>
        </nav>

        <div className="flex items-center gap-4">
          <Link href="/portfolio" className="text-[#999] transition-colors hover:text-fg text-sm">
            Dashboard
          </Link>
          <Link href="/login" className="rounded-full bg-lime px-4 py-1.5 text-sm font-semibold text-lime-ink transition-colors hover:bg-lime/90">
            API keys
          </Link>
        </div>
      </header>

      {/* MAIN LAYOUT */}
      <div className="relative mx-auto flex w-full max-w-[1440px]">
        {/* SIDEBAR */}
        <aside className="custom-scrollbar sticky top-16 hidden h-[calc(100vh-4rem)] w-[280px] shrink-0 overflow-y-auto border-r border-line p-6 lg:block">
          <div className="relative mb-8">
            <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="11" cy="11" r="8"></circle><line x1="21" y1="21" x2="16.65" y2="16.65"></line></svg>
            </div>
            <input
              type="text"
              placeholder="Search"
              className="w-full rounded-lg border border-line bg-surface-3 py-2 pl-9 pr-8 text-sm text-fg outline-none transition-colors focus:border-lime/50"
            />
            <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center pr-3 text-[#555]">
              /
            </div>
          </div>

          <nav className="space-y-8">
            {NAV_GROUPS.map((group) => (
              <div key={group.title}>
                <h3 className="mb-3 text-sm font-bold text-fg">{group.title}</h3>
                <ul className="space-y-2.5 text-sm text-[#999]">
                  {group.items.map((item) => (
                    <li key={item.href}>
                      <a href={item.href} className="block transition-colors hover:text-lime">
                        {item.label}
                      </a>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </nav>
        </aside>

        {/* MAIN CONTENT */}
        <main className="relative min-w-0 flex-1 p-8 md:p-12 lg:p-16">
          {/* Subtle grid background */}
          <div
            className="pointer-events-none absolute inset-0 opacity-[0.03]"
            style={{
              backgroundImage:
                "linear-gradient(#fff 1px, transparent 1px), linear-gradient(90deg, #fff 1px, transparent 1px)",
              backgroundSize: "32px 32px",
            }}
          />

          <div className="relative z-10 mx-auto max-w-4xl scroll-mt-24" id="top">
            {/* HERO */}
            <div className="mb-24 flex flex-col items-start justify-between gap-12 xl:flex-row">
              <div className="flex-1">
                <h1 className="mb-6 text-5xl font-medium leading-[1.1] tracking-tight text-fg md:text-6xl">
                  HALON<br />Documentation
                </h1>
                <p className="mb-8 max-w-md text-lg text-[#999]">
                  Integrate coverage, cascade reinsurance, and provide liquidity with AI-friendly,
                  on-chain tooling on Base.
                </p>
                <div className="flex gap-4">
                  <a
                    href="#quick-start"
                    className="rounded-full bg-lime px-6 py-3 font-medium text-lime-ink transition-colors hover:bg-lime/90"
                  >
                    Quick start
                  </a>
                  <a
                    href="#sdk"
                    className="rounded-full bg-lime/10 px-6 py-3 font-medium text-lime transition-colors hover:bg-lime/20"
                  >
                    SDK reference
                  </a>
                </div>
              </div>

              {/* QUICK START WIDGET */}
              <div className="w-full shrink-0 overflow-hidden rounded-2xl border border-line bg-surface-2 shadow-2xl xl:w-[480px]">
                <div className="flex items-center justify-between border-b border-line bg-surface-3 px-4 py-3">
                  <span className="text-sm font-medium text-fg">Quick Start</span>
                  <button onClick={handleCopy} className="text-[#999] transition-colors hover:text-fg">
                    {copied ? (
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#c8e63c" strokeWidth="2"><polyline points="20 6 9 17 4 12"></polyline></svg>
                    ) : (
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path></svg>
                    )}
                  </button>
                </div>
                <div className="overflow-x-auto p-6 font-mono text-sm leading-relaxed">
                  <span className="text-[#999]">npx</span> <span className="text-[#A78BFA]">skills</span>{" "}
                  <span className="text-[#60A5FA]">add</span>{" "}
                  <span className="text-fg">halon/halon-ai --skill swap-protection</span>
                </div>
              </div>
            </div>

            {/* GUIDES */}
            <div className="mb-20">
              <h2 className="mb-6 text-2xl font-medium text-fg">Guides</h2>
              <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
                <a href="#swapping" className="group cursor-pointer rounded-2xl border border-[#26361B] bg-[#151E12] p-8 transition-colors hover:border-lime/50">
                  <div className="mb-2 flex items-center gap-4">
                    <div className="flex h-10 w-10 items-center justify-center rounded-full bg-lime/20 text-lime">
                      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"></path><polyline points="3.27 6.96 12 12.01 20.73 6.96"></polyline></svg>
                    </div>
                    <h3 className="text-xl font-medium text-fg transition-colors group-hover:text-lime">Bind cover</h3>
                  </div>
                  <p className="ml-14 text-[#999]">Insure a worker agent in one call</p>
                </a>

                <a href="#liquidity" className="group cursor-pointer rounded-2xl border border-[#1E3A32] bg-[#0F1E1A] p-8 transition-colors hover:border-mint/50">
                  <div className="mb-2 flex items-center gap-4">
                    <div className="flex h-10 w-10 items-center justify-center rounded-full bg-mint/20 text-mint">
                      <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor"><path d="M12 2.69l5.66 5.66a8 8 0 1 1-11.31 0z" /></svg>
                    </div>
                    <h3 className="text-xl font-medium text-fg transition-colors group-hover:text-mint">Provide liquidity</h3>
                  </div>
                  <p className="ml-14 text-[#999]">Underwrite and earn premiums</p>
                </a>
              </div>
            </div>

            {/* QUICK START */}
            <section className="mb-20">
              <SectionHeading id="quick-start" kicker="Get Started" title="Quick start" />
              <p className="max-w-2xl text-[#999] leading-relaxed">
                {`Install the SDK, authenticate with your API key, and bind your first policy. Every call is a thin wrapper over the on-chain Halon Router — no forks, no shims.`}
              </p>

              <h3 className="mb-1 mt-8 text-lg font-medium text-fg">1. Install</h3>
              <CodeBlock lang="bash" code={`npm install @halon/sdk
# or wire it straight into an agent
npx skills add halon/halon-ai --skill swap-protection`} />

              <h3 className="mb-1 mt-8 text-lg font-medium text-fg">2. Authenticate</h3>
              <p className="max-w-2xl text-[#999] leading-relaxed">
                {`Create a client with your API key. Set HALON_API_KEY in your environment — never hardcode it.`}
              </p>
              <CodeBlock code={`import { Halon } from "@halon/sdk";

const halon = new Halon({
  apiKey: process.env.HALON_API_KEY!,
  chain: "base",
});`} />

              <h3 className="mb-1 mt-8 text-lg font-medium text-fg">3. Bind your first policy</h3>
              <p className="max-w-2xl text-[#999] leading-relaxed">
                {`Quote a premium for a worker agent, then bind and pay in one transaction.`}
              </p>
              <CodeBlock code={`const quote = await halon.getPremium({
  worker: "0xAgent…",
  coverage: "5000_USDC",
  deadline: 3600,
});

const policy = await halon.bindWithPremium({ quoteId: quote.id });
console.log(policy.status); // "bound"`} />
            </section>

            {/* CONCEPTS */}
            <section className="mb-20">
              <SectionHeading id="concepts" kicker="Get Started" title="Core concepts" />
              <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
                {CONCEPTS.map((c) => (
                  <div
                    key={c.title}
                    className="rounded-2xl border border-line bg-surface-2 p-6 transition-colors hover:border-lime/40"
                  >
                    <h3 className="mb-2 text-lg font-medium text-fg">{c.title}</h3>
                    <p className="text-sm leading-relaxed text-[#999]">{c.body}</p>
                  </div>
                ))}
              </div>
            </section>

            {/* TRADING */}
            <section className="mb-20">
              <SectionHeading id="trading" kicker="Trade" title="Trading overview" />
              <p className="max-w-2xl text-[#999] leading-relaxed">
                {`Coverage is priced, bound, and settled entirely on-chain. A client buys cover from an underwriter before hiring a worker; the underwriter immediately cedes part of that risk to a reinsurer. When the worker misses its deadline, capital moves back down the chain automatically.`}
              </p>

              <h3 className="mb-1 mt-10 scroll-mt-24 text-lg font-medium text-fg" id="swapping">Swapping</h3>
              <p className="max-w-2xl text-[#999] leading-relaxed">
                {`Bind cover in a single call. bindWithPremium quotes, binds, and settles the premium into the PolicyPool atomically — the premium is part of the pay-tx, not a follow-up transfer.`}
              </p>
              <CodeBlock code={`const policy = await halon.bindWithPremium({
  quoteId: (await halon.getPremium({
    worker: "0xAgent…",
    coverage: "5000_USDC",
    deadline: 3600,
  })).id,
});`} />

              <h3 className="mb-1 mt-10 scroll-mt-24 text-lg font-medium text-fg" id="linking">Custom linking</h3>
              <p className="max-w-2xl text-[#999] leading-relaxed">
                {`Verify a worker's SLA outcome and adjudicate a claim from your own backend. verifySLA reads on-chain order history; a failed SLA lets you file a claim that the pool discharges without a custodian.`}
              </p>
              <CodeBlock code={`const sla = await halon.verifySLA("order_123");
if (!sla.met) {
  const claim = await halon.adjudicateClaim({ orderId: "order_123" });
  console.log(claim.payout);
}`} />
            </section>

            {/* LIQUIDITY */}
            <section className="mb-20">
              <SectionHeading id="liquidity" kicker="Liquidity" title="Liquidity overview" />
              <p className="max-w-2xl text-[#999] leading-relaxed">
                {`Underwriters deposit into a PolicyPool, earn premiums on the cover it writes, and withdraw their share on demand. All collateral is tokenized on Base and anyone can audit the pool.`}
              </p>

              <h3 className="mb-1 mt-10 scroll-mt-24 text-lg font-medium text-fg" id="provisioning">Liquidity provisioning</h3>
              <p className="max-w-2xl text-[#999] leading-relaxed">
                {`Deposit capital to start underwriting, then claim accrued premiums without unwinding your position.`}
              </p>
              <CodeBlock code={`const pos = await halon.depositCapital({
  pool: "0xPool…",
  amount: "10000_USDC",
});

// later — collect earned premiums
const y = await halon.claimYield("0xPool…");`} />

              <h3 className="mb-1 mt-10 scroll-mt-24 text-lg font-medium text-fg" id="launchpad">Liquidity launchpad</h3>
              <p className="max-w-2xl text-[#999] leading-relaxed">
                {`Bootstrap a new PolicyPool for a class of worker agents. Set the initial capital and the pool is live for binding immediately.`}
              </p>

              <h3 className="mb-1 mt-10 scroll-mt-24 text-lg font-medium text-fg" id="halonx">HalonX</h3>
              <p className="max-w-2xl text-[#999] leading-relaxed">
                {`HalonX exposes the reinsurance layer: cede risk from one pool to another and cascade capital across layers with executeBridge on discharge.`}
              </p>
              <CodeBlock code={`await halon.executeBridge(policy.id);`} />
            </section>

            {/* SDK REFERENCE */}
            <section className="mb-20">
              <div className="mb-6 flex items-baseline justify-between scroll-mt-24" id="sdk">
                <div>
                  <div className="mb-2 font-mono text-[0.7rem] uppercase tracking-[0.16em] text-lime">
                    Reference
                  </div>
                  <h2 className="text-2xl font-medium text-fg md:text-3xl">SDK reference</h2>
                </div>
                <span className="hidden text-sm text-[#777] sm:block">Nine methods. No forks, no shims.</span>
              </div>

              <div className="space-y-4">
                {SDK_REFERENCE.map((m) => (
                  <div
                    key={m.name}
                    className="scroll-mt-24 overflow-hidden rounded-2xl border border-line bg-surface-2"
                    id={`sdk-${m.name}`}
                  >
                    <div className="border-b border-line px-6 py-4">
                      <code className="font-mono text-sm text-lime">{m.signature}</code>
                      <p className="mt-2 text-sm leading-relaxed text-[#999]">{m.desc}</p>
                    </div>
                    <div className="grid gap-6 px-6 py-5 md:grid-cols-2">
                      <div>
                        <div className="mb-2 font-mono text-[0.65rem] uppercase tracking-[0.16em] text-[#777]">
                          Parameters
                        </div>
                        <ul className="space-y-2">
                          {m.params.map((p) => (
                            <li key={p.name} className="text-sm">
                              <code className="font-mono text-[#d4d4d4]">{p.name}</code>
                              <span className="text-[#666]"> · {p.type}</span>
                              <div className="text-[#999]">{p.desc}</div>
                            </li>
                          ))}
                        </ul>
                        <div className="mb-2 mt-4 font-mono text-[0.65rem] uppercase tracking-[0.16em] text-[#777]">
                          Returns
                        </div>
                        <code className="font-mono text-sm text-[#d4d4d4]">{m.returns}</code>
                      </div>
                      <div>
                        <div className="mb-2 font-mono text-[0.65rem] uppercase tracking-[0.16em] text-[#777]">
                          Example
                        </div>
                        <pre className="overflow-x-auto rounded-lg border border-line bg-surface p-4 font-mono text-[0.75rem] leading-relaxed text-[#d4d4d4]">
                          <code>{m.example}</code>
                        </pre>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </section>

            {/* NEXT STEPS */}
            <section className="mb-16 rounded-2xl border border-line bg-surface-2 p-8">
              <h2 className="mb-2 text-xl font-medium text-fg">Ready to build?</h2>
              <p className="mb-6 max-w-lg text-sm leading-relaxed text-[#999]">
                Grab an API key, open the dashboard to watch policies bind and discharge live, or
                read the protocol overview.
              </p>
              <div className="flex flex-wrap gap-3">
                <Link href="/login" className="rounded-full bg-lime px-5 py-2.5 text-sm font-semibold text-lime-ink transition-colors hover:bg-lime/90">
                  Get API keys
                </Link>
                <Link href="/portfolio" className="rounded-full border border-line px-5 py-2.5 text-sm font-medium text-mist transition-colors hover:text-fg">
                  Open dashboard
                </Link>
              </div>
            </section>
          </div>
        </main>
      </div>
    </div>
  );
}
