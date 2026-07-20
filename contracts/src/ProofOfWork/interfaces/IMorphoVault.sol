// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

interface IMorphoVault {
    function deposit(uint256 assets, address receiver) external returns (uint256 shares);
    function withdraw(uint256 assets, address receiver, address owner) external returns (uint256 shares);
    function totalAssets() external view returns (uint256);
    function borrow(uint256 assets, address receiver) external; // Abstracted for MVP advance financing
    function repay(uint256 assets, address onBehalfOf) external; // Repay loan + yield
}
