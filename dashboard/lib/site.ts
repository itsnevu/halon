export const SITE = {
  name: "HALON",
  ticker: "$HLN",
  tagline: "Suppression layer for the agent economy",
  /** The line that explains the name. */
  metaphor: "Nobody pulls the trigger. It just discharges.",
  chain: "Base",
  protocol: "Halon Router",
  usdc: "0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913",
  github: "https://github.com/",
  docs: "/docs",
  agentStore: "https://croo.network",
} as const;

export const NAV = [
  { href: "/", label: "Overview" },
  { href: "/pow", label: "Proof of Work" },
  { href: "/explore", label: "Explore" },
  { href: "/portfolio", label: "Portfolio" },
  { href: "/earn", label: "Earn" },
  { href: "/disputes", label: "Disputes" },
] as const;

/** SDK surface we actually call — worth showing off, it's all real. */
export const SDK_METHODS = [
  "bindDirect",
  "bindWithPremium",
  "adjudicateClaim",
  "executeBridge",
  "depositCapital",
  "withdrawCapital",
  "claimYield",
  "getPremium",
  "verifySLA",
] as const;
