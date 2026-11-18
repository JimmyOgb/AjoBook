# AjoBook 📓⚡
### Bitcoin Lightning & Nostr Community Savings Ledger (Ajo • Esusu • Tontine)
**Built for the Dakar Bitcoin Hack by BTrust**

> **"One exercise book. Zero collector pockets."**  
> **AjoBook** digitizes the traditional African communal savings circle (Ajo / Esusu / Tontine) using **Bitcoin, Lightning Network, Nostr, and Autonomous AI**. Every payment is verified cryptographically on Nostr, pots disburse autonomously over Lightning, and no human middleman holds the money.

---

## 🌟 Live Links & Core Features

- 🌐 **Live Vercel Production dApp:** **[https://ajobook.vercel.app](https://ajobook.vercel.app)**
- 💻 **GitHub Repository:** **[https://github.com/JimmyOgb/AjoBook](https://github.com/JimmyOgb/AjoBook)**
- ⚡ **Pure Bitcoin & Lightning Settlement:** Invoices generated in Satoshis (BOLT11) with instant sub-second settlement.
- 🌍 **West African Currency Toggle:** Switch effortlessly between **SATS**, **Nigerian Naira (₦)**, and **Franc CFA (XOF)**.
- 🔑 **Nostr Native Identity & State:** Keypair generation (`npub` / `nsec`), NIP-07 browser extension support, Kind `30078` signed communal state, and Kind `8` NIP-58 turn completion badges.
- 👛 **Effortless Wallet Modes in Drawer:**
  - **1-Click Built-in Demo Wallet:** Pre-funded with **100,000 sats** by default on first visit (zero setup or extensions required).
  - **NWC (Nostr Wallet Connect / NIP-47):** Seamlessly connects to **Mutinynet (Signet)**, **Testnet4**, or **Mainnet** nodes.
- 🛡️ **1x Security Deposit Escrow:** Automatic default slashing protects honest members against missed turns.
- 🤖 **AI Bookkeeper & Steward:** Real-time circle health scoring (0-100), default risk modeling, and 1-click reminders in **English**, **Français** (Dakar Tontine), and **Nigerian Pidgin**.
- 📓 **Authentic African Exercise Book UX:** Clean notebook margins, Adire / Ankara geometric textile patterns, and human participant names (*Aminata*, *Tunde*, *Chidi*).

---

## ⚡ Supported Bitcoin Networks & Testing Modes

AjoBook is engineered for progressive, zero-friction onboarding—enabling hackathon judges and non-technical market participants to experience instant rotational savings without initial wallet configuration, while providing full cryptographic self-custody for live Bitcoin nodes.

| Testing Mode | Network / Protocol | How It Works | Ideal For |
| :--- | :--- | :--- | :--- |
| **Instant Judge Mode** | **Built-in Lightning Wallet** (100,000 sats) | Active by default on first load (never blocks page load with a wallet modal). Deducts sats locally and generates SHA-256 settlement preimages. **Zero setup required.** | Immediate hackathon evaluation, 30-second walkthrough, testing multi-turn pot distributions. |
| **Real Lightning Settlement Mode** | **Mutinynet (Signet)** via NWC (`lntbs`) | Connect any NIP-47 remote wallet. Need free Signet test sats? Instantly fund your wallet at [https://faucet.mutinynet.com](https://faucet.mutinynet.com). | Verifying live NIP-47 RPC calls, relay syncing, and BOLT11 invoices without spending real funds. |
| **Testnet4 Settlement Mode** | **Testnet4** via NWC (`lntb`) | Connect standard Testnet4 Lightning nodes via Alby Hub, Umbrel, or Core Lightning. | Full multi-node network verification and stress testing on Bitcoin Testnet4. |
| **Mainnet Production Mode** | **Bitcoin Mainnet** via NWC (`lnbc`) | Connect production self-custodial Lightning nodes (Alby Hub, Umbrel, LNbits, Phoenix). | Real-world communal rotational savings circles with instant satoshi settlement. |

---

## 🚀 One-Command Quick Start

### Option A: Standard Node
```bash
# 1. Start Backend & Frontend concurrently
npm start

# Visit http://localhost:5173
```

### Option B: Docker Compose
```bash
docker compose up --build
```

### Option C: Run End-to-End Test Suite
```bash
npm test
```
*Verifies ROSCA state engine, AI Steward, 1-tap payment, automated pot payout, and Nostr receipt generation.*

---

## 📖 BTrust Judge Quick-Test Walkthrough (30 Seconds)

1. Open **[https://ajobook.vercel.app](https://ajobook.vercel.app)** (or local `http://localhost:5173`).
2. Notice your **1-Click Demo Lightning Wallet** is already active with **100,000 sats**.
3. Toggle the currency pill in the top header between **⚡ SATS**, **₦ NGN**, and **CFA XOF**.
4. Open the pre-seeded **"Dakar–Lagos Market Circle"**:
   - **Aminata (Dakar)** is Round #1 collector and has paid.
   - **Tunde (Lagos)** has paid.
   - **Chidi (You / Judge)** is pending payment for Round #1.
5. Click **"Pay 5,000 sats"**:
   - The **Lightning Settlement Drawer** opens with a live BOLT11 invoice & QR code.
   - Click **"1-Tap Pay 5,000 sats"**.
6. **Watch the Magic Happen:**
   - Your contribution settles instantly, displaying the **cryptographic SHA-256 BOLT11 Preimage proof** directly in the drawer with 1-click copy.
   - As soon as your 3rd payment registers, the autonomous engine triggers the **Pot Payout**!
   - 14,925 sats are disbursed to Aminata.
   - A signed **Nostr NIP-58 Completion Badge** (`nevent`) is stamped into the ledger.
   - The circle automatically advances to Round #2!
7. **Optional: Test Real Lightning via NWC (Mutinynet Signet / Mainnet):**
   - Click the Wallet button in the header to open the **Lightning Wallet Drawer**.
   - Switch to **NWC Protocol** and paste your `nostr+walletconnect://...` URI (claim free Signet sats from [https://faucet.mutinynet.com](https://faucet.mutinynet.com)).
   - Inspect the connected relay, network badge, and real node balance alongside settlement proofs.
8. Check the **AI Bookkeeper & Steward** panel:
   - View the Circle Health Score (100/100, LOW RISK).
   - Test generating payment reminders in **English**, **Français**, and **Nigerian Pidgin**.

---

## 🏛️ Architecture & Protocols

```text
  +--------------------------------------------------------------------+
  |                        Frontend (Vite + React)                     |
  |  - Exercise Book UI with Adire / Ankara SVG Pattern                |
  |  - Currency Selector: SATS | NGN (₦) | XOF (CFA)                   |
  |  - Built-in 100k Sats Demo Wallet + NWC (NIP-47) Drawer            |
  |  - Nostr Identity: npub / nsec / NIP-07 Extension                  |
  +--------------------------------------------------------------------+
                                    |
                    Dual-Mode Relay / Coordinator Sync
                                    v
  +--------------------------------------------------------------------+
  |             Autonomous ROSCA Engine (backend/server.js)            |
  |  - Lightning BOLT11 Invoice Generator & Preimage Verifier          |
  |  - 1x Security Deposit Escrow & Default Slashing Engine            |
  |  - Autonomous Pot Payout Disburser (Advances Rotation Slots)       |
  |  - Nostr Kind: 30078 State Signing & Kind: 8 NIP-58 Badges         |
  +--------------------------------------------------------------------+
                                    |
                                    v
  +--------------------------------------------------------------------+
  |              AI Circle Steward (backend/ai_steward.js)             |
  |  - Real-time Circle Health (0-100) & Default Risk Assessment        |
  |  - Multilingual Reminders: English, Français (Dakar), Pidgin       |
  |  - Nostr NIP-04 / NIP-17 Encrypted DM Formatter                    |
  +--------------------------------------------------------------------+
```

---

## 📄 License
MIT License. Built with pride for the **BTrust Dakar Bitcoin Hack 2026**.
