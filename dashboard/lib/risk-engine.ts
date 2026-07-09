/**
 * HALON RiskEngine — the pricing model, in TypeScript.
 *
 * This is a faithful mirror of what `RiskEngine.sol` implements as a pure
 * `view` function. Keeping a TS twin means the dashboard can quote instantly
 * (no RPC round-trip per slider tick) and the numbers on screen are the same
 * numbers the contract would return. Any change here must be mirrored there.
 *
 * ── Two hazards, not one ─────────────────────────────────────────────────
 *
 * CAP gives an order two terminal failure states, and they are not the same
 * risk, so we do not price them as one:
 *
 *   rejected  — the worker delivered and the client refused it.
 *               Probability = 1 − reliability. Independent of the policy window.
 *   expired   — the worker blew `slaDeadline`. The longer the window a policy
 *               covers, the more chances there are to blow one.
 *
 *   rejectionHazard = 1 − reliability
 *   expiryHazard    = rejectionHazard × β × (tenorHours / 24)      β = 0.15
 *   totalHazard     = min(rejectionHazard + expiryHazard, 1)
 *
 *   expectedLoss = coverage × totalHazard          ← the actuarially fair premium
 *   riskLoad     = λ × rejectionHazard             λ = 0.75, convex in risk
 *   utilFactor   = 1 + κ × utilization²            κ = 0.6, scarce capital is dear
 *   expenseFee   = max($0.25, 1% × coverage)       underwriter opex
 *
 *   premium = expectedLoss × (1 + riskLoad) × utilFactor + expenseFee
 *
 * ── The invariant ────────────────────────────────────────────────────────
 * Because `riskLoad ≥ 0`, `utilFactor ≥ 1` and `expenseFee > 0`:
 *
 *     premium ≥ expectedLoss + expenseFee > expectedLoss
 *
 * for every input. Solvency is structural, not a number we tuned into place.
 * An earlier draft multiplied expected loss by √(tenor/24), which quietly priced
 * 12-hour policies *below* their own expected loss. Tenor now moves the hazard,
 * never the loading — a shorter window cannot make a coin flip cheaper than the
 * coin flip.
 *
 * ── The invariant the first one does not buy you ──────────────────────────
 * Solvency for *us* is not solvency for the reinsurer. B absorbs `cededShare`
 * of the loss but is paid only `cededShare × (1 − cedingCommission)` of the
 * premium. Solve for when it clears zero and `cededShare` cancels off both
 * sides, leaving a condition on the loading alone:
 *
 *     premium × (1 − cedingCommission) ≥ expectedLoss
 *
 * `riskLoad` is a function of `rejectionHazard`, but a long tenor inflates
 * `expectedLoss` without touching it — so past ~1,400 hours the loading thins
 * below the 10% commission and B is underwater on a policy that cleared both
 * the reliability floor *and* the rate cap. `RiskEngine.t.sol` found this by
 * fuzzing. We decline those. See `loadingTooThin`.
 *
 * ── Not DESIGN.md's numbers ──────────────────────────────────────────────
 * DESIGN.md §6 illustrates a $100 job at 80% reliability with a $5 premium.
 * Expected loss on that policy is $20. Charging $5 bleeds the pool dry. The
 * dashboard shows the full decomposition so the loading is auditable rather
 * than asserted.
 *
 * ── Solidity notes ───────────────────────────────────────────────────────
 * Everything is expressible in fixed-point bps; there is no `sqrt` left in the
 * model, which makes `RiskEngine.sol` a handful of `mulDiv`s.
 */

/** Convexity of the risk load in rejection hazard. */
export const RISK_LOAD_LAMBDA = 0.75;
/** How fast expiry risk accumulates per reference tenor. */
export const EXPIRY_BETA = 0.15;
/** Utilization surcharge coefficient. */
export const UTIL_KAPPA = 0.6;
/** Underwriter opex, as a share of coverage. */
export const EXPENSE_RATE = 0.01;
export const MIN_EXPENSE_USD = 0.25;
/** Reference tenor: expiry exposure is measured in 24h units. */
export const TENOR_REF_HOURS = 24;

/**
 * Below this reliability the pool declines to quote at any price.
 * At 60% reliability the technical premium is already ~63% of coverage — past
 * here you are not buying insurance, you are prepaying the loss.
 */
export const RELIABILITY_FLOOR = 0.6;
/** Rate-on-line cap. A quote that needs more than this is declined, not capped. */
export const MAX_RATE = 0.75;

/** Quota-share treaty: fraction of every loss the reinsurer picks up. */
export const CEDED_SHARE = 0.5;
/**
 * Ceding commission: the underwriter keeps a slice of the ceded premium as
 * compensation for having originated and serviced the policy. Real treaties
 * run 15–35%; we keep it thin so both layers stay margin-positive.
 */
export const CEDING_COMMISSION = 0.1;

export interface QuoteInput {
  /** 0..1 — HALON Reliability Index of the agent being insured. */
  reliability: number;
  coverageUsd: number;
  tenorHours: number;
  /** 0..1 — locked / total capital of the writing pool. */
  utilization: number;
}

export interface Quote {
  insurable: boolean;
  /** Set when `insurable` is false. */
  declineReason?: string;

  /** 1 − reliability. The chance the worker's delivery gets rejected. */
  rejectionHazard: number;
  /** Extra hazard bought by holding the window open for `tenorHours`. */
  expiryHazard: number;
  /** rejectionHazard + expiryHazard, capped at 1. */
  totalHazard: number;

  /** coverage × rejectionHazard — the loss before any tenor exposure. */
  baseLossUsd: number;
  /** coverage × totalHazard — the actuarially fair premium. */
  expectedLossUsd: number;

  riskLoad: number;
  /** 1 + β × tenor/24. Multiplies the hazard, never the loading. Always ≥ 1. */
  tenorFactor: number;
  utilFactor: number;
  expenseFeeUsd: number;

  /** What the client pays, rounded to the cent for display. */
  premiumUsd: number;
  /** premium / coverage, in basis points. */
  rateBps: number;
  /** How much of the premium is margin over expected loss. Always > 0. */
  loadingUsd: number;
  /** premium / expectedLoss. Structurally > 1. */
  solvencyMultiple: number;
  /** The technical premium blew through MAX_RATE — we decline rather than cap. */
  rateCapped: boolean;
  /**
   * The loading over expected loss is thinner than the ceding commission, so the
   * reinsurer would take its quota share at a structural loss. Declined. In
   * practice this only bites on very long tenors.
   */
  loadingTooThin: boolean;

  /** ── Reinsurance leg (Pool A → Pool B) ── */
  cededShare: number;
  /** Premium the underwriter forwards to the reinsurer. */
  cededPremiumUsd: number;
  /** Coverage the underwriter still carries alone. */
  netRetentionUsd: number;
  /** Premium the underwriter keeps. */
  netPremiumUsd: number;
  /** Expected profit for each layer, per policy. */
  underwriterMarginUsd: number;
  reinsurerMarginUsd: number;
}

const clamp = (n: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, n));
const round2 = (n: number) => Math.round(n * 100) / 100;

/** The one place reliability is derived. CAP exposes no reputation getter. */
export function reliabilityOf(counts: {
  completed: number;
  rejected: number;
  expired: number;
}): number {
  const total = counts.completed + counts.rejected + counts.expired;
  if (total === 0) return 0;
  return counts.completed / total;
}

/** 1 + β × tenor/24. A surcharge on the hazard; never a discount. */
export function tenorFactorOf(tenorHours: number): number {
  return 1 + EXPIRY_BETA * (Math.max(0, tenorHours) / TENOR_REF_HOURS);
}

export function utilFactorOf(utilization: number): number {
  const u = clamp(utilization, 0, 1);
  return 1 + UTIL_KAPPA * u * u;
}

export function quote(input: QuoteInput): Quote {
  const reliability = clamp(input.reliability, 0, 1);
  const coverageUsd = Math.max(0, input.coverageUsd);

  const rejectionHazard = 1 - reliability;
  const tenorFactor = tenorFactorOf(input.tenorHours);
  const expiryHazard = rejectionHazard * (tenorFactor - 1);
  const totalHazard = Math.min(rejectionHazard + expiryHazard, 1);

  const utilFactor = utilFactorOf(input.utilization);
  const riskLoad = RISK_LOAD_LAMBDA * rejectionHazard;

  const baseLossUsd = coverageUsd * rejectionHazard;
  const expectedLossUsd = coverageUsd * totalHazard;
  const expenseFeeUsd = Math.max(MIN_EXPENSE_USD, EXPENSE_RATE * coverageUsd);

  /**
   * Full precision. premium ≥ expectedLoss + expenseFee > expectedLoss, always.
   *
   * `RiskEngine.sol` works in micro-USDC and never rounds, so every figure below
   * is derived from *this* and rounded exactly once, at the end. Deriving them
   * from `premiumUsd` instead would subtract one rounded number from another,
   * which is not the same as rounding a subtraction — and the chain is the side
   * that actually moves the USDC.
   */
  const premiumRawUsd = expectedLossUsd * (1 + riskLoad) * utilFactor + expenseFeeUsd;
  const premiumUsd = round2(premiumRawUsd);

  const cededPremiumRawUsd = premiumRawUsd * CEDED_SHARE * (1 - CEDING_COMMISSION);
  const netPremiumRawUsd = premiumRawUsd - cededPremiumRawUsd;

  const belowFloor = reliability < RELIABILITY_FLOOR;
  const rateCapped = coverageUsd > 0 && premiumRawUsd > coverageUsd * MAX_RATE;
  // See the header: `cededShare` cancels, leaving a condition on the loading alone.
  const loadingTooThin =
    coverageUsd > 0 && premiumRawUsd * (1 - CEDING_COMMISSION) < expectedLossUsd;
  const insurable = coverageUsd > 0 && !belowFloor && !rateCapped && !loadingTooThin;

  let declineReason: string | undefined;
  if (coverageUsd <= 0) {
    declineReason = "Coverage must be greater than zero";
  } else if (belowFloor) {
    declineReason = `Reliability ${(reliability * 100).toFixed(1)}% is below the ${(
      RELIABILITY_FLOOR * 100
    ).toFixed(0)}% underwriting floor`;
  } else if (rateCapped) {
    declineReason = `Technical premium exceeds the ${(MAX_RATE * 100).toFixed(
      0,
    )}% rate-on-line cap`;
  } else if (loadingTooThin) {
    declineReason = `Loading is too thin to fund the ${(CEDING_COMMISSION * 100).toFixed(
      0,
    )}% ceding commission — the reinsurer would take its quota share at a loss`;
  }

  const cededPremiumUsd = round2(cededPremiumRawUsd);
  const netPremiumUsd = round2(netPremiumRawUsd);
  const netRetentionUsd = round2(coverageUsd * (1 - CEDED_SHARE));

  // Expected P&L per policy, per layer. For an insurable quote both clear zero:
  // Pool A structurally, Pool B by way of the `loadingTooThin` guard above.
  const underwriterMarginUsd = round2(netPremiumRawUsd - netRetentionUsd * totalHazard);
  const reinsurerMarginUsd = round2(
    cededPremiumRawUsd - coverageUsd * CEDED_SHARE * totalHazard,
  );

  return {
    insurable,
    declineReason,
    rejectionHazard,
    expiryHazard,
    totalHazard,
    baseLossUsd: round2(baseLossUsd),
    expectedLossUsd: round2(expectedLossUsd),
    riskLoad,
    tenorFactor,
    utilFactor,
    expenseFeeUsd: round2(expenseFeeUsd),
    premiumUsd,
    rateBps: coverageUsd > 0 ? Math.round((premiumRawUsd / coverageUsd) * 10_000) : 0,
    loadingUsd: round2(premiumRawUsd - expectedLossUsd),
    solvencyMultiple: expectedLossUsd > 0 ? premiumRawUsd / expectedLossUsd : Infinity,
    rateCapped,
    loadingTooThin,
    cededShare: CEDED_SHARE,
    cededPremiumUsd,
    netRetentionUsd,
    netPremiumUsd,
    underwriterMarginUsd,
    reinsurerMarginUsd,
  };
}

export interface CurvePoint {
  reliability: number;
  premiumUsd: number;
  expectedLossUsd: number;
  rateBps: number;
  insurable: boolean;
}

/**
 * Premium as a function of reliability, holding everything else fixed.
 * This is the contract's own output, sampled — not a decorative spline.
 */
export function premiumCurve(
  base: Omit<QuoteInput, "reliability">,
  opts: { from?: number; to?: number; points?: number } = {},
): CurvePoint[] {
  const from = opts.from ?? 0.3;
  const to = opts.to ?? 1;
  const points = Math.max(2, opts.points ?? 72);

  return Array.from({ length: points }, (_, i) => {
    const reliability = from + ((to - from) * i) / (points - 1);
    const q = quote({ ...base, reliability });
    return {
      reliability,
      premiumUsd: q.premiumUsd,
      expectedLossUsd: q.expectedLossUsd,
      rateBps: q.rateBps,
      insurable: q.insurable,
    };
  });
}

export function poolUtilization(pool: { lockedUsd: number; totalCapitalUsd: number }) {
  if (pool.totalCapitalUsd <= 0) return 0;
  return clamp(pool.lockedUsd / pool.totalCapitalUsd, 0, 1);
}

/** Risk band used for badges/colours across the UI. */
export type RiskBand = "prime" | "standard" | "watch" | "declined";

export function riskBand(reliability: number): RiskBand {
  if (reliability < RELIABILITY_FLOOR) return "declined";
  if (reliability >= 0.95) return "prime";
  if (reliability >= 0.8) return "standard";
  return "watch";
}

export const RISK_BAND_LABEL: Record<RiskBand, string> = {
  prime: "Prime",
  standard: "Standard",
  watch: "Watchlist",
  declined: "Declined",
};
