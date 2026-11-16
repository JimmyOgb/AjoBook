# AjoChain (AjoBook) 📓⛓️
### Non-Custodial Rotational Savings on X Layer & TapeOut Protocol

> **"One Exercise Book. Zero Collector Pockets."**  
> AjoChain digitizes the ubiquitous African rotational savings and credit association (**Ajo / Esusu / ROSCA**) into an immutable, human-first on-chain digital exercise book on **X Layer**, secured by deterministic digital logic gates via the **TapeOut Protocol** (`tapeout.net`).

---

## 🌟 Executive Summary & Problem Statement

### The Problem: The Human Collector Dilemma
Across Nigeria and West Africa, over **$15B+** circulates through informal rotational savings groups (**Ajo** or **Esusu**). A trusted organizer carries a physical **Exercise Book**, collecting daily or weekly contributions and handing the entire pot to one rotating member per turn.

This traditional system breaks down at two critical failure points:
1. **The Runaway Collector:** The organizer holds everyone's cash. Fraud, bank freezes, or theft wipe out entire communities with zero recourse.
2. **Early-Slot Defaulters & Delayed Turns:** A member collects the lump sum in Turn #1 or #2, then defaults or delays payment in Turn #4, stranding later participants.

### The Solution: AjoChain (AjoBook)
AjoChain replaces the vulnerable human collector with an immutable smart contract and TapeOut logic circuit, while preserving the exact communal familiarity of the **Ajo Exercise Book**:
- **Names, Not Just Hashes:** Members sign their human names (*"Chidi"*, *"Ngozi"*, *"Tunde"*) into the on-chain ledger alongside their wallet addresses.
- **Zero-Human Custody:** No admin keys, no pause functions, no upgrade proxies, and no owner backdoors. Funds move exclusively through verified turn payouts, deposit refunds, or late-join distributions.
- **1x Flat Security Deposit:** Protects against missed turns. If a participant misses a contribution, closing the turn automatically deducts the required amount from their deposit, marks their book record as `MISSED`, and releases the pot to the scheduled collector on time.
- **Late-Join Catch-Up:** Newcomers can join an active circle at Turn $T$ by paying the catch-up balance:
  $$\text{Catch-Up} = (T - 1) \times \text{Contribution}$$
  The contract immediately distributes $1 \times \text{Contribution}$ into the `claimableBalance` vault of every past collector ($1 \dots T-1$). No funds are ever stuck.
- **Flexible Turn Cadence:** Instant live demos via **5-minute turns (`300s`)**, as well as Daily (`86400s`), Weekly (`604800s`), and Monthly (`2592000s`) schedules.

---

## 🚀 Live X Layer Testnet Deployments (Proof of Life)

All contracts are deployed live, verified, and operational on **X Layer Testnet (Chain ID: `1952`)**.

| Contract | Address on X Layer Testnet | OKLink Block Explorer |
| :--- | :--- | :--- |
| **AjoFactory** | `0x138AA4E744d55898D40184526d8Fec60bbd61452` | [View on OKLink](https://www.oklink.com/x-layer-testnet/address/0x138AA4E744d55898D40184526d8Fec60bbd61452) |
| **Seed AjoCircle** (*Lagos Founders Ajo*) | `0x20f4F33Ff40DC6dAA1B8DCeE8A0916e79608fB20` | [View on OKLink](https://www.oklink.com/x-layer-testnet/address/0x20f4F33Ff40DC6dAA1B8DCeE8A0916e79608fB20) |
| **TestUSDT** (6-Dec Faucet) | `0x923E34aCfa31b25F49fa9533484198dD12761fa6` | [View on OKLink](https://www.oklink.com/x-layer-testnet/address/0x923E34aCfa31b25F49fa9533484198dD12761fa6) |

### Live On-Chain Interactions for Judges
| Action | Transaction Hash | Details |
| :--- | :--- | :--- |
| **1. Factory Deployment** | `0x19aeef9d1c7f5f909193796d11e51b229eb908d0032f6ae64d6db386629734e7` | Deployed `AjoFactory` and created Seed Circle |
| **2. Approve TestUSDT** | `0x12c972b085b4d6eca1886f3054c2f7a1b58552fbd3b67f5ffae5ca461cb45fb0` | Approved 1,000 USDT to Seed Circle |
| **3. Live Join (Slot 1)** | `0xd9dd81b2881021c4500c2227e68968dd4b0ca7e19494899d31d2c3382907ea31` | Signed *"Tunde (Host)"* to Slot #1 with 100 USDT deposit locked |

---

## 🏗️ Architecture & TapeOut Protocol Integration

```
               +--------------------------------------------------------+
               |                  AjoChain Architecture                 |
               +--------------------------------------------------------+

  [ Savers & OKX Wallet ] 
             |
             v
  +--------------------------------------------------------------------+
  |                     TapeOut DeWEB Static Layer                      |
  |  - Pure Static Bundle (Vite + React + TS, base: './')              |
  |  - Hosted on-chain inside ERC-6551 Circuit Container               |
  |  - TapeKit Dual-RPC Integrity: SHA-256 cross-check on 2 nodes      |
  |    Node 1: https://testrpc.xlayer.tech                             |
  |    Node 2: https://xlayertestrpc.okx.com/terigon                   |
  +--------------------------------------------------------------------+
             |                                    |
             | RPC Reads / Writes                 | TAP-10 Messaging
             v                                    v
  +------------------------------------+  +----------------------------+
  |       X Layer zkEVM Rollup         |  |   TapeSend (TAP-10)        |
  |  - Chain ID: 1952 (Testnet) / 196  |  |  - E2E Encrypted Container |
  |  - Native Gas Token: OKB           |  |    Coordination            |
  |  - Currency: USDT (6 decimals)     |  |  - Turn reminders & alerts |
  |                                    |  +----------------------------+
  |  Contracts:                        |
  |   - AjoFactory.sol                 |
  |   - AjoCircle.sol                  |
  |     - Human Exercise Book Ledger   |
  |     - 1x Security Deposit Escrow   |
  |     - Turn Payout Engine           |
  |     - Late-Join Catch-Up Vault     |
  +------------------------------------+
             |
             v Bound via tapeOutCircuitId & tapeOutProcessor
  +--------------------------------------------------------------------+
  |                     TapeOut Protocol Engine                         |
  |  - Circuit Netlist: AjoPayoutGate (circuit/ajo_payout_gate.json)   |
  |  - Boolean Netlist: NAND & LATCH ERC-1155 Logic Tokens             |
  |  - Circuit NFT: ERC-721 token bound to ERC-6551 Container          |
  |  - Area-coded Container URI: tape://0x89c7d413...2.LAGOS_ARM.tape/ |
  +--------------------------------------------------------------------+
```

### 1. TapeOut Digital Logic Netlist (`AjoPayoutGate`)
In [`circuit/ajo_payout_gate.json`](circuit/ajo_payout_gate.json), AjoChain defines the formal verification logic for payouts and default detection using primitive boolean gates:
- **`releasePayout`**: $\text{allMembersPaid} \land \neg \text{roundAlreadyDisbursed} \land \text{roundActive}$
- **`slashRequired`**: $\text{deadlinePassed} \land \neg \text{memberPaid} \land \text{roundActive}$

### 2. TapeKit Dual-RPC SHA-256 Asset Integrity Check
In [`frontend/src/tapeout/tapekit.ts`](frontend/src/tapeout/tapekit.ts), every loaded bundle computes SHA-256 hashes client-side and validates against both `https://testrpc.xlayer.tech` and `https://xlayertestrpc.okx.com/terigon` to guarantee zero-tamper decentralized hosting.

### 3. TapeSend (TAP-10) Member Coordination
TapeSend provides container-to-container encrypted communication for ROSCA participants (turn opening notices, payout confirmations, deadline countdown alerts) without routing payments or exposing private coordinator chats.

---

## 📐 Mathematical Invariants & Guarantees

1. **Balance Conservation:**
   $$\text{Contract USDT Balance} = \sum_{m} \text{Deposit}_m + \sum_{m} \text{TurnContributions}_{\text{current}} + \sum_{u} \text{claimableBalance}_u$$
2. **Late-Join Invariant (No Stuck Money):**
   When member $N$ joins at Turn $T$:
   $$\text{Catch-Up Paid} = (T - 1) \times \text{Contribution}$$
   $$\sum_{t=1}^{T-1} \Delta \text{claimableBalance}_t = (T - 1) \times \text{Contribution}$$
   Every past collector receives their exact share via safe pull-payments.
3. **Turn Payout Formula:**
   $$\text{Gross Pot} = \text{memberCount} \times \text{Contribution}$$
   $$\text{Protocol Fee} = \frac{\text{Gross Pot} \times 50}{10000} \quad (0.5\%)$$
   $$\text{Net Payout} = \text{Gross Pot} - \text{Protocol Fee}$$

---

## 💻 Local Development & Testing

### Prerequisites
- [Foundry](https://getfoundry.sh/) (`forge`, `cast`)
- Node.js 18+ & npm

### Smart Contracts (Foundry)
```bash
cd contracts
forge install
forge test -vvv
```
All 7 comprehensive exercise book tests pass:
- `test_JoinOrderAndDepositLock`: Verifies human name recording and 1x deposit escrow.
- `test_AutoStartAtMaxMembers`: Verifies circle begins automatically when full.
- `test_HostCanStartWithTwoMembers`: Verifies host initiation once $\ge 2$ members sign.
- `test_TurnContributionAndPayout`: Verifies smooth contribution and net pot distribution.
- `test_MissedTurnDeductedFromDeposit`: Verifies auto-deduction and `MISSED` ledger status.
- `test_LateJoinCatchUpDistribution`: Verifies exact mathematical credit to past collectors.
- `test_DepositRefundAtCompletion`: Verifies 100% deposit returns upon circle completion.

### Frontend (DeWEB Compliant)
```bash
cd frontend
npm install
npm run build
npm run preview
```

### Packaging for DeWEB On-Chain Deployment
```bash
powershell -ExecutionPolicy Bypass -File scripts/package-deweb.ps1
# Or on Linux/macOS:
./scripts/package-deweb.sh
```
Outputs `frontend/dist/deweb-manifest.json` and `ajochain-deweb-bundle.zip`.

---

## 🏆 Hackathon Checklist

- [x] Tested & Deployed on **X Layer** (Chain ID: `1952` Testnet, fully configured for `196` Mainnet).
- [x] Zero-Mock / Zero-Simulation policy strictly adhered to (all UI driven by real RPC calls).
- [x] TapeOut Protocol netlist compiled in `circuit/ajo_payout_gate.json`.
- [x] TapeKit dual-RPC SHA-256 integrity verifier operational.
- [x] 100% On-Chain DeWEB compatible static build (`base: './'`).
- [x] Human Exercise Book interface with Nigerian cultural UX, shareable invite links, and QR codes.
- [x] Complete test coverage with Foundry.

---

## 📄 License
MIT License. Built for the **X Layer & TapeOut Hackathon**.
