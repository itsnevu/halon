// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import {Script, console2} from "forge-std/Script.sol";
import {MockERC20} from "../src/ProofOfWork/mocks/MockERC20.sol";
import {MockAggregatorV3} from "../src/ProofOfWork/mocks/MockAggregatorV3.sol";
import {MockMorphoVault} from "../src/ProofOfWork/mocks/MockMorphoVault.sol";
import {EscrowFactory} from "../src/ProofOfWork/EscrowFactory.sol";
import {PaymentDistributor} from "../src/ProofOfWork/PaymentDistributor.sol";
import {AgentRegistry} from "../src/AgentRegistry.sol";

/**
 * Production-ready deploy for the ProofOfWork suite on Robinhood Chain.
 *
 * Every external dependency is read from the environment. When a real address is
 * provided it is used as-is (production); when omitted, a functional stand-in is
 * deployed so the same script still works on a fresh testnet / local Anvil.
 *
 *   AI_AGENT_ADDRESS      relayer that submits AI approvals            (required in prod)
 *   RHC_SEQUENCER_FEED    Chainlink L2 sequencer uptime feed proxy     (0 = skip check)
 *   RHC_PRICE_MAX_AGE     default oracle staleness window, seconds     (default 86400)
 *   RHC_USDG              real USDG stablecoin address                 (else deploy mock)
 *   RHC_AAPL              real tokenized-AAPL stock token address      (else deploy mock)
 *   RHC_AAPL_FEED         real Chainlink AAPL price-feed proxy         (else deploy mock $150)
 *   RHC_MORPHO_VAULT      real Morpho (ERC-4626) vault address         (else deploy vault)
 *
 * Feed proxy addresses are the source of truth on the Robinhood price-feeds page —
 * pass them via env, never hardcode.
 */
contract DeployProofOfWork is Script {
    struct Deployed {
        address usdg;
        address aapl;
        address aaplOracle;
        address factory;
        address vault;
        address paymentDistributor;
        address agentRegistry;
    }

    function run() external {
        uint256 deployerPrivateKey = vm.envOr(
            "PRIVATE_KEY",
            uint256(0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80)
        );
        address deployer = vm.addr(deployerPrivateKey);

        vm.startBroadcast(deployerPrivateKey);
        Deployed memory d = _deploy(deployer);
        vm.stopBroadcast();

        console2.log("=== ProofOfWork Suite Deployed ===");
        console2.log("Deployer:              ", deployer);
        console2.log("USDG:                  ", d.usdg);
        console2.log("AAPL:                  ", d.aapl);
        console2.log("AAPL Price Oracle:     ", d.aaplOracle);
        console2.log("EscrowFactory:         ", d.factory);
        console2.log("Yield Vault:           ", d.vault);
        console2.log("PaymentDistributor:    ", d.paymentDistributor);
        console2.log("AgentRegistry:         ", d.agentRegistry);
    }

    /// @dev All deployment logic; kept in one broadcast. Split out of run() so
    ///      the config locals don't blow the stack.
    function _deploy(address deployer) internal returns (Deployed memory d) {
        address aiAgent = vm.envOr("AI_AGENT_ADDRESS", address(0x70997970C51812dc3A010C7d01b50e0d17dc79C8));

        // 1. Collateral tokens — real if given, otherwise functional test tokens.
        d.usdg = _token("RHC_USDG", "USDG Stablecoin", "USDG", deployer);
        d.aapl = _token("RHC_AAPL", "Tokenized Apple Stock", "AAPL", deployer);

        // 2. AAPL price feed — real Chainlink proxy if given, else a $150/8-dp stub.
        d.aaplOracle = vm.envOr("RHC_AAPL_FEED", address(0));
        if (d.aaplOracle == address(0)) {
            d.aaplOracle = address(new MockAggregatorV3(8, 150 * 10 ** 8));
        }

        // 3. Escrow factory, wired with the L2 sequencer feed + staleness default.
        d.factory = address(
            new EscrowFactory(
                aiAgent,
                vm.envOr("RHC_SEQUENCER_FEED", address(0)),
                vm.envOr("RHC_PRICE_MAX_AGE", uint256(86400))
            )
        );

        // 4. Yield vault — real Morpho vault if given, else deploy an ERC-4626 vault.
        d.vault = vm.envOr("RHC_MORPHO_VAULT", address(0));
        if (d.vault == address(0)) {
            d.vault = address(new MockMorphoVault(d.usdg));
            // Seed initial liquidity only for our own freshly-deployed test token.
            if (vm.envOr("RHC_USDG", address(0)) == address(0)) {
                MockERC20(d.usdg).approve(d.vault, 500_000 * 10 ** 18);
                MockMorphoVault(d.vault).deposit(500_000 * 10 ** 18, deployer);
            }
        }

        // 5. Payment distributor for advance financing.
        d.paymentDistributor = address(new PaymentDistributor(d.vault, d.usdg, aiAgent));

        // 6. Agent registry — on-chain source of truth for agent identity. Starts
        //    empty; the operator registers real agents via registerAgent().
        d.agentRegistry = address(new AgentRegistry(deployer));
    }

    /// @dev Return the real token at `envKey`, or deploy a functional mock and
    ///      mint the deployer a starting balance.
    function _token(
        string memory envKey,
        string memory name,
        string memory symbol,
        address deployer
    ) internal returns (address) {
        address real = vm.envOr(envKey, address(0));
        if (real != address(0)) return real;
        MockERC20 t = new MockERC20(name, symbol, 18);
        t.mint(deployer, 1_000_000 * 10 ** 18);
        return address(t);
    }
}
