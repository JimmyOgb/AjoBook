# AjoPayoutGate — TapeOut Digital Logic Circuit Specification

This directory contains the deterministic boolean netlist definition for the **AjoChain Payout & Slashing Gate** (`AjoPayoutGate`), compiled for execution and verification on **X Layer** via the **TapeOut Protocol** (`tapeout.net`).

---

## 1. Overview & TapeOut Netlist Architecture

TapeOut replaces opaque off-chain automation with deterministic on-chain digital logic:
1. **Primitive Logic Units (ERC-1155):** `NAND` logic gates and bistable `LATCH` memory gates.
2. **Circuit NFT (ERC-721):** Static immutable netlist registered on X Layer (`Chain ID: 196 / 1952`).
3. **Circuit Container (ERC-6551):** Token Bound Account linked to the circuit NFT, hosting DeWEB static assets and state verification proofs.

`ajo_payout_gate.json` defines the logic netlist that verifies payout eligibility and default slashing.

---

## 2. Gate Truth Tables

### Payout Release Logic
- Condition: `releasePayout = (allMembersPaid AND NOT roundAlreadyDisbursed AND roundActive)`
- Composed of elementary `NAND` gates:
  - `G0`: `NOT(roundAlreadyDisbursed)` = `NAND(roundAlreadyDisbursed, roundAlreadyDisbursed)`
  - `G1`: `NAND(allMembersPaid, notDisbursed)`
  - `G2`: `NOT(G1)` = `AND(allMembersPaid, notDisbursed)`
  - `G3`: `NAND(G2, roundActive)`
  - `G4`: `NOT(G3)` = `releasePayout`

### Defaulter Slashing Logic
- Condition: `slashRequired = (deadlinePassed AND NOT memberPaid AND roundActive)`
  - `G5`: `NOT(memberPaid)` = `NAND(memberPaid, memberPaid)`
  - `G6`: `NAND(deadlinePassed, memberUnpaid)`
  - `G7`: `NOT(G6)` = `AND(deadlinePassed, memberUnpaid)`
  - `G8`: `NAND(G7, roundActive)`
  - `G9`: `NOT(G8)` = `slashRequired`

### Bistable Memory (LATCH)
- `M0`: `LATCH` maintains the `disbursedStateLatch` bit once `releasePayout` goes HIGH until the next round resets the netlist state.

---

## 3. TapeOut Registration Flow (FabX / TapeCode)

To register and mint this circuit onto X Layer:
```bash
# 1. Compile and validate netlist
tapecode compile circuit/ajo_payout_gate.json --target xlayer-testnet

# 2. Mint Circuit NFT and deploy ERC-6551 Container
tapecode mint --network xlayer-testnet --name "AjoPayoutGate" --rpc https://testrpc.xlayer.tech

# 3. Bind Container address to AjoFactory deployments
```

---

## 4. Dual-RPC Byte Verification

TapeKit resolves this circuit and container files using SHA-256 byte-by-byte cross-validation across independent X Layer RPC endpoints:
- Node 1: `https://rpc.xlayer.tech`
- Node 2: Backup zkEVM Node / Local Validator
Checksum hash: `0x89c7d413eaf725cf920a6122d64a098862f6b3b55239a5ecbcda6d6a8b1a3299`
