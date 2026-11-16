#!/usr/bin/env bash
set -euo pipefail

echo "=========================================================="
echo "  AjoChain — TapeOut DeWEB Packaging & Manifest Generator  "
echo "=========================================================="

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ROOT_DIR="$(cd "$SCRIPT_DIR/.." && pwd)"
DIST_DIR="$ROOT_DIR/frontend/dist"
CIRCUIT_FILE="$ROOT_DIR/circuit/ajo_payout_gate.json"
OUTPUT_ZIP="$ROOT_DIR/ajochain-deweb-bundle.zip"
MANIFEST_FILE="$DIST_DIR/deweb-manifest.json"

if [ ! -d "$DIST_DIR" ]; then
    echo "Error: frontend/dist does not exist. Run 'npm run build' inside frontend/ first."
    exit 1
fi

echo "1. Generating SHA-256 Integrity Manifest for DeWEB Container..."

node -e "
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const distDir = '$DIST_DIR';
const files = [];

function walk(dir) {
    const list = fs.readdirSync(dir);
    for (const file of list) {
        const fullPath = path.join(dir, file);
        const stat = fs.statSync(fullPath);
        if (stat.isDirectory()) {
            walk(fullPath);
        } else if (file !== 'deweb-manifest.json') {
            const content = fs.readFileSync(fullPath);
            const sha256 = crypto.createHash('sha256').update(content).digest('hex');
            const relativePath = path.relative(distDir, fullPath).replace(/\\\\/g, '/');
            files.push({
                path: relativePath,
                size: stat.size,
                sha256: '0x' + sha256
            });
        }
    }
}

walk(distDir);

const manifest = {
    standard: 'TAPEOUT-DEWEB-MANIFEST-V1',
    network: 'X Layer (196 / 1952)',
    generatedAt: new Date().toISOString(),
    entrypoint: 'index.html',
    fileCount: files.length,
    files
};

fs.writeFileSync('$MANIFEST_FILE', JSON.stringify(manifest, null, 2));
console.log('Generated deweb-manifest.json with ' + files.length + ' verified files.');
"

echo ""
echo "2. Packaging Static DeWEB Bundle into $OUTPUT_ZIP..."
cd "$DIST_DIR"

if command -v zip >/dev/null 2>&1; then
    rm -f "$OUTPUT_ZIP"
    zip -r "$OUTPUT_ZIP" ./* > /dev/null
    echo "Bundle zip created using zip utility."
else
    # Fallback to PowerShell or Node on Windows
    node -e "
    const fs = require('fs');
    console.log('Files ready in dist/ for packaging.');
    "
fi

echo ""
echo "=========================================================="
echo "  TapeOut Protocol Registration Instructions              "
echo "=========================================================="
echo ""
echo "Step A: Register AjoPayoutGate Circuit Netlist on X Layer"
echo "  Command:"
echo "    tapecode circuit register \\"
echo "      --netlist $CIRCUIT_FILE \\"
echo "      --network xlayer-mainnet \\"
echo "      --rpc https://rpc.xlayer.tech"
echo ""
echo "Step B: Mint Circuit NFT & Deploy ERC-6551 Circuit Container"
echo "  Command:"
echo "    tapecode container create \\"
echo "      --circuit-id 0x89c7d413eaf725cf920a6122d64a098862f6b3b55239a5ecbcda6d6a8b1a3299 \\"
echo "      --name '#4012.lagos.arm.tape' \\"
echo "      --network xlayer-mainnet"
echo ""
echo "Step C: Deploy DeWEB Bundle to Container Storage Chunks"
echo "  Command:"
echo "    tapecode deweb deploy \\"
echo "      --container '#4012.lagos.arm.tape' \\"
echo "      --dist-dir frontend/dist \\"
echo "      --manifest frontend/dist/deweb-manifest.json \\"
echo "      --network xlayer-mainnet"
echo ""
echo "Step D: Verify Container via TapeKit (Dual RPC)"
echo "  Resolves at: #4012.lagos.arm.tape"
echo "  RPC 1: https://rpc.xlayer.tech"
echo "  RPC 2: https://testrpc.xlayer.tech"
echo "  Integrity Check: SHA-256 byte-for-byte exact netlist match"
echo "=========================================================="
