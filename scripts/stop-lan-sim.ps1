# stop-lan-sim.ps1
param()
$ErrorActionPreference = "SilentlyContinue"
Write-Host "Arret de la simulation LAN..." -ForegroundColor Yellow
docker rm -f otherapp-sim 2>$null | Out-Null
Remove-Item -Recurse -Force (Join-Path $env:TEMP "pharma-sim") 2>$null
Write-Host "[OK] Simulation arretee." -ForegroundColor Green
