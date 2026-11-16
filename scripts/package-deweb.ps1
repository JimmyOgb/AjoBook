# TapeOut DeWEB Packaging Script (PowerShell)
$ErrorActionPreference = "Stop"

Write-Host "==========================================================" -ForegroundColor Cyan
Write-Host "  AjoChain — TapeOut DeWEB Packaging & Manifest Generator  " -ForegroundColor Cyan
Write-Host "==========================================================" -ForegroundColor Cyan

$rootDir = Split-Path -Parent $PSScriptRoot
$distDir = Join-Path $rootDir "frontend\dist"
$circuitFile = Join-Path $rootDir "circuit\ajo_payout_gate.json"
$outputZip = Join-Path $rootDir "ajochain-deweb-bundle.zip"
$manifestFile = Join-Path $distDir "deweb-manifest.json"

if (-not (Test-Path $distDir)) {
    Write-Error "frontend/dist does not exist. Run 'npm run build' inside frontend first."
}

Write-Host "1. Generating SHA-256 Integrity Manifest for DeWEB Container..." -ForegroundColor Yellow

$files = Get-ChildItem -Path $distDir -Recurse -File | Where-Object { $_.Name -ne "deweb-manifest.json" }
$manifestList = @()

foreach ($file in $files) {
    $sha256 = (Get-FileHash -Path $file.FullName -Algorithm SHA256).Hash.ToLower()
    $relPath = $file.FullName.Substring($distDir.Length + 1).Replace("\", "/")
    $manifestList += [PSCustomObject]@{
        path = $relPath
        size = $file.Length
        sha256 = "0x$sha256"
    }
}

$manifest = [PSCustomObject]@{
    standard = "TAPEOUT-DEWEB-MANIFEST-V1"
    network = "X Layer (196 / 1952)"
    generatedAt = (Get-Date).ToUniversalTime().ToString("yyyy-MM-ddTHH:mm:ssZ")
    entrypoint = "index.html"
    fileCount = $manifestList.Count
    files = $manifestList
}

$manifest | ConvertTo-Json -Depth 5 | Out-File -FilePath $manifestFile -Encoding utf8
Write-Host "Generated deweb-manifest.json with $($manifestList.Count) verified files." -ForegroundColor Green

Write-Host "`n2. Packaging Static DeWEB Bundle into $outputZip..." -ForegroundColor Yellow
if (Test-Path $outputZip) { Remove-Item $outputZip -Force }
Compress-Archive -Path "$distDir\*" -DestinationPath $outputZip -Force
Write-Host "Bundle archive created: $outputZip ($((Get-Item $outputZip).Length) bytes)" -ForegroundColor Green

Write-Host "`n==========================================================" -ForegroundColor Cyan
Write-Host "  TapeOut Protocol Registration Instructions              " -ForegroundColor Cyan
Write-Host "==========================================================" -ForegroundColor Cyan
Write-Host "Step A: Register AjoPayoutGate Circuit Netlist on X Layer"
Write-Host "  tapecode circuit register --netlist circuit/ajo_payout_gate.json --network xlayer-mainnet --rpc https://rpc.xlayer.tech"
Write-Host "`nStep B: Mint Circuit NFT & Deploy ERC-6551 Circuit Container"
Write-Host "  tapecode container create --circuit-id 0x89c7d413eaf725cf920a6122d64a098862f6b3b55239a5ecbcda6d6a8b1a3299 --name '#4012.lagos.arm.tape' --network xlayer-mainnet"
Write-Host "`nStep C: Deploy DeWEB Bundle to Container Storage Chunks"
Write-Host "  tapecode deweb deploy --container '#4012.lagos.arm.tape' --dist-dir frontend/dist --manifest frontend/dist/deweb-manifest.json --network xlayer-mainnet"
Write-Host "`nStep D: Verify Container via TapeKit (Dual RPC)"
Write-Host "  Resolves at: #4012.lagos.arm.tape (SHA-256 byte cross-check on node 1 & node 2)"
Write-Host "==========================================================" -ForegroundColor Cyan
