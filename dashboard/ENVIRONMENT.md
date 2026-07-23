# Live data sources & environment

The dashboard mixes three kinds of data. Two are **live out of the box** (public
APIs, no keys). The third (protocol/on-chain stats) is **live once you deploy the
contracts to a public testnet** and paste the addresses below.

---

## 1. Market data — LIVE now, no config

Wired to public, CORS-open, no-key APIs:

| Where | Source | Fields |
| --- | --- | --- |
| `/explore` token table | CoinGecko `/coins/markets` | price, FDV, 24h volume, 1h/24h %, 7d sparkline |
| `/explore` Base + OP TVL | DefiLlama `/v2/chains` | chain TVL |
| `/portfolio` ETH value & "today" | CoinGecko `/simple/price` | ETH price + 24h change |

Nothing to configure. If a call is rate-limited it keeps the last good values.

> Stock cards on `/explore` (Backpack, SpaceX, Micron) stay illustrative — those
> are private-company / tokenized tickers with no free public feed.

---

## 2. Protocol stats — go live by deploying + setting env

`useProtocolStats` reads the **PolicyPool** contract; until `NEXT_PUBLIC_POLICY_POOL`
is set it renders the `lib/data.ts` fixture and labels itself **"Demo data"**.
The escrow / Proof-of-Work pages read the `NEXT_PUBLIC_POW_*` addresses.

### Step 1 — deploy to Base Sepolia

```bash
cd contracts
export PRIVATE_KEY=0x…                    # a funded Base Sepolia deployer key
export UNDERWRITER_A_CAP_WALLET=0x…       # cede recipient (any address for demo)
forge script script/DeployTestnet.s.sol \
  --rpc-url https://sepolia.base.org \
  --broadcast
```

The script prints every deployed address (`=== HALON Testnet Deployment Complete ===`).

### Step 2 — paste them into `dashboard/.env.local`

```dotenv
# Core protocol (landing + /earn stats)
NEXT_PUBLIC_POLICY_POOL=0x…               # PolicyPool ("poolA") from the deploy log
NEXT_PUBLIC_HALON_CHAIN_ID=84532          # Base Sepolia
NEXT_PUBLIC_BASE_SEPOLIA_RPC_URL=https://sepolia.base.org

# Proof of Work (escrow / freelancer / LP pages)
NEXT_PUBLIC_POW_ESCROW_FACTORY=0x…
NEXT_PUBLIC_POW_USDG=0x…
NEXT_PUBLIC_POW_AAPL=0x…
NEXT_PUBLIC_POW_ORACLE=0x…
NEXT_PUBLIC_POW_MORPHO_VAULT=0x…
NEXT_PUBLIC_POW_PAYMENT_DISTRIBUTOR=0x…

# AI work verifier (FastAPI in ../ai-agent)
NEXT_PUBLIC_AI_BACKEND_URL=https://your-ai-host   # defaults to http://localhost:8000
```

Restart `npm run dev`. The "Demo data" badge flips to **"Live · on-chain"** and
the escrow/earn reads resolve against the real contracts. No code changes needed.

> The bundled `contracts/broadcast/**` addresses are from a **local Anvil (chain
> 31337)** run — they only work against `anvil`, not a public network. Deploy to
> Base Sepolia (above) for a shareable live demo.

---

## 3. Auth (Google sign-in)

```dotenv
GOOGLE_CLIENT_ID=…
GOOGLE_CLIENT_SECRET=…
NEXTAUTH_SECRET=…            # openssl rand -base64 32
NEXTAUTH_URL=http://localhost:3000
```
