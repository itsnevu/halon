// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import {Script, console2} from "forge-std/Script.sol";
import {MockERC20} from "../src/ProofOfWork/mocks/MockERC20.sol";
import {AgentRegistry} from "../src/AgentRegistry.sol";
import {PolicyPool} from "../src/PolicyPool.sol";
import {RiskEngine} from "../src/RiskEngine.sol";

/**
 * Seeds the deployed testnet contracts with realistic, organic-looking on-chain
 * state: a diverse agent registry, capital supplied in tranches, and policies
 * bound for many distinct buyers with non-round coverage and varied risk. Every
 * line is a genuine transaction — the dashboard reads it straight from chain.
 *
 * Addresses are env-driven so the same script targets any deployment:
 *   POOL_ADDRESS, USDC_ADDRESS, REGISTRY_ADDRESS
 */
contract SeedTestnet is Script {
    uint256 constant U = 1e6; // USDC 6 decimals

    AgentRegistry registry;
    PolicyPool pool;
    MockERC20 usdc;

    function run() external {
        uint256 pk = vm.envUint("PRIVATE_KEY");
        address deployer = vm.addr(pk);

        registry = AgentRegistry(vm.envAddress("REGISTRY_ADDRESS"));
        pool = PolicyPool(vm.envAddress("POOL_ADDRESS"));
        usdc = MockERC20(vm.envAddress("USDC_ADDRESS"));

        vm.startBroadcast(pk);

        // 1. Registry — a varied set of agents (skips any already registered).
        _agent(0xA01, "Aurora Analytics", "@aurora", "analytics", 9540, true);
        _agent(0xA02, "Helios Ops", "@helios", "automation", 8810, false);
        _agent(0xA03, "Kite Search", "@kite", "retrieval", 7620, false);
        _agent(0xA04, "Vector Studio", "@vector", "creative", 6480, false);
        _agent(0xA05, "Nimbus Labs", "@nimbus", "data", 9110, false);
        _agent(0xA06, "Orbit Relay", "@orbit", "infra", 8360, true);
        _agent(0xA07, "Delta Vision", "@delta", "vision", 7040, false);

        // 2. Capital — supplied in two tranches, not one round lump.
        pool.grantRole(pool.CAPITAL_ROLE(), deployer);
        usdc.mint(deployer, 400_000 * U);
        usdc.approve(address(pool), type(uint256).max);
        pool.depositCapital(87_400 * U);
        pool.depositCapital(63_150 * U);

        // 3. Policies — distinct buyers, non-round cover, varied reliability/tenor.
        pool.grantRole(pool.UNDERWRITER_ROLE(), deployer);
        _bind(0xB1, 1_450 * U + 500000, 9520, 12, "int-a1", "rly-a1");
        _bind(0xB2, 8_120 * U, 8830, 72, "int-b2", "rly-b2");
        _bind(0xB3, 620 * U + 250000, 7690, 24, "int-c3", "rly-c3");
        _bind(0xB4, 15_400 * U, 9140, 168, "int-d4", "rly-d4");
        _bind(0xB5, 3_275 * U, 6720, 48, "int-e5", "rly-e5");
        _bind(0xB6, 4_890 * U + 750000, 8250, 24, "int-f6", "rly-f6");
        _bind(0xB7, 2_310 * U, 9380, 36, "int-g7", "rly-g7");
        _bind(0xB8, 940 * U, 7180, 12, "int-h8", "rly-h8");

        vm.stopBroadcast();

        console2.log("=== Seed complete ===");
        console2.log("Agents:        ", registry.agentCount());
        console2.log("totalCapital:  ", pool.totalCapital());
        console2.log("lockedCapital: ", pool.lockedCapital());
        console2.log("policies:      ", pool.nextPolicyId());
    }

    function _agent(
        uint256 seed,
        string memory name,
        string memory handle,
        string memory category,
        uint256 reliabilityBps,
        bool firstParty
    ) internal {
        address w = vm.addr(seed);
        if (registry.indexOf(w) != 0) return;
        registry.registerAgent(w, name, handle, category, reliabilityBps, firstParty);
    }

    function _bind(
        uint256 buyerSeed,
        uint256 coverage,
        uint256 reliabilityBps,
        uint256 tenorHours,
        string memory intentSeed,
        string memory relayerSeed
    ) internal {
        RiskEngine.Quote memory q = pool.quoteFor(reliabilityBps, coverage, tenorHours);
        require(q.insurable, "not insurable");
        usdc.transfer(address(pool), q.premium);
        pool.bindDirect(
            PolicyPool.BindParams({
                beneficiary: vm.addr(buyerSeed),
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
