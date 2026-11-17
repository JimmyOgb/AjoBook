# AjoBook — Project Guidelines & Technical Specifications
### BTrust Dakar Bitcoin Hack 2026 Edition

> **AjoBook** is a decentralized, non-custodial West African rotational savings and credit association (ROSCA / Ajo / Esusu / Tontine) platform powered by **Bitcoin, Lightning Network, Nostr, and Autonomous AI**.
> **GitHub:** `https://github.com/JimmyOgb/AjoBook`
> **Vercel Project:** `Ajobook` (`https://ajobook.vercel.app`)

All agents, subagents, and contributors working on this repository **MUST** strictly follow the technical specifications and standards outlined in this document.

---

## 1. Network & Protocol Stack

| Component | Technology | Specification / Standard |
| :--- | :--- | :--- |
| **Settlement Rail** | Bitcoin Lightning Network | BOLT11 invoices, LNURL-pay, instant sat settlement |
| **Wallet Protocol** | Nostr Wallet Connect (NWC) | NIP-47 remote wallet control via `@getalby/sdk` & Alby CLI |
| **Identity Protocol** | Nostr Public-Key Cryptography | NIP-01 (`npub`/`nsec` secp256k1 keypairs) & NIP-07 web extensions |
| **Communal Ledger** | Nostr Signed Events | Kind `30078` (Application state) & Kind `8` (NIP-58 badges) |
| **AI Bookkeeper & Steward** | Autonomous Agentic Advisor | Multilingual risk analysis & reminders (EN, FR, PCM) |
| **Currencies** | SATS, NGN (₦), XOF (CFA) | Real-time satoshi to West African fiat conversion display |

---

## 2. Core Architecture & Ground Truths

### 2.1 Autonomous ROSCA Engine
- **Zero Human Custody:** No human organizer or middleman holds the communal pot.
- **1x Escrow Deposit Safeguard:** Members lock a 1-turn security deposit upfront. If a participant defaults on their turn, their deposit is slashed into the pot so the round recipient is never shortchanged.
- **Autonomous Pot Distribution:** As soon as all $N$ circle members contribute for the active turn, the pot automatically disburses to the designated rotation recipient's Lightning Address or NWC wallet.

### 2.2 Nostr Event Ledger (Tamper-Proof History)
- **Kind 30078 (App State):** Circle configuration, member slots, turn progression, and contribution status signed by the coordinator agent.
- **Kind 8 (NIP-58 Badges):** Verifiable cryptographic proof awarded to turn recipients upon successful pot disbursement.
- **NIP-04 / NIP-17 DMs:** Encrypted turn notification reminders sent directly to member Nostr pubkeys.

### 2.3 West African Cultural & Regional UX
- **The Exercise Book Experience:** Preserves the beloved African market physical exercise book layout with turn numbers, human names, and paid/missed ledger columns.
- **Trilingual Support:** Generates reminders in **English**, **Français** (Dakar / Francophone Tontines), and **Nigerian Pidgin**.
- **Authentic Adire / Ankara SVG:** Woven visual motif with zero external assets.

### 2.4 Dual-Mode Operation (Vercel Standalone + Local Docker Backend)
- **Standalone Vercel Mode (`ajobook.vercel.app`):** When `VITE_API_URL` is omitted, the frontend operates autonomously using `localStorage` persistence and direct Nostr relay synchronization with the pre-seeded Dakar–Lagos market demo ready on first load.
- **Local Docker / Node Mode:** Runs with Express ROSCA engine on port `3001` and Vite on port `5173`.

---

## 3. Quick Start & One-Command Setup

### Local Run:
```bash
# Install dependencies & run both backend + frontend
npm start

# Or run separately:
npm run backend   # Port 3001 (Node/Express ROSCA engine + Nostr coordinator)
npm run frontend  # Port 5173 (Vite + React + Tailwind dApp)
```

### Docker Compose:
```bash
docker compose up --build
```

### End-to-End Test:
```bash
npm test
```
Verifies health check, pre-seeded Dakar–Lagos market circle, AI steward risk assessment, 1-tap contribution payment, autonomous pot disbursement, and signed Nostr NIP-58 receipt generation.
