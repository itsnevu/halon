// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "forge-std/Test.sol";
import "../src/ProofOfWork/EscrowFactory.sol";
import "../src/ProofOfWork/EscrowProject.sol";
import "../src/ProofOfWork/mocks/MockERC20.sol";
import "../src/ProofOfWork/mocks/MockAggregatorV3.sol";

contract ProofOfWorkTest is Test {
    EscrowFactory public factory;
    MockERC20 public usdg;
    MockAggregatorV3 public oracle;
    
    address public client = address(0x1);
    address public freelancer = address(0x2);
    address public aiAgent = address(0x3);

    function setUp() public {
        usdg = new MockERC20("USDG Stablecoin", "USDG", 18);
        oracle = new MockAggregatorV3(8, 100 * 10**8); // $100 price dummy
        // No sequencer feed in tests (address(0) skips the L2 uptime check),
        // 1-hour default staleness window.
        factory = new EscrowFactory(aiAgent, address(0), 1 hours);
        
        // Setup client funds
        usdg.mint(client, 10000 * 10**18);
    }

    function testCreateProjectAndReleaseMilestone() public {
        vm.startPrank(client);
        usdg.approve(address(factory), 10000 * 10**18);
        
        address projectAddr = factory.createProject(
            freelancer,
            address(usdg),
            address(oracle),
            10000 * 10**18
        );
        vm.stopPrank();

        EscrowProject project = EscrowProject(projectAddr);
        
        // Verify balances
        assertEq(usdg.balanceOf(client), 0);
        assertEq(usdg.balanceOf(projectAddr), 10000 * 10**18);
        
        // Add milestone
        vm.prank(client);
        project.addMilestone(3000 * 10**18, "Design Phase");
        
        // AI approves
        vm.prank(aiAgent);
        project.approveMilestoneAI(0, 90); // Score 90
        
        // Client approves
        vm.prank(client);
        project.approveMilestoneClient(0);
        
        // Release funds
        project.releaseMilestone(0);
        
        assertEq(usdg.balanceOf(freelancer), 3000 * 10**18);
        assertEq(usdg.balanceOf(projectAddr), 7000 * 10**18);
    }
}
