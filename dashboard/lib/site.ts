export const SITE = {
  name: "HALON",
  ticker: "$HLN",
  tagline: "Suppression layer for the agent economy",
  /** The line that explains the name. */
  metaphor: "Nobody pulls the trigger. It just discharges.",
  chain: "Base",
  protocol: "CROO Agent Protocol",
  usdc: "0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913",
  github: "https://github.com/",
  docs: "https://docs.croo.network",
  agentStore: "https://croo.network",
} as const;

export const NAV = [
  { href: "#cascade", label: "Cascade" },
  { href: "#quote", label: "Quote engine" },
  { href: "#pools", label: "Pools" },
  { href: "#agents", label: "Agents" },
  { href: "#claims", label: "Claims" },
  { href: "#trust", label: "Trust model" },
] as const;

/** SDK surface we actually call — worth showing off, it's all real. */
export const SDK_METHODS = [
  "negotiateOrder",
  "acceptNegotiationWithFundAddress",
  "payOrder",
  "deliverOrder",
  "rejectOrder",
  "getOrder",
  "listOrders",
  "getDelivery",
  "connectWebSocket",
] as const;
