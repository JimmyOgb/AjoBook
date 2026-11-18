# AjoBook 📓⚡
### Bitcoin Lightning & Nostr Community Savings Ledger (Ajo • Esusu • Tontine)
**Built for the Dakar Bitcoin Hack 2026 by BTrust**

> **"One exercise book. Zero collector pockets."**  
> **AjoBook** digitizes the traditional West African communal savings circle (Ajo / Esusu / Tontine) using **Bitcoin, Lightning Network, Nostr, and Autonomous AI**. Every payment is verified cryptographically on Nostr, pots disburse autonomously over Lightning, and no human middleman holds the money.

---

## 🌟 Live Links & Canonical Deployments

- 🌐 **Live Vercel Production dApp:** **[https://ajobook-blue.vercel.app](https://ajobook-blue.vercel.app)** *(also accessible at [https://ajobook.vercel.app](https://ajobook.vercel.app))*
- 💻 **GitHub Repository:** **[https://github.com/JimmyOgb/AjoBook](https://github.com/JimmyOgb/AjoBook)**
- ⚡ **Pure Bitcoin & Lightning Settlement:** Invoices generated in Satoshis (BOLT11) with instant sub-second settlement.
- 🌍 **West African Currency Toggle:** Switch effortlessly between **⚡ SATS**, **₦ Nigerian Naira (NGN)**, and **CFA Franc (XOF)**.
- 🔑 **Nostr Native Identity & State:** Keypair generation (`npub` / `nsec`), NIP-07 browser extension support, Kind `30078` signed communal state, and Kind `8` NIP-58 turn completion badges.
- 🛡️ **1x Security Deposit Escrow:** Automatic default slashing protects honest members against missed turns.
- 🤖 **AI Bookkeeper & Steward:** Real-time circle health scoring (0-100), default risk modeling, and 1-click reminders in **English**, **Français** (Dakar Tontine), and **Nigerian Pidgin**.
- 📓 **Clean Editorial Warm-Light UI/UX:** Mobile-first design optimized for African market traders on mid-range phones, featuring the iconic African market women savings artwork (`/ajo-african-bg.svg`) and rubber ink ledger stamps.

---

## 🏛️ Alignment with BTrust Dakar Hackathon Stack

AjoBook is purpose-built to integrate and demonstrate the core technologies of the BTrust Dakar Bitcoin Hack:

| Technology Track | Protocol & Tooling | Implementation in AjoBook |
| :--- | :--- | :--- |
| **Bitcoin Base Layer & Telemetry** | Bitcoin Core, Electrum, Fulcrum, **mempool.space** REST API | Live block height query (`/api/blocks/tip/height`), priority fee rate tracking (`/api/v1/fees/recommended`), and on-chain escrow anchor settlement verification. |
| **Lightning Network** | **LDK, C-Lightning, BOLT11, LNURL, BTCPayServer** | Instant, sub-second satoshi settlement for round contributions and autonomous pot disbursement directly to recipients' Lightning addresses. |
| **Nostr & Remote Custody** | **NWC (NIP-47), NIP-01, NIP-04/17, NIP-58** | 100% non-custodial remote wallet control via `@getalby/sdk` (Alby Hub, Mutiny, CoinOS, Zeus), encrypted reminder DMs, and cryptographic savings reputation badges. |
| **USSD & Mobile Money Bridge** | Low-bandwidth mobile UI + JSON-RPC webhook adapter | Ultra-clean warm light UI (<35kB CSS) designed for low-bandwidth 3G/4G phones, with structured USSD SMS session endpoints (`/api/ussd`) for feature-phone savers. |
| **Autonomous AI Steward** | Autonomous Agentic Risk Modeling & Reminders | Multi-factor communal discipline scoring and trilingual payment reminders in **English**, **Français**, and **Nigerian Pidgin**. |

---

## ⚡ 100% Real Cryptographic Bitcoin & Lightning Integrations

AjoBook operates with **zero hardcoded or mock balances**—every transaction, invoice, and verification is real and cryptographic:

1. **Nostr Wallet Connect (NWC — NIP-47 via `@getalby/sdk`):**
   - Connect any live node via `nostr+walletconnect://...` (Alby Hub, Mutiny, CoinOS, Zeus, BTCPayServer NWC).
   - Fetches **real live wallet balances** (`client.getBalance()`), pays **real BOLT11 invoices** (`client.payInvoice()`), and generates **real BOLT11 invoices** (`client.makeInvoice()`) with real cryptographic SHA-256 preimages.
2. **WebLN & NIP-07 Browser Extension Connect (`window.webln` & `window.nostr`):**
   - 1-click connect to **Alby**, **nos2x**, or any WebLN extension to sign Nostr circle state (`kind: 30078`) and pay invoices seamlessly.
3. **External Mobile Lightning Wallets via Scannable QR Codes:**
   - Real scannable BOLT11 / LNURL QR codes compatible with **Phoenix**, **Zeus**, **Breez**, **Blink**, or **Sparrow Wallet** for direct phone-to-phone round contributions.
4. **Live Bitcoin Network Telemetry via `mempool.space`:**
   - Real-time Bitcoin tip height (`#976,385+`) and recommended fee rates (Fastest, Half-Hour, Hour sat/vB) displayed in the top header and payment tracker.
   - 1-click helper link to **Mutinynet Signet Faucet (`https://faucet.mutinynet.com`)** for instant test sat funding.

---

## 📱 Mobile-First Editorial Navigation Views

Matching the clean editorial architecture of `https://ajobook.vercel.app/`:

- **Home:** "This round at a glance" summary card, active savings circles list, "Host New Circle" wizard, and live mempool telemetry.
- **Dashboard:** Interactive exercise book ledger, turn progression timeline, 1-tap contribution, overdue escrow settlement safeguards, and the **AI Steward Panel**.
- **Members:** Communal directory with member slot order, Nostr `npub` identities, Lightning addresses (`lud16`), 1x security deposit escrow status, and NIP-58 reputation badges.
- **Payments:** BOLT11 invoice generator, scannable QR codes, live mempool recommended fees, and cryptographic Nostr receipt log.

---

## 🚀 One-Command Quick Start

### Standard Run:
```bash
# Start backend ROSCA engine & Vite frontend concurrently
npm start

# Visit http://localhost:5173
```

### Docker Compose:
```bash
docker compose up --build
```

### Run End-to-End Test Suite:
```bash
npm test
```
*Verifies ROSCA state engine, AI Steward, 1-tap payment, automated pot payout, and Nostr receipt generation.*

---

## 📖 BTrust Judge Quick-Test Walkthrough (60 Seconds)

1. Open **[https://ajobook-blue.vercel.app](https://ajobook-blue.vercel.app)** (or local `http://localhost:5173`).
2. Notice the top header shows live Bitcoin mempool fee rates (`~1 sat/vB`) and block height directly from `mempool.space`.
3. Toggle regional currencies between **⚡ SATS**, **₦ NGN**, and **CFA XOF**.
4. Click **"Connect Lightning Wallet"**:
   - Connect your **Alby extension (WebLN)** in 1 tap, or
   - Paste an **NWC URI** (`nostr+walletconnect://...`) from Mutiny, CoinOS, or Alby Hub (free test sats at [https://faucet.mutinynet.com](https://faucet.mutinynet.com)), or
   - Use your mobile Lightning wallet (Phoenix, Zeus, Blink) to scan the QR code.
5. In the **Home** tab, click **"Open Round Dashboard"** for the pre-seeded **"Dakar–Lagos Market Circle"**:
   - Inspect the member ledger: **Aminata (Dakar)** (Paid), **Tunde (Lagos)** (Paid), and **Chidi (You / Judge)** (Pending).
6. Click **"1-Tap Pay 5,000 sats"**:
   - If connected via NWC/WebLN, the payment broadcasts instantly and returns the **SHA-256 BOLT11 Preimage proof**.
   - If using a mobile phone wallet, scan the displayed QR code.
7. As soon as the 3rd payment registers:
   - The communal pot (14,925 sats net) disburses autonomously to Aminata.
   - A verifiable **Nostr NIP-58 Badge Receipt** is minted into the ledger.
   - The circle advances to Round #2 automatically!
8. Check the **AI Steward Panel** to review the health score (100/100) and generate payment reminders in **English**, **Français**, or **Nigerian Pidgin**.

---

## ⚖️ License & Open Source
MIT License • Built for the African Bitcoin economy at the **BTrust Dakar Bitcoin Hack 2026**.
