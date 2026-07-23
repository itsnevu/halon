// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import {Script, console2} from "forge-std/Script.sol";
import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import {MockERC20} from "../src/ProofOfWork/mocks/MockERC20.sol";
import {PolicyPool} from "../src/PolicyPool.sol";
import {RiskEngine} from "../src/RiskEngine.sol";

/**
 * Deploys Layer 2 (the reinsurer pool) and seeds it with real capital + treaty
 * policies whose beneficiary is Pool A — i.e. genuine reinsurance the underwriter
 * pool can lean on. Reuses the existing USDC + RiskEngine.
 *
 * Env: USDC_ADDRESS, RISK_ENGINE_ADDRESS, POOL_A_ADDRESS
 */
contract DeployPoolB is Script {
    uint256 constant U = 1e6;

    function run() external {
        uint256 pk = vm.envUint("PRIVATE_KEY");
        address deployer = vm.addr(pk);
        MockERC20 usdc = MockERC20(vm.envAddress("USDC_ADDRESS"));
        RiskEngine re = RiskEngine(vm.envAddress("RISK_ENGINE_ADDRESS"));
        address poolA = vm.envAddress("POOL_A_ADDRESS");

        vm.startBroadcast(pk);

        PolicyPool poolB = new PolicyPool(IERC20(address(usdc)), re, deployer, "HALON Reinsurance", "HALON-RE");

        // Capital, supplied in two tranches.
        poolB.grantRole(poolB.CAPITAL_ROLE(), deployer);
        usdc.mint(deployer, 200_000 * U);
        usdc.approve(address(poolB), type(uint256).max);
        poolB.depositCapital(63_500 * U);
        poolB.depositCapital(41_200 * U);

        // Treaties — reinsurance written for Pool A, varied cover/risk/tenor.
        poolB.grantRole(poolB.UNDERWRITER_ROLE(), deployer);
        _treaty(poolB, usdc, poolA, 6_400 * U, 9100, 72, "tr-1", "rl-1");
        _treaty(poolB, usdc, poolA, 3_050 * U + 500000, 8400, 168, "tr-2", "rl-2");
        _treaty(poolB, usdc, poolA, 9_800 * U, 7700, 48, "tr-3", "rl-3");

        vm.stopBroadcast();

        console2.log("=== Pool B deployed + seeded ===");
        console2.log("PoolB:            ", address(poolB));
        console2.log("PoolB totalCapital:", poolB.totalCapital());
        console2.log("PoolB lockedCapital:", poolB.lockedCapital());
        console2.log("PoolB treaties:   ", poolB.nextPolicyId());
    }

    function _treaty(
        PolicyPool pool,
        MockERC20 usdc,
        address beneficiary,
        uint256 coverage,
        uint256 reliabilityBps,
        uint256 tenorHours,
        string memory intentSeed,
        string memory relayerSeed
    ) internal {
        RiskEngine.Quote memory q = pool.quoteFor(reliabilityBps, coverage, tenorHours);
        require(q.insurable, "treaty not insurable");
        usdc.transfer(address(pool), q.premium);
        pool.bindTreaty(
            PolicyPool.BindParams({
                beneficiary: beneficiary,
                coverage: coverage,
                premium: q.premium,
                tenorHours: tenorHours,
                reliabilityBps: reliabilityBps,
                intentId: keccak256(bytes(intentSeed)),
                relayerId: keccak256(bytes(relayerSeed))
            })
        );
    }
}
