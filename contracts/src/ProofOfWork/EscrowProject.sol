// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";

interface IAggregatorV3 {
    function latestRoundData() external view returns (uint80, int256, uint256, uint256, uint80);
    function decimals() external view returns (uint8);
}

contract EscrowProject is ReentrancyGuard {
    using SafeERC20 for IERC20;

    address public client;
    address public freelancer;
    address public aiAgent; // Authorized AI Agent relayer
    IERC20 public collateralToken;
    IAggregatorV3 public priceOracle; // Optional, address(0) if using USDG directly

    uint256 public totalAmount; // In collateral token units
    uint256 public amountReleased;

    struct Milestone {
        uint256 id;
        uint256 amount; // Amount to release for this milestone
        string description;
        bool aiApproved;
        uint256 aiScore;
        bool clientApproved;
        bool isPaid;
    }

    Milestone[] public milestones;

    event MilestoneCreated(uint256 indexed id, uint256 amount, string description);
    event MilestoneAIApproved(uint256 indexed id, uint256 score);
    event MilestoneClientApproved(uint256 indexed id);
    event MilestonePaid(uint256 indexed id, uint256 amount, address to);

    modifier onlyClient() {
        require(msg.sender == client, "Only client");
        _;
    }

    modifier onlyAIAgent() {
        require(msg.sender == aiAgent, "Only AI agent");
        _;
    }

    constructor(
        address _client,
        address _freelancer,
        address _aiAgent,
        address _collateralToken,
        address _priceOracle,
        uint256 _totalAmount
    ) {
        client = _client;
        freelancer = _freelancer;
        aiAgent = _aiAgent;
        collateralToken = IERC20(_collateralToken);
        priceOracle = IAggregatorV3(_priceOracle);
        totalAmount = _totalAmount;
    }

    /// @notice Number of milestones on this project. Lets the UI enumerate them.
    function milestoneCount() external view returns (uint256) {
        return milestones.length;
    }

    function addMilestone(uint256 amount, string memory description) external onlyClient {
        uint256 id = milestones.length;
        milestones.push(Milestone({
            id: id,
            amount: amount,
            description: description,
            aiApproved: false,
            aiScore: 0,
            clientApproved: false,
            isPaid: false
        }));
        emit MilestoneCreated(id, amount, description);
    }

    function approveMilestoneAI(uint256 milestoneId, uint256 score) external onlyAIAgent {
        require(milestoneId < milestones.length, "Invalid milestone");
        require(!milestones[milestoneId].aiApproved, "Already AI approved");
        
        milestones[milestoneId].aiApproved = true;
        milestones[milestoneId].aiScore = score;
        emit MilestoneAIApproved(milestoneId, score);
    }

    function approveMilestoneClient(uint256 milestoneId) external onlyClient {
        require(milestoneId < milestones.length, "Invalid milestone");
        require(!milestones[milestoneId].clientApproved, "Already client approved");
        
        milestones[milestoneId].clientApproved = true;
        emit MilestoneClientApproved(milestoneId);
    }

    function releaseMilestone(uint256 milestoneId) external nonReentrant {
        require(milestoneId < milestones.length, "Invalid milestone");
        Milestone storage m = milestones[milestoneId];
        require(m.aiApproved, "AI not approved");
        require(m.clientApproved, "Client not approved");
        require(!m.isPaid, "Already paid");

        m.isPaid = true;
        amountReleased += m.amount;
        
        collateralToken.safeTransfer(freelancer, m.amount);
        emit MilestonePaid(milestoneId, m.amount, freelancer);
    }

    function getCollateralValueUSD() public view returns (uint256) {
        if (address(priceOracle) == address(0)) {
            // Assume 1:1 if no oracle (e.g., USDG)
            return collateralToken.balanceOf(address(this));
        }

        (, int256 price, , uint256 updatedAt, ) = priceOracle.latestRoundData();
        require(price > 0, "Invalid oracle price");
        require(block.timestamp <= updatedAt + 1 hours, "Stale oracle price");

        uint8 decimals = priceOracle.decimals();
        
        uint256 balance = collateralToken.balanceOf(address(this));
        // Return value normalized to 18 decimals roughly for MVP
        return (balance * uint256(price)) / (10 ** decimals);
    }

    function topUpCollateral(uint256 amount) external onlyClient nonReentrant {
        require(amount > 0, "Amount must be greater than zero");
        collateralToken.safeTransferFrom(msg.sender, address(this), amount);
        totalAmount += amount;
    }
}
