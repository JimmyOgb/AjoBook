# AjoChain — Project Guidelines & Technical Specifications

> **AjoChain** is a decentralized, non-custodial Nigerian rotational savings and credit association (ROSCA / Ajo / Esusu) dApp deployed on **X Layer** and powered by the **TapeOut Protocol** (`tapeout.net`).

All agents, subagents, and contributors working on this repository **MUST** strictly follow the technical specifications, architectural constraints, and coding standards outlined in this document.

---

## 1. Network & Chain Configuration (X Layer)

AjoChain is built specifically for **X Layer** (Polygon CDK / zkEVM rollup secured by OKX and Ethereum).

| Parameter | Mainnet | Testnet |
| :--- | :--- | :--- |
| **Network Name** | X Layer Mainnet | X Layer Testnet |
| **Chain ID** | `196` | `1952` |
| **RPC URL** | `https://rpc.xlayer.tech` | `https://testrpc.xlayer.tech` |
| **Block Explorer** | `https://www.oklink.com/xlayer` | `https://www.oklink.com/xlayer-test` |
| **Native Gas Token** | `OKB` | `OKB` (Testnet) |
| **Settlement Currency** | `USDT` (Bridged/Native on X Layer) | `TestUSDT` (Mock ERC-20 for testing) |

### Currency & Gas Rules:
- **Zero ETH assumptions:** Always use `OKB` as native gas token.
- **USDT Accounting:** All circle contributions, collateral escrows, and payouts are denominated in `USDT` (6 decimals). Smart contracts and frontend must handle 6-decimal math accurately.
- **Mock Token:** Local Foundry tests and Testnet deployments must use `TestUSDT.sol` (with a public faucet/mint function for test runners).

---

## 2. TapeOut Protocol Architecture & Ground Truths

> [!IMPORTANT]
> **Strict Anti-Hallucination Policy:** Do **NOT** invent or hallucinate fictional TapeOut Protocol APIs, consensus mechanisms, or payment routing features. Adhere strictly to the actual TapeOut specifications below.

### 2.1 Core Circuit & Container Architecture
- **Primitive Logic Elements:** TapeOut constructs on-chain digital logic circuits using `NAND` gates and `LATCH` memory gates represented by **ERC-1155** tokens.
- **Circuit NFTs (ERC-721):** Static netlists of compiled logic gates are minted as immutable Circuit NFTs.
- **Circuit Containers (ERC-6551):** Each Circuit NFT is paired with a Token Bound Account (ERC-6551 Circuit Container). The container owns assets, stores state, executes circuit instructions, and hosts DeWEB bundles.

### 2.2 X Layer Naming & Resolution (TapeKit)
- Containers on X Layer are addressed either by their canonical ERC-6551 contract address or by area-coded names following the format:
  ```text
  #<ID>.<area>.<processor>.tape
  ```
- **Verification Rule:** TapeKit client resolution verifies all hosted files byte-for-byte using **SHA-256 integrity hashes** cross-checked across **at least two independent RPC nodes** on X Layer.

### 2.3 DeWEB Static On-Chain Hosting Constraints
DeWEB dApp frontends live 100% on-chain stored across container storage chunks:
- **Zero SSR / Zero Node Runtime:** The web application MUST be a pure static Single Page Application (SPA).
- **Relative Pathing Requirement:** All assets must use relative paths (`./assets/...`, `./favicon.ico`). The Vite configuration MUST specify `base: './'`.
- **Root Entrypoint:** Build artifacts must place `index.html` at the bundle root with flat or clean relative asset hierarchies.
- **Lightweight Bundle Budgets:** Keep code splittings lean, eliminate heavy external libraries, inline critical SVGs, and compress CSS/JS to fit within on-chain container storage limits when pushed via **TapeCode** / **SiteRegistry**.

### 2.4 TapeSend (TAP-10 Messaging Standard)
- **What TapeSend IS:** An end-to-end encrypted container-to-container messaging protocol (TAP-10).
- **What TapeSend IS NOT:** TapeSend is **NOT** a financial payment router, token bridge, or fund transfer rail.
- **AjoChain Use Case:** Use TapeSend strictly for off-chain/on-chain encrypted member coordination:
  1. Circle invitations and acceptances between member containers.
  2. Encrypted round status notifications (e.g., contribution window open, round payout dispatched, default warning alerts).

### 2.5 Hybrid Execution Model (Hackathon Approved)
To provide institutional financial safety alongside TapeOut decentralized hosting:
- **Solidity Smart Contracts (`AjoFactory.sol` & `AjoCircle.sol`):** Handle financial custody, collateral escrow locking, time-locked round deadlines, contribution checks, and automatic USDT payouts.
- **TapeOut Integration:**
  1. **Container Linkage:** Each `AjoCircle` is bound to a registered TapeOut Circuit ID / Container address.
  2. **Deterministic State Verification:** Defaulter identification logic and payout turn verification can be proven via TapeOut boolean gate logic (`NAND`/`LATCH` netlists).
  3. **DeWEB Frontends:** The user interface is permanently hosted within a TapeOut Circuit Container.

---

## 3. Smart Contract Standards (Solidity & Foundry)

1. **Compiler:** Solidity `^0.8.24` with EVM target compatible with X Layer (Cancun/Shanghai compatible; avoid opcodes unsupported on X Layer zkEVM).
2. **Toolchain:** Foundry (`forge build`, `forge test`, `forge fmt`).
3. **Security Standards:**
   - Use OpenZeppelin contracts: `ReentrancyGuard`, `SafeERC20`, `IERC20`, `Ownable`.
   - All token transfers must use `SafeERC20.safeTransfer` and `SafeERC20.safeTransferFrom`.
   - **Zero Human Custody:** Once an Ajo circle starts, funds cannot be withdrawn, redirected, or altered by the creator, factory owner, or any admin key.
4. **Testing & Invariants:**
   - Invariant testing for circle balance conservation ($\sum \text{contributions} + \sum \text{collateral} = \text{contract balance}$).
   - Defaulter slashing: If a member who received an early payout fails to contribute in subsequent rounds, their locked collateral is automatically slashed and distributed to remaining honest members.
   - Deadline auto-payout: Any participant or keeper can trigger round distribution once deadlines expire without admin permissions.

---

## 4. Frontend Standards (Vite + React + TypeScript + Wagmi)

1. **Framework:** React 18+ with TypeScript and Vite.
2. **Web3 Stack:** `viem` and `wagmi` configured for:
   - X Layer Mainnet (`chainId: 196`) & X Layer Testnet (`chainId: 1952`).
   - OKX Wallet native connector + Injected / WalletConnect.
3. **DeWEB Compliance:**
   - `vite.config.ts` must set `base: './'`.
   - No dynamic server-side imports or server environment variables.
   - All environment variables exposed to the client must use `VITE_*` prefix.
   - Static asset output in single `dist/` folder ready for `tapecode` deployment.

---

## 5. Repository Structure

```text
ajochain/
├── .agents/
│   └── skills/
│       └── tapeout-xlayer/
│           └── SKILL.md         # Specialized skill for TapeOut + X Layer engineering
├── contracts/                   # Foundry smart contract project
│   ├── src/
│   │   ├── AjoFactory.sol       # Factory for creating and tracking Ajo circles
│   │   ├── AjoCircle.sol        # Core ROSCA circle logic (escrow, rounds, slashing)
│   │   └── mocks/
│   │       └── TestUSDT.sol     # Mock USDT for local/testnet development
│   ├── test/
│   │   ├── AjoCircle.t.sol      # Unit and scenario tests
│   │   └── Invariants.t.sol     # Property and invariant fuzz tests
│   └── foundry.toml
├── frontend/                    # Vite + React + TypeScript DeWEB static dApp
│   ├── src/
│   │   ├── config/chains.ts     # X Layer chain and RPC definitions
│   │   ├── config/wagmi.ts      # Wagmi client configuration
│   │   ├── contracts/           # ABIs and contract addresses
│   │   └── tapeout/             # TapeKit resolver & TapeSend TAP-10 helpers
│   ├── vite.config.ts           # base: './' static configuration
│   └── package.json
└── AGENTS.md                    # This file
```

---

## 6. Development Workflow Rules for Agents

- **Always verify before reporting done:** Run tests (`forge test -vvv`) and build commands (`npm run build` or `pnpm build`) to prove validity.
- **Do not bypass checks:** Never suppress TypeScript errors or skip failing tests.
- **Cross-link references:** Reference files using standard markdown links (e.g. `[AjoCircle.sol](file:///contracts/src/AjoCircle.sol)`).
- **Refer to skill:** When performing TapeOut or X Layer specific tasks, load and follow [SKILL.md](file:///.agents/skills/tapeout-xlayer/SKILL.md).
