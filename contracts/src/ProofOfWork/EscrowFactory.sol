// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "./EscrowProject.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";

contract EscrowFactory {
    using SafeERC20 for IERC20;

    address public aiAgent; // Authorized relayer for AI
    address public sequencerUptimeFeed; // Chainlink L2 sequencer feed (chain-wide)
    uint256 public defaultPriceMaxAge; // Default oracle staleness window (seconds)
    EscrowProject[] public deployedProjects;

    event ProjectCreated(address indexed projectAddress, address indexed client, address indexed freelancer, uint256 amount);

    constructor(address _aiAgent, address _sequencerUptimeFeed, uint256 _defaultPriceMaxAge) {
        aiAgent = _aiAgent;
        sequencerUptimeFeed = _sequencerUptimeFeed;
        defaultPriceMaxAge = _defaultPriceMaxAge == 0 ? 1 hours : _defaultPriceMaxAge;
    }

    function createProject(
        address freelancer,
        address collateralToken,
        address priceOracle,
        uint256 totalAmount
    ) external returns (address) {
        EscrowProject newProject = new EscrowProject(
            msg.sender,
            freelancer,
            aiAgent,
            collateralToken,
            priceOracle,
            totalAmount,
            sequencerUptimeFeed,
            defaultPriceMaxAge
        );

        // Transfer collateral from client to the new project contract
        IERC20(collateralToken).safeTransferFrom(msg.sender, address(newProject), totalAmount);

        deployedProjects.push(newProject);
        
        emit ProjectCreated(address(newProject), msg.sender, freelancer, totalAmount);
        
        return address(newProject);
    }

    function getDeployedProjectsCount() external view returns (uint256) {
        return deployedProjects.length;
    }
}
