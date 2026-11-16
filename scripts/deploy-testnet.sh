#!/usr/bin/env bash
set -euo pipefail

echo "=========================================================="
echo "  AjoChain — Deploying to X Layer Testnet (Chain ID 1952)"
echo "=========================================================="

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ROOT_DIR="$(cd "$SCRIPT_DIR/.." && pwd)"

# 1. Load Environment Variables
if [ -f "$ROOT_DIR/.env" ]; then
    echo "Loading .env configuration..."
    export $(grep -v '^#' "$ROOT_DIR/.env" | xargs -d '\n')
else
    echo "Error: .env file not found. Copy .env.example to .env and set PRIVATE_KEY."
    exit 1
fi

if [ -z "${PRIVATE_KEY:-}" ]; then
    echo "Error: PRIVATE_KEY is not set in .env."
    exit 1
fi

if [[ ! "$PRIVATE_KEY" =~ ^0x ]]; then
    PRIVATE_KEY="0x$PRIVATE_KEY"
fi

RPC_URL="${XLAYER_TESTNET_RPC:-https://testrpc.xlayer.tech}"
CHAIN_ID=1952

echo "Target RPC: $RPC_URL (Chain ID: $CHAIN_ID)"

# 2. Run Foundry Deployment Script
echo "Executing DeployXLayer.s.sol with forge script..."
cd "$ROOT_DIR/contracts"

forge script script/DeployXLayer.s.sol:DeployXLayer \
    --rpc-url "$RPC_URL" \
    --chain-id "$CHAIN_ID" \
    --broadcast \
    --skip-simulation \
    -vvv

# 3. Verify deployments.json
DEPLOYMENTS_FILE="$ROOT_DIR/frontend/src/config/deployments.json"
if [ ! -f "$DEPLOYMENTS_FILE" ]; then
    echo "Error: deployments.json was not generated at $DEPLOYMENTS_FILE"
    exit 1
fi

echo "Deployments successfully recorded:"
cat "$DEPLOYMENTS_FILE"

# 4. Rebuild DeWEB Frontend
echo ""
echo "Rebuilding DeWEB-ready frontend with updated contract addresses..."
cd "$ROOT_DIR/frontend"
npm run build

echo ""
echo "=========================================================="
echo "  X Layer Testnet Deployment & Frontend Build Complete!  "
echo "=========================================================="
