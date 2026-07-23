// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import {Ownable} from "@openzeppelin/contracts/access/Ownable.sol";

/**
 * @title  DynamicRiskEngine
 * @notice HALON's pricing model with governable parameters.
 * @dev    Same closed-form quote as {RiskEngine}, but its loadings and
 *         underwriting limits live in storage instead of `constant`s, so an
 *         admin can retune the book without redeploying and re-wiring every
 *         PolicyPool. That is the whole reason this engine is `view` and not
 *         `pure`: it reads governed state.
 *
 *         The parameter *names* match {RiskEngine} exactly — `CEDED_SHARE_BPS()`,
 *         `CEDING_COMMISSION_BPS()`, `BPS()` — because `PolicyPool` holds this
 *         contract behind a `RiskEngine` reference (an address cast in the deploy
 *         script) and calls those getters directly. Public storage variables with
 *         the same identifiers generate the same getter signatures, so the cast
 *         keeps working.
 *
 *         The model itself is documented on {RiskEngine}; only the tunability is
 *         new. Setters are bounded so a governance mistake can degrade pricing
 *         but never overflow `quote` or push a share past 100%.
 */
contract DynamicRiskEngine is Ownable {
    /* ── Fixed-point (never governed) ────────────────────────── */

    /// @notice 100%, in basis points.
    uint256 public constant BPS = 10_000;
    /// @dev Denominator for the one combined division in `quote`.
    uint256 private constant BPS_SQ = BPS * BPS;
    /// @dev One US dollar, in USDC base units.
    uint256 private constant USDC = 1e6;
    /// @notice Expiry exposure is measured in 24h units. Structural, not economic.
    uint256 public constant TENOR_REF_HOURS = 24;
    /// @notice One year. Beyond this the expiry model is meaningless.
    uint256 public constant MAX_TENOR_HOURS = 8_760;
    /// @notice $1e12 of cover. Exists so `quote` cannot overflow.
    uint256 public constant MAX_COVERAGE = 1e18;

    /// @dev Upper bound on any loading multiplier, so `quote` arithmetic stays
    ///      far below 2^256 for every governed value.
    uint256 public constant MAX_LOADING_BPS = 50_000; // 5×

    /* ── Governed model parameters ───────────────────────────── */

    /// @notice λ — convexity of the risk load in rejection hazard. 0.75
    uint256 public RISK_LOAD_LAMBDA_BPS = 7_500;
    /// @notice β — how fast expiry risk accumulates per reference tenor. 0.15
    uint256 public EXPIRY_BETA_BPS = 1_500;
    /// @notice κ — utilization surcharge coefficient. 0.60
    uint256 public UTIL_KAPPA_BPS = 6_000;
    /// @notice Underwriter opex as a share of coverage. 1%
    uint256 public EXPENSE_RATE_BPS = 100;
    /// @notice Opex floor. $0.25
    uint256 public MIN_EXPENSE = USDC / 4;

    /* ── Governed underwriting limits ────────────────────────── */

    /// @notice Below this reliability the pool declines at any price. 60%
    uint256 public RELIABILITY_FLOOR_BPS = 6_000;
    /// @notice Rate-on-line cap. A quote needing more than this is declined. 75%
    uint256 public MAX_RATE_BPS = 7_500;
    /// @notice Quota-share treaty: fraction of every loss the reinsurer picks up. 50%
    uint256 public CEDED_SHARE_BPS = 5_000;
    /// @notice The slice of ceded premium the underwriter keeps for originating. 10%
    uint256 public CEDING_COMMISSION_BPS = 1_000;

    /* ── Errors & events ─────────────────────────────────────── */

    error TenorTooLong(uint256 tenorHours);
    error CoverageTooLarge(uint256 coverage);
    error OutOfRange(string parameter, uint256 value);

    event ModelParametersChanged(
        uint256 riskLoadLambdaBps, uint256 expiryBetaBps, uint256 utilKappaBps, uint256 expenseRateBps, uint256 minExpense
    );
    event UnderwritingLimitsChanged(
        uint256 reliabilityFloorBps, uint256 maxRateBps, uint256 cededShareBps, uint256 cedingCommissionBps
    );

    constructor() Ownable(msg.sender) {}

    /* ── Governance ──────────────────────────────────────────── */

    /// @notice Retune the loading model. Multipliers are capped so `quote` cannot overflow.
    function setModelParameters(
        uint256 riskLoadLambdaBps,
        uint256 expiryBetaBps,
        uint256 utilKappaBps,
        uint256 expenseRateBps,
        uint256 minExpense
    ) external onlyOwner {
        if (riskLoadLambdaBps > MAX_LOADING_BPS) revert OutOfRange("riskLoadLambda", riskLoadLambdaBps);
        if (expiryBetaBps > MAX_LOADING_BPS) revert OutOfRange("expiryBeta", expiryBetaBps);
        if (utilKappaBps > MAX_LOADING_BPS) revert OutOfRange("utilKappa", utilKappaBps);
        if (expenseRateBps > BPS) revert OutOfRange("expenseRate", expenseRateBps);

        RISK_LOAD_LAMBDA_BPS = riskLoadLambdaBps;
        EXPIRY_BETA_BPS = expiryBetaBps;
        UTIL_KAPPA_BPS = utilKappaBps;
        EXPENSE_RATE_BPS = expenseRateBps;
        MIN_EXPENSE = minExpense;
        emit ModelParametersChanged(riskLoadLambdaBps, expiryBetaBps, utilKappaBps, expenseRateBps, minExpense);
    }

    /// @notice Retune the underwriting limits. Every share is a fraction of BPS.
    function setUnderwritingLimits(
        uint256 reliabilityFloorBps,
        uint256 maxRateBps,
        uint256 cededShareBps,
        uint256 cedingCommissionBps
    ) external onlyOwner {
        if (reliabilityFloorBps > BPS) revert OutOfRange("reliabilityFloor", reliabilityFloorBps);
        if (maxRateBps > BPS) revert OutOfRange("maxRate", maxRateBps);
        if (cededShareBps > BPS) revert OutOfRange("cededShare", cededShareBps);
        if (cedingCommissionBps > BPS) revert OutOfRange("cedingCommission", cedingCommissionBps);

        RELIABILITY_FLOOR_BPS = reliabilityFloorBps;
        MAX_RATE_BPS = maxRateBps;
        CEDED_SHARE_BPS = cededShareBps;
        CEDING_COMMISSION_BPS = cedingCommissionBps;
        emit UnderwritingLimitsChanged(reliabilityFloorBps, maxRateBps, cededShareBps, cedingCommissionBps);
    }

    /* ── Types ───────────────────────────────────────────────── */

    /// @notice Why a quote is not insurable.
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
        uint256 rejectionHazardBps;
        uint256 expiryHazardBps;
        uint256 totalHazardBps;
        uint256 baseLoss;
        uint256 expectedLoss;
        uint256 riskLoadBps;
        uint256 tenorFactorBps;
        uint256 utilFactorBps;
        uint256 expenseFee;
        uint256 premium;
        uint256 rateBps;
        uint256 loading;
        bool rateCapped;
        uint256 cededShareBps;
        uint256 cededPremium;
        uint256 netRetention;
        uint256 netPremium;
        int256 underwriterMargin;
        int256 reinsurerMargin;
    }

    /* ── The model ───────────────────────────────────────────── */

    function quote(uint256 reliabilityBps, uint256 coverage, uint256 tenorHours, uint256 utilizationBps)
        external
        view
        returns (Quote memory q)
    {
        if (tenorHours > MAX_TENOR_HOURS) revert TenorTooLong(tenorHours);
        if (coverage > MAX_COVERAGE) revert CoverageTooLarge(coverage);

        uint256 reliability = reliabilityBps > BPS ? BPS : reliabilityBps;
        uint256 utilization = utilizationBps > BPS ? BPS : utilizationBps;

        // Hazards. Tenor moves the hazard; it never touches the loading.
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

        // One division, not two, to preserve premium >= expectedLoss.
        q.premium = (q.expectedLoss * (BPS + q.riskLoadBps) * q.utilFactorBps) / BPS_SQ + q.expenseFee;
        q.loading = q.premium - q.expectedLoss;

        q.rateBps = coverage == 0 ? 0 : (q.premium * BPS + coverage / 2) / coverage;

        bool belowFloor = reliability < RELIABILITY_FLOOR_BPS;
        q.rateCapped = coverage > 0 && q.premium * BPS > coverage * MAX_RATE_BPS;
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

        // Reinsurance leg, Pool A → Pool B.
        q.cededShareBps = CEDED_SHARE_BPS;
        q.cededPremium = (q.premium * CEDED_SHARE_BPS * (BPS - CEDING_COMMISSION_BPS)) / BPS_SQ;
        q.netPremium = q.premium - q.cededPremium;
        q.netRetention = (coverage * (BPS - CEDED_SHARE_BPS)) / BPS;

        uint256 retainedLoss = (q.netRetention * q.totalHazardBps) / BPS;
        uint256 cededLoss = (coverage * CEDED_SHARE_BPS * q.totalHazardBps) / BPS_SQ;
        // forge-lint: disable-next-line(unsafe-typecast)
        q.underwriterMargin = int256(q.netPremium) - int256(retainedLoss);
        // forge-lint: disable-next-line(unsafe-typecast)
        q.reinsurerMargin = int256(q.cededPremium) - int256(cededLoss);
    }

    /* ── Derived inputs ──────────────────────────────────────── */

    /// @notice Reliability in basis points from terminal order counts. Zero for no history.
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
