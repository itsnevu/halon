// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "../interfaces/IMorphoVault.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";

contract MockMorphoVault is IMorphoVault {
    using SafeERC20 for IERC20;

    IERC20 public underlyingToken;
    uint256 public simulatedTotalAssets;
    
    mapping(address => uint256) public borrowedAmount;

    constructor(address _underlyingToken) {
        underlyingToken = IERC20(_underlyingToken);
    }

    // LP deposits funds into the pool
    function deposit(uint256 assets, address receiver) external returns (uint256) {
        underlyingToken.safeTransferFrom(msg.sender, address(this), assets);
        simulatedTotalAssets += assets;
        return assets; // 1:1 share for MVP
    }

    function withdraw(uint256 assets, address receiver, address owner) external returns (uint256) {
        require(simulatedTotalAssets >= assets, "Not enough assets");
        simulatedTotalAssets -= assets;
        underlyingToken.safeTransfer(receiver, assets);
        return assets;
    }

    function totalAssets() external view returns (uint256) {
        return simulatedTotalAssets;
    }

    // Used by advance financing to borrow upfront
    function borrow(uint256 assets, address receiver) external {
        require(simulatedTotalAssets >= assets, "Pool drained");
        simulatedTotalAssets -= assets;
        borrowedAmount[msg.sender] += assets;
        underlyingToken.safeTransfer(receiver, assets);
    }

    // Used when client actually pays net-30 invoice
    function repay(uint256 assets, address onBehalfOf) external {
        underlyingToken.safeTransferFrom(msg.sender, address(this), assets);
        simulatedTotalAssets += assets;
        if (borrowedAmount[onBehalfOf] >= assets) {
            borrowedAmount[onBehalfOf] -= assets;
        } else {
            borrowedAmount[onBehalfOf] = 0;
        }
    }
}
