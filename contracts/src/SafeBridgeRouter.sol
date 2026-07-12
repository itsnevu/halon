// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

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

/**
 * @title SafeBridgeRouter
 * @notice Multi-token premium router. Swaps user tokens to USDC to fund PolicyPool premiums.
 */
contract SafeBridgeRouter {
    address public immutable usdc;
    IPolicyPool public immutable policyPool;

    constructor(address _usdc, address _policyPool) {
        usdc = _usdc;
        policyPool = IPolicyPool(_policyPool);
    }

    /**
     * @notice Simulates a swap from an arbitrary ERC20 token to USDC.
     * @dev In production, this would call Uniswap V3 or a similar DEX. 
     *      For this local mock, we assume the user already sent enough USDC 
     *      or we simulate the conversion rate 1:1 if it's USDC itself.
     */
    function routeAndBind(
        address tokenIn,
        uint256 amountIn,
        IPolicyPool.BindParams memory params
    ) external returns (uint256 policyId) {
        // 1. Transfer token in from user
        IERC20(tokenIn).transferFrom(msg.sender, address(this), amountIn);
        
        uint256 usdcAmount;
        if (tokenIn != usdc) {
            // MOCK SWAP LOGIC
            // In a real scenario: IUniswapV3Router.exactInputSingle(...)
            // Here, we just assume the router holds a reserve of USDC for testing
            // and we "swap" at a fixed arbitrary rate just to prove the concept.
            usdcAmount = params.premium; // we output exactly what the pool needs
        } else {
            usdcAmount = amountIn;
            require(usdcAmount >= params.premium, "Insufficient USDC premium");
        }

        // 2. Approve PolicyPool to take the USDC
        IERC20(usdc).approve(address(policyPool), params.premium);

        // 3. Bind the policy
        policyId = policyPool.bindDirect(params);

        // 4. Refund any excess USDC if we didn't use it all
        uint256 excess = usdcAmount - params.premium;
        if (excess > 0 && tokenIn == usdc) {
            IERC20(usdc).transfer(msg.sender, excess);
        }
    }
}
