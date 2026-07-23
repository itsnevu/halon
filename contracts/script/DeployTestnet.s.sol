// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import {Script, console2} from "forge-std/Script.sol";
import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import {MockERC20} from "../src/ProofOfWork/mocks/MockERC20.sol";

import {ClaimsAdjudicator} from "../src/ClaimsAdjudicator.sol";
import {PolicyPool} from "../src/PolicyPool.sol";
import {DynamicRiskEngine} from "../src/DynamicRiskEngine.sol";
import {RiskEngine} from "../src/RiskEngine.sol";
import {HalonRouter} from "../src/HalonRouter.sol";

/**
 * @title DeployTestnet
 * @notice Centralized deployment script for HALON.
 * Deploys the complete HALON V3 ecosystem to Robinhood Chain.
 */
contract DeployTestnet is Script {
    function run() external {
        uint256 deployerPrivateKey = vm.envUint("PRIVATE_KEY");
        address deployer = vm.addr(deployerPrivateKey);

        console2.log("Deployer:", deployer);

        vm.startBroadcast(deployerPrivateKey);

        // 1. Deploy Core Dependencies
        // Use a mock USDC for testnet if a real one isn't available
        MockERC20 usdc = new MockERC20("USDC", "USDC", 6);
        address usdcAddr = address(usdc);
        
        DynamicRiskEngine riskEngine = new DynamicRiskEngine();

        // 2. Deploy PolicyPool (Layer 1 - HALON)
        PolicyPool poolA = new PolicyPool(usdc, RiskEngine(address(riskEngine)), deployer, "HALON Intent Cover", "HALON-COV");
        
        // 3. Deploy Claims Adjudicator (Layer 2)
        ClaimsAdjudicator adjudicator = new ClaimsAdjudicator(deployer);

        // 4. Deploy HALON Router (Multi-token swapper)
        HalonRouter router = new HalonRouter(usdcAddr, address(poolA));

        // 5. Setup Initial State
        // Grant Roles
        poolA.grantRole(poolA.UNDERWRITER_ROLE(), address(router));
        poolA.grantRole(poolA.ADJUDICATOR_ROLE(), address(adjudicator));
        
        // Register pool in adjudicator
        adjudicator.setPool(address(poolA), true);

        // Fetch mock/env addresses for roles
        address cedeRecipientA = vm.envAddress("UNDERWRITER_A_CAP_WALLET");
        poolA.setCedeRecipient(cedeRecipientA);

        vm.stopBroadcast();

        // Output deployed addresses for the frontend/agents
        console2.log("=== HALON Testnet Deployment Complete ===");
        console2.log("USDC (Mock):       %s", address(usdc));
        console2.log("DynamicRiskEngine: %s", address(riskEngine));
        console2.log("PolicyPool:        %s", address(poolA));
        console2.log("ClaimsAdjudicator: %s", address(adjudicator));
        console2.log("SafeBridgeRouter:  %s", address(router));
    }
}
