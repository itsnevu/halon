import "dotenv/config";

export type Hex = `0x${string}`;

const HINT = "Copy agents/.env.example to agents/.env and fill it in.";

export function need(name: string): string {
  const value = process.env[name]?.trim();
  if (!value) throw new Error(`Missing ${name}. ${HINT}`);
  return value;
}

export function needAddress(name: string): Hex {
  const value = need(name);
  if (!/^0x[0-9a-fA-F]{40}$/.test(value)) {
    throw new Error(`${name} must be a 20-byte hex address, got "${value}".`);
  }
  return value as Hex;
}

export function needPrivateKey(name: string): Hex {
  const value = need(name);
  if (!/^0x[0-9a-fA-F]{64}$/.test(value)) {
    // Never echo the value: it is a key.
    throw new Error(`${name} must be a 0x-prefixed 32-byte private key. ${HINT}`);
  }
  return value as Hex;
}

export function numberOr(name: string, fallback: number): number {
  const raw = process.env[name]?.trim();
  if (!raw) return fallback;
  const parsed = Number(raw);
  if (!Number.isFinite(parsed)) throw new Error(`${name} must be a number, got "${raw}".`);
  return parsed;
}

export function boolOr(name: string, fallback: boolean): boolean {
  const raw = process.env[name]?.trim().toLowerCase();
  if (!raw) return fallback;
  return raw === "1" || raw === "true" || raw === "yes";
}

/**
 * `Config.baseURL` is required by the SDK and it ships no default, so a wrong value
 * here fails at the first request rather than at startup. The values in
 * `.env.example` are still guesses — see README, "Open questions".
 */
export function capConfig() {
  return {
    baseURL: need("CROO_API_URL"),
    wsURL: need("CROO_WS_URL"),
    rpcURL: process.env.CROO_RPC_URL?.trim(),
  };
}
