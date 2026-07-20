// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "./interfaces/IMorphoVault.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

contract PaymentDistributor is ReentrancyGuard, Ownable {
    using SafeERC20 for IERC20;

    IMorphoVault public morphoVault;
    IERC20 public stablecoin; // USDG
    
    uint256 public protectionPoolBalance;
    uint256 public constant PLATFORM_FEE_BPS = 50; // 0.5% protection pool fee
    uint256 public constant ADVANCE_RATE_BPS = 8500; // 85% of invoice value paid upfront

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
    event AdvanceFunded(uint256 indexed id, uint256 advancedAmount);
    event InvoiceRepaid(uint256 indexed id, uint256 totalRepaid);

    modifier onlyAIAgent() {
        require(msg.sender == aiAgent, "Only AI Agent");
        _;
    }

    constructor(address _morphoVault, address _stablecoin, address _aiAgent) Ownable(msg.sender) {
        morphoVault = IMorphoVault(_morphoVault);
        stablecoin = IERC20(_stablecoin);
        aiAgent = _aiAgent;
    }

    // Client creates an invoice (e.g. net-30 terms)
    function createInvoice(address freelancer, uint256 amount) external returns (uint256) {
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

    // AI Agent triggers advance financing if client score > 80
    function triggerAdvanceFinancing(uint256 invoiceId) external onlyAIAgent nonReentrant {
        Invoice storage invoice = invoices[invoiceId];
        require(!invoice.isFunded, "Already funded");
        require(!invoice.isRepaid, "Already repaid");

        // Borrow from Morpho Vault (Robinhood Earn pool)
        uint256 advanceAmount = (invoice.amount * ADVANCE_RATE_BPS) / 10000;
        
        // Fee goes to protection pool
        uint256 fee = (invoice.amount * PLATFORM_FEE_BPS) / 10000;
        protectionPoolBalance += fee;
        
        // The freelancer receives advanceAmount minus fee
        uint256 payout = advanceAmount - fee;
        
        invoice.advancedAmount = advanceAmount;
        invoice.isFunded = true;

        // Execute borrow and payout
        morphoVault.borrow(advanceAmount, address(this));
        stablecoin.safeTransfer(invoice.freelancer, payout);

        emit AdvanceFunded(invoiceId, payout);
    }

    // Client pays the invoice at net-30
    function repayInvoice(uint256 invoiceId) external nonReentrant {
        Invoice storage invoice = invoices[invoiceId];
        require(invoice.isFunded, "Not funded");
        require(!invoice.isRepaid, "Already repaid");

        // Transfer full amount from client
        stablecoin.safeTransferFrom(msg.sender, address(this), invoice.amount);
        
        // Repay Morpho Vault the advanced amount plus simulated yield
        // In a real scenario, the yield would be dynamic. For MVP, we repay the exact borrowed amount 
        // and the remaining balance is profit/yield for the protocol/LP.
        stablecoin.safeIncreaseAllowance(address(morphoVault), invoice.advancedAmount);
        morphoVault.repay(invoice.advancedAmount, address(this));
        
        // The difference (invoice.amount - advancedAmount) can be distributed:
        // - Part to freelancer (remaining 15%)
        // - Part to LP yield
        uint256 remainingForFreelancer = invoice.amount - invoice.advancedAmount;
        if (remainingForFreelancer > 0) {
            stablecoin.safeTransfer(invoice.freelancer, remainingForFreelancer);
        }

        invoice.isRepaid = true;
        emit InvoiceRepaid(invoiceId, invoice.amount);
    }
}
