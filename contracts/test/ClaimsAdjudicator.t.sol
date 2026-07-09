// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import {Test} from "forge-std/Test.sol";

import {MockUSDC} from "./mocks/MockUSDC.sol";
import {ClaimsAdjudicator} from "../src/ClaimsAdjudicator.sol";
import {PolicyPool} from "../src/PolicyPool.sol";
import {RiskEngine} from "../src/RiskEngine.sol";

/**
 * `test_RejectedAfterDeliveryIsRefused` is the one that matters. Everything else
 * here is plumbing around it: the pool must not pay a claim whose beneficiary
 * pulled the trigger on work that was actually delivered.
 */
contract ClaimsAdjudicatorTest is Test {
    MockUSDC internal usdc;
    RiskEngine internal engine;
    PolicyPool internal poolA;
    PolicyPool internal poolB;
    ClaimsAdjudicator internal adj;

    uint256 internal constant WATCHER_PK = 0xA11CE;
    uint256 internal constant WATCHER_2_PK = 0xB0B;
    address internal watcher;
    address internal watcher2;

    address internal admin = makeAddr("admin");
    address internal uwA = makeAddr("underwriterA");
    address internal uwB = makeAddr("underwriterB");
    address internal resolver = makeAddr("resolver");
    address internal client = makeAddr("client");

    uint256 internal constant USDC_ONE = 1e6;
    uint256 internal constant COVER = 100 * USDC_ONE;
    uint256 internal constant TENOR = 24;
    uint256 internal constant REL = 8_000;
    uint256 internal constant START = 500 * USDC_ONE;

    bytes32 internal constant ORDER_JOB = keccak256("ord_meridian_hires_aurora");
    bytes32 internal constant ORDER_TREATY = keccak256("ord_sentinel_cedes_to_bastion");
    bytes32 internal constant AURORA = keccak256("cap:agent:aurora");
    bytes32 internal constant CONTENT = keccak256("the analysis Aurora actually delivered");

    uint256 internal policyId;
    uint256 internal treatyId;

    function setUp() public {
        vm.warp(1_700_000_000); // a real-looking clock, so `observedAt - 1` is not underflow
        watcher = vm.addr(WATCHER_PK);
        watcher2 = vm.addr(WATCHER_2_PK);

        usdc = new MockUSDC();
        engine = new RiskEngine();
        poolA = new PolicyPool(usdc, engine, admin, "HALON Policy", "HALON-P");
        poolB = new PolicyPool(usdc, engine, admin, "HALON Treaty", "HALON-R");
        adj = new ClaimsAdjudicator(admin);

        vm.startPrank(admin);
        adj.grantRole(adj.ATTESTOR_ROLE(), watcher);
        adj.grantRole(adj.DISPUTE_RESOLVER_ROLE(), resolver);

        poolA.grantRole(poolA.UNDERWRITER_ROLE(), uwA);
        poolA.grantRole(poolA.CAPITAL_ROLE(), uwA);
        poolA.grantRole(poolA.ADJUDICATOR_ROLE(), address(adj));

        poolB.grantRole(poolB.UNDERWRITER_ROLE(), uwB);
        poolB.grantRole(poolB.CAPITAL_ROLE(), uwB);
        // The adjudicator has to reach into Pool B too, or the cascade cannot run.
        poolB.grantRole(poolB.ADJUDICATOR_ROLE(), address(adj));

        poolA.setCedeRecipient(uwA);
        vm.stopPrank();

        _deposit(poolA, uwA, START);
        _deposit(poolB, uwB, START);
        (policyId, treatyId) = _armPolicyWithTreaty();
    }

    /* ── Fixture ─────────────────────────────────────────────── */

    function _deposit(PolicyPool pool, address who, uint256 amount) internal {
        usdc.mint(who, amount);
        vm.startPrank(who);
        usdc.approve(address(pool), amount);
        pool.depositCapital(amount);
        vm.stopPrank();
    }

    function _params(address beneficiary, uint256 coverage, uint256 premium, bytes32 orderId)
        internal
        pure
        returns (PolicyPool.BindParams memory)
    {
        return PolicyPool.BindParams({
            beneficiary: beneficiary,
            coverage: coverage,
            premium: premium,
            tenorHours: TENOR,
            reliabilityBps: REL,
            insuredOrderId: orderId,
            insuredAgentId: AURORA
        });
    }

    function _armPolicyWithTreaty() internal returns (uint256 pid, uint256 tid) {
        RiskEngine.Quote memory q = engine.quote(REL, COVER, TENOR, poolA.utilizationBps());

        usdc.mint(client, q.premium);
        vm.prank(client);
        // forge-lint: disable-next-line(erc20-unchecked-transfer)
        usdc.transfer(address(poolA), q.premium);

        vm.startPrank(uwA);
        pid = poolA.bindDirect(_params(client, COVER, q.premium, ORDER_JOB));
        uint256 drawn = poolA.drawCededPremium(pid);
        // forge-lint: disable-next-line(erc20-unchecked-transfer)
        usdc.transfer(address(poolB), drawn);
        vm.stopPrank();

        vm.prank(uwB);
        tid = poolB.bindTreaty(_params(address(poolA), COVER - q.netRetention, drawn, ORDER_TREATY));

        vm.prank(uwA);
        poolA.attachReinsurance(pid, address(poolB), tid);
    }

    /* ── Attestations ────────────────────────────────────────── */

    function _attestation(ClaimsAdjudicator.Outcome outcome, bool delivered, bytes32 contentHash)
        internal
        view
        returns (ClaimsAdjudicator.Attestation memory)
    {
        return ClaimsAdjudicator.Attestation({
            pool: address(poolA),
            policyId: policyId,
            insuredOrderId: ORDER_JOB,
            outcome: outcome,
            deliverySubmitted: delivered,
            contentHash: contentHash,
            observedAt: block.timestamp
        });
    }

    /// The worker never delivered. The canonical, auto-payable claim.
    function _cleanRejection() internal view returns (ClaimsAdjudicator.Attestation memory) {
        return _attestation(ClaimsAdjudicator.Outcome.Rejected, false, bytes32(0));
    }

    function _sign(uint256 pk, bytes32 digest) internal pure returns (bytes memory) {
        (uint8 v, bytes32 r, bytes32 s) = vm.sign(pk, digest);
        return abi.encodePacked(r, s, v);
    }

    /// @dev Calls `adj.hashAttestation`, which is an external call — so always build
    ///      the signatures *before* arming `vm.expectRevert`, or the cheatcode is
    ///      consumed by the hash call and the revert lands unwatched.
    function _oneSig(ClaimsAdjudicator.Attestation memory a) internal view returns (bytes[] memory sigs) {
        sigs = new bytes[](1);
        sigs[0] = _sign(WATCHER_PK, adj.hashAttestation(a));
    }

    /* ── The happy paths ─────────────────────────────────────── */

    function test_ExpiredOrderDischargesAndCascades() public {
        RiskEngine.Quote memory q = engine.quote(REL, COVER, TENOR, 0);
        uint256 ceded = COVER - q.netRetention;

        ClaimsAdjudicator.Attestation memory a = _attestation(ClaimsAdjudicator.Outcome.Expired, false, bytes32(0));
        uint256 indemnity = adj.discharge(a, _oneSig(a)); // anyone may relay a signed claim

        assertEq(indemnity, COVER);
        assertEq(usdc.balanceOf(client), COVER, "nobody approved this");
        assertEq(poolA.recoveredTotal(), ceded, "the cascade ran");
        assertEq(poolB.claimsPaid(), ceded);
        assertEq(uint256(poolB.policy(treatyId).status), uint256(PolicyPool.Status.Discharged));
    }

    function test_RejectedWithoutDeliveryDischarges() public {
        ClaimsAdjudicator.Attestation memory a = _cleanRejection();
        assertTrue(adj.isAutoPayable(a));

        adj.discharge(a, _oneSig(a));
        assertEq(usdc.balanceOf(client), COVER);
    }

    /* ── The hazard ──────────────────────────────────────────── */

    /**
     * Aurora delivered. Meridian rejected it anyway and would collect $100 of cover
     * on top of whatever CAP refunds from escrow. The beneficiary controls the
     * trigger, so this contract refuses to be the one that pulls it.
     */
    function test_RejectedAfterDeliveryIsRefused() public {
        ClaimsAdjudicator.Attestation memory a = _attestation(ClaimsAdjudicator.Outcome.Rejected, true, CONTENT);
        assertFalse(adj.isAutoPayable(a));
        bytes[] memory sigs = _oneSig(a);

        vm.expectRevert(
            abi.encodeWithSelector(ClaimsAdjudicator.DeliveredThenRefused.selector, address(poolA), policyId, CONTENT)
        );
        adj.discharge(a, sigs);

        assertEq(usdc.balanceOf(client), 0, "not a cent moved");
        assertEq(uint256(poolA.policy(policyId).status), uint256(PolicyPool.Status.Armed));
    }

    /// The escape hatch, and the only thing that opens it: a human with standing.
    function test_DisputeResolverCanSettleWhatTheWatcherCannot() public {
        vm.prank(resolver);
        uint256 indemnity = adj.dischargeDisputed(address(poolA), policyId, "worker conceded the delivery was junk");

        assertEq(indemnity, COVER);
        assertEq(usdc.balanceOf(client), COVER);
        assertEq(poolA.recoveredTotal(), COVER - engine.quote(REL, COVER, TENOR, 0).netRetention);
    }

    function test_DisputeDischargeIsRoleGated() public {
        vm.expectRevert();
        adj.dischargeDisputed(address(poolA), policyId, "i would like the money");
    }

    /* ── Binding the claim to the order ──────────────────────── */

    /// An attestation about some other failed order must not discharge this policy.
    function test_AttestationMustNameThePolicysOwnOrder() public {
        ClaimsAdjudicator.Attestation memory a = _cleanRejection();
        a.insuredOrderId = keccak256("ord_some_entirely_different_job");
        bytes[] memory sigs = _oneSig(a);

        vm.expectRevert(
            abi.encodeWithSelector(ClaimsAdjudicator.OrderPolicyMismatch.selector, ORDER_JOB, a.insuredOrderId)
        );
        adj.discharge(a, sigs);
    }

    function test_InconsistentDeliveryIsRejected() public {
        ClaimsAdjudicator.Attestation memory a = _attestation(ClaimsAdjudicator.Outcome.Rejected, true, bytes32(0));
        bytes[] memory aSigs = _oneSig(a);
        vm.expectRevert(abi.encodeWithSelector(ClaimsAdjudicator.InconsistentDelivery.selector, true, bytes32(0)));
        adj.discharge(a, aSigs);

        ClaimsAdjudicator.Attestation memory b = _attestation(ClaimsAdjudicator.Outcome.Expired, false, CONTENT);
        bytes[] memory bSigs = _oneSig(b);
        vm.expectRevert(abi.encodeWithSelector(ClaimsAdjudicator.InconsistentDelivery.selector, false, CONTENT));
        adj.discharge(b, bSigs);
    }

    /* ── The signature ───────────────────────────────────────── */

    function test_UnknownSignerIsRejected() public {
        ClaimsAdjudicator.Attestation memory a = _cleanRejection();
        bytes[] memory sigs = new bytes[](1);
        uint256 impostorPk = 0xDEAD;
        sigs[0] = _sign(impostorPk, adj.hashAttestation(a));

        vm.expectRevert(abi.encodeWithSelector(ClaimsAdjudicator.NotAnAttestor.selector, vm.addr(impostorPk)));
        adj.discharge(a, sigs);
    }

    function test_StaleAttestationIsRejected() public {
        ClaimsAdjudicator.Attestation memory a = _cleanRejection();
        bytes[] memory sigs = _oneSig(a);

        vm.warp(block.timestamp + adj.ATTESTATION_TTL() + 1);
        vm.expectRevert(abi.encodeWithSelector(ClaimsAdjudicator.AttestationStale.selector, a.observedAt));
        adj.discharge(a, sigs);
    }

    function test_FutureAttestationIsRejected() public {
        ClaimsAdjudicator.Attestation memory a = _cleanRejection();
        a.observedAt = block.timestamp + 1;
        bytes[] memory sigs = _oneSig(a);

        vm.expectRevert(abi.encodeWithSelector(ClaimsAdjudicator.AttestationFromTheFuture.selector, a.observedAt));
        adj.discharge(a, sigs);
    }

    function test_AttestationCannotBeReplayed() public {
        ClaimsAdjudicator.Attestation memory a = _cleanRejection();
        bytes[] memory sigs = _oneSig(a);
        bytes32 digest = adj.hashAttestation(a);

        adj.discharge(a, sigs);
        assertTrue(adj.attestationUsed(digest));

        vm.expectRevert(abi.encodeWithSelector(ClaimsAdjudicator.AttestationAlreadyUsed.selector, digest));
        adj.discharge(a, sigs);
    }

    /// One attestor signing twice is one attestor, not two.
    function test_TheSameSignerCannotBeCountedTwice() public {
        vm.prank(admin);
        adj.setThreshold(2);

        ClaimsAdjudicator.Attestation memory a = _cleanRejection();
        bytes memory sig = _sign(WATCHER_PK, adj.hashAttestation(a));
        bytes[] memory sigs = new bytes[](2);
        sigs[0] = sig;
        sigs[1] = sig;

        vm.expectRevert(ClaimsAdjudicator.SignaturesNotStrictlyAscending.selector);
        adj.discharge(a, sigs);
    }

    function test_ThresholdOfTwoNeedsTwoDistinctAttestors() public {
        vm.startPrank(admin);
        adj.grantRole(adj.ATTESTOR_ROLE(), watcher2);
        adj.setThreshold(2);
        vm.stopPrank();

        ClaimsAdjudicator.Attestation memory a = _cleanRejection();
        bytes32 digest = adj.hashAttestation(a);

        bytes[] memory one = _oneSig(a);
        vm.expectRevert(abi.encodeWithSelector(ClaimsAdjudicator.NotEnoughSignatures.selector, 2, 1));
        adj.discharge(a, one);

        // Ascending by signer address, which is what makes them countable.
        bytes[] memory both = new bytes[](2);
        (uint256 lo, uint256 hi) = watcher < watcher2 ? (WATCHER_PK, WATCHER_2_PK) : (WATCHER_2_PK, WATCHER_PK);
        both[0] = _sign(lo, digest);
        both[1] = _sign(hi, digest);

        adj.discharge(a, both);
        assertEq(usdc.balanceOf(client), COVER);
    }

    /* ── When Bastion Re does not perform ────────────────────── */

    /**
     * The reinsurer's pool rejects the cascade — here because its role was revoked,
     * but insolvency looks the same from this side. The cedent still owes the client.
     * The recovery becomes a receivable and the failure is logged, not thrown.
     */
    function test_ClientIsPaidEvenWhenTheCascadeFails() public {
        bytes32 role = poolB.ADJUDICATOR_ROLE(); // read before the prank, it is a call
        vm.prank(admin);
        poolB.revokeRole(role, address(adj));

        ClaimsAdjudicator.Attestation memory a = _cleanRejection();
        bytes[] memory sigs = _oneSig(a);

        // Topics only: the revert `reason` bytes are not worth pinning.
        vm.expectEmit(true, true, false, false);
        emit ClaimsAdjudicator.CascadeFailed(address(poolA), policyId, address(poolB), "");
        uint256 indemnity = adj.discharge(a, sigs);

        assertEq(indemnity, COVER);
        assertEq(usdc.balanceOf(client), COVER, "the client does not carry the cedent's credit risk");
        assertEq(poolA.recoveredTotal(), 0, "nothing came back");
        assertEq(uint256(poolB.policy(treatyId).status), uint256(PolicyPool.Status.Armed), "the treaty survives");
        assertTrue(poolA.underReserved() == false, "one policy, so releasing its retention squares the book");
    }

    /* ── Housekeeping ────────────────────────────────────────── */

    function test_ThresholdCannotBeZero() public {
        vm.prank(admin);
        vm.expectRevert(ClaimsAdjudicator.ThresholdMustBePositive.selector);
        adj.setThreshold(0);
    }

    function test_DischargingATwiceSettledPolicyReverts() public {
        ClaimsAdjudicator.Attestation memory a = _cleanRejection();
        adj.discharge(a, _oneSig(a));

        // A fresh observation of the same, now-discharged policy: a different digest,
        // so replay protection does not catch it. The pool's own status does.
        ClaimsAdjudicator.Attestation memory b = _cleanRejection();
        b.observedAt = block.timestamp - 1;
        bytes[] memory sigs = _oneSig(b);

        vm.expectRevert(abi.encodeWithSelector(ClaimsAdjudicator.PolicyNotArmed.selector, address(poolA), policyId));
        adj.discharge(b, sigs);
    }
}
