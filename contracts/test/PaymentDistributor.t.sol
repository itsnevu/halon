// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "forge-std/Test.sol";
import "../src/ProofOfWork/PaymentDistributor.sol";
import "../src/ProofOfWork/mocks/MockMorphoVault.sol";
import "../src/ProofOfWork/mocks/MockERC20.sol";

contract PaymentDistributorTest is Test {
    PaymentDistributor public distributor;
    MockMorphoVault public vault;
    MockERC20 public usdg;

    address public owner = address(this);
    address public aiAgent = address(0xA1);
    address public client = address(0xC1);
    address public freelancer = address(0xF1);

    uint256 constant LIQUIDITY = 10_000 ether;
    uint256 constant INVOICE = 1_000 ether;

    function setUp() public {
        usdg = new MockERC20("USDG Stablecoin", "USDG", 18);
        vault = new MockMorphoVault(address(usdg));
        distributor = new PaymentDistributor(address(vault), address(usdg), aiAgent);

        // Seed the LP vault with liquidity for advances.
        usdg.mint(owner, LIQUIDITY);
        usdg.approve(address(vault), LIQUIDITY);
        vault.deposit(LIQUIDITY, owner);

        // Client can pay the invoice at net-30.
        usdg.mint(client, INVOICE);
        vm.prank(client);
        usdg.approve(address(distributor), INVOICE);
    }

    function _fundedInvoice() internal returns (uint256 id) {
        vm.prank(client);
        id = distributor.createInvoice(freelancer, INVOICE);
        vm.prank(aiAgent);
        distributor.triggerAdvanceFinancing(id);
    }

    function test_AdvancePaysFreelancerNetOfFee() public {
        uint256 id = _fundedInvoice();

        // advance 85% = 850, fee 0.5% = 5, payout = 845.
        assertEq(usdg.balanceOf(freelancer), 845 ether);
        assertEq(distributor.protectionPoolBalance(), 5 ether);
        assertEq(vault.totalAssets(), LIQUIDITY - 850 ether);

        (,,, uint256 advancedAmount, bool isFunded,) = distributor.invoices(id);
        assertEq(advancedAmount, 850 ether);
        assertTrue(isFunded);
    }

    function test_RepayReturnsPrincipalPlusYieldToLP() public {
        uint256 id = _fundedInvoice();

        vm.prank(client);
        distributor.repayInvoice(id);

        // LP yield = 1% of 850 = 8.5, so the vault ends 8.5 above where it began.
        assertEq(vault.totalAssets(), LIQUIDITY + 8.5 ether);
        // Freelancer: 845 upfront + (1000 - 858.5) remainder = 986.5 total.
        assertEq(usdg.balanceOf(freelancer), 986.5 ether);
        // Fee stays put until swept.
        assertEq(distributor.protectionPoolBalance(), 5 ether);

        (,,,,, bool isRepaid) = distributor.invoices(id);
        assertTrue(isRepaid);
    }

    function test_OwnerCanSweepProtectionPool() public {
        _fundedInvoice();
        distributor.withdrawProtectionPool(owner, 5 ether);
        assertEq(usdg.balanceOf(owner), 5 ether);
        assertEq(distributor.protectionPoolBalance(), 0);
    }

    function test_AdvanceInterestKnobFlowsToLP() public {
        distributor.setAdvanceInterestBps(500); // 5%
        uint256 id = _fundedInvoice();
        vm.prank(client);
        distributor.repayInvoice(id);
        // 5% of 850 = 42.5 yield to the pool.
        assertEq(vault.totalAssets(), LIQUIDITY + 42.5 ether);
    }

    function test_RevertWhen_NonAgentTriggers() public {
        vm.prank(client);
        uint256 id = distributor.createInvoice(freelancer, INVOICE);
        vm.expectRevert("Only AI Agent");
        distributor.triggerAdvanceFinancing(id);
    }

    function test_RevertWhen_FundingUnknownInvoice() public {
        vm.prank(aiAgent);
        vm.expectRevert(abi.encodeWithSelector(PaymentDistributor.UnknownInvoice.selector, 99));
        distributor.triggerAdvanceFinancing(99);
    }

    function test_RevertWhen_DoubleFunding() public {
        uint256 id = _fundedInvoice();
        vm.prank(aiAgent);
        vm.expectRevert(abi.encodeWithSelector(PaymentDistributor.AlreadyFunded.selector, id));
        distributor.triggerAdvanceFinancing(id);
    }

    function test_RevertWhen_InterestAboveCap() public {
        vm.expectRevert(abi.encodeWithSelector(PaymentDistributor.InterestTooHigh.selector, 1_001));
        distributor.setAdvanceInterestBps(1_001);
    }

    function test_RevertWhen_CreatingZeroInvoice() public {
        vm.prank(client);
        vm.expectRevert(PaymentDistributor.ZeroAmount.selector);
        distributor.createInvoice(freelancer, 0);
    }
}
