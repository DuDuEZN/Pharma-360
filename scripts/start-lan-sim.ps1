# start-lan-sim.ps1
# Simulation LAN : coexistence + plusieurs postes de travail
# - Lance un mock "logiciel existant" sur le port 8090 (simule un autre service)
# - Ouvre 3 fenetres "poste de travail" vers Pharma 360 (http://localhost)
# - Ouvre 1 fenetre vers le logiciel existant (http://localhost:8090)
param(
    [string]$PharmaUrl = "http://localhost",
    [int]$OtherAppPort = 8090
)

$ErrorActionPreference = "Stop"

Write-Host "=== Simulation LAN Pharma 360 ===" -ForegroundColor Cyan

# 1. Verifier que Pharma tourne
try {
    $r = Invoke-WebRequest -Uri "$PharmaUrl/api/health" -UseBasicParsing -TimeoutSec 5
    Write-Host "[OK] Pharma 360 repond sur $PharmaUrl ($($r.StatusCode))" -ForegroundColor Green
} catch {
    Write-Host "[ERREUR] Pharma 360 ne repond pas sur $PharmaUrl. Demarrez la stack d'abord." -ForegroundColor Red
    exit 1
}

# 2. Lancer le mock "logiciel existant" sur un port libre
$existing = docker ps --filter "name=otherapp-sim" --format "{{.Names}}" 2>$null
if (-not $existing) {
    Write-Host "Demarrage du mock 'logiciel existant' sur le port $OtherAppPort..." -ForegroundColor Yellow
    docker run -d --name otherapp-sim -p "${OtherAppPort}:80" `
        -v "${PWD}\sim\otherapp:/usr/share/nginx/html:ro" nginx:alpine | Out-Null
    Start-Sleep -Seconds 3
    Write-Host "[OK] Mock logiciel existant demarre (http://localhost:$OtherAppPort)" -ForegroundColor Green
} else {
    Write-Host "[INFO] Mock 'logiciel existant' deja en cours." -ForegroundColor Gray
}

# 3. Ouvrir les postes de travail (3 fenetres Chrome isolees)
$chrome = "C:\Program Files\Google\Chrome\Application\chrome.exe"
if (-not (Test-Path $chrome)) { $chrome = "C:\Program Files (x86)\Google\Chrome\Application\chrome.exe" }

$profiles = @("PosteCaisse1","PosteCaisse2","PosteStock")
foreach ($p in $profiles) {
    $profileDir = Join-Path $env:TEMP "pharma-sim\$p"
    New-Item -ItemType Directory -Force -Path $profileDir | Out-Null
    if (Test-Path $chrome) {
        Start-Process $chrome "--user-data-dir=`"$profileDir`" --new-window $PharmaUrl"
    } else {
        Start-Process $PharmaUrl
    }
    Start-Sleep -Milliseconds 800
}

# 4. Ouvrir le logiciel existant
Start-Process "http://localhost:$OtherAppPort"

Write-Host ""
Write-Host "=== Simulation lancee ===" -ForegroundColor Cyan
Write-Host "Postes Pharma 360 : 3 fenetres Chrome isolees -> $PharmaUrl" -ForegroundColor Green
Write-Host "Logiciel existant : http://localhost:$OtherAppPort" -ForegroundColor Green
Write-Host ""
Write-Host "Pour arreter la simulation : .\scripts\stop-lan-sim.ps1" -ForegroundColor Yellow
