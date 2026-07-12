// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import {Script, console2} from "forge-std/Script.sol";
import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";

import {ClaimsAdjudicator} from "../src/ClaimsAdjudicator.sol";
import {PolicyPool} from "../src/PolicyPool.sol";
import {DynamicRiskEngine} from "../src/DynamicRiskEngine.sol";
import {SafeBridgeRouter} from "../src/SafeBridgeRouter.sol";

/**
 * Deploys the complete SafeBridge V3 ecosystem to a testnet (e.g. Base Sepolia).
 *
 *   forge script script/DeployTestnet.s.sol --rpc-url baseSepolia --broadcast --verify
 */
contract DeployTestnet is Script {
    function run() external {
        uint256 deployerPk = vm.envUint("DEPLOYER_PRIVATE_KEY");
        address deployer = vm.addr(deployerPk);

        // Fetch mock USDC address for Testnet
        address usdcAddr = vm.envAddress("USDC_ADDRESS_SEPOLIA");
        IERC20 usdc = IERC20(usdcAddr);

        // The keys that hold roles
        address attestor = vm.envAddress("ATTESTOR_ADDRESS");
        address underwriterA = vm.envAddress("UNDERWRITER_A_ADDRESS");
        address cedeRecipientA = vm.envAddress("UNDERWRITER_A_CAP_WALLET");

        vm.startBroadcast(deployerPk);

        // 1. Deploy the new Dynamic Risk Engine
        DynamicRiskEngine riskEngine = new DynamicRiskEngine();

        // 2. Deploy PolicyPool (Layer 1 - SafeBridge)
        PolicyPool poolA = new PolicyPool(usdc, riskEngine, deployer, "SafeBridge Intent Cover", "SB-COV");

        // 3. Deploy ClaimsAdjudicator
        ClaimsAdjudicator adjudicator = new ClaimsAdjudicator(deployer);

        // 4. Deploy SafeBridge Router (Multi-token swapper)
        SafeBridgeRouter router = new SafeBridgeRouter(usdcAddr, address(poolA));

        // 5. Wire the Roles
        adjudicator.grantRole(adjudicator.ATTESTOR_ROLE(), attestor);
        adjudicator.grantRole(adjudicator.DISPUTE_RESOLVER_ROLE(), deployer); // Admin handles disputes
        adjudicator.setPool(address(poolA), true);

        // Underwriter Agent and Router need access
        poolA.grantRole(poolA.UNDERWRITER_ROLE(), underwriterA);
        poolA.grantRole(poolA.UNDERWRITER_ROLE(), address(router)); // Router binds on behalf of users
        poolA.grantRole(poolA.CAPITAL_ROLE(), deployer); // LPs deposit via UI
        poolA.grantRole(poolA.ADJUDICATOR_ROLE(), address(adjudicator));
        poolA.setCedeRecipient(cedeRecipientA);

        vm.stopBroadcast();

        console2.log("=== SafeBridge Testnet Deployment Complete ===");
        console2.log("DynamicRiskEngine: %s", address(riskEngine));
        console2.log("PolicyPool:        %s", address(poolA));
        console2.log("ClaimsAdjudicator: %s", address(adjudicator));
        console2.log("SafeBridgeRouter:  %s", address(router));
    }
}
