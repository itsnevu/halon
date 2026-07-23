import Link from "next/link";
import type { ReactNode } from "react";
import { HalonMark } from "@/components/ui/logo";
import { SiteFooter } from "@/components/cta-footer";

export const metadata = {
  title: "HALON — Whitepaper",
  description:
    "On-chain insurance and reinsurance for the failure of work executed under an SLA.",
};

/* ── table of contents ────────────────────────────────────────── */

const SECTIONS = [
  { n: "01", id: "abstract", title: "Abstract" },
  { n: "02", id: "problem", title: "The problem" },
  { n: "03", id: "principles", title: "Design principles" },
  { n: "04", id: "architecture", title: "Protocol architecture" },
  { n: "05", id: "contracts", title: "Core contracts" },
  { n: "06", id: "risk-model", title: "The risk model" },
  { n: "07", id: "reliability", title: "The Reliability Index" },
  { n: "08", id: "reinsurance", title: "Reinsurance & the cascade" },
  { n: "09", id: "claims", title: "Claim lifecycle" },
  { n: "10", id: "capital", title: "Capital & yield" },
  { n: "11", id: "pow", title: "Proof of Work" },
  { n: "12", id: "trust", title: "Trust & security" },
  { n: "13", id: "token", title: "Token" },
  { n: "14", id: "deployment", title: "Technology & deployment" },
  { n: "15", id: "glossary", title: "Glossary" },
] as const;

/* ── content, as data (strings only → no JSX-escaping hazards) ──── */

type Block =
  | { t: "h2"; id: string; n: string; title: string }
  | { t: "h3"; title: string }
  | { t: "p"; text: string }
  | { t: "code"; code: string }
  | { t: "ul"; items: string[] }
  | { t: "table"; head: string[]; rows: string[][] };

const BLOCKS: Block[] = [
  { t: "h2", id: "abstract", n: "01", title: "Abstract" },
  {
    t: "p",
    text: "Autonomous software now transacts on its own behalf. Agents hire agents; relayers execute cross-chain intents; solvers take orders with deadlines attached. In every case one party pays another to perform work under a service-level agreement (SLA), and in every case the buyer carries a loss it cannot price or offload if the work fails.",
  },
  {
    t: "p",
    text: "HALON is the missing primitive: a market that prices that failure and pays it out automatically. A buyer purchases cover before the work begins; the premium settles into a capital pool; if the covered order reaches a terminal `failed` or `expired` state, the pool discharges the full coverage to the policy holder without a claim form, a custodian, or a human decision. The underwriting pool protects itself the same way — by buying reinsurance from a deeper pool — so a single loss cascades down layered balance sheets exactly as it does in the real insurance industry.",
  },
  {
    t: "p",
    text: "This document describes the protocol as implemented in this repository: five Solidity contracts, a closed-form actuarial pricing model, an EIP-712 attestation path for observing failures, an agent runtime, and a companion application (Proof of Work) that applies the same risk engine to human freelancers. It is deliberately honest about where trust currently sits and what is not yet built.",
  },

  { t: "h2", id: "problem", n: "02", title: "The problem" },
  { t: "p", text: "On-chain, the transaction is solved and the trust is not." },
  {
    t: "p",
    text: "When an agent hires another agent, or a user routes an intent through a relayer, real value moves under an SLA. The counterparty may fail: deliver something the buyer rejects, or blow the deadline entirely. Human commerce absorbs this with contracts, reputation, chargebacks, and courts. Machine commerce has none of it. If the executor fails, the buyer eats the loss in full, with no recourse.",
  },
  {
    t: "p",
    text: "Escrow does not close this gap. Escrow guarantees that the money deposited is the money returned; it holds stakes, it does not cover losses, and it has no opinion on how likely a counterparty is to fail. What the machine economy lacks is insurance — a way to price risk, sell protection, and pay claims automatically at machine speed. Human insurance cannot be retrofitted onto it: weeks-long adjudication and five-to-seven-business-day settlement do not survive contact with actors that transact hundreds of times an hour.",
  },
  { t: "p", text: "HALON is built for that constraint. Cover is armed in advance and discharges on its own." },

  { t: "h2", id: "principles", n: "03", title: "Design principles" },
  {
    t: "p",
    text: "The name is the mechanism. Halon is the inert gas in a server room ceiling. No technician decides to release it; a sensor reads the fire and the valve opens. HALON works the same way: when an order is observed to have failed, the pool pays out — no approval, no vote. The vocabulary follows the metaphor: a live policy is armed, a payout is a discharge, recovery from a reinsurer is a cascade, and the split between risk kept and risk passed on is retention versus cede.",
  },
  {
    t: "p",
    text: "Trust is a number, and it is auditable. Pricing is a pure function of a reliability index derived, in the open, from an executor's own on-chain history. There is no private reputation oracle to trust.",
  },
  {
    t: "p",
    text: "Solvency is structural, not tuned. The pricing model is constructed so that the premium always exceeds the expected loss plus expenses, for every input — an inequality that holds by algebra, not by parameter choice.",
  },
  {
    t: "p",
    text: "Honest boundaries beat fake trustlessness. Where the MVP relies on a trusted observer, it says so in the code and names the roadmap that removes it.",
  },

  { t: "h2", id: "architecture", n: "04", title: "Protocol architecture" },
  {
    t: "code",
    code: `┌───────────────────────────────────────────────────────────────┐
│  DASHBOARD  (Next.js · wagmi · viem · ConnectKit)             │
│  quotes · pool stats · policy book · claims feed · Earn       │
├───────────────────────────────────────────────────────────────┤
│  AGENT RUNTIME  (Node · TypeScript)                           │
│  Underwriter agents · Watcher (observes failures, attests)    │
├───────────────────────────────────────────────────────────────┤
│  HALON CONTRACTS  (Solidity ^0.8.20 · OpenZeppelin v5)        │
│  HalonRouter → PolicyPool → RiskEngine / DynamicRiskEngine    │
│               ClaimsAdjudicator (EIP-712 attestations)        │
├───────────────────────────────────────────────────────────────┤
│  SETTLEMENT LAYER  (intent / order protocol, USDC escrow)     │
│  supplies the terminal failed / expired signal HALON reacts to│
├───────────────────────────────────────────────────────────────┤
│  EVM L2 + USDC   (wired to Robinhood Chain; design portable)  │
└───────────────────────────────────────────────────────────────┘`,
  },
  {
    t: "p",
    text: "HALON does not reinvent settlement or order execution. It sits on top of an intent/order protocol that already produces terminal `failed` and `expired` states, and layers a risk market over them. All value is denominated in USDC; policies are ERC-721 tokens.",
  },

  { t: "h2", id: "contracts", n: "05", title: "Core contracts" },
  {
    t: "p",
    text: "The protocol is five contracts. One vault does the balance-sheet work for both the insurer and the reinsurer; a pricing engine quotes; an adjudicator turns an observed failure into a payout; a router is the buyer's entry point.",
  },
  { t: "h3", title: "5.1 · PolicyPool" },
  {
    t: "p",
    text: "A USDC vault that writes cover, mints each policy as an ERC-721, and pays claims. A single deployment serves both roles: Pool A writes cover for clients, Pool B reinsures Pool A. A reinsurance treaty is not a special type — it is an ordinary policy in Pool B whose beneficiary is Pool A's address, which is why `PolicyPool` implements `IERC721Receiver` and holds its own treaties as NFTs.",
  },
  {
    t: "ul",
    items: [
      "Roles. `UNDERWRITER_ROLE` binds policies and executes cedes; `ADJUDICATOR_ROLE` discharges claims; `CAPITAL_ROLE` deposits and withdraws capital; `DEFAULT_ADMIN_ROLE` sets the cede recipient and pauses.",
      "Premium arrives before the pool is told. The settlement layer's pay transaction transfers the premium straight to the pool as a plain ERC-20 transfer — no hook fires. The pool reconciles by balance delta: `sync()` sweeps unaccounted USDC into `pendingInflow`, and bind refuses to write a policy whose premium has not actually landed (`PremiumNotReceived`).",
      "Capital is locked gross, then released against a verified treaty. At bind, the pool locks the full coverage. `attachReinsurance` does not take the underwriter's word for the cede: it reads the treaty out of the reinsurer's own storage and checks that this pool holds the treaty NFT, that the treaty is armed, sized within coverage, and does not lapse before the policy. Only then is `cededCoverage` released. Net effect: Pool A locks its retention, Pool B locks the ceded share, together exactly the coverage — never more.",
      "Discharge pays in full. `discharge` pays the whole coverage to the current NFT holder and releases only the retention, so a claim paid before its cascade recovery lands leaves the book briefly under-reserved — a real state `freeCapital()` reports as zero and `underReserved()` reports as true. The pool stops writing new cover; it never stops paying.",
      "Settlement. After the claim window (`CLAIM_WINDOW` = 1 hour) past expiry with no claim, anyone may call `settle` to release the locked capital.",
      "No LP shares — by choice. Capital belongs to whoever holds `CAPITAL_ROLE`; withdrawals are bounded by free capital. A share-based vault must price locked capital and pending claims into the share price, and the authors deliberately did not ship that rather than ship it subtly wrong. (See §10.)",
    ],
  },
  { t: "h3", title: "5.2 · RiskEngine and DynamicRiskEngine" },
  { t: "p", text: "The pricing model (§6), implemented twice with an identical closed form:" },
  {
    t: "ul",
    items: [
      "`RiskEngine` — a pure `view` function with the loadings and limits as `constant`s. Everything reduces to fixed-point `mulDiv`s; there is no `sqrt`.",
      "`DynamicRiskEngine` — the same quote with the parameters moved into storage behind bounded `Ownable` setters, so governance can retune the book without redeploying and re-wiring every pool. Its getters (`BPS()`, `CEDED_SHARE_BPS()`, `CEDING_COMMISSION_BPS()`) share signatures with `RiskEngine`, so a pool holding either behind a `RiskEngine` reference works unchanged.",
    ],
  },
  { t: "h3", title: "5.3 · ClaimsAdjudicator" },
  {
    t: "p",
    text: "Turns a signed observation of a failed order into a discharge, and cascades the recovery on the way.",
  },
  {
    t: "ul",
    items: [
      "The Watcher attests. An off-chain process holding `ATTESTOR_ROLE` signs an EIP-712 attestation binding the pool, policy id, intent id, outcome, whether a proof was submitted, its content hash, and when it was observed. The digest is bound to the policy's own `intentId`, so an attestation about one failed order can never discharge a different policy.",
      "Auto-pay vs. dispute. An `expired` order, or a `failed` order where no proof was ever submitted, is auto-payable and discharges without a human. A `failed` order with a submitted proof — the executor delivered and the buyer refused — is never auto-paid; it routes to `dischargeDisputed`, gated by `DISPUTE_RESOLVER_ROLE`.",
      "Cascade first, pay unconditionally. `_settleClaim` attempts recovery from the reinsurer first (so the cedent's book is never briefly short), but wraps it in `try/catch`: if the reinsurer cannot pay, that is logged as `CascadeFailed` and the client is paid anyway. The discharge is not conditional on the cascade.",
      "Hardening. Attestations carry a 1-hour TTL, are single-use by digest (replay protection), and require `threshold` signatures from distinct attestors enforced by strictly-ascending signer order — so 1-of-1 becomes k-of-n without a code change. Only pools registered by the admin can be acted on.",
    ],
  },
  { t: "h3", title: "5.4 · HalonRouter" },
  {
    t: "p",
    text: "The buyer's entry point for insuring a cross-chain intent. `routeAndBind` pulls the buyer's token, converts it to the USDC premium the pool needs, approves the pool, and calls `bindDirect` in one transaction, refunding any excess. In the current build the swap is a mock (a production version would call a DEX such as Uniswap V3); the binding path it wraps is real.",
  },

  { t: "h2", id: "risk-model", n: "06", title: "The risk model" },
  {
    t: "p",
    text: "A quote is a pure function of four inputs: the executor's reliability, the coverage requested, the policy tenor, and the writing pool's utilization. Two failure modes are priced separately because they are not the same risk:",
  },
  {
    t: "ul",
    items: [
      "Rejection — the executor delivered and the buyer refused. Probability `1 − reliability`, independent of the policy window.",
      "Expiry — the executor blew the deadline. The longer the window, the more chances to blow one.",
    ],
  },
  { t: "h3", title: "Hazards" },
  {
    t: "code",
    code: `rejectionHazard = 1 − reliability
tenorFactor     = 1 + β · (tenorHours / 24)            β = 0.15
expiryHazard    = rejectionHazard · (tenorFactor − 1)
totalHazard     = min(rejectionHazard + expiryHazard, 1)`,
  },
  { t: "h3", title: "Premium" },
  {
    t: "code",
    code: `expectedLoss = coverage · totalHazard          ← actuarially fair premium
riskLoad     = λ · rejectionHazard             λ = 0.75  (convex in risk)
utilFactor   = 1 + κ · utilization²            κ = 0.60  (scarce capital is dear)
expenseFee   = max($0.25, 1% · coverage)       underwriter opex

premium = expectedLoss · (1 + riskLoad) · utilFactor + expenseFee`,
  },
  {
    t: "p",
    text: "The solvency invariant. Because riskLoad ≥ 0, utilFactor ≥ 1, and expenseFee greater than 0, premium ≥ expectedLoss + expenseFee, which is strictly greater than expectedLoss for every input. Solvency is a property of the algebra, not a tuned number. Tenor moves the hazard, never the loading — a shorter window can never make a coin flip cheaper than the coin flip. (An earlier draft multiplied expected loss by √(tenor/24), which quietly priced short policies below their own expected loss; it was removed.)",
  },
  { t: "p", text: "Underwriting limits. A quote is declined, not silently capped, when it fails any of:" },
  {
    t: "table",
    head: ["Guard", "Condition", "Meaning"],
    rows: [
      ["Reliability floor", "`reliability < 0.60`", "below this you are prepaying the loss, not insuring it"],
      ["Rate-on-line cap", "`premium > 0.75 · coverage`", "the honest price exceeds what cover is worth"],
      ["Loading too thin", "`premium · (1 − commission) < expectedLoss`", "the reinsurer would take its quota share at a loss"],
    ],
  },
  {
    t: "p",
    text: "Worked example. Cover a $100 order on an executor with 80% reliability, 24h tenor, fresh pool (0% utilization):",
  },
  {
    t: "code",
    code: `rejectionHazard 0.20 · tenorFactor 1.15 → totalHazard 0.23
expectedLoss = $23.00
premium = 23 · 1.15 · 1 + 1 = $27.45      (27.45% rate-on-line)
loading over expected loss = $4.45 · solvency multiple 1.19×
ceded to reinsurer = $12.35 · underwriter keeps $15.10`,
  },
  {
    t: "p",
    text: "This deliberately corrects the illustrative $5 premium in early design notes: the expected loss alone on that policy is $23, and a pool that charges $5 bleeds out. The dashboard shows the full decomposition so the loading is auditable rather than asserted.",
  },
  {
    t: "p",
    text: "Risk bands (for UI badges): prime ≥ 95%, standard ≥ 80%, watch ≥ 60%, declined below 60%.",
  },

  { t: "h2", id: "reliability", n: "07", title: "The Reliability Index" },
  {
    t: "p",
    text: "The settlement layer exposes no reputation getter, so HALON derives one — which is better for auditability, because anyone can recompute it from the same public record:",
  },
  { t: "code", code: `reliability = completed / (completed + rejected + expired)` },
  {
    t: "p",
    text: "counted over an executor's terminal order history. This single figure is the only behavioral input the pricing model needs. Because premiums are a function of it, the market has a memory: an executor that just failed becomes more expensive to insure, one with a long clean record becomes cheaper, and the price is the market's continuously published opinion of who is worth hiring.",
  },

  { t: "h2", id: "reinsurance", n: "08", title: "Reinsurance and the cascade" },
  {
    t: "p",
    text: "An underwriter does not carry the whole risk alone. HALON implements a quota-share treaty: the reinsurer takes a fixed fraction of every loss and is paid the same fraction of the premium, less a ceding commission that compensates the cedent for originating the policy.",
  },
  {
    t: "code",
    code: `cededShare        = 50%        fraction of each loss the reinsurer absorbs
cedingCommission  = 10%        slice of ceded premium the cedent keeps
cededPremium      = premium · cededShare · (1 − cedingCommission)`,
  },
  { t: "p", text: "The flow, with the worked example above:" },
  {
    t: "code",
    code: `Buyer ──premium $27.45──▶ Pool A ──ceded $12.35──▶ Pool B
Buyer ──order $100──────▶ Executor

Executor FAILS (expired / failed-no-proof):
  Pool A ──discharge $100──▶ Buyer        full coverage, to the NFT holder
  Pool B ──recovery $50────▶ Pool A       its 50% quota share, cascaded
  Realized loss: Pool A $50, Pool B $50`,
  },
  {
    t: "p",
    text: "The treaty is verified, not trusted: `attachReinsurance` reads Pool B's storage and confirms the NFT is held, the treaty is armed, sized within coverage, and outlives the policy. A treaty the cedent was allowed to write is, by the loading guard, always a treaty the reinsurer is allowed to accept — the same inequality seen from both sides. The cascade recurses as deep as capital is willing to go.",
  },

  { t: "h2", id: "claims", n: "09", title: "Claim lifecycle" },
  {
    t: "code",
    code: `Status:  None → Armed → Discharged        claim paid
                     └─→ Settled          ran to term, capital released`,
  },
  {
    t: "ul",
    items: [
      "Bind. Premium lands; the pool locks coverage, mints the policy NFT to the beneficiary, and the policy is armed.",
      "Hedge. The underwriter draws the ceded premium to its settlement wallet, buys the reinsurance treaty, and attaches it — releasing the ceded capital.",
      "Observe. The Watcher sees a terminal `failed`/`expired` event and signs an attestation within its TTL.",
      "Adjudicate. `ClaimsAdjudicator.discharge` verifies signatures, the intent match, and auto-payability; cascades recovery from the reinsurer; then discharges the pool to the policy holder.",
      "Or settle. If no claim arrives within the claim window past expiry, anyone calls `settle` and the locked capital returns to free capital.",
    ],
  },
  {
    t: "p",
    text: "Disputed deliveries (proof submitted, buyer refused) are the sole exception and require a human resolver — an explicitly temporary boundary (§12).",
  },

  { t: "h2", id: "capital", n: "10", title: "Capital and yield" },
  {
    t: "p",
    text: "Underwriting capital earns the premiums on the cover it backs. In the current contract, that capital is role-gated: `depositCapital` / `withdrawCapital` require `CAPITAL_ROLE`, and there is no per-provider share accounting. This is a deliberate MVP boundary, not an oversight — a public, share-priced vault is a distinct and dangerous thing to get wrong.",
  },
  {
    t: "p",
    text: "Consequently, a permissionless provide-liquidity-earn-yield experience is not yet supported by the base contract. Two paths close the gap:",
  },
  {
    t: "ul",
    items: [
      "Permissioned capital console. Expose deposit/withdraw only to holders of `CAPITAL_ROLE` (the underwriting operators). Honest to the contract today.",
      "ERC-4626 vault wrapper. A separate vault holds `CAPITAL_ROLE`, mints shares to depositors, routes their USDC into the pool, and prices shares against `totalCapital`, `lockedCapital`, and `pendingInflow`. This is the production route to public LP yield.",
    ],
  },
  {
    t: "p",
    text: "Data that is readable on-chain today — and should drive any dashboard rather than placeholders — includes `totalCapital`, `lockedCapital`, `freeCapital()`, `premiumsEarned`, `cededPremiumsPaid`, `claimsPaid`, `recoveredTotal`, and `utilizationBps()`. APY has no native field and must be derived (e.g. annualized premiumsEarned / totalCapital) or added as a view.",
  },

  { t: "h2", id: "pow", n: "11", title: "Proof of Work — the same engine, pointed at people" },
  {
    t: "p",
    text: "HALON's companion module applies the identical philosophy — price risk from evidence, back it with capital, settle automatically — to human freelancers on a milestone escrow.",
  },
  {
    t: "ul",
    items: [
      "RWA-collateralized escrow. A client locks tokenized collateral (a stock token such as AAPL, or a stable such as USDG) into an `EscrowProject` deployed by an `EscrowFactory`, with milestone payouts validated against an oracle price.",
      "AI underwriter. A FastAPI service scores a submitted proof-of-work document 0–100 using an LLM (StepFun `step-3.5-flash` via an OpenAI-compatible API), with a deterministic heuristic fallback so a demo never hard-fails. On a clean score it acts as an authorized relayer and signs `approveMilestoneAI` on-chain — the escrow releases the same way a pool discharges a claim: automatically, against evidence.",
      "Advance financing. When a client's on-chain track record is strong enough, `PaymentDistributor` advances most of the payment immediately by borrowing from a lending vault (a Morpho-style pool), and the client repays on normal terms. The freelancer is paid today; liquidity providers earn the yield for making it possible.",
    ],
  },
  {
    t: "p",
    text: "One protocol, two markets: machines insuring machines, and capital-plus-AI standing behind human work.",
  },

  { t: "h2", id: "trust", n: "12", title: "Trust model and security" },
  { t: "p", text: "The system is honest about where trust sits." },
  {
    t: "ul",
    items: [
      "The Watcher is trusted (for now). `ATTESTOR_ROLE` decides that an order failed. It is documented in the code, not hidden, because the roadmap that removes it — reading terminal order status directly from the settlement layer's on-chain escrow — is what makes the discharge trustless. `threshold` lets 1-of-1 become k-of-n attestation without touching the contract.",
      "The one human in the loop. Disputed deliveries require `DISPUTE_RESOLVER_ROLE`. The contract's own comment names the replacement: a challenge window in which the executor posts the content hash it delivered, resolved by a market or court. The MVP does not pretend to have that.",
      "Contract hardening. `ReentrancyGuard` on every value-moving path; `AccessControlDefaultAdminRules` for role management; `Pausable` deposits and binds; EIP-712 typed attestations with TTL, single-use digests, and distinct-signer enforcement; pool allow-listing in the adjudicator so a leaked attestor key cannot name an attacker-controlled pool. Coverage and tenor are bounded so quote cannot overflow. The book is fuzz-tested with Foundry (`RiskEngine.t.sol` found the thin-loading edge case that produced the reinsurer-solvency guard).",
      "Anti-sybil awareness. Because the natural demo looks like value circulating among a few related agents, real composability — external parties buying cover for their own executors — is both the strongest proof of the product and the intended mitigation.",
    ],
  },
  {
    t: "p",
    text: "This is an unaudited hackathon-stage codebase. Nothing here should be treated as production-secure until independently reviewed.",
  },

  { t: "h2", id: "token", n: "13", title: "Token" },
  {
    t: "p",
    text: "The protocol carries the ticker $HLN. A token-economic design — fee capture from premiums, staked underwriting capital, and governance over `DynamicRiskEngine` parameters — is a natural extension of the mechanics above, but it is not specified in the current codebase and is intentionally out of scope for this version. No supply, distribution, or emission is defined; any figure claiming otherwise is not from this repository.",
  },

  { t: "h2", id: "deployment", n: "14", title: "Technology and deployment status" },
  {
    t: "p",
    text: "Stack. Solidity ^0.8.20 with OpenZeppelin v5, built and tested with Foundry. Dashboard in Next.js with wagmi/viem/ConnectKit. Agent runtime in Node/TypeScript. AI scorer in Python/FastAPI. Contract addresses are env-driven so the same build runs against a local node or a public network without code changes.",
  },
  {
    t: "p",
    text: "Chain. Wired to Robinhood Chain (an Arbitrum L2; chain id 4663 mainnet, 46630 testnet), with USDC as the unit of account. The design is chain-agnostic EVM.",
  },
  {
    t: "p",
    text: "Deployment status (honest). As of this repository, the contracts have been deployed and exercised only against a local Anvil node (chain id 31337). The deterministic local addresses are what the dashboard currently reads, which is why live stat tiles that read those addresses show zeros. No public testnet or mainnet deployment exists yet.",
  },
  { t: "h3", title: "Roadmap" },
  {
    t: "ul",
    items: [
      "Deploy the contract suite to Robinhood Chain testnet; wire real addresses via env.",
      "Replace the trusted Watcher with direct on-chain reads of terminal order status (removes the last off-chain trust in the auto-pay path).",
      "Raise attestation `threshold` to k-of-n across independent operators.",
      "Ship the ERC-4626 vault so underwriting capital is a public, share-priced, yield-bearing position (§10).",
      "Replace `HalonRouter`'s mock swap with a real DEX route.",
      "Replace the dispute resolver role with a challenge-window market.",
      "External security review before any value-bearing deployment.",
    ],
  },

  { t: "h2", id: "glossary", n: "15", title: "Glossary" },
  {
    t: "table",
    head: ["Term", "Meaning"],
    rows: [
      ["Armed", "a live, in-force policy"],
      ["Discharge", "an automatic claim payout to the policy holder"],
      ["Cascade", "recovery paid from a reinsurer's pool to the cedent's pool on a claim"],
      ["Retention / Cede", "the share of risk a pool keeps versus the share it passes to a reinsurer"],
      ["Treaty", "a reinsurance policy; a PolicyPool policy whose beneficiary is another pool"],
      ["Reliability Index", "completed / (completed + rejected + expired) over an executor's history"],
      ["Rate-on-line", "premium as a percentage of coverage"],
    ],
  },
];

/* ── inline `code` splitter (keeps everything as safe string exprs) ── */

function inline(text: string): ReactNode[] {
  return text.split("`").map((seg, i) =>
    i % 2 === 1 ? (
      <code
        key={i}
        className="rounded bg-surface-2 px-1.5 py-0.5 font-mono text-[0.85em] text-lime"
      >
        {seg}
      </code>
    ) : (
      <span key={i}>{seg}</span>
    ),
  );
}

function Pre({ children }: { children: string }) {
  return (
    <pre className="my-5 overflow-x-auto rounded-xl border border-line bg-surface-2 p-4 font-mono text-[0.78rem] leading-relaxed text-[#cfd8cf]">
      <code>{children}</code>
    </pre>
  );
}

function renderBlock(b: Block, i: number) {
  switch (b.t) {
    case "h2":
      return (
        <h2
          key={i}
          id={b.id}
          className="mt-16 mb-5 scroll-mt-24 font-display text-2xl font-semibold text-fg md:text-[1.75rem]"
        >
          <span className="mr-3 font-mono text-lime">{b.n}</span>
          {b.title}
        </h2>
      );
    case "h3":
      return (
        <h3 key={i} className="mt-8 mb-3 text-lg font-medium text-fg">
          {b.title}
        </h3>
      );
    case "p":
      return (
        <p key={i} className="mb-4 leading-relaxed text-mist">
          {inline(b.text)}
        </p>
      );
    case "code":
      return <Pre key={i}>{b.code}</Pre>;
    case "ul":
      return (
        <ul key={i} className="mb-5 space-y-2.5">
          {b.items.map((it, j) => (
            <li key={j} className="flex gap-2.5 leading-relaxed text-mist">
              <span className="mt-2 h-1 w-1 shrink-0 rounded-full bg-lime" />
              <span>{inline(it)}</span>
            </li>
          ))}
        </ul>
      );
    case "table":
      return (
        <div key={i} className="my-5 overflow-x-auto">
          <table className="w-full border-collapse text-left text-sm">
            <thead>
              <tr className="border-b border-line">
                {b.head.map((h, j) => (
                  <th
                    key={j}
                    className="px-3 py-2 font-mono text-[0.7rem] font-medium tracking-wider text-lime uppercase"
                  >
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {b.rows.map((r, ri) => (
                <tr key={ri} className="border-b border-line/60">
                  {r.map((c, ci) => (
                    <td key={ci} className="px-3 py-2.5 align-top text-mist">
                      {inline(c)}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      );
  }
}

/* ── page ─────────────────────────────────────────────────────── */

export default function WhitepaperPage() {
  return (
    <div className="min-h-screen bg-surface font-sans text-mist selection:bg-lime/30">
      <header className="sticky top-0 z-50 flex h-16 items-center justify-between border-b border-line bg-surface/90 px-5 backdrop-blur sm:px-6">
        <Link href="/" className="flex items-center gap-2 transition-opacity hover:opacity-80">
          <HalonMark eager className="h-6 w-auto" />
          <span className="text-lg font-medium tracking-tight text-fg">Whitepaper</span>
        </Link>
        <nav className="flex items-center gap-6 text-sm font-medium">
          <Link href="/docs" className="text-mist transition-colors hover:text-fg">
            Docs
          </Link>
          <Link href="/" className="text-mist transition-colors hover:text-fg">
            App
          </Link>
        </nav>
      </header>

      <div className="mx-auto flex max-w-6xl gap-12 px-5 py-12 sm:px-8">
        {/* table of contents */}
        <aside className="sticky top-24 hidden h-[calc(100vh-8rem)] w-56 shrink-0 overflow-y-auto lg:block">
          <div className="mb-3 font-mono text-[0.7rem] tracking-wider text-mist-dim uppercase">
            Contents
          </div>
          <nav className="space-y-0.5">
            {SECTIONS.map((s) => (
              <a
                key={s.id}
                href={`#${s.id}`}
                className="block rounded px-2 py-1.5 text-sm text-mist transition-colors hover:bg-surface-2 hover:text-fg"
              >
                <span className="mr-2 font-mono text-mist-dim">{s.n}</span>
                {s.title}
              </a>
            ))}
          </nav>
        </aside>

        {/* content */}
        <article className="min-w-0 max-w-3xl flex-1">
          <div id="top" className="mb-12 border-b border-line pb-10">
            <div className="mb-3 font-mono text-[0.7rem] tracking-[0.16em] text-lime uppercase">
              Whitepaper · v1
            </div>
            <h1 className="font-display text-4xl font-semibold tracking-tight text-fg md:text-6xl">
              HALON
            </h1>
            <p className="mt-4 text-lg text-mist md:text-xl">
              Suppression layer for the agent economy.
            </p>
            <p className="mt-2 text-sm text-mist-dim italic">
              On-chain insurance and reinsurance for the failure of work executed under an SLA —
              whether that work is an AI agent delivering a service or a relayer executing a
              cross-chain intent.
            </p>
            <p className="mt-4 font-mono text-sm text-mist-dim">
              Nobody pulls the trigger. It just discharges.
            </p>
          </div>

          {BLOCKS.map(renderBlock)}

          <p className="mt-14 border-t border-line pt-8 text-sm text-mist-dim italic">
            HALON — Suppression layer for the agent economy. This whitepaper describes software in
            this repository; it is not investment advice, and the codebase is unaudited and
            pre-deployment.
          </p>
        </article>
      </div>

      <SiteFooter />
    </div>
  );
}
