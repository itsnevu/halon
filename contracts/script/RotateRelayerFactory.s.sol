// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import {Script, console2} from "forge-std/Script.sol";
import {EscrowFactory} from "../src/ProofOfWork/EscrowFactory.sol";

/**
 * Surgical relayer rotation — the security fix that makes ProofOfWork safe.
 *
 * The factory bakes its `aiAgent` (the only address allowed to sign AI milestone
 * approvals) in at construction, and every project it deploys inherits it. The
 * original deployment used the PUBLIC Anvil dev account 0x7099… as aiAgent, whose
 * private key is known to everyone — so anyone could forge `approveMilestoneAI`
 * and unlock payouts. This rotates that trust anchor.
 *
 * It deploys ONLY a new EscrowFactory wired to a fresh secret relayer, reusing the
 * existing USDG / AAPL / oracle / vault untouched (those are passed per-project in
 * createProject, not held by the factory). Token balances are NOT reset.
 *
 * After it runs:
 *   1. set NEXT_PUBLIC_POW_ESCROW_FACTORY (dashboard/.env.local + Vercel) to the
 *      printed factory address — the ONLY dashboard var that changes;
 *   2. on the backend VPS set RELAYER_PRIVATE_KEY to the matching secret and
 *      RELAYER_ALLOW_DEV_KEY=false, then restart the FastAPI service.
 *
 * Env:
 *   PRIVATE_KEY         deployer key (funds the deploy)
 *   AI_AGENT_ADDRESS    the NEW secret relayer's address  (REQUIRED — dev key refused)
 *   RHC_SEQUENCER_FEED  same value used in the first deploy  (default 0 = skip check)
 *   RHC_PRICE_MAX_AGE   same value used in the first deploy  (default 86400)
 */
contract RotateRelayerFactory is Script {
    /// @dev The public Anvil account #1. Refuse to reuse it as the relayer.
    address constant DEV_KEY_ADDR = 0x70997970C51812dc3A010C7d01b50e0d17dc79C8;

    function run() external {
        uint256 pk = vm.envUint("PRIVATE_KEY");
        address aiAgent = vm.envAddress("AI_AGENT_ADDRESS");
        require(
            aiAgent != address(0) && aiAgent != DEV_KEY_ADDR,
            "Set AI_AGENT_ADDRESS to a fresh secret relayer (not the public dev key)"
        );

        vm.startBroadcast(pk);
        EscrowFactory factory = new EscrowFactory(
            aiAgent,
            vm.envOr("RHC_SEQUENCER_FEED", address(0)),
            vm.envOr("RHC_PRICE_MAX_AGE", uint256(86400))
        );
        vm.stopBroadcast();

        console2.log("=== Relayer rotated ===");
        console2.log("New EscrowFactory: ", address(factory));
        console2.log("aiAgent (relayer): ", aiAgent);
        console2.log("Next: set NEXT_PUBLIC_POW_ESCROW_FACTORY to the factory address above.");
    }
}
