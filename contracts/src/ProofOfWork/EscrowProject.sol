// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/extensions/IERC20Metadata.sol";
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

    // ── Chainlink production guards (Robinhood Chain is an Arbitrum L2) ──────────
    /// @notice L2 sequencer uptime feed. address(0) skips the check (local/tests).
    IAggregatorV3 public sequencerUptimeFeed;
    /// @notice Max age (seconds) a price may be before it's rejected as stale.
    uint256 public priceMaxAge;
    /// @notice Seconds to wait after the sequencer comes back before trusting prices.
    uint256 public constant SEQUENCER_GRACE_PERIOD = 3600;
    /// @notice All USD valuations are returned scaled to 18 decimals.
    uint8 private constant USD_DECIMALS = 18;

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

    event PriceMaxAgeUpdated(uint256 newMaxAge);

    constructor(
        address _client,
        address _freelancer,
        address _aiAgent,
        address _collateralToken,
        address _priceOracle,
        uint256 _totalAmount,
        address _sequencerUptimeFeed,
        uint256 _priceMaxAge
    ) {
        client = _client;
        freelancer = _freelancer;
        aiAgent = _aiAgent;
        collateralToken = IERC20(_collateralToken);
        priceOracle = IAggregatorV3(_priceOracle);
        totalAmount = _totalAmount;
        sequencerUptimeFeed = IAggregatorV3(_sequencerUptimeFeed);
        priceMaxAge = _priceMaxAge == 0 ? 1 hours : _priceMaxAge;
    }

    /// @notice Client can tune the staleness window to the collateral feed's
    ///         heartbeat (crypto feeds are tight; stock feeds update 24/5 so a
    ///         wider window avoids false "stale" reverts over market close).
    function setPriceMaxAge(uint256 newMaxAge) external onlyClient {
        require(newMaxAge > 0, "maxAge=0");
        priceMaxAge = newMaxAge;
        emit PriceMaxAgeUpdated(newMaxAge);
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

    /// @notice USD value of the collateral held, scaled to 18 decimals.
    /// @dev Production Chainlink read per the Robinhood Chain oracle guide:
    ///      L2 sequencer uptime → answer validity → staleness → decimal scaling.
    ///      The feed already returns the multiplier-adjusted per-token price for
    ///      Stock Tokens, so we multiply the raw balance by it directly (this is
    ///      the "token value" figure; no uiMultiplier math is needed for USD).
    function getCollateralValueUSD() public view returns (uint256) {
        uint256 balance = collateralToken.balanceOf(address(this));

        if (address(priceOracle) == address(0)) {
            // No oracle → stablecoin collateral (e.g. USDG), valued 1:1 in USD,
            // normalised from the token's own decimals to 18.
            return _scaleTo18(balance, _tokenDecimals());
        }

        _requireSequencerUp();

        (, int256 answer, , uint256 updatedAt, ) = priceOracle.latestRoundData();
        require(answer > 0, "Invalid oracle price");
        require(updatedAt > 0, "Round not complete");
        require(block.timestamp - updatedAt <= priceMaxAge, "Stale oracle price");

        uint8 feedDecimals = priceOracle.decimals();
        // value = balance * price, then normalise (tokenDecimals + feedDecimals) → 18.
        uint256 raw = balance * uint256(answer);
        return _scaleTo18(raw, _tokenDecimals() + feedDecimals);
    }

    /// @dev Reverts unless the L2 sequencer is up and past its grace period.
    ///      Skipped when no sequencer feed is configured (local Anvil / tests).
    function _requireSequencerUp() internal view {
        if (address(sequencerUptimeFeed) == address(0)) return;
        (, int256 status, uint256 startedAt, , ) = sequencerUptimeFeed.latestRoundData();
        require(status == 0, "Sequencer down"); // 0 = up
        require(block.timestamp - startedAt > SEQUENCER_GRACE_PERIOD, "Grace period not over");
    }

    /// @dev Collateral token decimals, defaulting to 18 if the token omits them.
    function _tokenDecimals() internal view returns (uint8) {
        try IERC20Metadata(address(collateralToken)).decimals() returns (uint8 d) {
            return d;
        } catch {
            return 18;
        }
    }

    /// @dev Rescale `amount` from `fromDecimals` to 18 decimals.
    function _scaleTo18(uint256 amount, uint8 fromDecimals) internal pure returns (uint256) {
        if (fromDecimals == USD_DECIMALS) return amount;
        if (fromDecimals > USD_DECIMALS) return amount / (10 ** (fromDecimals - USD_DECIMALS));
        return amount * (10 ** (USD_DECIMALS - fromDecimals));
    }

    function topUpCollateral(uint256 amount) external onlyClient nonReentrant {
        require(amount > 0, "Amount must be greater than zero");
        collateralToken.safeTransferFrom(msg.sender, address(this), amount);
        totalAmount += amount;
    }
}
