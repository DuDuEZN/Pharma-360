<#
.SYNOPSIS
    Gere les services Windows de Pharma 360 (backend FastAPI, service IA, nginx)
    via NSSM. Aucune dependance a Docker.

.DESCRIPTION
    Actions disponibles :
      install  cree (ou recree) les 3 services et les demarre
      start    demarre les services
      stop     arrete les services
      restart  redemarre backend + IA + nginx
      status   affiche l'etat des services et les sondes de sante
      reload   recharge la configuration nginx sans couper le service
      remove   arrete et supprime les services

.EXEMPLE
    powershell -ExecutionPolicy Bypass -File .\services-pharma360.ps1 -Action install
#>
[CmdletBinding()]
param(
    [ValidateSet("install", "start", "stop", "restart", "status", "reload", "remove")]
    [string]$Action = "status",

    # Racine du projet. Par defaut : deux niveaux au-dessus de ce script.
    [string]$RepoRoot,

    # Port HTTP servi par nginx (utilise pour les tests de sante).
    [int]$HttpPort = 80
)

$ErrorActionPreference = "Stop"

function Write-Step { param([string]$Text) Write-Host ""; Write-Host "==> $Text" -ForegroundColor Cyan }
function Write-Ok   { param([string]$Text) Write-Host "    [OK] $Text" -ForegroundColor Green }
function Write-Warn2 { param([string]$Text) Write-Host "    [!] $Text" -ForegroundColor Yellow }
function Write-Err2 { param([string]$Text) Write-Host "    [X] $Text" -ForegroundColor Red }

if (-not $RepoRoot -or $RepoRoot.Trim() -eq "") {
    $RepoRoot = (Resolve-Path (Join-Path $PSScriptRoot "..\..")).Path
}
$RepoRoot = (Resolve-Path $RepoRoot).Path

$ToolsDir  = Join-Path $RepoRoot "tools"
$NssmExe   = Join-Path $ToolsDir "nssm.exe"
$NginxDir  = Join-Path $ToolsDir "nginx"
$NginxExe  = Join-Path $NginxDir "nginx.exe"
$VenvPy    = Join-Path $RepoRoot ".venv\Scripts\python.exe"
$LogsDir   = Join-Path $RepoRoot "logs"

$ServiceNames = @("Pharma360Backend", "Pharma360IA", "Pharma360Nginx")

function Test-Elevated {
    $identity = [Security.Principal.WindowsIdentity]::GetCurrent()
    $principal = New-Object Security.Principal.WindowsPrincipal($identity)
    return $principal.IsInRole([Security.Principal.WindowsBuiltInRole]::Administrator)
}

function Get-Svc {
    param([string]$Name)
    return Get-Service -Name $Name -ErrorAction SilentlyContinue
}

function Invoke-Nssm {
    param([Parameter(ValueFromRemainingArguments = $true)][string[]]$NssmArgs)
    & $NssmExe @NssmArgs
    if ($LASTEXITCODE -ne 0) {
        throw ("nssm " + ($NssmArgs -join " ") + " a echoue (code " + $LASTEXITCODE + ")")
    }
}

function Wait-Url {
    param([string]$Url, [int]$Attempts = 30, [int]$DelaySeconds = 2)
    for ($i = 1; $i -le $Attempts; $i++) {
        try {
            $response = Invoke-WebRequest -Uri $Url -UseBasicParsing -TimeoutSec 3
            if ($response.StatusCode -ge 200 -and $response.StatusCode -lt 500) { return $true }
        } catch {
            # service pas encore pret
        }
        Start-Sleep -Seconds $DelaySeconds
    }
    return $false
}

function Assert-Admin {
    if (-not (Test-Elevated)) {
        Write-Err2 "Cette action doit etre lancee dans une console PowerShell 'Administrateur'."
        exit 1
    }
}

function Install-Services {
    Assert-Admin

    if (-not (Test-Path $NssmExe)) {
        Write-Err2 "NSSM introuvable : $NssmExe"
        Write-Warn2 "Lancez install-pharma360.ps1 (telechargement automatique) ou copiez nssm.exe dans tools\."
        exit 1
    }
    if (-not (Test-Path $VenvPy)) {
        Write-Err2 "Environnement Python introuvable : $VenvPy"
        Write-Warn2 "Lancez d'abord install-pharma360.ps1."
        exit 1
    }
    if (-not (Test-Path $NginxExe)) {
        Write-Err2 "nginx introuvable : $NginxExe"
        Write-Warn2 "Lancez d'abord install-pharma360.ps1."
        exit 1
    }
    if (-not (Test-Path $LogsDir)) {
        New-Item -ItemType Directory -Force -Path $LogsDir | Out-Null
    }

    Write-Step "Suppression des anciens services (si presents)"
    foreach ($name in $ServiceNames) {
        $svc = Get-Svc $name
        if ($svc) {
            if ($svc.Status -ne "Stopped") {
                Stop-Service -Name $name -Force -ErrorAction SilentlyContinue
                Start-Sleep -Seconds 2
            }
            Invoke-Nssm remove $name confirm | Out-Null
            Start-Sleep -Seconds 1
            Write-Ok "ancien service $name supprime"
        }
    }

    Write-Step "Creation du service backend (port 8000)"
    Invoke-Nssm install "Pharma360Backend" $VenvPy "-m uvicorn backend.main:app --host 127.0.0.1 --port 8000 --workers 4"
    Invoke-Nssm set "Pharma360Backend" AppDirectory $RepoRoot
    Invoke-Nssm set "Pharma360Backend" DisplayName "Pharma 360 - Backend"
    Invoke-Nssm set "Pharma360Backend" Description "API FastAPI Pharma 360 (port 8000)"
    Invoke-Nssm set "Pharma360Backend" Start SERVICE_AUTO_START
    Invoke-Nssm set "Pharma360Backend" AppStdout (Join-Path $LogsDir "backend-service.log")
    Invoke-Nssm set "Pharma360Backend" AppStderr (Join-Path $LogsDir "backend-service.err.log")
    Invoke-Nssm set "Pharma360Backend" AppRotateFiles 1
    Invoke-Nssm set "Pharma360Backend" AppRotateOnline 1
    Invoke-Nssm set "Pharma360Backend" AppRotateBytes 10485760
    Invoke-Nssm set "Pharma360Backend" AppStopMethodConsole 15000
    Invoke-Nssm set "Pharma360Backend" AppThrottle 2000
    Invoke-Nssm set "Pharma360Backend" AppExit Default Restart
    Write-Ok "service Pharma360Backend cree"

    Write-Step "Creation du service IA (port 8001)"
    Invoke-Nssm install "Pharma360IA" $VenvPy "-m uvicorn ia.main:app --host 127.0.0.1 --port 8001"
    Invoke-Nssm set "Pharma360IA" AppDirectory $RepoRoot
    Invoke-Nssm set "Pharma360IA" DisplayName "Pharma 360 - Service IA"
    Invoke-Nssm set "Pharma360IA" Description "OCR et analyses Pharma 360 (port 8001)"
    Invoke-Nssm set "Pharma360IA" Start SERVICE_AUTO_START
    Invoke-Nssm set "Pharma360IA" AppStdout (Join-Path $LogsDir "ia-service.log")
    Invoke-Nssm set "Pharma360IA" AppStderr (Join-Path $LogsDir "ia-service.err.log")
    Invoke-Nssm set "Pharma360IA" AppRotateFiles 1
    Invoke-Nssm set "Pharma360IA" AppRotateOnline 1
    Invoke-Nssm set "Pharma360IA" AppRotateBytes 10485760
    Invoke-Nssm set "Pharma360IA" AppStopMethodConsole 15000
    Invoke-Nssm set "Pharma360IA" AppThrottle 2000
    Invoke-Nssm set "Pharma360IA" AppExit Default Restart
    Write-Ok "service Pharma360IA cree"

    Write-Step "Creation du service nginx (port $HttpPort)"
    Invoke-Nssm install "Pharma360Nginx" $NginxExe '-c conf/nginx.conf -g "daemon off;"'
    Invoke-Nssm set "Pharma360Nginx" AppDirectory $NginxDir
    Invoke-Nssm set "Pharma360Nginx" DisplayName "Pharma 360 - nginx"
    Invoke-Nssm set "Pharma360Nginx" Description "Reverse proxy et fichiers statiques Pharma 360"
    Invoke-Nssm set "Pharma360Nginx" Start SERVICE_AUTO_START
    Invoke-Nssm set "Pharma360Nginx" AppStdout (Join-Path $LogsDir "nginx-service.log")
    Invoke-Nssm set "Pharma360Nginx" AppStderr (Join-Path $LogsDir "nginx-service.err.log")
    Invoke-Nssm set "Pharma360Nginx" AppRotateFiles 1
    Invoke-Nssm set "Pharma360Nginx" AppRotateOnline 1
    Invoke-Nssm set "Pharma360Nginx" AppRotateBytes 10485760
    Invoke-Nssm set "Pharma360Nginx" AppStopMethodConsole 10000
    Invoke-Nssm set "Pharma360Nginx" AppStopMethodWindow 5000
    Invoke-Nssm set "Pharma360Nginx" AppStopMethodThreads 5000
    Invoke-Nssm set "Pharma360Nginx" AppStopMethodTerm 5000
    Invoke-Nssm set "Pharma360Nginx" AppExit Default Restart
    Write-Ok "service Pharma360Nginx cree"

    Write-Step "Demarrage des services"
    foreach ($name in $ServiceNames) {
        try {
            Start-Service -Name $name
            Start-Sleep -Seconds 2
            $svc = Get-Svc $name
            if ($svc -and $svc.Status -eq "Running") {
                Write-Ok "$name demarre"
            } else {
                Write-Warn2 "$name n'a pas demarre : consultez logs\$name-service.err.log"
            }
        } catch {
            Write-Warn2 ("$name n'a pas demarre : " + $_.Exception.Message)
        }
    }

    Write-Step "Verification des sondes"
    $backendOk = Wait-Url -Url "http://127.0.0.1:8000/api/health" -Attempts 30
    if ($backendOk) { Write-Ok "backend http://127.0.0.1:8000/api/health" } else { Write-Warn2 "backend injoignable" }

    $iaOk = Wait-Url -Url "http://127.0.0.1:8001/api/health" -Attempts 15
    if ($iaOk) { Write-Ok "service IA http://127.0.0.1:8001/api/health" } else { Write-Warn2 "service IA injoignable (OCR indisponible, le reste fonctionne)" }

    $siteOk = Wait-Url -Url ("http://127.0.0.1:" + $HttpPort + "/health") -Attempts 15
    if ($siteOk) { Write-Ok ("nginx http://127.0.0.1:" + $HttpPort + "/") } else { Write-Warn2 "nginx injoignable" }
}

function Start-Services {
    Assert-Admin
    foreach ($name in $ServiceNames) {
        $svc = Get-Svc $name
        if (-not $svc) {
            Write-Warn2 "$name n'est pas installe (utilisez -Action install)"
            continue
        }
        if ($svc.Status -eq "Running") {
            Write-Ok "$name deja demarre"
            continue
        }
        try {
            Start-Service -Name $name
            Start-Sleep -Seconds 2
            Write-Ok "$name demarre"
        } catch {
            Write-Warn2 ("$name n'a pas demarre : " + $_.Exception.Message)
        }
    }
}

function Stop-Services {
    Assert-Admin
    $ordered = @("Pharma360Nginx", "Pharma360IA", "Pharma360Backend")
    foreach ($name in $ordered) {
        $svc = Get-Svc $name
        if (-not $svc) { continue }
        if ($svc.Status -eq "Stopped") {
            Write-Ok "$name deja arrete"
            continue
        }
        Stop-Service -Name $name -Force
        Start-Sleep -Seconds 1
        Write-Ok "$name arrete"
    }
}

function Restart-Services {
    Assert-Admin
    $ordered = @("Pharma360Nginx", "Pharma360IA", "Pharma360Backend")
    foreach ($name in $ordered) {
        $svc = Get-Svc $name
        if ($svc -and $svc.Status -ne "Stopped") {
            Stop-Service -Name $name -Force -ErrorAction SilentlyContinue
            Start-Sleep -Seconds 1
        }
    }
    Start-Sleep -Seconds 2
    Start-Services
    Write-Step "Verification des sondes"
    if (Wait-Url -Url "http://127.0.0.1:8000/api/health" -Attempts 30) {
        Write-Ok "backend operationnel"
    } else {
        Write-Warn2 "backend injoignable : verifiez logs\backend-service.err.log"
    }
}

function Show-Status {
    Write-Step "Services Pharma 360"
    $all = Get-Service -Name "Pharma360*" -ErrorAction SilentlyContinue
    if (-not $all) {
        Write-Warn2 "aucun service Pharma 360 installe"
    } else {
        $all | ForEach-Object {
            $line = "    " + $_.Name.PadRight(22) + $_.Status.ToString().PadRight(12) + $_.StartType
            if ($_.Status -eq "Running") { Write-Host $line -ForegroundColor Green }
            elseif ($_.Status -eq "Stopped") { Write-Host $line -ForegroundColor Red }
            else { Write-Host $line -ForegroundColor Yellow }
        }
    }

    Write-Step "Sondes de sante"
    $targets = @(
        @{ Name = "backend"; Url = "http://127.0.0.1:8000/api/health" },
        @{ Name = "IA";      Url = "http://127.0.0.1:8001/api/health" },
        @{ Name = "nginx";   Url = ("http://127.0.0.1:" + $HttpPort + "/health") }
    )
    foreach ($t in $targets) {
        try {
            $r = Invoke-WebRequest -Uri $t.Url -UseBasicParsing -TimeoutSec 5
            Write-Ok ($t.Name + " -> HTTP " + $r.StatusCode)
        } catch {
            Write-Warn2 ($t.Name + " -> injoignable (" + $t.Url + ")")
        }
    }

    Write-Step "Ports en ecoute (80/443/8000/8001/5432)"
    try {
        Get-NetTCPConnection -State Listen -ErrorAction Stop |
            Where-Object { $_.LocalPort -in 80, 443, 8000, 8001, 5432 } |
            Sort-Object LocalPort |
            ForEach-Object {
                $procName = "-"
                try { $procName = (Get-Process -Id $_.OwningProcess -ErrorAction Stop).ProcessName } catch {}
                Write-Host ("    port " + $_.LocalPort.ToString().PadRight(6) + " pid " + $_.OwningProcess.ToString().PadRight(8) + $procName)
            }
    } catch {
        Write-Warn2 "Get-NetTCPConnection indisponible sur ce systeme"
    }
}

function Reload-Nginx {
    Assert-Admin
    if (-not (Test-Path $NginxExe)) {
        Write-Err2 "nginx introuvable : $NginxExe"
        exit 1
    }
    Push-Location $NginxDir
    try {
        & $NginxExe -t -c conf/nginx.conf
        if ($LASTEXITCODE -ne 0) {
            Write-Err2 "configuration nginx invalide : rechargement annule"
            exit 1
        }
        & $NginxExe -c conf/nginx.conf -s reload
        if ($LASTEXITCODE -ne 0) {
            Write-Err2 "rechargement nginx refuse"
            exit 1
        }
        Write-Ok "configuration nginx rechargee"
    } finally {
        Pop-Location
    }
}

function Remove-Services {
    Assert-Admin
    if (-not (Test-Path $NssmExe)) {
        Write-Err2 "NSSM introuvable : $NssmExe"
        exit 1
    }
    Stop-Services
    foreach ($name in $ServiceNames) {
        $svc = Get-Svc $name
        if ($svc) {
            Invoke-Nssm remove $name confirm | Out-Null
            Write-Ok "$name supprime"
        }
    }
}

switch ($Action) {
    "install" { Install-Services }
    "start"   { Start-Services }
    "stop"    { Stop-Services }
    "restart" { Restart-Services }
    "status"  { Show-Status }
    "reload"  { Reload-Nginx }
    "remove"  { Remove-Services }
}
