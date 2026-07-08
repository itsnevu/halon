# HALON — dashboard

> Suppression layer for the agent economy.
> Nobody pulls the trigger. It just discharges.

The front end for HALON: on-chain insurance and reinsurance for autonomous agents,
built on the CROO Agent Protocol.

```bash
npm install
npm run dev      # http://localhost:3000
npm run build
```

Next.js 16 (App Router) · React 19 · Tailwind v4 · TypeScript strict.
**Zero runtime dependencies beyond React** — every chart, sparkline, icon and animation
is hand-rolled SVG or CSS. No chart library, no icon pack, no animation library.

---

## Where the numbers come from

Nothing on this page is a hardcoded marketing number.

| Layer | File | What it does |
| --- | --- | --- |
| Pricing model | [`lib/risk-engine.ts`](lib/risk-engine.ts) | A pure TS twin of `RiskEngine.sol`. Same inputs, same output. |
| Fixture | [`lib/data.ts`](lib/data.ts) | Agents, pools, policies, events. **Premiums are computed by calling `quote()`**, never typed in. |
| Formatting | [`lib/format.ts`](lib/format.ts) | The only place money, percentages and hashes get stringified. |
| Types | [`lib/types.ts`](lib/types.ts) | Shapes the real contract/CAP reads will fill. |

Move the slider in the Quote Engine and every figure in the decomposition table —
expected loss, risk load, tenor factor, utilization surcharge, ceded premium, both
layers' expected margins — recomputes from the same function the contract runs.

### The model

CAP gives an order **two** terminal failure states, and they are not the same risk, so
we don't price them as one. `rejected` is the worker delivering something the client
refuses — independent of how long the policy runs. `expired` is the worker blowing
`slaDeadline` — the longer the window, the more chances to blow one.

```
rejectionHazard = 1 − reliability
expiryHazard    = rejectionHazard × β × (tenorHours / 24)     β = 0.15
totalHazard     = min(rejectionHazard + expiryHazard, 1)

expectedLoss    = coverage × totalHazard                      ← actuarially fair premium
riskLoad        = λ × rejectionHazard                         λ = 0.75, convex in risk
utilFactor      = 1 + κ × utilization²                        κ = 0.6, scarce capital is dear
expenseFee      = max($0.25, 1% × coverage)

premium = expectedLoss × (1 + riskLoad) × utilFactor + expenseFee
```

Three properties worth defending out loud:

1. **`premium > expectedLoss` for every input — structurally.** Since `riskLoad ≥ 0`,
   `utilFactor ≥ 1` and `expenseFee > 0`, the premium can never fall below expected loss
   plus opex. It isn't a number we tuned into place; it falls out of the algebra. The UI
   shows the *solvency multiple* (`premium / expectedLoss`) on every quote so you can check.
2. **Tenor moves the hazard, never the loading.** An earlier draft multiplied expected
   loss by `√(tenor/24)`, which quietly priced 12-hour policies *below* their own expected
   loss (solvency 0.89×). A shorter window cannot make a coin flip cheaper than the coin flip.
3. **Below 60% reliability the pool declines to quote at any price.** At exactly 60% the
   technical premium is already 63% of coverage — past there you aren't buying insurance,
   you're prepaying the loss. `Nomad Scraper` (41%) exists in the registry to show that state.

> ⚠️ This is calibrated, not the illustrative "$5 premium on $100 cover" from `DESIGN.md` §6.
> At 80% reliability the fair premium on $100 of cover is $23 — $5 would have bled the pool
> dry within a dozen policies. See "Pricing correction" below.

### Reinsurance leg

A 50% quota-share treaty with a 10% ceding commission. Both layers come out
margin-positive in expectation — which is the only reason either agent shows up:

```
cededPremium = premium × 0.5 × 0.9
netRetention = coverage × 0.5
```

---

## Swapping the fixture for chain reads

`lib/data.ts` is the only module that invents data. Replace its exports with
viem/wagmi reads and **no component changes**:

| Export | Real source |
| --- | --- |
| `AGENTS[].completed / rejected / expired` | CAP `client.listOrders({ agentId, status })` |
| `AGENTS[].reliability` | `reliabilityOf()` over those counts — CAP exposes no reputation getter |
| `POOL_A` / `POOL_B` | `PolicyPool.totalCapital()`, `.locked()`, `.claimsPaid()` |
| `POLICIES` | `PolicyPool` ERC-721 enumeration + policy struct |
| `EVENTS` | `connectWebSocket()` + contract event logs |

Two invariants the fixture upholds, and any replacement must too:

- **No `Math.random()` or `Date.now()` during render.** Timestamps are stored as
  `agoSeconds` / `boundAgoSeconds` (relative), so server and client HTML match and the
  fixture never goes stale. Clocks tick from a `useEffect` counter after mount.
- **Money is derived, not stored.** Policy premiums come from `quote()`.

---

## Design system

`app/globals.css` is the single source of truth. Near-black canvas, one loud lime,
everything else grayscale. **Red (`text-danger`) is reserved for failure, rejection,
discharge and declined states — never decoration.**

Tokens: `ink · ink-2 · surface · surface-2 · surface-3 · line · line-soft · mist ·
mist-dim · lime · lime-soft · lime-deep · lime-ink · danger · warn · info`

Utilities: `.panel` (glass card w/ hairline top highlight) · `.grid-bg` · `.noise` ·
`.tabular` · `.glow-lime` · `.mask-fade-*` · `.stripe-lime` / `.stripe-danger`

Primitives live in [`components/ui/`](components/ui/) — `Panel`, `Section`, `Badge`,
`Button`, `Reveal`, `CountUp`, `Sparkline`, `HalonMark`.

---

## Pricing correction vs. DESIGN.md

`DESIGN.md` §6 walks through a $100 job at 80% reliability with a **$5 premium** and a
**$2 reinsurance cede**. Those numbers are illustrative and, taken literally, insolvent:
a 20% rejection hazard on $100 of cover has an expected loss of **$23** over a 24h policy.

The engine here prices that same policy at **$28.50** (rate 2,850 bps), of which
**$12.83** is ceded to Bastion Re, leaving Sentinel a **$15.67** net premium against a
**$50** net retention — an expected margin of **$4.17** for Sentinel and **$1.33** for
Bastion Re. Both layers are margin-positive, which is the only reason either agent
bothers to show up.

The demo story gets *better*, not worse: move Aurora from 80% → 95% reliability and the
premium collapses **$28.50 → $7.20**. That is a far sharper "the pricing is alive" moment
than $5 → $2, and it survives a judge who does the arithmetic.

If you want DESIGN.md's exact numbers back, the knobs are `RISK_LOAD_LAMBDA`,
`EXPENSE_RATE` and the `expectedLoss` term in `lib/risk-engine.ts` — but you would be
choosing a pool that loses money on every policy it writes.

### Full fixture, re-checked

Every policy in `lib/data.ts`, priced by the engine:

| Policy | Reliability | Cover | Tenor | Premium | Expected loss | Solvency | Sentinel margin | Bastion margin |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| #1042 Aurora | 80% | $100 | 24h | $28.50 | $23.00 | 1.24× | $4.17 | $1.33 |
| #1041 Aurora | 82% | $250 | 12h | $59.59 | $48.38 | 1.23× | $8.58 | $2.63 |
| #1039 Kite | 94% | $500 | 48h | $47.37 | $39.00 | 1.22× | $6.55 | $1.82 |
| #1036 Foundry | 67% | $300 | 24h | $150.67 | $113.85 | 1.32× | $25.95 | $10.88 |
| #1031 Lumen | 97% | $1,200 | 72h | $67.49 | $52.20 | 1.29× | $11.02 | $4.27 |
| #1028 Ferry | 88% | $800 | 24h | $133.11 | $110.40 | 1.21× | $18.01 | $4.70 |
| #1024 Cinder | 96% | $2,000 | 168h | $195.63 | $164.00 | 1.19× | $25.60 | $6.03 |
| #1019 Foundry | 71% | $400 | 24h | $172.86 | $133.40 | 1.30× | $28.37 | $11.09 |
| Nomad | 41% | — | — | **declined** | — | — | — | — |
