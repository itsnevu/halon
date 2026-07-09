// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import {Test} from "forge-std/Test.sol";
import {RiskEngine} from "../src/RiskEngine.sol";

/**
 * The point of this file is that the contract and the dashboard cannot drift.
 *
 * The `test_Readme*` cases are the three worked examples in README.md, entered
 * as inputs and asserted to the cent. If somebody edits either the model here or
 * `dashboard/lib/risk-engine.ts` without editing the other, these fail.
 *
 * The `testFuzz_*` cases hold the model's stated properties over the whole input
 * space, not over three hand-picked rows:
 *   · premium never dips below expected loss           (solvency is structural)
 *   · a longer tenor never costs less                  (no √tenor discount)
 *   · a more reliable agent never pays more            (monotone in reliability)
 *   · an insurable policy is margin-positive for both layers
 */
contract RiskEngineTest is Test {
    RiskEngine internal engine;

    uint256 internal constant USDC = 1e6;
    uint256 internal constant CENT = 1e4;
    uint256 internal constant BPS = 10_000;

    /// README's reference book: $100 cover, 24h tenor, Sentinel Pool at 35% utilization.
    uint256 internal constant COVER = 100 * USDC;
    uint256 internal constant TENOR = 24;
    uint256 internal constant UTIL = 3_500;

    function setUp() public {
        engine = new RiskEngine();
    }

    /// Round-half-up to the cent — what `round2()` does in the TS twin, and what
    /// the dashboard prints. The contract itself keeps full micro-USDC precision.
    function _cents(uint256 micro) internal pure returns (uint256) {
        return (micro + CENT / 2) / CENT;
    }

    function _cents(int256 micro) internal pure returns (int256) {
        require(micro >= 0, "negative");
        // forge-lint: disable-next-line(unsafe-typecast)
        return int256(_cents(uint256(micro)));
    }

    /* ── README §"Worked examples" ───────────────────────────── */

    /// | 95% | $5.75 | **$7.40** | 740 bps | 1.29x | Prime |
    function test_ReadmeRow_Prime() public view {
        RiskEngine.Quote memory q = engine.quote(9_500, COVER, TENOR, UTIL);

        assertEq(_cents(q.expectedLoss), 575, "expected loss $5.75");
        assertEq(_cents(q.premium), 740, "premium $7.40");
        assertEq(q.rateBps, 740, "740 bps rate-on-line");
        assertTrue(q.insurable);
        assertEq(uint256(q.decline), uint256(RiskEngine.Decline.None));

        // README: "1.29x" solvency multiple = premium / expectedLoss, to 2dp.
        assertEq((q.premium * 100 + q.expectedLoss / 2) / q.expectedLoss, 129);
    }

    /// | 80% | $23.00 | **$29.39** | 2,939 bps | 1.28x | Standard |
    /// Also the policy the whole README narrates, so the cascade legs are pinned here.
    function test_ReadmeRow_Standard() public view {
        RiskEngine.Quote memory q = engine.quote(8_000, COVER, TENOR, UTIL);

        assertEq(q.rejectionHazardBps, 2_000, "1 - 0.80");
        assertEq(q.expiryHazardBps, 300, "0.20 x 0.15 x 24/24");
        assertEq(q.totalHazardBps, 2_300);
        assertEq(q.utilFactorBps, 10_735, "1 + 0.6 x 0.35^2");
        assertEq(q.riskLoadBps, 1_500, "0.75 x 0.20");

        assertEq(_cents(q.expectedLoss), 2_300, "expected loss $23.00");
        assertEq(_cents(q.premium), 2_939, "premium $29.39");
        assertEq(q.rateBps, 2_939, "2,939 bps rate-on-line");
        assertEq(_cents(q.loading), 639, "loading $6.39");
        assertTrue(q.insurable);

        // The reinsurance leg: A cedes 50% of the risk and 45% of the premium.
        assertEq(_cents(q.cededPremium), 1_323, "ceded premium $13.23");
        assertEq(q.netRetention, 50 * USDC, "A still carries $50 alone");
        assertEq(_cents(q.reinsurerMargin), 173, "B earns $1.73");

        // ── Where the README is a cent off, and why ──────────────────────────
        // README: "A keeps $16.16" and "A: +$4.66". Those come from subtracting
        // one rounded number from another ($29.39 - $13.23). The contract
        // subtracts the exact ones: $29.394075 - $13.227333 = $16.166742, which
        // is $16.17 to the cent. Same for the margin. The chain is the side that
        // moves USDC, so these are the true figures.
        assertEq(q.premium, 29_394_075, "exact micro-USDC premium");
        assertEq(q.cededPremium, 13_227_333);
        assertEq(q.netPremium, 16_166_742);
        assertEq(_cents(q.netPremium), 1_617, "A keeps $16.17, not $16.16");
        assertEq(_cents(q.underwriterMargin), 467, "A earns $4.67, not $4.66");
    }

    /// | 55% | $51.75 | *$75.30* | 7,530 bps | 1.46x | Below the 60% floor |
    function test_ReadmeRow_Declined() public view {
        RiskEngine.Quote memory q = engine.quote(5_500, COVER, TENOR, UTIL);

        assertEq(_cents(q.expectedLoss), 5_175, "expected loss $51.75");
        assertEq(_cents(q.premium), 7_530, "technical premium $75.30");
        assertEq(q.rateBps, 7_530);

        assertFalse(q.insurable);
        // Below the floor *and* through the rate cap; the floor is the reason given.
        assertTrue(q.rateCapped);
        assertEq(uint256(q.decline), uint256(RiskEngine.Decline.BelowFloor));
    }

    /* ── Underwriting limits ─────────────────────────────────── */

    /// Exactly at the floor, but a fully-utilized pool pushes the rate through the cap.
    /// The quote is declined, not capped — the distinction README insists on.
    function test_DeclinedByRateCapNotFloor() public view {
        RiskEngine.Quote memory q = engine.quote(6_000, COVER, TENOR, BPS);

        assertEq(q.utilFactorBps, 16_000, "1 + 0.6 at full utilization");
        assertEq(q.rateBps, 9_668);
        assertTrue(q.rateCapped);
        assertFalse(q.insurable);
        assertEq(uint256(q.decline), uint256(RiskEngine.Decline.RateCapped));
    }

    /**
     * A 99%-reliable agent, $1M of cover, an 83-day window, an idle pool: through
     * the reliability floor, through the rate cap (11.4% rate-on-line), and still
     * unwritable. Tenor inflates `expectedLoss` while `riskLoad` — a function of
     * rejection hazard alone — stays put, so the loading thins below the 10%
     * ceding commission and Pool B would take the treaty at a structural loss.
     *
     * The fuzzer found this. It is a hole in the model, not in the port: the same
     * arithmetic is in `dashboard/lib/risk-engine.ts`.
     */
    function test_LongTenorIsDeclinedAsUnreinsurable() public view {
        uint256 million = 1_000_000 * USDC;
        RiskEngine.Quote memory q = engine.quote(9_900, million, 1_500, 0);

        // It clears both limits the README talks about...
        assertGe(uint256(9_900), engine.RELIABILITY_FLOOR_BPS());
        assertFalse(q.rateCapped);
        assertEq(q.rateBps, 1_145, "11.45% rate-on-line, nowhere near the 75% cap");

        // ...and would still hand Pool B a structural loss.
        assertLt(q.reinsurerMargin, int256(0), "the reinsurer is underwater");
        assertLt(
            q.premium * (BPS - engine.CEDING_COMMISSION_BPS()),
            q.expectedLoss * BPS,
            "loading cannot fund the ceding commission"
        );

        assertFalse(q.insurable);
        assertEq(uint256(q.decline), uint256(RiskEngine.Decline.LoadingTooThin));
    }

    /// The same policy over a sane window is perfectly writable. The guard is
    /// narrow: it bites on tenor, not on good risks.
    function test_ShortTenorOnTheSameRiskIsWritable() public view {
        uint256 million = 1_000_000 * USDC;
        RiskEngine.Quote memory q = engine.quote(9_900, million, TENOR, 0);

        assertTrue(q.insurable);
        assertGt(q.reinsurerMargin, int256(0));
    }

    function test_ZeroCoverageIsDeclined() public view {
        RiskEngine.Quote memory q = engine.quote(9_500, 0, TENOR, UTIL);

        assertFalse(q.insurable);
        assertEq(uint256(q.decline), uint256(RiskEngine.Decline.ZeroCoverage));
        assertEq(q.premium, engine.MIN_EXPENSE(), "nothing but the opex floor");
        assertEq(q.rateBps, 0, "no rate on zero coverage");
    }

    function test_SmallCoverageGetsTheExpenseFloor() public view {
        // 1% of $10 is $0.10, under the $0.25 floor.
        RiskEngine.Quote memory q = engine.quote(9_500, 10 * USDC, TENOR, UTIL);
        assertEq(q.expenseFee, engine.MIN_EXPENSE());
    }

    function test_RevertsOnAbsurdTenor() public {
        vm.expectRevert(abi.encodeWithSelector(RiskEngine.TenorTooLong.selector, 8_761));
        engine.quote(9_500, COVER, 8_761, UTIL);
    }

    function test_RevertsOnAbsurdCoverage() public {
        uint256 tooMuch = engine.MAX_COVERAGE() + 1;
        vm.expectRevert(abi.encodeWithSelector(RiskEngine.CoverageTooLarge.selector, tooMuch));
        engine.quote(9_500, tooMuch, TENOR, UTIL);
    }

    function test_InputsAreClamped() public view {
        RiskEngine.Quote memory a = engine.quote(BPS, COVER, TENOR, BPS);
        RiskEngine.Quote memory b = engine.quote(50_000, COVER, TENOR, 50_000);
        assertEq(a.premium, b.premium, "reliability and utilization clamp at 100%");
    }

    /* ── Derived inputs ──────────────────────────────────────── */

    /// The Reliability Index of the fixture agents in `dashboard/lib/data.ts`.
    function test_ReliabilityIndex() public view {
        assertEq(engine.reliabilityOf(48, 10, 2), 8_000, "Aurora Analytics: 80.0%");
        assertEq(engine.reliabilityOf(41, 49, 10), 4_100, "Nomad Scraper: 41.0%");
        assertEq(engine.reliabilityOf(0, 0, 0), 0, "no history is not prime, it is unproven");
    }

    /// Nomad Scraper is the agent the dashboard says it refuses. Say it in Solidity too.
    function test_NomadScraperIsUninsurable() public view {
        uint256 reliability = engine.reliabilityOf(41, 49, 10);
        assertLt(reliability, engine.RELIABILITY_FLOOR_BPS());

        RiskEngine.Quote memory q = engine.quote(reliability, 15 * USDC, TENOR, UTIL);
        assertFalse(q.insurable);
        assertEq(uint256(q.decline), uint256(RiskEngine.Decline.BelowFloor));
    }

    function test_PoolUtilization() public view {
        // Sentinel Pool: $12,400 locked of $48,200.
        assertEq(engine.poolUtilization(12_400 * USDC, 48_200 * USDC), 2_572);
        assertEq(engine.poolUtilization(0, 0), 0);
        assertEq(engine.poolUtilization(100, 10), BPS, "clamped at 100%");
    }

    /* ── Properties, over the whole input space ──────────────── */

    /// premium >= expectedLoss + expenseFee > expectedLoss, for every input.
    /// This is the claim README calls "structural, not a number tuned into place".
    function testFuzz_SolvencyIsStructural(uint256 r, uint256 coverage, uint256 tenor, uint256 util) public view {
        r = bound(r, 0, 2 * BPS); // past 100% too, to exercise the clamp
        coverage = bound(coverage, 0, 1e15);
        tenor = bound(tenor, 0, engine.MAX_TENOR_HOURS());
        util = bound(util, 0, 2 * BPS);

        RiskEngine.Quote memory q = engine.quote(r, coverage, tenor, util);

        assertGe(q.premium, q.expectedLoss + q.expenseFee);
        assertGt(q.premium, q.expectedLoss);
        assertGe(q.tenorFactorBps, BPS, "tenor multiplies the hazard, never discounts it");
        assertGe(q.utilFactorBps, BPS);
        assertLe(q.totalHazardBps, BPS);
    }

    /// A longer window can never be cheaper. The bug the README says an earlier
    /// draft had — `expectedLoss x sqrt(tenor/24)` priced 12h policies below their
    /// own expected loss — would fail right here.
    function testFuzz_TenorNeverDiscounts(uint256 r, uint256 coverage, uint256 shortT, uint256 longT, uint256 util)
        public
        view
    {
        r = bound(r, 0, BPS);
        coverage = bound(coverage, 0, 1e15);
        util = bound(util, 0, BPS);
        shortT = bound(shortT, 0, engine.MAX_TENOR_HOURS());
        longT = bound(longT, shortT, engine.MAX_TENOR_HOURS());

        assertLe(engine.quote(r, coverage, shortT, util).premium, engine.quote(r, coverage, longT, util).premium);
    }

    /// A more reliable agent never pays more.
    function testFuzz_ReliabilityNeverPenalised(uint256 lo, uint256 hi, uint256 coverage, uint256 tenor, uint256 util)
        public
        view
    {
        lo = bound(lo, 0, BPS);
        hi = bound(hi, lo, BPS);
        coverage = bound(coverage, 0, 1e15);
        tenor = bound(tenor, 0, engine.MAX_TENOR_HOURS());
        util = bound(util, 0, BPS);

        assertGe(engine.quote(lo, coverage, tenor, util).premium, engine.quote(hi, coverage, tenor, util).premium);
    }

    /// "Both layers are margin-positive, or the market has no reason to exist."
    function testFuzz_InsurableIsMarginPositiveForBothLayers(
        uint256 r,
        uint256 coverage,
        uint256 tenor,
        uint256 util
    ) public view {
        r = bound(r, engine.RELIABILITY_FLOOR_BPS(), BPS);
        coverage = bound(coverage, 1, 1e15);
        tenor = bound(tenor, 0, engine.MAX_TENOR_HOURS());
        util = bound(util, 0, BPS);

        RiskEngine.Quote memory q = engine.quote(r, coverage, tenor, util);
        if (!q.insurable) return; // declined, so there is no policy to price

        assertGe(q.underwriterMargin, int256(0), "Pool A must clear zero");
        assertGe(q.reinsurerMargin, int256(0), "Pool B must clear zero");
        assertEq(q.netPremium + q.cededPremium, q.premium, "the premium splits exactly");

        // The condition that makes Pool B's leg work, stated directly. `cededShare`
        // cancels out of both sides, which is why the guard never mentions it.
        assertGe(q.premium * (BPS - engine.CEDING_COMMISSION_BPS()), q.expectedLoss * BPS);
    }
}
