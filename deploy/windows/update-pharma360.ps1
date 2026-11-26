<#
.SYNOPSIS
    Met a jour Pharma 360 (code, dependances Python, build frontend) et
    redemarre les services Windows.

.DESCRIPTION
    Etapes :
      1. git pull (si le projet est un depot git)
      2. pip install -r backend\requirements.txt et ia\requirements.txt
      3. npm ci + npm run build
      4. redemarrage des services (backend, IA, nginx)
      5. verification de sante

    Faire une sauvegarde AVANT : .\backup-pharma360.ps1

.EXEMPLE
    powershell -ExecutionPolicy Bypass -File .\update-pharma360.ps1
#>
[CmdletBinding()]
param(
    [string]$RepoRoot,
    [int]$HttpPort = 80,
    [switch]$SkipGit,
    [switch]$SkipDeps,
    [switch]$SkipFrontend
)

$ErrorActionPreference = "Stop"
$ProgressPreference = "SilentlyContinue"

function Write-Step  { param([string]$Text) Write-Host ""; Write-Host "==> $Text" -ForegroundColor Cyan }
function Write-Ok    { param([string]$Text) Write-Host "    [OK] $Text" -ForegroundColor Green }
function Write-Warn2 { param([string]$Text) Write-Host "    [!] $Text" -ForegroundColor Yellow }

function Fail {
    param([string]$Text)
    Write-Host ("    [X] " + $Text) -ForegroundColor Red
    Write-Host ""
    Write-Host "Mise a jour interrompue." -ForegroundColor Red
    exit 1
}

if (-not $RepoRoot -or $RepoRoot.Trim() -eq "") {
    $RepoRoot = (Resolve-Path (Join-Path $PSScriptRoot "..\..")).Path
}
$RepoRoot = (Resolve-Path $RepoRoot).Path

$VenvPy = Join-Path $RepoRoot ".venv\Scripts\python.exe"
$FrontendDir = Join-Path $RepoRoot "frontend"

if (-not (Test-Path $VenvPy)) { Fail "Environnement Python introuvable : lancez install-pharma360.ps1." }

Write-Host ""
Write-Host "=============================================================" -ForegroundColor Cyan
Write-Host "  PHARMA 360 - Mise a jour" -ForegroundColor Cyan
Write-Host "=============================================================" -ForegroundColor Cyan

if (-not $SkipGit) {
    Write-Step "1/5 Recuperation du code (git pull)"
    $git = Get-Command git.exe -ErrorAction SilentlyContinue
    if (-not $git) {
        Write-Warn2 "git introuvable : etape ignoree"
    } elseif (-not (Test-Path (Join-Path $RepoRoot ".git"))) {
        Write-Warn2 "pas de depot git dans ce dossier : etape ignoree"
    } else {
        Push-Location $RepoRoot
        try {
            & $git.Source pull --ff-only
            if ($LASTEXITCODE -ne 0) { Fail "git pull a echoue (conflit local ?)." }
        } finally {
            Pop-Location
        }
        Write-Ok "code a jour"
    }
}

if (-not $SkipDeps) {
    Write-Step "2/5 Dependances Python"
    & $VenvPy -m pip install -r (Join-Path $RepoRoot "backend\requirements.txt") --quiet
    if ($LASTEXITCODE -ne 0) { Fail "Echec de l'installation des dependances backend." }
    Write-Ok "backend"
    & $VenvPy -m pip install -r (Join-Path $RepoRoot "ia\requirements.txt") --quiet
    if ($LASTEXITCODE -ne 0) { Write-Warn2 "dependances IA incompletes" } else { Write-Ok "IA" }
}

if (-not $SkipFrontend) {
    Write-Step "3/5 Build du frontend"
    $npm = Get-Command npm.cmd -ErrorAction SilentlyContinue
    if (-not $npm) { Fail "npm introuvable : installez Node.js 20 LTS." }
    Push-Location $FrontendDir
    try {
        & $npm.Source ci --no-audit --no-fund
        if ($LASTEXITCODE -ne 0) { Fail "npm ci a echoue." }
        & $npm.Source run build
        if ($LASTEXITCODE -ne 0) { Fail "npm run build a echoue." }
    } finally {
        Pop-Location
    }
    if (-not (Test-Path (Join-Path $FrontendDir "dist\index.html"))) { Fail "frontend\dist\index.html absent apres le build." }
    Write-Ok "frontend compile"
}

Write-Step "4/5 Redemarrage des services"
$servicesScript = Join-Path $PSScriptRoot "services-pharma360.ps1"
& $servicesScript -Action restart -RepoRoot $RepoRoot -HttpPort $HttpPort
if ($LASTEXITCODE -ne 0) { Fail "redemarrage des services en echec." }

Write-Step "5/5 Verification"
Start-Sleep -Seconds 2
try {
    $r = Invoke-WebRequest -Uri ("http://127.0.0.1:" + $HttpPort + "/api/health") -UseBasicParsing -TimeoutSec 10
    if ($r.StatusCode -eq 200) {
        Write-Ok "application operationnelle"
    } else {
        Write-Warn2 ("API HTTP " + $r.StatusCode)
    }
} catch {
    Write-Warn2 "API injoignable : consultez logs\backend-service.err.log"
}

Write-Host ""
Write-Host "Mise a jour terminee." -ForegroundColor Green
