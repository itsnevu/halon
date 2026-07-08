/** Display formatting. Deterministic — safe to call during SSR. */

const USD = new Intl.NumberFormat("en-US", {
  style: "currency",
  currency: "USD",
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

const USD0 = new Intl.NumberFormat("en-US", {
  style: "currency",
  currency: "USD",
  minimumFractionDigits: 0,
  maximumFractionDigits: 0,
});

/** `$5.17` */
export function usd(n: number): string {
  return USD.format(n);
}

/** `$48,200` */
export function usd0(n: number): string {
  return USD0.format(n);
}

/** `$258.2K` · `$1.4M` — for stat tiles where width is tight. */
export function usdCompact(n: number, digits = 1): string {
  const abs = Math.abs(n);
  if (abs >= 1_000_000_000) return `$${(n / 1_000_000_000).toFixed(digits)}B`;
  if (abs >= 1_000_000) return `$${(n / 1_000_000).toFixed(digits)}M`;
  if (abs >= 1_000) return `$${(n / 1_000).toFixed(digits)}K`;
  return `$${n.toFixed(abs < 10 ? 2 : 0)}`;
}

/** `80.0%` — takes a 0..1 fraction. */
export function pct(n: number, digits = 1): string {
  return `${(n * 100).toFixed(digits)}%`;
}

/** `2,491 bps` */
export function bps(n: number): string {
  return `${n.toLocaleString("en-US")} bps`;
}

/** `1.24×` */
export function multiple(n: number, digits = 2): string {
  if (!Number.isFinite(n)) return "∞";
  return `${n.toFixed(digits)}×`;
}

/** `0x8335…2913` */
export function shortAddr(addr: string, lead = 6, tail = 4): string {
  if (addr.length <= lead + tail + 1) return addr;
  return `${addr.slice(0, lead)}…${addr.slice(-tail)}`;
}

/** `0x9f2c41a7…9d4f8e21` — hashes get more characters, they're identifiers. */
export function shortHash(hash: string): string {
  return shortAddr(hash, 10, 8);
}

/** `just now` · `42s ago` · `7m ago` · `3h ago` · `2d ago` */
export function agoLabel(seconds: number): string {
  if (seconds < 3) return "just now";
  if (seconds < 60) return `${Math.floor(seconds)}s ago`;
  if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`;
  if (seconds < 86_400) return `${Math.floor(seconds / 3600)}h ago`;
  return `${Math.floor(seconds / 86_400)}d ago`;
}

/** `6h 12m` · `48m` · `expired` */
export function durationLabel(seconds: number): string {
  if (seconds <= 0) return "expired";
  const d = Math.floor(seconds / 86_400);
  const h = Math.floor((seconds % 86_400) / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  if (d > 0) return `${d}d ${h}h`;
  if (h > 0) return `${h}h ${m}m`;
  return `${m}m`;
}

/** `4.2s` — sub-minute latencies keep one decimal. */
export function secondsLabel(seconds: number): string {
  return seconds < 60 ? `${seconds.toFixed(1)}s` : durationLabel(seconds);
}

export const BASESCAN = "https://basescan.org";
export const basescanTx = (hash: string) => `${BASESCAN}/tx/${hash}`;
export const basescanAddr = (addr: string) => `${BASESCAN}/address/${addr}`;
