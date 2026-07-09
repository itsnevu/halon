// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import {Test} from "forge-std/Test.sol";

import {MockUSDC} from "./mocks/MockUSDC.sol";
import {PolicyPool} from "../src/PolicyPool.sol";
import {RiskEngine} from "../src/RiskEngine.sol";

/**
 * The headline is `test_FullCascade`. It runs the README's story end to end —
 * client pays, A writes, A auto-hedges into B, the worker fails, the pool
 * discharges, B cascades back — and then asserts that both balance sheets landed
 * exactly where `RiskEngine` said they would, to the micro-dollar. Nothing in it
 * is hand-typed: every amount is read out of the engine.
 */
contract PolicyPoolTest is Test {
    MockUSDC internal usdc;
    RiskEngine internal engine;
    PolicyPool internal poolA;
    PolicyPool internal poolB;

    address internal admin = makeAddr("admin");
    address internal uwA = makeAddr("underwriterA");
    address internal uwB = makeAddr("underwriterB");
    address internal adjudicator = makeAddr("adjudicator");
    address internal client = makeAddr("client");

    uint256 internal constant USDC_ONE = 1e6;
    uint256 internal constant COVER = 100 * USDC_ONE;
    uint256 internal constant TENOR = 24;
    uint256 internal constant REL = 8_000; // Aurora Analytics, 80%
    uint256 internal constant A_START = 500 * USDC_ONE;
    uint256 internal constant B_START = 500 * USDC_ONE;

    bytes32 internal constant ORDER_A = keccak256("ord_client_buys_cover");
    bytes32 internal constant ORDER_B = keccak256("ord_sentinel_cedes_to_bastion");
    bytes32 internal constant ORDER_C = keccak256("ord_client_buys_more_cover");
    bytes32 internal constant ORDER_D = keccak256("ord_sentinel_cedes_again");
    bytes32 internal constant AURORA = keccak256("cap:agent:aurora");

    function setUp() public {
        usdc = new MockUSDC();
        engine = new RiskEngine();
        poolA = new PolicyPool(usdc, engine, admin, "HALON Policy", "HALON-P");
        poolB = new PolicyPool(usdc, engine, admin, "HALON Treaty", "HALON-R");

        vm.startPrank(admin);
        poolA.grantRole(poolA.UNDERWRITER_ROLE(), uwA);
        poolA.grantRole(poolA.CAPITAL_ROLE(), uwA);
        poolA.grantRole(poolA.ADJUDICATOR_ROLE(), adjudicator);
        poolB.grantRole(poolB.UNDERWRITER_ROLE(), uwB);
        poolB.grantRole(poolB.CAPITAL_ROLE(), uwB);
        poolB.grantRole(poolB.ADJUDICATOR_ROLE(), adjudicator);

        // Where Pool A's cede is allowed to land. Pool B has no reinsurer, so it
        // never cedes and is deliberately left without one.
        poolA.setCedeRecipient(uwA);
        vm.stopPrank();

        _deposit(poolA, uwA, A_START);
        _deposit(poolB, uwB, B_START);
    }

    /* ── Helpers ─────────────────────────────────────────────── */

    function _deposit(PolicyPool pool, address who, uint256 amount) internal {
        usdc.mint(who, amount);
        vm.startPrank(who);
        usdc.approve(address(pool), amount);
        pool.depositCapital(amount);
        vm.stopPrank();
    }

    /// The CAP pay-tx: a plain ERC-20 transfer into `providerFundAddress`. No hook,
    /// no callback — which is exactly why the pool has to reconcile by balance delta.
    function _payPremium(PolicyPool pool, address payer, uint256 amount) internal {
        usdc.mint(payer, amount);
        vm.prank(payer);
        // forge-lint: disable-next-line(erc20-unchecked-transfer)
        usdc.transfer(address(pool), amount);
    }

    function _params(address beneficiary, uint256 coverage, uint256 premium, uint256 tenor, bytes32 orderId)
        internal
        pure
        returns (PolicyPool.BindParams memory)
    {
        return PolicyPool.BindParams({
            beneficiary: beneficiary,
            coverage: coverage,
            premium: premium,
            tenorHours: tenor,
            reliabilityBps: REL,
            insuredOrderId: orderId,
            insuredAgentId: AURORA
        });
    }

    /// The quote Pool A gives on an empty book. Every test reads its numbers from here.
    function _quoteA() internal view returns (RiskEngine.Quote memory) {
        return engine.quote(REL, COVER, TENOR, poolA.utilizationBps());
    }

    /* ── The whole story ─────────────────────────────────────── */

    function test_FullCascade() public {
        RiskEngine.Quote memory q = _quoteA();
        uint256 cededCoverage = COVER - q.netRetention;

        // 1 — Client pays the premium. It lands in the pool before anyone binds.
        _payPremium(poolA, client, q.premium);
        assertEq(poolA.pendingInflow(), 0, "not recognised until someone syncs");
        poolA.sync();
        assertEq(poolA.pendingInflow(), q.premium, "reconciled by balance delta");

        // 2 — Sentinel writes the cover. No reinsurance yet, so it locks all of it.
        vm.prank(uwA);
        uint256 pid = poolA.bindDirect(_params(client, COVER, q.premium, TENOR, ORDER_A));

        assertEq(poolA.ownerOf(pid), client, "policy is an ERC-721, minted to the buyer");
        assertEq(poolA.lockedCapital(), COVER, "on the hook for the lot");
        assertEq(poolA.totalCapital(), A_START + q.premium);
        assertEq(poolA.pendingInflow(), 0);

        // 3 — Auto-hedge. The pool releases exactly the cedeable premium, no more.
        vm.prank(uwA);
        uint256 drawn = poolA.drawCededPremium(pid);
        assertEq(drawn, q.cededPremium, "the agent does not get to pick the number");

        // The agent's wallet is the payer of the CAP order, so the money goes through it.
        vm.prank(uwA);
        // forge-lint: disable-next-line(erc20-unchecked-transfer)
        usdc.transfer(address(poolB), drawn);

        // 4 — Bastion Re writes the treaty. Its beneficiary is Pool A itself.
        vm.prank(uwB);
        uint256 tid = poolB.bindTreaty(_params(address(poolA), cededCoverage, drawn, TENOR, ORDER_B));

        assertEq(poolB.ownerOf(tid), address(poolA), "the pool holds its own treaty NFT");
        assertEq(poolB.lockedCapital(), cededCoverage);

        // 5 — A verifies the treaty in B's storage, then releases the ceded capital.
        vm.prank(uwA);
        poolA.attachReinsurance(pid, address(poolB), tid);
        assertEq(poolA.lockedCapital(), q.netRetention, "A now carries only its retention");

        // Together the two layers lock the coverage exactly once. That is the capacity
        // reinsurance is supposed to buy.
        assertEq(poolA.lockedCapital() + poolB.lockedCapital(), COVER);

        // 6 — The worker fails. Cascade first, then pay the client in full.
        vm.warp(block.timestamp + 12 hours);
        vm.startPrank(adjudicator);
        uint256 recovered = poolB.discharge(tid);
        poolA.creditRecovery(pid, recovered);
        uint256 paid = poolA.discharge(pid);
        vm.stopPrank();

        assertEq(recovered, cededCoverage);
        assertEq(paid, COVER);
        assertEq(usdc.balanceOf(client), COVER, "made whole, with nobody's approval");
        assertEq(poolA.lockedCapital(), 0);
        assertEq(poolB.lockedCapital(), 0);
        assertEq(uint256(poolA.policy(pid).status), uint256(PolicyPool.Status.Discharged));
        assertEq(uint256(poolB.policy(tid).status), uint256(PolicyPool.Status.Discharged));

        // ── The assertion this whole file exists for ──────────────────────────
        // Both balance sheets land on the number RiskEngine predicted, exactly.
        assertEq(A_START - poolA.totalCapital(), q.netRetention - q.netPremium, "Pool A's realised loss");
        assertEq(B_START - poolB.totalCapital(), cededCoverage - q.cededPremium, "Pool B's realised loss");

        // And the loss really did split down the middle of the quota share.
        assertEq(poolA.claimsPaid(), COVER);
        assertEq(poolA.recoveredTotal(), cededCoverage);
        assertEq(poolB.claimsPaid(), cededCoverage);
    }

    /* ── Premium has to be real ──────────────────────────────── */

    function test_BindRevertsWhenPremiumNeverLanded() public {
        RiskEngine.Quote memory q = _quoteA();
        vm.prank(uwA);
        vm.expectRevert(abi.encodeWithSelector(PolicyPool.PremiumNotReceived.selector, q.premium, 0));
        poolA.bindDirect(_params(client, COVER, q.premium, TENOR, ORDER_A));
    }

    /// The pool will not underwrite below its own model, whatever the agent says.
    function test_BindRevertsBelowTechnicalRate() public {
        RiskEngine.Quote memory q = _quoteA();
        uint256 short = q.premium - 1;
        _payPremium(poolA, client, short);

        vm.prank(uwA);
        vm.expectRevert(abi.encodeWithSelector(PolicyPool.PremiumBelowTechnicalRate.selector, q.premium, short));
        poolA.bindDirect(_params(client, COVER, short, TENOR, ORDER_A));
    }

    /// Nomad Scraper: 41% reliable. The dashboard refuses it; so does the pool.
    function test_BindRefusesSubFloorAgent() public {
        uint256 reliability = engine.reliabilityOf(41, 49, 10);
        _payPremium(poolA, client, COVER);

        PolicyPool.BindParams memory p = _params(client, COVER, COVER, TENOR, ORDER_A);
        p.reliabilityBps = reliability;

        vm.prank(uwA);
        vm.expectRevert(abi.encodeWithSelector(PolicyPool.NotInsurable.selector, RiskEngine.Decline.BelowFloor));
        poolA.bindDirect(p);
    }

    function test_CannotBindTheSameCapOrderTwice() public {
        RiskEngine.Quote memory q = _quoteA();
        _payPremium(poolA, client, q.premium * 2);

        vm.startPrank(uwA);
        poolA.bindDirect(_params(client, COVER, q.premium, TENOR, ORDER_A));
        vm.expectRevert(abi.encodeWithSelector(PolicyPool.OrderAlreadyInsured.selector, ORDER_A));
        poolA.bindDirect(_params(client, COVER, q.premium, TENOR, ORDER_A));
        vm.stopPrank();
    }

    /* ── A treaty is not priced at the reinsurer's shelf price ── */

    /**
     * The cedent forwards `cededShare × (1 − commission)` of a premium that was
     * already loaded once, and it carries no second expense fee — so it arrives
     * *below* what Bastion Re charges retail for the same layer, and above the
     * expected loss on it. Both facts have to hold or the treaty is unwritable.
     */
    function test_TreatyPremiumSitsBetweenExpectedLossAndRetail() public view {
        RiskEngine.Quote memory q = _quoteA();
        uint256 cededCoverage = COVER - q.netRetention;
        RiskEngine.Quote memory retail = engine.quote(REL, cededCoverage, TENOR, poolB.utilizationBps());

        assertLt(q.cededPremium, retail.premium, "a treaty is cheaper than the shelf price");
        assertGe(q.cededPremium, retail.expectedLoss, "but never below the reinsurer's expected loss");
    }

    function test_TreatyRevertsBelowExpectedLoss() public {
        RiskEngine.Quote memory q = _quoteA();
        uint256 cededCoverage = COVER - q.netRetention;
        RiskEngine.Quote memory retail = engine.quote(REL, cededCoverage, TENOR, poolB.utilizationBps());

        uint256 short = retail.expectedLoss - 1;
        _payPremium(poolB, uwB, short);

        vm.prank(uwB);
        vm.expectRevert(abi.encodeWithSelector(PolicyPool.PremiumBelowExpectedLoss.selector, retail.expectedLoss, short));
        poolB.bindTreaty(_params(address(poolA), cededCoverage, short, TENOR, ORDER_B));
    }

    /* ── The treaty is verified, not asserted ────────────────── */

    function test_AttachRevertsWhenThisPoolDoesNotHoldTheTreaty() public {
        (uint256 pid,) = _bindAndCede();

        // B writes an identical treaty, but to the client — not to Pool A.
        RiskEngine.Quote memory q = _quoteA();
        _payPremium(poolB, uwB, q.cededPremium);
        vm.prank(uwB);
        uint256 stray =
            poolB.bindTreaty(_params(client, COVER - q.netRetention, q.cededPremium, TENOR, keccak256("stray")));

        vm.prank(uwA);
        vm.expectRevert(abi.encodeWithSelector(PolicyPool.TreatyNotHeld.selector, address(poolB), stray));
        poolA.attachReinsurance(pid, address(poolB), stray);
    }

    /// Cover that lapses before the policy does is not cover.
    function test_AttachRevertsWhenTreatyLapsesFirst() public {
        (uint256 pid, uint256 drawn) = _bindAndCede();
        RiskEngine.Quote memory q = _quoteA();
        uint256 cededCoverage = COVER - q.netRetention;

        vm.prank(uwB);
        uint256 tid = poolB.bindTreaty(_params(address(poolA), cededCoverage, drawn, 12, ORDER_B));

        uint256 treatyExpiry = poolB.policy(tid).expiresAt;
        uint256 policyExpiry = poolA.policy(pid).expiresAt;

        vm.prank(uwA);
        vm.expectRevert(abi.encodeWithSelector(PolicyPool.TreatyLapsesFirst.selector, treatyExpiry, policyExpiry));
        poolA.attachReinsurance(pid, address(poolB), tid);
    }

    /**
     * `AlreadyReinsured` stops one policy taking two treaties. This is the other
     * direction: one treaty backing two policies. Both attaches release
     * `cededCoverage`, so Pool A frees 2× the capacity Bastion Re is standing
     * behind — and only discovers it when the second cascade fails.
     */
    function test_OneTreatyCannotBackTwoPolicies() public {
        (uint256 p1, uint256 drawn) = _bindAndCede();
        RiskEngine.Quote memory q = _quoteA();
        uint256 cededCoverage = COVER - q.netRetention;

        vm.prank(uwB);
        uint256 tid = poolB.bindTreaty(_params(address(poolA), cededCoverage, drawn, TENOR, ORDER_B));

        vm.prank(uwA);
        poolA.attachReinsurance(p1, address(poolB), tid);
        assertEq(poolA.lockedCapital(), q.netRetention);

        // A second policy, and the underwriter points it at the treaty already spent.
        RiskEngine.Quote memory q2 = _quoteA();
        _payPremium(poolA, client, q2.premium);
        vm.startPrank(uwA);
        uint256 p2 = poolA.bindDirect(_params(client, COVER, q2.premium, TENOR, ORDER_C));

        vm.expectRevert(abi.encodeWithSelector(PolicyPool.TreatyAlreadyAttached.selector, address(poolB), tid));
        poolA.attachReinsurance(p2, address(poolB), tid);
        vm.stopPrank();

        assertEq(poolA.lockedCapital(), q.netRetention + COVER, "the second policy is still fully reserved");
    }

    function test_CededPremiumCanOnlyBeDrawnOnce() public {
        (uint256 pid,) = _bindAndCede();
        vm.prank(uwA);
        vm.expectRevert(abi.encodeWithSelector(PolicyPool.CededPremiumAlreadyDrawn.selector, pid));
        poolA.drawCededPremium(pid);
    }

    /// The hot key decides *when* to cede. It never decides where the money goes.
    function test_UnderwriterCannotRedirectTheCede() public {
        vm.prank(uwA);
        vm.expectRevert(); // AccessControl: uwA is not the admin
        poolA.setCedeRecipient(uwA);
    }

    function test_CedeRequiresAnAdminSetRecipient() public {
        RiskEngine.Quote memory q = engine.quote(REL, COVER, TENOR, poolB.utilizationBps());
        _payPremium(poolB, client, q.premium);

        vm.prank(uwB);
        uint256 pid = poolB.bindDirect(_params(client, COVER, q.premium, TENOR, ORDER_A));

        assertEq(poolB.cedeRecipient(), address(0), "Pool B never cedes");
        vm.prank(uwB);
        vm.expectRevert(PolicyPool.CedeRecipientUnset.selector);
        poolB.drawCededPremium(pid);
    }

    /* ── Lifetime ────────────────────────────────────────────── */

    function test_DischargePaysWhoeverHoldsThePolicy() public {
        RiskEngine.Quote memory q = _quoteA();
        _payPremium(poolA, client, q.premium);
        vm.prank(uwA);
        uint256 pid = poolA.bindDirect(_params(client, COVER, q.premium, TENOR, ORDER_A));

        address bob = makeAddr("bob");
        vm.prank(client);
        poolA.transferFrom(client, bob, pid);

        vm.prank(adjudicator);
        poolA.discharge(pid);

        assertEq(usdc.balanceOf(bob), COVER, "the policy is a bearer instrument");
        assertEq(usdc.balanceOf(client), 0);
    }

    function test_SettleReleasesCapitalAfterTheClaimWindow() public {
        RiskEngine.Quote memory q = _quoteA();
        _payPremium(poolA, client, q.premium);
        vm.prank(uwA);
        uint256 pid = poolA.bindDirect(_params(client, COVER, q.premium, TENOR, ORDER_A));

        vm.warp(poolA.policy(pid).expiresAt + poolA.CLAIM_WINDOW() + 1);
        uint256 released = poolA.settle(pid); // anyone may call

        assertEq(released, COVER);
        assertEq(poolA.lockedCapital(), 0);
        assertEq(poolA.totalCapital(), A_START + q.premium, "the premium was earned");
        assertEq(uint256(poolA.policy(pid).status), uint256(PolicyPool.Status.Settled));
    }

    /// The grace period is real, and so is its end.
    function test_ClaimWindowBoundaries() public {
        RiskEngine.Quote memory q = _quoteA();
        _payPremium(poolA, client, q.premium);
        vm.prank(uwA);
        uint256 pid = poolA.bindDirect(_params(client, COVER, q.premium, TENOR, ORDER_A));
        uint256 deadline = poolA.policy(pid).expiresAt + poolA.CLAIM_WINDOW();

        vm.warp(deadline + 1);
        vm.prank(adjudicator);
        vm.expectRevert(abi.encodeWithSelector(PolicyPool.ClaimWindowClosed.selector, pid));
        poolA.discharge(pid);

        vm.warp(deadline);
        vm.prank(adjudicator);
        assertEq(poolA.discharge(pid), COVER, "the last second of the window still pays");
    }

    function test_SettleRevertsWhileTheWindowIsOpen() public {
        RiskEngine.Quote memory q = _quoteA();
        _payPremium(poolA, client, q.premium);
        vm.prank(uwA);
        uint256 pid = poolA.bindDirect(_params(client, COVER, q.premium, TENOR, ORDER_A));

        vm.expectRevert(abi.encodeWithSelector(PolicyPool.ClaimWindowOpen.selector, pid));
        poolA.settle(pid);
    }

    /* ── Capital ─────────────────────────────────────────────── */

    function test_LockedCapitalIsNotWithdrawable() public {
        RiskEngine.Quote memory q = _quoteA();
        _payPremium(poolA, client, q.premium);
        vm.prank(uwA);
        poolA.bindDirect(_params(client, COVER, q.premium, TENOR, ORDER_A));

        uint256 free = poolA.freeCapital();
        assertEq(free, A_START + q.premium - COVER);

        vm.prank(uwA);
        vm.expectRevert(abi.encodeWithSelector(PolicyPool.InsufficientFreeCapital.selector, free + 1, free));
        poolA.withdrawCapital(free + 1, uwA);

        vm.prank(uwA);
        poolA.withdrawCapital(free, uwA);
        assertEq(poolA.totalCapital(), COVER, "exactly the armed exposure is left standing");
    }

    function test_BindRevertsWithoutTheCapitalToBackIt() public {
        // Drain the pool, then try to write $100 of cover against the premium alone.
        vm.prank(uwA);
        poolA.withdrawCapital(A_START, uwA);

        RiskEngine.Quote memory q = _quoteA();
        _payPremium(poolA, client, q.premium);

        vm.prank(uwA);
        vm.expectRevert(abi.encodeWithSelector(PolicyPool.InsufficientFreeCapital.selector, COVER, q.premium));
        poolA.bindDirect(_params(client, COVER, q.premium, TENOR, ORDER_A));
    }

    /* ── When the layer below does not perform ───────────────── */

    /**
     * A cedent owes its client whether or not its reinsurer pays. The recovery is
     * a receivable, never a precondition. If `discharge` waited on the cascade, a
     * broke or unresponsive Pool B would leave the client holding nothing — which
     * is the opposite of what the policy says.
     */
    function test_CedentPaysEvenIfTheReinsurerNeverPerforms() public {
        (uint256 pid, uint256 tid) = _bindCedeAndAttach(ORDER_A, ORDER_B);

        vm.prank(adjudicator);
        poolA.discharge(pid);

        assertEq(usdc.balanceOf(client), COVER, "the client is owed by A, not by B");
        assertEq(poolA.recoveredTotal(), 0, "nothing recovered");
        assertEq(uint256(poolB.policy(tid).status), uint256(PolicyPool.Status.Armed), "A can still collect later");
    }

    /**
     * Paying a claim ahead of its cascade releases only the retention but spends the
     * whole coverage, so the book goes short. With another policy still armed, that
     * drives `lockedCapital` above `totalCapital`.
     *
     * A naive `totalCapital - lockedCapital` underflows there and reverts, and since
     * `freeCapital` is read by `bindDirect`, `withdrawCapital` and `drawCededPremium`,
     * the whole contract would brick — including the second policy's discharge. It
     * saturates instead: the pool stops writing, and keeps paying.
     */
    function test_DischargeAheadOfRecoveryUnderReservesButDoesNotBrick() public {
        (uint256 p1, uint256 t1) = _bindCedeAndAttach(ORDER_A, ORDER_B);
        _bindCedeAndAttach(ORDER_C, ORDER_D);

        uint256 retention = COVER / 2;
        assertEq(poolA.lockedCapital(), 2 * retention, "two retentions armed");

        // Strip the pool down to exactly the exposure it has armed.
        // (`freeCapital()` must be read before the prank — it is an external call,
        //  and `vm.prank` only covers the next one.)
        uint256 free = poolA.freeCapital();
        vm.prank(uwA);
        poolA.withdrawCapital(free, uwA);
        assertEq(poolA.totalCapital(), poolA.lockedCapital());

        // Pay the first claim. Bastion Re has not cascaded anything yet.
        vm.prank(adjudicator);
        poolA.discharge(p1);

        assertEq(usdc.balanceOf(client), COVER, "the claim was paid regardless");
        assertEq(poolA.totalCapital(), 0);
        assertEq(poolA.lockedCapital(), retention, "the second policy is still armed");

        assertTrue(poolA.underReserved(), "the book is short");
        assertEq(poolA.freeCapital(), 0, "saturated, not underflowed");

        // The recovery lands and the book heals.
        vm.startPrank(adjudicator);
        uint256 recovered = poolB.discharge(t1);
        poolA.creditRecovery(p1, recovered);
        vm.stopPrank();

        assertFalse(poolA.underReserved());
        assertEq(poolA.totalCapital(), retention, "reserved against the surviving policy, exactly");
    }

    /* ── Shared setup for the ceding tests ───────────────────── */

    /// Bind a direct policy in A and draw its ceded premium into B's pool.
    function _bindAndCede() internal returns (uint256 pid, uint256 drawn) {
        RiskEngine.Quote memory q = _quoteA();
        _payPremium(poolA, client, q.premium);

        vm.startPrank(uwA);
        pid = poolA.bindDirect(_params(client, COVER, q.premium, TENOR, ORDER_A));
        drawn = poolA.drawCededPremium(pid);
        // forge-lint: disable-next-line(erc20-unchecked-transfer)
        usdc.transfer(address(poolB), drawn);
        vm.stopPrank();
    }

    /// The whole auto-hedge, priced at whatever utilization the pools are at now.
    function _bindCedeAndAttach(bytes32 policyOrder, bytes32 treatyOrder)
        internal
        returns (uint256 pid, uint256 tid)
    {
        RiskEngine.Quote memory q = engine.quote(REL, COVER, TENOR, poolA.utilizationBps());
        _payPremium(poolA, client, q.premium);

        vm.startPrank(uwA);
        pid = poolA.bindDirect(_params(client, COVER, q.premium, TENOR, policyOrder));
        uint256 drawn = poolA.drawCededPremium(pid);
        // forge-lint: disable-next-line(erc20-unchecked-transfer)
        usdc.transfer(address(poolB), drawn);
        vm.stopPrank();

        vm.prank(uwB);
        tid = poolB.bindTreaty(_params(address(poolA), COVER - q.netRetention, drawn, TENOR, treatyOrder));

        vm.prank(uwA);
        poolA.attachReinsurance(pid, address(poolB), tid);
    }
}
