/**
 * ProofOfWork on-chain wiring.
 *
 * Every address is env-driven (mirroring `lib/onchain.ts`), so the same build
 * runs against a local Anvil node or a public testnet without code changes.
 * The fallbacks are the deterministic Anvil deploy addresses, so `pnpm dev`
 * against a fresh `anvil` + `DeployProofOfWork.s.sol` works with zero config.
 *
 * Override in `.env.local` (or Vercel) after deploying:
 *   NEXT_PUBLIC_POW_ESCROW_FACTORY, NEXT_PUBLIC_POW_USDG, NEXT_PUBLIC_POW_AAPL,
 *   NEXT_PUBLIC_POW_ORACLE, NEXT_PUBLIC_POW_MORPHO_VAULT,
 *   NEXT_PUBLIC_POW_PAYMENT_DISTRIBUTOR, NEXT_PUBLIC_AI_BACKEND_URL
 */

type Address = `0x${string}`;

const env = (key: string, fallback: Address): Address =>
  (process.env[key] as Address | undefined) ?? fallback;

export const POW_CONFIG = {
  // Escrow Factory
  escrowFactoryAddress: env("NEXT_PUBLIC_POW_ESCROW_FACTORY", "0x5FC8d32690cc91D4c39d9d3abcBD16989F875707"),

  // Mocks
  mockUSDGAddress: env("NEXT_PUBLIC_POW_USDG", "0x5FbDB2315678afecb367f032d93F642f64180aa3"),
  mockAAPLAddress: env("NEXT_PUBLIC_POW_AAPL", "0xe7f1725E7734CE288F8367e1Bb143E90bb3F0512"),
  mockOracleAddress: env("NEXT_PUBLIC_POW_ORACLE", "0xDc64a140Aa3E981100a9becA4E685f962f0cF6C9"),

  // DeFi
  mockMorphoVaultAddress: env("NEXT_PUBLIC_POW_MORPHO_VAULT", "0x0165878A594ca255338adfa4d48449f69242Eb8F"),
  paymentDistributorAddress: env("NEXT_PUBLIC_POW_PAYMENT_DISTRIBUTOR", "0xa513E6E4b8f2a923D98304ec87F64353C4D5C853"),

  // Backend — override via NEXT_PUBLIC_AI_BACKEND_URL in prod (Vercel/.env),
  // falls back to the local FastAPI server for development.
  aiBackendUrl: process.env.NEXT_PUBLIC_AI_BACKEND_URL ?? "http://localhost:8000",
} as const;
