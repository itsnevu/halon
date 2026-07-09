// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import {Script, console2} from "forge-std/Script.sol";
import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";

import {ClaimsAdjudicator} from "../src/ClaimsAdjudicator.sol";
import {PolicyPool} from "../src/PolicyPool.sol";
import {RiskEngine} from "../src/RiskEngine.sol";

/**
 * Deploys the three contracts and wires the roles between them.
 *
 *   forge script script/Deploy.s.sol --rpc-url base --broadcast --verify
 *
 * The one grant that is easy to forget is `ADJUDICATOR_ROLE` on **Pool B**. Without
 * it Pool A's claims still pay, but every cascade silently fails and the reinsurer
 * never contributes a cent — `ClaimsAdjudicator` catches the revert and emits
 * `CascadeFailed`, which is exactly the failure mode you would not notice in a demo.
 *
 * Capital is not deposited here. `depositCapital` needs a USDC approval from the
 * underwriter wallets, and those keys do not belong in a deploy script.
 */
contract Deploy is Script {
    function run() external {
        uint256 deployerPk = vm.envUint("DEPLOYER_PRIVATE_KEY");
        address deployer = vm.addr(deployerPk);

        IERC20 usdc = IERC20(vm.envAddress("USDC_ADDRESS"));
        address attestor = vm.envAddress("ATTESTOR_ADDRESS");
        // The keys that hold UNDERWRITER_ROLE and sign `bindDirect`.
        address underwriterA = vm.envAddress("UNDERWRITER_A_ADDRESS");
        address underwriterB = vm.envAddress("UNDERWRITER_B_ADDRESS");
        // A different account: the CAP custodial wallet that pays the cede order.
        address cedeRecipientA = vm.envAddress("UNDERWRITER_A_CAP_WALLET");

        vm.startBroadcast(deployerPk);

        RiskEngine riskEngine = new RiskEngine();
        PolicyPool poolA = new PolicyPool(usdc, riskEngine, deployer, "HALON Policy", "HALON-P");
        PolicyPool poolB = new PolicyPool(usdc, riskEngine, deployer, "HALON Treaty", "HALON-R");
        ClaimsAdjudicator adjudicator = new ClaimsAdjudicator(deployer);

        adjudicator.grantRole(adjudicator.ATTESTOR_ROLE(), attestor);
        adjudicator.grantRole(adjudicator.DISPUTE_RESOLVER_ROLE(), deployer);

        poolA.grantRole(poolA.UNDERWRITER_ROLE(), underwriterA);
        poolA.grantRole(poolA.CAPITAL_ROLE(), underwriterA);
        poolA.grantRole(poolA.ADJUDICATOR_ROLE(), address(adjudicator));
        poolA.setCedeRecipient(cedeRecipientA);

        poolB.grantRole(poolB.UNDERWRITER_ROLE(), underwriterB);
        poolB.grantRole(poolB.CAPITAL_ROLE(), underwriterB);
        poolB.grantRole(poolB.ADJUDICATOR_ROLE(), address(adjudicator));

        vm.stopBroadcast();

        console2.log("# paste into agents/.env");
        console2.log("RISK_ENGINE=%s", address(riskEngine));
        console2.log("POLICY_POOL_A=%s", address(poolA));
        console2.log("POLICY_POOL_B=%s", address(poolB));
        console2.log("CLAIMS_ADJUDICATOR=%s", address(adjudicator));
    }
}
