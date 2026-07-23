// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import {Ownable} from "@openzeppelin/contracts/access/Ownable.sol";

/**
 * @title  AgentRegistry
 * @notice On-chain registry of agents HALON can insure. This is the source of
 *         truth for agent identity (name, handle, category) and reliability —
 *         data that has no other on-chain home. The dashboard reads it directly;
 *         nothing is faked client-side.
 *
 * Registration is owner-gated (the protocol operator). Reliability is expressed
 * in basis points (0–10000) and is the same figure the RiskEngine prices on.
 */
contract AgentRegistry is Ownable {
    struct Agent {
        address wallet;
        string name;
        string handle;
        string category;
        uint256 reliabilityBps; // 0..10000
        bool firstParty; // true = HALON first-party worker
        bool active;
        uint256 registeredAt;
    }

    Agent[] private _agents;
    /// @notice 1-based index into `_agents` (0 means "not registered").
    mapping(address wallet => uint256 index1) public indexOf;

    event AgentRegistered(address indexed wallet, string name, uint256 reliabilityBps);
    event AgentUpdated(address indexed wallet, uint256 reliabilityBps, bool active);

    error AlreadyRegistered(address wallet);
    error NotRegistered(address wallet);
    error ReliabilityOutOfRange(uint256 bps);

    constructor(address owner_) Ownable(owner_) {}

    function registerAgent(
        address wallet,
        string calldata name,
        string calldata handle,
        string calldata category,
        uint256 reliabilityBps,
        bool firstParty
    ) external onlyOwner {
        if (wallet == address(0)) revert NotRegistered(wallet);
        if (indexOf[wallet] != 0) revert AlreadyRegistered(wallet);
        if (reliabilityBps > 10000) revert ReliabilityOutOfRange(reliabilityBps);

        _agents.push(
            Agent({
                wallet: wallet,
                name: name,
                handle: handle,
                category: category,
                reliabilityBps: reliabilityBps,
                firstParty: firstParty,
                active: true,
                registeredAt: block.timestamp
            })
        );
        indexOf[wallet] = _agents.length; // 1-based
        emit AgentRegistered(wallet, name, reliabilityBps);
    }

    /// @notice Update the mutable fields: reliability and active flag.
    function updateAgent(address wallet, uint256 reliabilityBps, bool active) external onlyOwner {
        uint256 i1 = indexOf[wallet];
        if (i1 == 0) revert NotRegistered(wallet);
        if (reliabilityBps > 10000) revert ReliabilityOutOfRange(reliabilityBps);
        Agent storage a = _agents[i1 - 1];
        a.reliabilityBps = reliabilityBps;
        a.active = active;
        emit AgentUpdated(wallet, reliabilityBps, active);
    }

    /* ── Views ───────────────────────────────────────────────── */

    function agentCount() external view returns (uint256) {
        return _agents.length;
    }

    function agentAt(uint256 index) external view returns (Agent memory) {
        return _agents[index];
    }

    function getAgent(address wallet) external view returns (Agent memory) {
        uint256 i1 = indexOf[wallet];
        if (i1 == 0) revert NotRegistered(wallet);
        return _agents[i1 - 1];
    }

    /// @notice The whole registry in one call — convenient for the dashboard.
    function allAgents() external view returns (Agent[] memory) {
        return _agents;
    }
}
