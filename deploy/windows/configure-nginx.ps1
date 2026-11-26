<#
.SYNOPSIS
    Regenere la configuration nginx de Pharma 360 (Windows natif) puis la teste.

.DESCRIPTION
    Utile pour changer de port HTTP (ex. 80 -> 8080 si un autre logiciel occupe
    le port 80) ou apres modification du modele nginx.pharma360.conf.

    Le script :
      1. rend le modele deploy\windows\nginx.pharma360.conf
      2. sauvegarde la configuration actuelle
      3. ecrit tools\nginx\conf\nginx.conf
      4. teste la configuration (nginx -t)
      5. recharge le service s'il tourne

.EXEMPLE
    powershell -ExecutionPolicy Bypass -File .\configure-nginx.ps1 -HttpPort 8080
#>
[CmdletBinding()]
param(
    [string]$RepoRoot,
    [int]$HttpPort = 80
)

$ErrorActionPreference = "Stop"

function Write-Step  { param([string]$Text) Write-Host ""; Write-Host "==> $Text" -ForegroundColor Cyan }
function Write-Ok    { param([string]$Text) Write-Host "    [OK] $Text" -ForegroundColor Green }
function Write-Err2  { param([string]$Text) Write-Host "    [X] $Text" -ForegroundColor Red }

function Fail {
    param([string]$Text)
    Write-Err2 $Text
    exit 1
}

if (-not $RepoRoot -or $RepoRoot.Trim() -eq "") {
    $RepoRoot = (Resolve-Path (Join-Path $PSScriptRoot "..\..")).Path
}
$RepoRoot = (Resolve-Path $RepoRoot).Path
$RootFwd = $RepoRoot.Replace("\", "/")

$nginxDir = Join-Path $RepoRoot "tools\nginx"
$nginxExe = Join-Path $nginxDir "nginx.exe"
$template = Join-Path $PSScriptRoot "nginx.pharma360.conf"

if (-not (Test-Path $nginxExe)) { Fail ("nginx introuvable : " + $nginxExe + " (lancez install-pharma360.ps1).") }
if (-not (Test-Path $template)) { Fail ("Modele introuvable : " + $template) }

Write-Step "Generation de la configuration nginx (port $HttpPort)"
$rendered = (Get-Content $template -Raw).Replace("__PHARMA_ROOT__", $RootFwd).Replace("__HTTP_PORT__", "$HttpPort")

$confDir = Join-Path $nginxDir "conf"
New-Item -ItemType Directory -Force -Path $confDir | Out-Null
$targetConf = Join-Path $confDir "nginx.conf"

if (Test-Path $targetConf) {
    $backup = Join-Path $confDir ("nginx.conf.backup_" + (Get-Date -Format "yyyyMMdd_HHmmss"))
    Copy-Item $targetConf $backup
    Write-Ok ("sauvegarde : " + $backup)
}

$utf8NoBom = New-Object System.Text.UTF8Encoding($false)
[System.IO.File]::WriteAllText($targetConf, $rendered, $utf8NoBom)
Write-Ok ("configuration ecrite : " + $targetConf)

foreach ($sub in @("logs", "temp\client_body", "temp\proxy", "temp\fastcgi", "temp\uwsgi", "temp\scgi", "temp\cache")) {
    New-Item -ItemType Directory -Force -Path (Join-Path $nginxDir $sub) | Out-Null
}

Write-Step "Test de la configuration"
Push-Location $nginxDir
try {
    & $nginxExe -t -c conf/nginx.conf
    if ($LASTEXITCODE -ne 0) { Fail "Configuration invalide : fichier precedent conserve." }
} finally {
    Pop-Location
}
Write-Ok "configuration valide"

$service = Get-Service -Name "Pharma360Nginx" -ErrorAction SilentlyContinue
if ($service -and $service.Status -eq "Running") {
    Write-Step "Rechargement du service nginx"
    Push-Location $nginxDir
    try {
        & $nginxExe -c conf/nginx.conf -s reload
        if ($LASTEXITCODE -ne 0) { Fail "Rechargement refuse (service redemarre necessaire)." }
    } finally {
        Pop-Location
    }
    Write-Ok "nginx recharge"
} else {
    Write-Step "Service nginx non demarre"
    Write-Host "    Demarrez-le avec : .\deploy\windows\services-pharma360.ps1 -Action start"
}

Write-Host ""
Write-Host ("Application : http://localhost" + $(if ($HttpPort -ne 80) { ":" + $HttpPort } else { "" })) -ForegroundColor Cyan
