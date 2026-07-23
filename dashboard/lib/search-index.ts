/**
 * Static catalog the header search resolves against. Grouped into Tokens / Pools
 * / Pages so the placeholder's promise ("Search tokens, pools…") is actually
 * kept. Tokens mirror the Explore feed's asset set; Pools are the live HALON /
 * ProofOfWork liquidity venues; Pages are in-app destinations.
 *
 * Kept static on purpose: the header is global, so this avoids running on-chain
 * reads on every route just to power a search box. Token rows deep-link into
 * Explore's own live filter, where the real market data already loads.
 */

export type SearchGroup = "Tokens" | "Pools" | "Pages";

export type SearchEntry = {
  group: SearchGroup;
  label: string;
  /** Secondary line (symbol, venue, section). */
  sub?: string;
  href: string;
  /** Extra terms to match on beyond label/sub. */
  keywords?: string;
};

export const SEARCH_INDEX: SearchEntry[] = [
  // ── Tokens (mirror app/explore SEED set) ──────────────────────────────────
  { group: "Tokens", label: "Ethereum", sub: "ETH", href: "/explore?q=ETH" },
  { group: "Tokens", label: "Wrapped BTC", sub: "WBTC", href: "/explore?q=WBTC" },
  { group: "Tokens", label: "Solana", sub: "SOL", href: "/explore?q=SOL" },
  { group: "Tokens", label: "USD Coin", sub: "USDC", href: "/explore?q=USDC" },
  { group: "Tokens", label: "Tether", sub: "USDT", href: "/explore?q=USDT" },
  { group: "Tokens", label: "Chainlink", sub: "LINK", href: "/explore?q=LINK" },
  { group: "Tokens", label: "Uniswap", sub: "UNI", href: "/explore?q=UNI" },
  { group: "Tokens", label: "Aave", sub: "AAVE", href: "/explore?q=AAVE" },

  // ── Pools ─────────────────────────────────────────────────────────────────
  {
    group: "Pools",
    label: "Policy Pool A (Underwriter)",
    sub: "SafeBridge insurance",
    href: "/earn",
    keywords: "insurance underwriter safebridge premium liquidity tvl usdc",
  },
  {
    group: "Pools",
    label: "Policy Pool B (Reinsurer)",
    sub: "Cascading reinsurance",
    href: "/earn",
    keywords: "reinsurance reinsurer cascade treaty",
  },
  {
    group: "Pools",
    label: "Morpho Earn Vault",
    sub: "USDG liquidity · Proof of Work",
    href: "/pow/lp",
    keywords: "morpho vault usdg liquidity yield escrow financing advance",
  },

  // ── Pages ─────────────────────────────────────────────────────────────────
  { group: "Pages", label: "Overview", href: "/", keywords: "home dashboard" },
  { group: "Pages", label: "Explore", href: "/explore", keywords: "tokens markets movers" },
  { group: "Pages", label: "Portfolio", href: "/portfolio", keywords: "balance holdings assets allocation" },
  { group: "Pages", label: "Earn", href: "/earn", keywords: "yield liquidity premium deposit" },
  { group: "Pages", label: "Disputes", href: "/disputes", keywords: "adjudicate claim resolution discharge" },
  { group: "Pages", label: "Proof of Work", href: "/pow", keywords: "pow escrow milestone ai verify" },
  { group: "Pages", label: "Client Portal", sub: "Proof of Work", href: "/pow/client", keywords: "escrow collateral lock milestone create" },
  { group: "Pages", label: "Freelancer Portal", sub: "Proof of Work", href: "/pow/freelancer", keywords: "upload work payout ai verify claim" },
  { group: "Pages", label: "Liquidity Vault", sub: "Proof of Work", href: "/pow/lp", keywords: "lp deposit morpho earn supply" },
  { group: "Pages", label: "Docs", href: "/docs", keywords: "documentation sdk api" },
  { group: "Pages", label: "Whitepaper", href: "/whitepaper", keywords: "paper protocol design" },
];

const GROUP_ORDER: SearchGroup[] = ["Tokens", "Pools", "Pages"];

/**
 * Filter + group the catalog for a query. Empty query returns nothing (the box
 * shows its idle state). Each group is capped so the dropdown stays compact.
 */
export function searchCatalog(
  raw: string,
  perGroup = 5,
): { group: SearchGroup; entries: SearchEntry[] }[] {
  const q = raw.trim().toLowerCase();
  if (!q) return [];

  const matches = SEARCH_INDEX.filter((e) =>
    `${e.label} ${e.sub ?? ""} ${e.keywords ?? ""}`.toLowerCase().includes(q),
  );

  return GROUP_ORDER.map((group) => ({
    group,
    entries: matches.filter((e) => e.group === group).slice(0, perGroup),
  })).filter((g) => g.entries.length > 0);
}
