---
name: tapeout-xlayer
description: >-
  Technical standards, architecture, and step-by-step procedures for building, testing,
  and deploying AjoChain on X Layer using the TapeOut Protocol (Circuits, ERC-6551 Containers,
  DeWEB static hosting, TapeSend TAP-10 messaging, and hybrid Solidity execution).
---

# TapeOut Protocol & X Layer Engineering Skill

This skill provides the authoritative specifications, architecture, and development workflows for **AjoChain** — a non-custodial Nigerian rotational savings (ROSCA / Ajo / Esusu) dApp deployed on **X Layer** and integrated with the **TapeOut Protocol** (`tapeout.net`).

---

## 1. Network & Chain Configuration: X Layer

X Layer is an EVM-compatible ZK-Rollup built with the Polygon CDK and secured by OKX and Ethereum.

### 1.1 Network Parameters

| Parameter | Mainnet | Testnet |
| :--- | :--- | :--- |
| **Chain Name** | X Layer Mainnet | X Layer Testnet |
| **Chain ID** | `196` | `1952` |
| **RPC Endpoint** | `https://rpc.xlayer.tech` | `https://testrpc.xlayer.tech` |
| **Block Explorer** | `https://www.oklink.com/xlayer` | `https://www.oklink.com/xlayer-test` |
| **Native Gas Token** | `OKB` (18 decimals) | `OKB` (18 decimals) |
| **Primary Savings Token** | `USDT` (6 decimals) | `TestUSDT` (Mock ERC-20, 6 decimals) |

### 1.2 Foundry Configuration (`foundry.toml`)
When initializing Foundry in `/contracts`, configure EVM settings suitable for X Layer zkEVM:

```toml
[profile.default]
src = "src"
out = "out"
libs = ["lib"]
solc_version = "0.8.24"
evm_version = "cancun"
optimizer = true
optimizer_runs = 200
fs_permissions = [{ access = "read", path = "./" }]

[rpc_endpoints]
xlayer_mainnet = "https://rpc.xlayer.tech"
xlayer_testnet = "https://testrpc.xlayer.tech"
localhost = "http://127.0.0.1:8545"

[etherscan]
xlayer_mainnet = { key = "${OKLINK_API_KEY}", url = "https://www.oklink.com/api/v5/explorer/contract/verify-source-code-plugin/XLAYER" }
```

### 1.3 Wagmi / Viem Chain Definition
In frontend TypeScript code:

```typescript
import { defineChain } from 'viem';

export const xLayerMainnet = defineChain({
  id: 196,
  name: 'X Layer Mainnet',
  nativeCurrency: { name: 'OKB', symbol: 'OKB', decimals: 18 },
  rpcUrls: {
    default: { http: ['https://rpc.xlayer.tech'] },
  },
  blockExplorers: {
    default: { name: 'OKLink', url: 'https://www.oklink.com/xlayer' },
  },
});

export const xLayerTestnet = defineChain({
  id: 1952,
  name: 'X Layer Testnet',
  nativeCurrency: { name: 'OKB', symbol: 'OKB', decimals: 18 },
  rpcUrls: {
    default: { http: ['https://testrpc.xlayer.tech'] },
  },
  blockExplorers: {
    default: { name: 'OKLink', url: 'https://www.oklink.com/xlayer-test' },
  },
  testnet: true,
});
```

---

## 2. TapeOut Protocol Architecture & Ground Truths

> [!CAUTION]
> **Anti-Hallucination Invariant:**
> TapeOut is NOT an off-chain cloud provider, nor is TapeSend a token transfer rail. Every agent must adhere to the ground truth architecture below.

### 2.1 Primitive Logic Gates & Circuit Containers
- **Logic Gates (ERC-1155):** TapeOut circuits are constructed from elementary gates:
  - `NAND`: The universal logic gate.
  - `LATCH`: The bistable state-holding memory element.
- **Circuit NFTs (ERC-721):** Static netlists of compiled gates represent reproducible on-chain digital circuits.
- **Circuit Containers (ERC-6551 Token Bound Accounts):** Every Circuit NFT is deployed alongside an ERC-6551 smart contract account. The container can:
  - Hold tokens (`USDT`, `OKB`).
  - Execute transactions triggered by verified circuit logic.
  - Host decentralized web (DeWEB) file payloads.

### 2.2 X Layer Naming & Resolution (TapeKit)
- Containers on X Layer are resolved using standard format:
  ```text
  #<ID>.<area>.<processor>.tape
  ```
  *(e.g., `#4012.lagos.arm.tape` or direct ERC-6551 contract address `0x...`)*
- **Dual-RPC SHA-256 Resolution:**
  When TapeKit retrieves file chunks or state from a container on X Layer, it performs byte-by-byte SHA-256 hash checks across **at least two independent RPC nodes** (`https://rpc.xlayer.tech` and a fallback node) to prevent RPC tampering or corrupted bytecode delivery.

### 2.3 DeWEB Static Hosting Rules
DeWEB sites live 100% on-chain inside a Circuit Container:
1. **Pure Static Output:** No Node.js runtime, no Next.js SSR, no dynamic server functions. Must compile to static HTML, JS, CSS, and SVG.
2. **Relative URLs Required:** Because DeWEB containers serve files without domain-rooted paths, the frontend build **must** use relative paths:
   - Root index: `./index.html`
   - Assets: `./assets/app-*.js`, `./assets/style-*.css`
   - In `vite.config.ts`: `base: './'`
3. **Bundle Optimization:** Compress assets to minimize on-chain storage footprint during `tapecode` deployment. Inline small icons or use minimal SVGs.

### 2.4 TapeSend (TAP-10 Messaging Standard)
- **Definition:** TapeSend is a standardized end-to-end encrypted communication channel between Circuit Containers (TAP-10 standard).
- **Not a Payment Rail:** Tokens (USDT/OKB) must NEVER be routed through TapeSend. Financial settlement happens via Solidity contracts.
- **Role in AjoChain:**
  - **Circle Invites:** Circle creators dispatch encrypted invitations directly to member containers using their `.tape` address or container address.
  - **Round Alerts:** Notifications dispatched when:
    - A round contribution window opens.
    - A payout turn has occurred.
    - A member defaults and enters the grace period.

### 2.5 Hybrid Execution Model (Hackathon Specification)
AjoChain implements a two-tier hybrid architecture:
1. **Settlement & Escrow (Solidity on X Layer zkEVM):**
   - `AjoFactory.sol`: Deploys and catalogs Ajo circles.
   - `AjoCircle.sol`: Manages USDT deposits, security collateral locks, round rotation timers, payout dispatches, and defaulter slashing.
2. **Deterministic State & DeWEB Hosting (TapeOut):**
   - Each `AjoCircle` contract stores a reference to a `bytes32 circuitId` and `address containerAddress`.
   - The user frontend is deployed directly to a TapeOut DeWEB container.
   - Member identity and encrypted coordination run via TapeOut Containers and TapeSend (TAP-10).

---

## 3. Smart Contract Specifications & Security Invariants

### 3.1 Mechanics of Non-Custodial Ajo (ROSCA)
A standard Nigerian Ajo/Esusu circle operates as follows:
1. **Formation:** $N$ members join. Each member commits to contributing $C$ USDT each round for $N$ total rounds.
2. **Collateral Lock:** To eliminate default risk, each member deposits upfront collateral (e.g., $1 \times C$ or $2 \times C$) before Round 1 starts.
3. **Round Contributions:** In each round $k \in [1, N]$:
   - All $N$ members must deposit $C$ USDT within the round deadline.
   - The pot ($N \times C$ USDT) is automatically transferred to the member designated for turn $k$.
4. **Early-Slot Defaulter Slashing:**
   - If member $M$ receives payout in Round 1 and fails to contribute in Round 2:
   - Member $M$'s collateral is immediately slashed.
   - Slashed collateral compensates the pool, ensuring honest later-slot members receive their full payout.
5. **Completion & Collateral Return:**
   - Once all $N$ rounds complete successfully, each honest member's collateral is unlocked and returned in full.
6. **Zero Human Custody:**
   - No creator, admin, or contract owner can pause withdrawals, extract funds, or alter beneficiary order once the circle is initialized.

### 3.2 Key Foundry Tests to Implement
Every contract implementation must pass these tests in `contracts/test/`:
- `test_CreateCircle`: Verify factory clones or deploys `AjoCircle` with valid params.
- `test_CollateralDepositAndLock`: Ensure circle does not start until all members lock collateral.
- `test_RoundContributionAndAutoPayout`: Verify pot pays out cleanly to the designated slot owner.
- `test_DefaulterSlashing`: Ensure an early beneficiary who defaults has collateral slashed and honest members are made whole.
- `test_ZeroHumanCustody`: Prove that neither factory owner nor circle creator can withdraw deposited funds.
- `test_Invariant_BalanceConservation`: Property fuzz test proving contract USDT balance equals expected sum of remaining collateral plus current round contributions.

---

## 4. Frontend & DeWEB Static Build Specification

### 4.1 Vite Configuration (`frontend/vite.config.ts`)
```typescript
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  base: './', // CRITICAL FOR DeWEB: Enables relative path resolution
  build: {
    outDir: 'dist',
    assetsDir: 'assets',
    sourcemap: false,
    chunkSizeWarningLimit: 600,
    rollupOptions: {
      output: {
        manualChunks: {
          vendor: ['react', 'react-dom'],
          web3: ['viem', 'wagmi'],
        },
      },
    },
  },
});
```

### 4.2 Web3 Connector Configuration
Ensure `OKX Wallet` is prioritized alongside standard Injected connectors for X Layer native ecosystem compatibility.

---

## 5. Verification Checklist

Before completing any task or opening a PR:

- [ ] **Solidity Compiles Cleanly:** `forge build --sizes` succeeds with no warnings or contract size overflows.
- [ ] **Foundry Tests Pass:** `forge test -vvv` passes 100% of unit and invariant tests.
- [ ] **Zero Hallucinated APIs:** TapeOut interactions reference valid Circuit Container (ERC-6551), ERC-1155 gates (`NAND`/`LATCH`), DeWEB static hosting, or TapeSend (TAP-10) messaging.
- [ ] **Static DeWEB Build Verified:** `npm run build` outputs a standalone `dist/` containing `index.html` referencing `./assets/...` with no absolute `/...` paths.
- [ ] **Network Target Confirmed:** Chain IDs are strictly `196` (Mainnet) or `1952` (Testnet), with `OKB` for gas and `USDT` for deposits.
