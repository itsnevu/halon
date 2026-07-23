# HALON — Deployment Reference

Everything the dashboard shows is read **live from contracts on Robinhood Chain
Testnet (chainId 46630)**. No fixtures, no mock numbers. This file is the source
of truth for addresses + how to ship to production.

## Deployed addresses (Robinhood Chain Testnet · 46630)

| Contract | Address |
|---|---|
| PolicyPool A (underwriter) | `0xFE75131aAF525DC964B12F9d68E61c6a531F7526` |
| PolicyPool B (reinsurer) | `0x162A895d77f621Ec40295b9111282CC5CD6E818a` |
| DynamicRiskEngine | `0xfa0d4FBe6Df23E76A020815Efd2D8728D4F0A61F` |
| ClaimsAdjudicator | `0xd3fFBdBCadE20F7200aFf2EFfBEb025d9AA11b5a` |
| HalonRouter (real DEX swap) | `0x20384447A48E833A6a29A3Ee525e630318f6B717` |
| HALON USDC (6dp) | `0x13FD816D2b558Cea086754C990D722514c004049` |
| AgentRegistry | `0x3cf8b676B087bAC4b9aEC787C9E47a8eDbDC0a94` |
| EscrowFactory | `0x9e2C3b999de90b7cE8213da5c62B20A21CD76fdd` |
| USDG (ProofOfWork) | `0xE7c8F17c1e214D9052a889A443CA79df26489237` |
| AAPL token | `0x049146f0b05cc15F2C66b4F5A557085971F8697B` |
| AAPL Chainlink oracle | `0x986CC3E5802B4098617e6E43Be3928F52d5023Bb` |
| Morpho vault | `0x932f28C283eF2Ad642fCb0F062684CBF956ca094` |
| PaymentDistributor | `0x428292Ad8d1CD27fbD1909251eBab2fA284f32De` |

- Explorer: https://explorer.testnet.chain.robinhood.com
- AI backend: `https://halon.37.60.232.191.sslip.io` (FastAPI, VPS, systemd `halon-ai`)

## Frontend → Vercel

1. Import the repo, set **Root Directory = `dashboard`**.
2. Add these Environment Variables (Production + Preview + Development).
   Replace `<ALCHEMY_KEY>` with your Alchemy testnet key; fill WalletConnect id.
3. Redeploy (env changes only apply to a new build).

```
NEXT_PUBLIC_RHC_NETWORK=testnet
NEXT_PUBLIC_RHC_RPC_URL=https://robinhood-testnet.g.alchemy.com/v2/<ALCHEMY_KEY>
NEXT_PUBLIC_AI_BACKEND_URL=https://halon.37.60.232.191.sslip.io
NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID=<from cloud.walletconnect.com>

NEXT_PUBLIC_POLICY_POOL=0xFE75131aAF525DC964B12F9d68E61c6a531F7526
NEXT_PUBLIC_POLICY_POOL_B=0x162A895d77f621Ec40295b9111282CC5CD6E818a
NEXT_PUBLIC_CLAIMS_ADJUDICATOR=0xd3fFBdBCadE20F7200aFf2EFfBEb025d9AA11b5a
NEXT_PUBLIC_AGENT_REGISTRY=0x3cf8b676B087bAC4b9aEC787C9E47a8eDbDC0a94
NEXT_PUBLIC_HALON_USDC=0x13FD816D2b558Cea086754C990D722514c004049

NEXT_PUBLIC_POW_ESCROW_FACTORY=0x9e2C3b999de90b7cE8213da5c62B20A21CD76fdd
NEXT_PUBLIC_POW_USDG=0xE7c8F17c1e214D9052a889A443CA79df26489237
NEXT_PUBLIC_POW_AAPL=0x049146f0b05cc15F2C66b4F5A557085971F8697B
NEXT_PUBLIC_POW_ORACLE=0x986CC3E5802B4098617e6E43Be3928F52d5023Bb
NEXT_PUBLIC_POW_MORPHO_VAULT=0x932f28C283eF2Ad642fCb0F062684CBF956ca094
NEXT_PUBLIC_POW_PAYMENT_DISTRIBUTOR=0x428292Ad8d1CD27fbD1909251eBab2fA284f32De
```

Notes:
- All `NEXT_PUBLIC_*` are shipped to the browser (normal for a dApp). Lock the
  Alchemy key to your domain in the Alchemy dashboard.
- Empty contract vars → that section renders honest zeros/empty, never fake data.

## AI backend (VPS)

Runs on the VPS as systemd unit `halon-ai` (`/opt/halon-ai`, port 8000, behind
Caddy with auto-HTTPS at `halon.37.60.232.191.sslip.io`).

- Manage: `systemctl restart halon-ai` · `journalctl -u halon-ai -f`
- Config: `/opt/halon-ai/.env` — set `STEPFUN_API_KEY` for LLM scoring (falls
  back to a heuristic scorer when empty). `RELAYER_PRIVATE_KEY` must be the
  escrow `aiAgent` (funded with testnet ETH for gas). Tighten `ALLOWED_ORIGINS`
  to the Vercel domain for production.

## Contracts (Foundry)

Deploy scripts live in `contracts/script/`:
- `DeployProofOfWork.s.sol` — escrow suite + AgentRegistry
- `DeployTestnet.s.sol` — PolicyPool A + RiskEngine + ClaimsAdjudicator (needs `UNDERWRITER_A_CAP_WALLET`)
- `DeployPoolB.s.sol` — reinsurer pool (needs `USDC_ADDRESS`, `RISK_ENGINE_ADDRESS`, `POOL_A_ADDRESS`)
- `SeedTestnet.s.sol` — organic agents/capital/policies (needs `REGISTRY_ADDRESS`, `POOL_ADDRESS`, `USDC_ADDRESS`)

Run with `--rpc-url $RHC_TESTNET_RPC_URL --broadcast --private-key $PRIVATE_KEY`.
The optimizer + `via_ir` are ON in `foundry.toml` (PolicyPool exceeds the
24576-byte EIP-170 limit unoptimized).

## Mainnet later

Set `NEXT_PUBLIC_RHC_NETWORK=mainnet` (chainId 4663), redeploy contracts to
mainnet, update addresses. No frontend code changes.
