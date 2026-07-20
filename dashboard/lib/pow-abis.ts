export const ERC20_ABI = [
  {
    "constant": true,
    "inputs": [{ "name": "account", "type": "address" }],
    "name": "balanceOf",
    "outputs": [{ "name": "", "type": "uint256" }],
    "payable": false,
    "stateMutability": "view",
    "type": "function"
  },
  {
    "constant": false,
    "inputs": [
      { "name": "spender", "type": "address" },
      { "name": "amount", "type": "uint256" }
    ],
    "name": "approve",
    "outputs": [{ "name": "", "type": "bool" }],
    "payable": false,
    "stateMutability": "nonpayable",
    "type": "function"
  }
] as const;

export const ESCROW_FACTORY_ABI = [
  {
    "inputs": [
      { "internalType": "address", "name": "freelancer", "type": "address" },
      { "internalType": "address", "name": "collateralToken", "type": "address" },
      { "internalType": "address", "name": "priceOracle", "type": "address" },
      { "internalType": "uint256", "name": "totalAmount", "type": "uint256" }
    ],
    "name": "createProject",
    "outputs": [{ "internalType": "address", "name": "", "type": "address" }],
    "stateMutability": "nonpayable",
    "type": "function"
  }
] as const;

export const ESCROW_PROJECT_ABI = [
  {
    "inputs": [{ "internalType": "uint256", "name": "milestoneId", "type": "uint256" }],
    "name": "releaseMilestone",
    "outputs": [],
    "stateMutability": "nonpayable",
    "type": "function"
  }
] as const;

export const MORPHO_VAULT_ABI = [
  {
    "inputs": [],
    "name": "totalAssets",
    "outputs": [{ "internalType": "uint256", "name": "", "type": "uint256" }],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [
      { "internalType": "uint256", "name": "assets", "type": "uint256" },
      { "internalType": "address", "name": "receiver", "type": "address" }
    ],
    "name": "deposit",
    "outputs": [{ "internalType": "uint256", "name": "shares", "type": "uint256" }],
    "stateMutability": "nonpayable",
    "type": "function"
  }
] as const;
