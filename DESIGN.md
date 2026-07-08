# HALON

> **Suppression layer for the agent economy.**
> Pasar asuransi & reinsurance on-chain untuk risiko gagalnya sebuah Agent, dibangun di atas CROO Agent Protocol (CAP).

CROO Hackathon · Track: **DeFi / On-chain Ops** (+ opsional: Open — Any A2A Agents)

**Kenapa "HALON".** Halon itu gas pemadam api di ruang server. Nggak ada manusia yang mencet
tombol — sensornya nyala, gasnya discharge, rack-nya selamat. Persis mekanik produk ini: begitu
CAP nandain sebuah order `rejected`, pool langsung bayar, tanpa approval siapa pun. Kosakata
produknya ikut: *armed* (polis aktif), *discharge* (payout), *cascade* (recovery ke reinsurer),
*retention* vs *cede* (porsi risiko yang ditahan vs dioper).

---

## 1. Ide dalam satu paragraf

Kalau Agent A hire Agent B lewat CAP, siapa yang nanggung kalau B gagal deliver? Hari ini: nggak ada. HALON bikin lapisan **asuransi antar-agent**: sebelum hire Worker Agent yang riskan, Client bisa beli proteksi dari **Underwriter Agent**. Kalau Worker gagal, Client dapat ganti rugi otomatis dari pool si Underwriter. Dan Underwriter itu sendiri nggak nanggung sendirian — dia otomatis beli **reinsurance** ke Underwriter lain yang pool-nya lebih besar. Hasilnya: rantai A2A berlapis di mana agent hire agent hire agent, semuanya transaksi USDC nyata.

**Analogi:** kamu sewa supir (Worker). Sebelum berangkat, kamu beli asuransi (Underwriter A). Perusahaan asuransi itu sendiri beli asuransi lagi ke reasuradur (Underwriter B). Itu persis cara industri asuransi beneran bekerja — kita cuma pindahin ke ekonomi agent.

**"Auto-hedge"** = proses Underwriter A beli reinsurance ke B itu terjadi otomatis lewat kode, dalam hitungan detik setelah dia jual polis. Nggak ada manusia yang klik apa-apa.

---

## 2. Kenapa ini gampang dipitch ke juri CROO

| Yang juri cari | Cara HALON menjawabnya |
| --- | --- |
| A2A composability | Rantai 3 lapis: Client → Underwriter A → Underwriter B. Underwriter A jadi **provider dan requester sekaligus**. Ini composability struktural, bukan gimmick. |
| Transaksi on-chain nyata | Premi = order price (USDC, di-escrow CAP). Kapital & payout = kontrak kita. Tiap langkah adalah order CAP beneran. |
| Nyambung ke masalah CROO sendiri | CROO nyebut "liquidity" sebagai salah satu dari 4 kebutuhan inti agent. HALON **adalah** lapisan liquidity/risk itu. |
| Bukan reinvent the wheel | Kita nggak bikin ulang escrow/settlement — kita pakai punya CAP dan menumpuk pasar risiko di atasnya. |
| Agent lain bisa hire kita | Underwriter Agent kita jadi dependency untuk agent siapa pun di Agent Store. Itu poin "earn from a network". |

**Kalimat pitch:** *"Kami nggak bikin agent yang jual jasa. Kami bikin pasar yang bikin semua agent lain layak dipercaya."*

---

## 3. Temuan dari SDK asli (yang mengubah desain)

Ini hasil baca langsung `@croo-network/sdk@0.2.1` yang sudah terinstall di `agents/node_modules`. **Tiga temuan ini bikin desain jauh lebih simpel dari rencana awal:**

### 3.1 Kita nggak perlu bikin oracle kegagalan — CAP sudah punya

Order lifecycle CAP punya status terminal `rejected` dan `expired`, plus event WebSocket `order_rejected` dan `order_expired`, plus `rejectTxHash` dan `slaDeadline` on-chain. **Itu definisi "Worker gagal" kita.** Nggak perlu Chainlink, nggak perlu voting.

```
OrderStatus: creating → created → paying → paid → delivering → completed
                                                            ↘ rejected   ← klaim!
                                                            ↘ expired    ← klaim!
```

### 3.2 `require_fund_transfer` = primitive buat gerakin kapital premi

Ini penemuan terpenting. CAP membedakan dua aliran uang dalam satu order:

- **`price` / `feeAmount`** — di-escrow CAP, cair ke provider saat order selesai. → kita pakai sebagai **fee/spread Underwriter**.
- **`fundAmount` + `fundToken` → `providerFundAddress`** — transfer USDC langsung ke alamat yang ditentukan provider, dalam pay-tx batch yang sama. → kita set `providerFundAddress` = **alamat kontrak `PolicyPool`**.

Artinya: premi kapital masuk ke pool contract secara **atomik di transaksi bayar yang sama**. Nggak ada langkah "transfer manual" yang bisa gagal di tengah. Dan bentuk yang persis sama dipakai lagi waktu Underwriter A beli reinsurance ke B — makanya rantainya rekursif secara natural.

> API-nya: `negotiateOrder({serviceId, fundAmount, fundToken})` lalu provider panggil `acceptNegotiationWithFundAddress(negotiationId, providerFundAddress)`.

### 3.3 SDK **tidak** punya getter reputasi — jadi kita hitung sendiri

Nggak ada method `getMeritScore()` atau sejenisnya di `AgentClient`. Jadi RiskEngine nggak bisa "baca skor" dari CAP. **Solusinya justru lebih bagus untuk pitch:** kita turunkan reputasi dari riwayat order on-chain sendiri.

```ts
const done   = await client.listOrders({ agentId: workerId, status: 'completed' })
const failed = await client.listOrders({ agentId: workerId, status: 'rejected' })
const successRate = done.length / (done.length + failed.length)
```

Ini bikin kita punya **HALON Reliability Index** — angka reputasi turunan yang kita hitung dan publish. Itu sendiri produk yang bisa dijual ke agent lain.

---

## 4. Arsitektur

```
┌──────────────────────────────────────────────────────────┐
│  DASHBOARD (Next.js)                                     │
│  pool size · kurva premi · polis aktif · riwayat klaim   │
├──────────────────────────────────────────────────────────┤
│  AGENT RUNTIME (Node + @croo-network/sdk)                │
│  4 agent, masing-masing 1 SDK-Key + wallet               │
│  Watcher: connectWebSocket() → dengar order_rejected     │
├──────────────────────────────────────────────────────────┤
│  KONTRAK HALON (Solidity, Base)      ← yang kita tulis   │
│  PolicyPool · RiskEngine · ClaimsAdjudicator             │
├──────────────────────────────────────────────────────────┤
│  CAP — order lifecycle, escrow, settlement  ← dipakai    │
├──────────────────────────────────────────────────────────┤
│  Base L2 + USDC                                          │
└──────────────────────────────────────────────────────────┘
```

---

## 5. Modul yang dibangun

### 5.1 Empat Agent CAP

| Agent | Peran | Service yang dilisting |
| --- | --- | --- |
| **Worker** | Agent "berisiko" yang jadi objek asuransi | `Data Analysis` — fail rate bisa di-rig untuk demo |
| **Client** | Requester; beli proteksi lalu hire Worker | — (dia pembeli) |
| **Underwriter A** | Jual proteksi; **sekaligus beli reinsurance ke B** | `Buy Coverage` (`require_fund_transfer=true`) |
| **Underwriter B** | Reinsurer, pool lebih besar | `Reinsurance` (`require_fund_transfer=true`) |

> Kunci demo: **Underwriter A adalah provider dan requester sekaligus.** Di situ letak cerita A2A-nya.

### 5.2 Tiga kontrak

| Kontrak | Tanggung jawab |
| --- | --- |
| **`PolicyPool.sol`** | Vault USDC per underwriter. Deposit modal, kunci kapital per polis, terbitkan polis (ERC-721), bayar klaim. Menerima `fundAmount` langsung dari pay-tx CAP. |
| **`RiskEngine.sol`** | `premium = f(reliabilityIndex, coverageAmount, tenor)`. Fungsi `view` murni → gampang di-unit-test, gampang didemo. |
| **`ClaimsAdjudicator.sol`** | Verifikasi attestation EIP-712 dari Watcher ("order X status rejected, txHash Y"), cek polis aktif, trigger payout dari PolicyPool, lalu **cascade recovery** ke pool reinsurer. |

Reinsurance **bukan kontrak baru** — dia cuma order CAP biasa dari A ke B. Yang perlu kita simpan cuma link `policyId → reinsurancePolicyId` supaya cascade recovery tahu harus nagih ke mana.

### 5.3 Watcher (off-chain)

`connectWebSocket()` → subscribe event. Kalau ada `order_rejected` / `order_expired` untuk order yang sedang di-cover → tanda tangan EIP-712 → submit ke `ClaimsAdjudicator`.

---

## 6. Aliran uang, pakai angka konkret

Worker punya reliability 80% (20% gagal). Client mau hire buat job senilai **$100**.

**Sebelum job:**

1. Client tanya harga ke Underwriter A → RiskEngine bilang premi **$5**.
2. Client bayar $5 → order CAP ke A. `fundAmount` $5 masuk **langsung ke PolicyPool A**. A dapat fee kecil dari escrow. Polis terbit (ERC-721).
3. *(otomatis)* A langsung buka order CAP ke B: bayar **$2** reinsurance, `fundAmount` masuk ke PolicyPool B. Perjanjian: B nanggung 50% kalau ada klaim.
4. Client hire Worker, order $100 lewat CAP.

**Kalau Worker sukses** → semua senang. A untung $5, B untung $2, nggak ada yang bayar klaim.

**Kalau Worker gagal** (`order_rejected` / `order_expired`):

1. Watcher lihat event → kirim attestation ke ClaimsAdjudicator.
2. PolicyPool A bayar **$100** ke Client. *Otomatis.*
3. Cascade: PolicyPool B bayar **$50** ke PolicyPool A.
4. Kerugian riil terbagi: A nanggung $50, B nanggung $50.

```
Client ──premi $5──▶ Underwriter A ──reinsurance $2──▶ Underwriter B
Client ──job $100──▶ Worker Agent

Worker GAGAL:
  PolicyPool A ──payout $100──▶ Client
  PolicyPool B ──recovery $50──▶ PolicyPool A
```

---

## 7. Tech stack

| Layer | Pilihan | Status |
| --- | --- | --- |
| Chain | Base (RPC default SDK: `https://mainnet.base.org`) | ✅ dikonfirmasi dari `Config.rpcURL` |
| Token | USDC — `0x8335...2913` (Base mainnet) | ✅ |
| Kontrak | Solidity `0.8.35` + **Foundry 1.7.1** | ✅ terinstall, `forge build` hijau |
| Libs kontrak | OpenZeppelin `v5.1.0` (ERC-20/721, AccessControl, ReentrancyGuard) | ✅ terinstall + remapping terverifikasi |
| Integrasi CAP | `@croo-network/sdk@0.2.1` | ✅ terinstall |
| Runtime agent | Node 20 + TypeScript + `tsx` | ✅ terinstall |
| Baca chain | `viem` | ✅ terinstall |
| Dashboard | Next.js + Tailwind + wagmi | ⬜ belum (nanti) |
| Deploy | Kontrak → Foundry script; Dashboard → Vercel | ⬜ |
| Repo | GitHub, lisensi MIT | ⬜ |

### Method SDK yang dipakai (buat ditulis di README submission)

`negotiateOrder` · `acceptNegotiationWithFundAddress` · `payOrder` · `deliverOrder` · `rejectOrder` · `getOrder` · `listOrders` · `getDelivery` · `connectWebSocket`

---

## 8. Skrip demo 5 menit

1. **0:00** — Tunjukin 4 agent live di CROO Agent Store. "Semua ini agent beneran, punya wallet, punya harga."
2. **0:45** — Client minta quote. Dashboard nunjukin reliability Worker 80% → premi $5. Ubah Worker jadi 95% → premi turun. *Pricing-nya hidup, bukan hardcoded.*
3. **1:30** — Client beli polis. Tunjukin tx di Basescan: premi mendarat di PolicyPool.
4. **2:00** — **Momen kunci.** Tanpa disuruh siapa pun, Underwriter A langsung buka order ke Underwriter B. "Agent kami barusan hire agent lain, buat lindungi dirinya sendiri."
5. **2:45** — Client hire Worker. Worker sengaja gagal deliver → Client `rejectOrder`.
6. **3:15** — Watcher nangkap `order_rejected`. Payout $100 masuk ke Client. Basescan.
7. **3:45** — Cascade: PolicyPool B ganti $50 ke A. **Tiga lapis, nol intervensi manusia.**
8. **4:15** — Dashboard: pool size berubah, premi Worker naik karena baru gagal. "Pasarnya belajar."
9. **4:40** — Closing.

---

## 9. Yang masih HARUS diverifikasi sebelum ngoding serius

Jangan asumsikan poin-poin ini benar — dari SDK saja belum kelihatan. Cek di `docs.croo.network` atau office hours Discord:

- [ ] **`baseURL` / `wsURL` yang benar.** Nilai di `.env.example` masih tebakan.
- [ ] **Ada testnet (Base Sepolia)?** Default SDK ke Base *mainnet*. Kalau nggak ada testnet, semua dev pakai uang sungguhan — atur budget.
- [ ] **Cara register service + set `require_fund_transfer=true`.** Ini nggak ada di SDK; kemungkinan lewat dashboard/REST API.
- [ ] **Klaim "gas 0%", ERC-8004, ERC-4337.** Ini dari materi marketing, belum terkonfirmasi di kode SDK.
- [ ] **Siapa yang boleh panggil `rejectOrder`, dan ada dispute flow?** Kalau Worker bisa nolak dituduh gagal, ClaimsAdjudicator butuh periode tunggu.

### Asumsi kepercayaan (jujur ke juri, jangan disembunyiin)

Watcher kita adalah **oracle terpercaya** untuk MVP — dia yang tanda tangan "order X gagal". Roadmap: baca status order langsung dari kontrak escrow CAP on-chain, biar trustless. **Sebutkan ini di demo.** Juri lebih respek tim yang tahu batas sistemnya sendiri daripada tim yang pura-pura trustless.

### Catatan anti-sybil ⚠️

Aturan CROO: minimal **3 counterparty agent unik** dan **5 buyer wallet unik**, dan pola self-trade terkonsentrasi kena flag. Desain ini secara alami kelihatan seperti "duit muter di antara 4 agent sendiri". **Mitigasi:** ajak tim hackathon lain beli coverage buat agent mereka — gratisin preminya kalau perlu. Itu sekaligus bukti terkuat bahwa produknya benar-benar composable.

---

## 10. Setup

```bash
# Kontrak
cd contracts
forge install OpenZeppelin/openzeppelin-contracts@v5.1.0 --no-git   # lib/ di-gitignore
forge build
forge test

# Agent
cd agents
npm install
cp .env.example .env    # isi SDK-Key tiap agent
npx tsx src/<script>.ts
```

**Struktur:**

```
halon/
├── DESIGN.md          ← file ini
├── contracts/         Foundry — PolicyPool, RiskEngine, ClaimsAdjudicator
│   ├── src/
│   ├── test/
│   └── remappings.txt
└── agents/            Node + CAP SDK — 4 agent + watcher
    ├── src/
    └── .env.example
```

---

## Langkah berikutnya

1. Konfirmasi checklist Bagian 9 (ini yang paling bisa bikin buang waktu kalau salah asumsi).
2. Tulis `RiskEngine.sol` duluan — fungsi `view` murni, paling cepat jadi, dan langsung bisa didemo.
3. Baru `PolicyPool.sol` + test-nya.
4. Terakhir wiring agent — bagian ini paling gampang kalau kontraknya sudah rapi.
