// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import {Script, console2} from "forge-std/Script.sol";
import {MockERC20} from "../src/ProofOfWork/mocks/MockERC20.sol";
import {MockAggregatorV3} from "../src/ProofOfWork/mocks/MockAggregatorV3.sol";
import {MockMorphoVault} from "../src/ProofOfWork/mocks/MockMorphoVault.sol";
import {EscrowFactory} from "../src/ProofOfWork/EscrowFactory.sol";
import {PaymentDistributor} from "../src/ProofOfWork/PaymentDistributor.sol";

contract DeployProofOfWork is Script {
    function run() external {
        // Use default Anvil Account #0 to deploy
        uint256 deployerPrivateKey = vm.envOr("PRIVATE_KEY", uint256(0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80));
        address deployer = vm.addr(deployerPrivateKey);

        // Account #1 is the AI Agent/Relayer
        address aiAgent = vm.envOr("AI_AGENT_ADDRESS", address(0x70997970C51812dc3A010C7d01b50e0d17dc79C8));

        console2.log("Deployer:", deployer);
        console2.log("AI Agent Address:", aiAgent);

        vm.startBroadcast(deployerPrivateKey);

        // 1. Deploy Mock Tokens
        MockERC20 usdg = new MockERC20("USDG Stablecoin", "USDG", 18);
        MockERC20 aapl = new MockERC20("Tokenized Apple Stock", "AAPL", 18);

        // Mint initial balances
        usdg.mint(deployer, 1_000_000 * 10**18);
        aapl.mint(deployer, 1_000_000 * 10**18);

        // 2. Deploy Price Oracle (AAPL price = $150 with 8 decimals)
        MockAggregatorV3 aaplOracle = new MockAggregatorV3(8, 150 * 10**8);

        // 3. Deploy Escrow Factory
        EscrowFactory factory = new EscrowFactory(aiAgent);

        // 4. Deploy Morpho Vault
        MockMorphoVault morphoVault = new MockMorphoVault(address(usdg));

        // 5. Deploy Payment Distributor
        PaymentDistributor paymentDistributor = new PaymentDistributor(
            address(morphoVault),
            address(usdg),
            aiAgent
        );

        // Supply initial liquidy to Morpho Vault for advance financing
        usdg.approve(address(morphoVault), 500_000 * 10**18);
        morphoVault.deposit(500_000 * 10**18, deployer);

        vm.stopBroadcast();

        console2.log("=== ProofOfWork Suite Deployed ===");
        console2.log("USDG (Mock):           ", address(usdg));
        console2.log("AAPL (Mock):           ", address(aapl));
        console2.log("AAPL Price Oracle:     ", address(aaplOracle));
        console2.log("EscrowFactory:         ", address(factory));
        console2.log("MockMorphoVault:       ", address(morphoVault));
        console2.log("PaymentDistributor:    ", address(paymentDistributor));
    }
}
