// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

/**
 * @title  RiskEngine
 * @notice HALON's pricing model. `premium = f(reliability, coverage, tenor, utilization)`.
 * @dev    Pure `view`. No storage, no owner, no upgrade path — deploy it and read it.
 *
 * ── Two hazards, not one ─────────────────────────────────────────────────────
 *
 * CAP gives an order two terminal failure states, and they are not the same
 * risk, so we do not price them as one.
 *
 *   rejectionHazard = 1 − reliability                       (client refused the delivery)
 *   expiryHazard    = rejectionHazard × β × tenor / 24      (worker blew slaDeadline)
 *   totalHazard     = min(rejectionHazard + expiryHazard, 1)
 *
 *   expectedLoss = coverage × totalHazard        ← the actuarially fair premium
 *   riskLoad     = λ × rejectionHazard           λ = 0.75, convex in risk
 *   utilFactor   = 1 + κ × utilization²          κ = 0.60, scarce capital is dear
 *   expenseFee   = max($0.25, 1% × coverage)     underwriter opex
 *
 *   premium = expectedLoss × (1 + riskLoad) × utilFactor + expenseFee
 *
 * ── The solvency invariant ───────────────────────────────────────────────────
 *
 * `riskLoad >= 0` and `utilFactor >= 1`, so the real-valued product is never
 * below `expectedLoss`. `expectedLoss` is an integer, and `floor(x) >= n` for
 * any integer `n <= x`. Therefore, for every input this contract accepts:
 *
 *     premium >= expectedLoss + expenseFee > expectedLoss
 *
 * That is a property of the arithmetic, not a constant somebody tuned. It is
 * why the whole loaded product is computed with a *single* division by BPS²
 * rather than two chained ones — an intermediate `floor` would surrender it.
 * `RiskEngineTest.testFuzz_SolvencyIsStructural` holds it to that.
 *
 * ── Units ────────────────────────────────────────────────────────────────────
 *
 * Money is USDC base units — 6 decimals, so $1.00 is 1_000_000. Rates, hazards
 * and factors are basis points (1e4 = 100%). The contract never rounds money to
 * the cent: it returns the exact micro-USDC figure, because that is what will
 * actually move through `PolicyPool`. Rounding to two decimals is a *display*
 * concern and belongs in the dashboard.
 *
 * ── Divergence from the TypeScript twin ──────────────────────────────────────
 *
 * `dashboard/lib/risk-engine.ts` mirrors this file, with two knowable gaps:
 *
 *  1. It rounds `premium` to the cent and then derives `cededPremium`,
 *     `netPremium` and the margins from that *rounded* number. This contract
 *     derives them from the exact one. Subtracting rounded figures is not the
 *     same as rounding a subtraction, so `netPremium` and `underwriterMargin`
 *     can land one cent apart. On the README's reference policy the contract
 *     says $16.166742 net (→ $16.17) where the TS twin prints $16.16.
 *
 *  2. `tenorFactor` here floors `β × tenor / 24`; in floats it does not. They
 *     differ by half a basis point on odd tenors, and agree exactly on even ones.
 *
 * Whichever way those are reconciled, this contract is the side that moves USDC.
 */
contract RiskEngine {
    /* ── Fixed-point ─────────────────────────────────────────── */

    /// @notice 100%, in basis points.
    uint256 public constant BPS = 10_000;
    /// @dev Denominator for the one combined division in `quote`.
    uint256 private constant BPS_SQ = BPS * BPS;
    /// @dev One US dollar, in USDC base units.
    uint256 private constant USDC = 1e6;

    /* ── Model parameters ────────────────────────────────────── */

    /// @notice λ — convexity of the risk load in rejection hazard. 0.75
    uint256 public constant RISK_LOAD_LAMBDA_BPS = 7_500;
    /// @notice β — how fast expiry risk accumulates per reference tenor. 0.15
    uint256 public constant EXPIRY_BETA_BPS = 1_500;
    /// @notice κ — utilization surcharge coefficient. 0.60
    uint256 public constant UTIL_KAPPA_BPS = 6_000;
    /// @notice Underwriter opex as a share of coverage. 1%
    uint256 public constant EXPENSE_RATE_BPS = 100;
    /// @notice Opex floor. $0.25
    uint256 public constant MIN_EXPENSE = USDC / 4;
    /// @notice Expiry exposure is measured in 24h units.
    uint256 public constant TENOR_REF_HOURS = 24;

    /* ── Underwriting limits ─────────────────────────────────── */

    /**
     * @notice Below this reliability the pool declines at any price. 60%
     * @dev At 60% the technical premium is already most of the coverage — past
     *      here you are not buying insurance, you are prepaying the loss.
     */
    uint256 public constant RELIABILITY_FLOOR_BPS = 6_000;
    /// @notice Rate-on-line cap. A quote needing more than this is declined, not capped. 75%
    uint256 public constant MAX_RATE_BPS = 7_500;
    /// @notice Quota-share treaty: the fraction of every loss the reinsurer picks up. 50%
    uint256 public constant CEDED_SHARE_BPS = 5_000;
    /// @notice The slice of ceded premium the underwriter keeps for originating. 10%
    uint256 public constant CEDING_COMMISSION_BPS = 1_000;

    /* ── Input bounds ────────────────────────────────────────── */

    /// @notice One year. Beyond this the expiry model is meaningless, so refuse rather than extrapolate.
    uint256 public constant MAX_TENOR_HOURS = 8_760;
    /// @notice $1e12 of cover. Orders of magnitude past any pool; exists so `quote` cannot overflow.
    uint256 public constant MAX_COVERAGE = 1e18;

    error TenorTooLong(uint256 tenorHours);
    error CoverageTooLarge(uint256 coverage);

    /* ── Types ───────────────────────────────────────────────── */

    /// @notice Why a quote is not insurable. Mirrors `declineReason` in the TS twin.
    enum Decline {
        None,
        ZeroCoverage,
        BelowFloor,
        RateCapped,
        LoadingTooThin
    }

    /// @dev Money fields are USDC base units; `*Bps` fields are basis points.
    struct Quote {
        bool insurable;
        Decline decline;
        // hazards
        uint256 rejectionHazardBps;
        uint256 expiryHazardBps;
        uint256 totalHazardBps;
        // losses
        uint256 baseLoss; // coverage × rejectionHazard — before any tenor exposure
        uint256 expectedLoss; // coverage × totalHazard — the fair premium
        // loadings
        uint256 riskLoadBps;
        uint256 tenorFactorBps; // always >= BPS: it multiplies the hazard, never the loading
        uint256 utilFactorBps; // always >= BPS
        uint256 expenseFee;
        // price
        uint256 premium;
        uint256 rateBps; // premium / coverage
        uint256 loading; // premium − expectedLoss, always > 0
        bool rateCapped;
        // reinsurance leg, Pool A → Pool B
        uint256 cededShareBps;
        uint256 cededPremium;
        uint256 netRetention;
        uint256 netPremium;
        int256 underwriterMargin; // expected P&L per policy, per layer
        int256 reinsurerMargin;
    }

    /* ── The model ───────────────────────────────────────────── */

    /**
     * @notice Price one policy.
     * @param  reliabilityBps  HALON Reliability Index of the insured agent, 0..BPS. Clamped.
     * @param  coverage        Indemnity the policy pays on discharge, USDC base units.
     * @param  tenorHours      How long the cover stays armed.
     * @param  utilizationBps  locked / total capital of the writing pool, 0..BPS. Clamped.
     */
    function quote(uint256 reliabilityBps, uint256 coverage, uint256 tenorHours, uint256 utilizationBps)
        external
        pure
        returns (Quote memory q)
    {
        if (tenorHours > MAX_TENOR_HOURS) revert TenorTooLong(tenorHours);
        if (coverage > MAX_COVERAGE) revert CoverageTooLarge(coverage);

        uint256 reliability = reliabilityBps > BPS ? BPS : reliabilityBps;
        uint256 utilization = utilizationBps > BPS ? BPS : utilizationBps;

        // Hazards. Tenor moves the hazard; it never touches the loading, so a
        // shorter window cannot make a coin flip cheaper than the coin flip.
        q.rejectionHazardBps = BPS - reliability;
        q.tenorFactorBps = BPS + (EXPIRY_BETA_BPS * tenorHours) / TENOR_REF_HOURS;
        q.expiryHazardBps = (q.rejectionHazardBps * (q.tenorFactorBps - BPS)) / BPS;

        uint256 total = q.rejectionHazardBps + q.expiryHazardBps;
        q.totalHazardBps = total > BPS ? BPS : total;

        // Loadings.
        q.riskLoadBps = (RISK_LOAD_LAMBDA_BPS * q.rejectionHazardBps) / BPS;
        q.utilFactorBps = BPS + (UTIL_KAPPA_BPS * utilization * utilization) / BPS_SQ;

        // Losses.
        q.baseLoss = (coverage * q.rejectionHazardBps) / BPS;
        q.expectedLoss = (coverage * q.totalHazardBps) / BPS;

        uint256 proportionalFee = (coverage * EXPENSE_RATE_BPS) / BPS;
        q.expenseFee = proportionalFee < MIN_EXPENSE ? MIN_EXPENSE : proportionalFee;

        // One division, not two. See the solvency invariant above.
        q.premium = (q.expectedLoss * (BPS + q.riskLoadBps) * q.utilFactorBps) / BPS_SQ + q.expenseFee;
        q.loading = q.premium - q.expectedLoss;

        // Rate-on-line, rounded half-up so it matches what the dashboard prints.
        q.rateBps = coverage == 0 ? 0 : (q.premium * BPS + coverage / 2) / coverage;

        // Underwriting decision. A quote through the cap is declined, not capped.
        bool belowFloor = reliability < RELIABILITY_FLOOR_BPS;
        q.rateCapped = coverage > 0 && q.premium * BPS > coverage * MAX_RATE_BPS;

        // The reinsurer absorbs `cededShare` of the loss but is paid only
        // `cededShare × (1 − cedingCommission)` of the premium. Solve for when it
        // still clears zero and `cededShare` cancels out of both sides entirely:
        //
        //     premium × (1 − cedingCommission) >= expectedLoss
        //
        // i.e. the loading must be at least thick enough to fund the commission.
        // It usually is — but `riskLoad` is a function of `rejectionHazard` alone
        // while a long tenor inflates `expectedLoss`, so past roughly 1,400 hours
        // the loading thins out and Pool B is underwater on a policy that clears
        // both the reliability floor and the rate cap. Writing cover we cannot
        // cede on the treaty's terms is precisely how the layer beneath us fails.
        // So we decline, rather than quietly hand Bastion Re a losing contract.
        bool loadingTooThin = coverage > 0 && q.premium * (BPS - CEDING_COMMISSION_BPS) < q.expectedLoss * BPS;

        q.insurable = coverage > 0 && !belowFloor && !q.rateCapped && !loadingTooThin;

        if (coverage == 0) {
            q.decline = Decline.ZeroCoverage;
        } else if (belowFloor) {
            q.decline = Decline.BelowFloor;
        } else if (q.rateCapped) {
            q.decline = Decline.RateCapped;
        } else if (loadingTooThin) {
            q.decline = Decline.LoadingTooThin;
        }

        // Reinsurance leg. Not a separate contract — an ordinary CAP order from
        // A to B — but the money has to be worked out here, where the model is.
        q.cededShareBps = CEDED_SHARE_BPS;
        q.cededPremium = (q.premium * CEDED_SHARE_BPS * (BPS - CEDING_COMMISSION_BPS)) / BPS_SQ;
        q.netPremium = q.premium - q.cededPremium;
        q.netRetention = (coverage * (BPS - CEDED_SHARE_BPS)) / BPS;

        // Expected P&L per policy. For an insurable quote both are non-negative —
        // Pool A structurally, Pool B by way of the `loadingTooThin` guard above.
        // Signed anyway: a future model change should surface here as a negative
        // margin the fuzzer catches, not underflow into a very large positive one.
        // Every term is bounded by MAX_COVERAGE × 2.8e4 << 2^255, so no cast wraps.
        uint256 retainedLoss = (q.netRetention * q.totalHazardBps) / BPS;
        uint256 cededLoss = (coverage * CEDED_SHARE_BPS * q.totalHazardBps) / BPS_SQ;
        // forge-lint: disable-next-line(unsafe-typecast)
        q.underwriterMargin = int256(q.netPremium) - int256(retainedLoss);
        // forge-lint: disable-next-line(unsafe-typecast)
        q.reinsurerMargin = int256(q.cededPremium) - int256(cededLoss);
    }

    /* ── Derived inputs ──────────────────────────────────────── */

    /**
     * @notice The one place reliability is derived. CAP exposes no reputation getter,
     *         so the index is computed from terminal order counts and nothing else.
     * @return Reliability in basis points. Zero for an agent with no history —
     *         an unproven agent is uninsurable, not prime.
     */
    function reliabilityOf(uint256 completed, uint256 rejected, uint256 expired) external pure returns (uint256) {
        uint256 total = completed + rejected + expired;
        if (total == 0) return 0;
        return (completed * BPS) / total;
    }

    /// @notice Pool utilization in basis points, clamped to 100%.
    function poolUtilization(uint256 lockedUsd, uint256 totalCapitalUsd) external pure returns (uint256) {
        if (totalCapitalUsd == 0) return 0;
        if (lockedUsd >= totalCapitalUsd) return BPS;
        return (lockedUsd * BPS) / totalCapitalUsd;
    }
}
