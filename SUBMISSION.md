# AjoBook 📓⚡
### Bitcoin Lightning & Nostr Community Savings Ledger (Ajo • Esusu • Tontine)
**Submission for the BTrust Dakar Bitcoin Hack 2026**

- **Project Name:** AjoBook
- **Subtitle:** Bitcoin Lightning & Nostr Community Savings Ledger — Ajo • Esusu • Tontine
- **Live Vercel Production dApp:** [https://ajobook.vercel.app](https://ajobook.vercel.app)
- **GitHub Repository:** [https://github.com/JimmyOgb/AjoBook](https://github.com/JimmyOgb/AjoBook)

---

## 1. Problem Statement & West African Reality
In market squares from Dakar to Lagos, millions of market traders, women's cooperatives, and diaspora circles save billions of dollars every month through rotational savings clubs called **Ajo**, **Esusu**, or **Tontine**.

However, traditional clubs suffer from three systemic risks:
1. **Collector Default & Theft:** A human organizer physically holds cash in a wooden drawer or bank account and can abscond.
2. **Early Beneficiary Disappearance:** A member collects the first pot and stops paying future rounds.
3. **Currency Instability & High Remittance Fees:** Inflation erodes local fiat currencies, and cross-border remittances within ECOWAS incur 10-18% fees.

---

## 2. The AjoBook Solution
**"One exercise book. Zero collector pockets."**

AjoBook replaces the human middleman with an autonomous, non-custodial Bitcoin Lightning Network & Nostr protocol engine:
- **Zero Human Custody:** No organizer touches the communal pot.
- **1x Escrow Deposit Safeguard:** Members lock 1 round's worth of sats upfront. If an early winner defaults on a later turn, their deposit is slashed into the pot so honest collectors are never shortchanged.
- **Instant Lightning Settlement:** Contributions and pot payouts disburse in Satoshis over Lightning with sub-second finality.
- **Nostr Cryptographic Ledger:** Every round progression is signed into Kind `30078` communal state, and zero-default participants receive Kind `8` (NIP-58) completion badges.
- **Regional Currency Display:** Savers seamlessly toggle between **SATS**, **Nigerian Naira (₦)**, and **Franc CFA (XOF)**.
- **AI Bookkeeper & Steward:** Autonomous risk analysis and 1-click reminders in **English**, **Français** (Dakar), and **Nigerian Pidgin**.

---

## 3. Architecture & Technical Invariants

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

## 4. BTrust Judging Criteria Alignment

| Criteria | Implementation in AjoBook |
| :--- | :--- |
| **Bitcoin / Lightning Core** | 100% native Lightning BOLT11 invoicing, LNURL, sats accounting, zero altcoins. |
| **Nostr Identity & Protocol** | secp256k1 keypairs (`npub`/`nsec`), NIP-47 NWC wallet control, NIP-58 badges, Kind 30078 state events. |
| **Security by Design** | 1x upfront deposit escrow, pull-claim fallbacks, automated slashing, non-custodial. |
| **One-Command Setup** | `npm start`, `npm test`, and `docker compose up --build`. |
| **West African UX** | Trilingual reminders (EN, FR, PCM), SATS/NGN/XOF currency toggle, exercise-book layout. |

---

## 5. Quick Start & Test Commands

```bash
# 1. Run local dev server (Backend + Frontend)
npm start

# 2. Run with Docker Compose
docker compose up --build

# 3. Run automated verification test suite
npm test
```
