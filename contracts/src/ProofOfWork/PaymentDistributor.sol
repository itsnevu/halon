// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "./interfaces/IMorphoVault.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import "@openzeppelin/contracts/utils/Pausable.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

/**
 * @title  PaymentDistributor
 * @notice Advance-financing for ProofOfWork invoices. The AI Agent funds a
 *         freelancer upfront out of the Robinhood Earn (Morpho) liquidity pool;
 *         the client repays at net-30 and the pool earns yield on the advance.
 *
 * ── Where the money goes on a $100 invoice ───────────────────────────────────
 *
 *   fund:   pool → freelancer  85% − fee      (fee = 0.5% is kept for the
 *                                              protection pool, withdrawable)
 *   repay:  client → pool      100%
 *           pool  → LP vault   85% + yield    (yield = advanceInterest × 85%)
 *           pool  → freelancer the remainder
 *
 * Every unit is conserved: the LP gets its principal back plus `yield`, the
 * protocol keeps `fee`, and the freelancer nets the rest. The earlier version
 * repaid the vault the exact principal — so LPs earned nothing and the fee was
 * locked in the contract forever. Both are fixed here.
 */
contract PaymentDistributor is ReentrancyGuard, Pausable, Ownable {
    using SafeERC20 for IERC20;

    IMorphoVault public immutable morphoVault;
    IERC20 public immutable stablecoin; // USDG

    /// @notice Accrued protection-pool fees, backed 1:1 by USDG held here.
    uint256 public protectionPoolBalance;

    uint256 public constant BPS = 10_000;
    uint256 public constant PLATFORM_FEE_BPS = 50; // 0.5% protection pool fee
    uint256 public constant ADVANCE_RATE_BPS = 8_500; // 85% of invoice paid upfront
    /// @dev Ceiling on the LP-yield knob. 10% × 85% advance keeps `principal +
    ///      yield` comfortably under the invoice, so repay can never underflow.
    uint256 public constant MAX_ADVANCE_INTEREST_BPS = 1_000;

    /// @notice Interest charged on the advanced principal, paid to the LP pool at repay.
    uint256 public advanceInterestBps = 100; // 1% default

    struct Invoice {
        address client;
        address freelancer;
        uint256 amount;
        uint256 advancedAmount;
        bool isFunded;
        bool isRepaid;
    }

    mapping(uint256 => Invoice) public invoices;
    uint256 public invoiceCounter;

    address public aiAgent; // Authorized relayer for risk scoring

    event InvoiceCreated(uint256 indexed id, address client, address freelancer, uint256 amount);
    event AdvanceFunded(uint256 indexed id, uint256 advancedAmount, uint256 payout, uint256 fee);
    event InvoiceRepaid(uint256 indexed id, uint256 totalRepaid, uint256 lpYield);
    event AiAgentChanged(address indexed previous, address indexed current);
    event AdvanceInterestChanged(uint256 bps);
    event ProtectionPoolWithdrawn(address indexed to, uint256 amount);

    error ZeroAddress();
    error ZeroAmount();
    error UnknownInvoice(uint256 id);
    error AlreadyFunded(uint256 id);
    error AlreadyRepaid(uint256 id);
    error NotFunded(uint256 id);
    error InterestTooHigh(uint256 bps);
    error InsufficientProtectionPool(uint256 requested, uint256 available);

    modifier onlyAIAgent() {
        require(msg.sender == aiAgent, "Only AI Agent");
        _;
    }

    constructor(address _morphoVault, address _stablecoin, address _aiAgent) Ownable(msg.sender) {
        if (_morphoVault == address(0) || _stablecoin == address(0) || _aiAgent == address(0)) revert ZeroAddress();
        morphoVault = IMorphoVault(_morphoVault);
        stablecoin = IERC20(_stablecoin);
        aiAgent = _aiAgent;
    }

    /* ── Admin ───────────────────────────────────────────────── */

    function setAiAgent(address newAgent) external onlyOwner {
        if (newAgent == address(0)) revert ZeroAddress();
        emit AiAgentChanged(aiAgent, newAgent);
        aiAgent = newAgent;
    }

    function setAdvanceInterestBps(uint256 bps) external onlyOwner {
        if (bps > MAX_ADVANCE_INTEREST_BPS) revert InterestTooHigh(bps);
        advanceInterestBps = bps;
        emit AdvanceInterestChanged(bps);
    }

    function pause() external onlyOwner {
        _pause();
    }

    function unpause() external onlyOwner {
        _unpause();
    }

    /// @notice Sweep accrued protection-pool fees. Bounded by the accounted balance.
    function withdrawProtectionPool(address to, uint256 amount) external onlyOwner nonReentrant {
        if (to == address(0)) revert ZeroAddress();
        if (amount > protectionPoolBalance) revert InsufficientProtectionPool(amount, protectionPoolBalance);
        protectionPoolBalance -= amount;
        stablecoin.safeTransfer(to, amount);
        emit ProtectionPoolWithdrawn(to, amount);
    }

    /* ── Invoicing ───────────────────────────────────────────── */

    // Client creates an invoice (e.g. net-30 terms)
    function createInvoice(address freelancer, uint256 amount) external whenNotPaused returns (uint256) {
        if (freelancer == address(0)) revert ZeroAddress();
        if (amount == 0) revert ZeroAmount();
        uint256 id = invoiceCounter++;
        invoices[id] = Invoice({
            client: msg.sender,
            freelancer: freelancer,
            amount: amount,
            advancedAmount: 0,
            isFunded: false,
            isRepaid: false
        });
        emit InvoiceCreated(id, msg.sender, freelancer, amount);
        return id;
    }

    /// @notice AI Agent triggers advance financing once the client's score clears its bar.
    function triggerAdvanceFinancing(uint256 invoiceId) external onlyAIAgent nonReentrant whenNotPaused {
        Invoice storage invoice = invoices[invoiceId];
        if (invoice.amount == 0) revert UnknownInvoice(invoiceId);
        if (invoice.isFunded) revert AlreadyFunded(invoiceId);
        if (invoice.isRepaid) revert AlreadyRepaid(invoiceId);

        uint256 advanceAmount = (invoice.amount * ADVANCE_RATE_BPS) / BPS;
        uint256 fee = (invoice.amount * PLATFORM_FEE_BPS) / BPS;
        uint256 payout = advanceAmount - fee;

        protectionPoolBalance += fee;
        invoice.advancedAmount = advanceAmount;
        invoice.isFunded = true;

        // Borrow from the LP vault, then pay the freelancer their advance.
        morphoVault.borrow(advanceAmount, address(this));
        stablecoin.safeTransfer(invoice.freelancer, payout);

        emit AdvanceFunded(invoiceId, advanceAmount, payout, fee);
    }

    /// @notice Client pays the invoice at net-30. Anyone may settle it on their behalf.
    function repayInvoice(uint256 invoiceId) external nonReentrant whenNotPaused {
        Invoice storage invoice = invoices[invoiceId];
        if (!invoice.isFunded) revert NotFunded(invoiceId);
        if (invoice.isRepaid) revert AlreadyRepaid(invoiceId);

        invoice.isRepaid = true; // effects before interactions

        uint256 lpYield = (invoice.advancedAmount * advanceInterestBps) / BPS;
        uint256 dueToVault = invoice.advancedAmount + lpYield;

        // Pull the full invoice from the payer.
        stablecoin.safeTransferFrom(msg.sender, address(this), invoice.amount);

        // Return principal + yield to the LP pool (Robinhood Earn / Morpho).
        stablecoin.safeIncreaseAllowance(address(morphoVault), dueToVault);
        morphoVault.repay(dueToVault, address(this));

        // Whatever remains after principal + yield is the freelancer's balance.
        uint256 remainingForFreelancer = invoice.amount - dueToVault;
        if (remainingForFreelancer > 0) {
            stablecoin.safeTransfer(invoice.freelancer, remainingForFreelancer);
        }

        emit InvoiceRepaid(invoiceId, invoice.amount, lpYield);
    }
}
