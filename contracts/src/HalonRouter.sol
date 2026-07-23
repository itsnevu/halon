// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import {Ownable} from "@openzeppelin/contracts/access/Ownable.sol";

interface IERC20 {
    function transferFrom(address sender, address recipient, uint256 amount) external returns (bool);
    function transfer(address recipient, uint256 amount) external returns (bool);
    function approve(address spender, uint256 amount) external returns (bool);
    function balanceOf(address account) external view returns (uint256);
}

interface IPolicyPool {
    struct BindParams {
        address beneficiary;
        uint256 coverage;
        uint256 premium;
        uint256 tenorHours;
        uint256 reliabilityBps;
        bytes32 intentId;
        bytes32 relayerId;
    }
    function bindDirect(BindParams calldata p) external returns (uint256);
}

/// @dev Uniswap V3 SwapRouter surface (the subset we use).
interface ISwapRouter {
    struct ExactInputSingleParams {
        address tokenIn;
        address tokenOut;
        uint24 fee;
        address recipient;
        uint256 deadline;
        uint256 amountIn;
        uint256 amountOutMinimum;
        uint160 sqrtPriceLimitX96;
    }

    function exactInputSingle(ExactInputSingleParams calldata params) external payable returns (uint256 amountOut);
}

/**
 * @title HalonRouter
 * @notice One-transaction entry: pull the buyer's token, convert it to the USDC
 *         premium the pool needs, and bind the policy. The conversion is a REAL
 *         Uniswap-V3 swap when a DEX router is configured; there is no fabricated
 *         USDC. If the buyer pays in USDC no swap happens. If they pay another
 *         token and no DEX router is set, the call reverts rather than pretending.
 */
contract HalonRouter is Ownable {
    address public immutable usdc;
    IPolicyPool public immutable policyPool;

    /// @notice The DEX router used to swap non-USDC tokens into USDC. address(0)
    ///         until a DEX is live on the chain — the USDC path works regardless.
    ISwapRouter public swapRouter;
    /// @notice Pool fee tier for the swap (e.g. 3000 = 0.3%).
    uint24 public poolFee = 3000;

    event SwapRouterUpdated(address router, uint24 poolFee);
    event RoutedAndBound(uint256 indexed policyId, address indexed tokenIn, uint256 amountIn, uint256 usdcUsed);

    error SwapRouterNotConfigured();
    error InsufficientUsdcPremium(uint256 have, uint256 need);
    error SwapOutputBelowPremium(uint256 out, uint256 need);

    constructor(address _usdc, address _policyPool, address _swapRouter) Ownable(msg.sender) {
        usdc = _usdc;
        policyPool = IPolicyPool(_policyPool);
        swapRouter = ISwapRouter(_swapRouter);
    }

    /// @notice Set/clear the DEX router and fee tier once a DEX is available.
    function setSwapRouter(address router, uint24 fee) external onlyOwner {
        swapRouter = ISwapRouter(router);
        poolFee = fee;
        emit SwapRouterUpdated(router, fee);
    }

    function routeAndBind(address tokenIn, uint256 amountIn, IPolicyPool.BindParams memory params)
        external
        returns (uint256 policyId)
    {
        // 1. Pull the buyer's token.
        IERC20(tokenIn).transferFrom(msg.sender, address(this), amountIn);

        uint256 usdcAmount;
        if (tokenIn == usdc) {
            usdcAmount = amountIn;
            if (usdcAmount < params.premium) revert InsufficientUsdcPremium(usdcAmount, params.premium);
        } else {
            // Real DEX swap — no fake output. Requires a configured router.
            if (address(swapRouter) == address(0)) revert SwapRouterNotConfigured();
            IERC20(tokenIn).approve(address(swapRouter), amountIn);
            usdcAmount = swapRouter.exactInputSingle(
                ISwapRouter.ExactInputSingleParams({
                    tokenIn: tokenIn,
                    tokenOut: usdc,
                    fee: poolFee,
                    recipient: address(this),
                    deadline: block.timestamp,
                    amountIn: amountIn,
                    amountOutMinimum: params.premium, // never accept less than the premium
                    sqrtPriceLimitX96: 0
                })
            );
            if (usdcAmount < params.premium) revert SwapOutputBelowPremium(usdcAmount, params.premium);
        }

        // 2. Approve + bind.
        IERC20(usdc).approve(address(policyPool), params.premium);
        policyId = policyPool.bindDirect(params);

        // 3. Refund any excess USDC to the buyer.
        uint256 excess = usdcAmount - params.premium;
        if (excess > 0) {
            IERC20(usdc).transfer(msg.sender, excess);
        }

        emit RoutedAndBound(policyId, tokenIn, amountIn, params.premium);
    }
}
