# Deploy to X Layer Testnet (PowerShell)
$ErrorActionPreference = "Stop"

Write-Host "==========================================================" -ForegroundColor Cyan
Write-Host "  AjoChain — Deploying to X Layer Testnet (Chain ID 1952)" -ForegroundColor Cyan
Write-Host "==========================================================" -ForegroundColor Cyan

$env:PATH = "$env:USERPROFILE\.foundry\bin;$env:PATH"
$rootDir = Split-Path -Parent $PSScriptRoot

if (-not (Test-Path "$rootDir\.env")) {
    Write-Error ".env file not found at $rootDir\.env"
}

$envLines = Get-Content "$rootDir\.env"
$pkLine = ($envLines | Where-Object { $_ -match "^PRIVATE_KEY=(.+)$" }) -replace "^PRIVATE_KEY=", ""
$pk = $pkLine.Trim()
if (-not $pk.StartsWith("0x")) { $pk = "0x$pk" }
$env:PRIVATE_KEY = $pk

$rpcUrl = "https://testrpc.xlayer.tech"
$chainId = 1952

Write-Host "Target RPC: $rpcUrl (Chain ID: $chainId)" -ForegroundColor Yellow

Set-Location "$rootDir\contracts"
Write-Host "Executing DeployXLayer.s.sol with forge script..." -ForegroundColor Yellow

forge script script/DeployXLayer.s.sol:DeployXLayer `
    --rpc-url $rpcUrl `
    --chain-id $chainId `
    --broadcast `
    --skip-simulation `
    -vvv

$deploymentsFile = "$rootDir\frontend\src\config\deployments.json"
if (-not (Test-Path $deploymentsFile)) {
    Write-Error "deployments.json not generated!"
}

Write-Host "`nDeployments successfully recorded:" -ForegroundColor Green
Get-Content $deploymentsFile

Write-Host "`nRebuilding DeWEB-ready frontend..." -ForegroundColor Yellow
Set-Location "$rootDir\frontend"
npm run build

Write-Host "`n==========================================================" -ForegroundColor Cyan
Write-Host "  X Layer Testnet Deployment & Frontend Build Complete!  " -ForegroundColor Cyan
Write-Host "==========================================================" -ForegroundColor Cyan
