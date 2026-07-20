# ProofOfWork

**ProofOfWork** is a milestone-based escrow platform built for the **Robinhood Chain Hackathon**. It shifts the paradigm from passive liquidity vaults to an active, real-world utility by combining **RWA (Stock Tokens)**, **DeFi Lending (Robinhood Earn)**, and **AI-Driven Risk Management**.

## The Problem
Global freelancers face chronic cash-flow issues and payment uncertainty. Traditional Web2 platforms charge exorbitant fees, hold funds for 14-30 days, and offer no advance financing options for gig workers.

## The Solution (ProofOfWork)
We built an end-to-end B2B/B2C SaaS on blockchain rails:
1. **RWA Escrow**: Clients lock tokenized assets (e.g., AAPL) or USDG as collateral.
2. **AI Verifier**: Freelancers upload work proofs. A Python FastAPI backend running an LLM (simulated Llama 3) scores the submission (0-100) based on anomaly detection, duplication, and contract rules.
3. **Advance Financing**: If a client has a high reputation score, the smart contract automatically borrows from the **Robinhood Earn** liquidity pool (Morpho) to pay the freelancer upfront (85% value). The client repays at net-30, rewarding liquidity providers with extra yield.

## Smart Contracts (`contracts/src/ProofOfWork/`)
- `EscrowFactory.sol`: Factory to deploy new client-freelancer projects.
- `EscrowProject.sol`: Manages collateral, Oracle price validation, and milestone payouts.
- `PaymentDistributor.sol`: Handles the Advance Financing logic and integrates with `MockMorphoVault`.

## AI Backend (`ai-agent/`)
- FastAPI server.
- Uses OCR (mocked) and LLM logic to output a risk score.
- Acts as an authorized relayer to sign `approveMilestoneAI` on-chain.

## UI Dashboards (`dashboard/app/pow/`)
- **Client Portal**: Lock collateral, approve work.
- **Freelancer Portal**: Upload work, view AI verification, claim funds instantly.
- **Liquidity Provider Portal**: Supply USDG to earn base APY + advance financing yields.

---
*Built for the Robinhood Chain Hackathon 2026.*
