<#
.SYNOPSIS
    Diagnostic de l'installation native Windows de Pharma 360.

.DESCRIPTION
    Affiche : versions des composants, etat des services, ports en ecoute,
    sondes de sante, espace disque, derniere sauvegarde et dernieres lignes
    des journaux d'erreur.

.EXEMPLE
    powershell -ExecutionPolicy Bypass -File .\diagnostic-pharma360.ps1
#>
[CmdletBinding()]
param(
    [string]$RepoRoot,
    [int]$HttpPort = 80
)

$ErrorActionPreference = "Continue"

function Write-Step { param([string]$Text) Write-Host ""; Write-Host "==> $Text" -ForegroundColor Cyan }
function Item {
    param([string]$Label, [string]$Value, [string]$Color = "Gray")
    $padded = $Label.PadRight(22)
    Write-Host ("    " + $padded + " " + $Value) -ForegroundColor $Color
}

if (-not $RepoRoot -or $RepoRoot.Trim() -eq "") {
    $RepoRoot = (Resolve-Path (Join-Path $PSScriptRoot "..\..")).Path
}
$RepoRoot = (Resolve-Path $RepoRoot).Path

Write-Host ""
Write-Host "=============================================================" -ForegroundColor Cyan
Write-Host "  PHARMA 360 - Diagnostic (Windows natif)" -ForegroundColor Cyan
Write-Host "=============================================================" -ForegroundColor Cyan
Item "Projet" $RepoRoot
Item "Date" (Get-Date -Format "yyyy-MM-dd HH:mm:ss")

Write-Step "Systeme"
Item "OS" ([System.Environment]::OSVersion.VersionString)
$os = Get-CimInstance Win32_OperatingSystem -ErrorAction SilentlyContinue
if ($os) {
    Item "Windows" ($os.Caption + " (build " + $os.BuildNumber + ")")
    Item "Memoire libre" ([math]::Round($os.FreePhysicalMemory / 1MB, 2).ToString() + " Go / " + [math]::Round($os.TotalVisibleMemorySize / 1MB, 2) + " Go")
}
$disk = Get-PSDrive -Name ($RepoRoot.Substring(0, 1)) -ErrorAction SilentlyContinue
if ($disk) {
    Item "Disque libre" ([math]::Round($disk.Free / 1GB, 1).ToString() + " Go")
}

Write-Step "Composants"
$python = Get-Command python.exe -ErrorAction SilentlyContinue
if ($python) {
    $v = & $python.Source -c "import sys;print('%d.%d.%d'%sys.version_info[:3])" 2>$null
    Item "Python" ($v + "  (" + $python.Source + ")")
} else {
    Item "Python" "absent" "Red"
}
$node = Get-Command node.exe -ErrorAction SilentlyContinue
if ($node) { Item "Node.js" ((& $node.Source --version) + "  (" + $node.Source + ")") } else { Item "Node.js" "absent (build uniquement)" "Yellow" }
$psql = Get-Command psql.exe -ErrorAction SilentlyContinue
if ($psql) { Item "psql" $psql.Source } else {
    $found = Get-ChildItem "C:\Program Files\PostgreSQL" -Directory -ErrorAction SilentlyContinue |
        ForEach-Object { Join-Path $_.FullName "bin\psql.exe" } | Where-Object { Test-Path $_ } | Select-Object -First 1
    if ($found) { Item "psql" $found } else { Item "psql" "absent" "Red" }
}
$nginx = Join-Path $RepoRoot "tools\nginx\nginx.exe"
if (Test-Path $nginx) { Item "nginx" $nginx } else { Item "nginx" "absent (tools\nginx)" "Red" }
$nssm = Join-Path $RepoRoot "tools\nssm.exe"
if (Test-Path $nssm) { Item "NSSM" $nssm } else { Item "NSSM" "absent (tools\nssm.exe)" "Yellow" }
$tess = "C:\Program Files\Tesseract-OCR\tesseract.exe"
if (Test-Path $tess) { Item "Tesseract OCR" $tess } else { Item "Tesseract OCR" "absent (OCR indisponible)" "Yellow" }
if (Test-Path (Join-Path $RepoRoot ".venv\Scripts\python.exe")) { Item "venv" (Join-Path $RepoRoot ".venv") } else { Item "venv" "absent" "Red" }
if (Test-Path (Join-Path $RepoRoot "frontend\dist\index.html")) {
    $built = (Get-Item (Join-Path $RepoRoot "frontend\dist\index.html")).LastWriteTime
    $builtText = $built.ToString("yyyy-MM-dd HH:mm")
    Item "build frontend" $builtText
} else {
    Item "build frontend" "absent" "Red"
}

Write-Step "Services Windows"
$services = Get-Service -Name "Pharma360*" -ErrorAction SilentlyContinue
if (-not $services) {
    Item "services" "aucun service Pharma 360 installe" "Yellow"
} else {
    foreach ($svc in $services) {
        $color = "Red"
        if ($svc.Status -eq "Running") { $color = "Green" }
        Item $svc.Name ($svc.Status.ToString() + " / " + $svc.StartType) $color
    }
}

Write-Step "Services PostgreSQL"
$pg = Get-Service -Name "postgresql*" -ErrorAction SilentlyContinue
if (-not $pg) { Item "postgresql" "aucun service detecte" "Red" }
else {
    foreach ($s in $pg) {
        $color = "Red"
        if ($s.Status -eq "Running") { $color = "Green" }
        Item $s.Name ($s.Status.ToString()) $color
    }
}

Write-Step "Ports en ecoute"
$ports = @(80, 443, 8000, 8001, 5432, $HttpPort) | Select-Object -Unique
foreach ($port in $ports) {
    $conn = Get-NetTCPConnection -State Listen -LocalPort $port -ErrorAction SilentlyContinue | Select-Object -First 1
    if ($conn) {
        $procName = "?"
        try { $procName = (Get-Process -Id $conn.OwningProcess -ErrorAction Stop).ProcessName } catch { }
        Item ("port " + $port) ("ecoute - pid " + $conn.OwningProcess + " (" + $procName + ")") "Green"
    } else {
        Item ("port " + $port) "libre" "DarkGray"
    }
}

Write-Step "Sondes HTTP"
$checks = @(
    @{ Name = "nginx /health"; Url = "http://127.0.0.1:" + $HttpPort + "/health" },
    @{ Name = "API /api/health"; Url = "http://127.0.0.1:" + $HttpPort + "/api/health" },
    @{ Name = "backend direct"; Url = "http://127.0.0.1:8000/api/health" },
    @{ Name = "IA directe"; Url = "http://127.0.0.1:8001/api/health" }
)
foreach ($check in $checks) {
    try {
        $r = Invoke-WebRequest -Uri $check.Url -UseBasicParsing -TimeoutSec 5
        Item $check.Name ("HTTP " + $r.StatusCode) "Green"
    } catch {
        Item $check.Name "injoignable" "Red"
    }
}

Write-Step "Sauvegardes"
$backups = Get-ChildItem (Join-Path $RepoRoot "backups") -Filter "pharma360_*.dump" -ErrorAction SilentlyContinue |
    Sort-Object LastWriteTime -Descending | Select-Object -First 3
if (-not $backups) {
    Item "sauvegardes" "aucune" "Yellow"
} else {
    foreach ($b in $backups) {
        Item $b.Name ([math]::Round($b.Length / 1MB, 2).ToString() + " Mo - " + $b.LastWriteTime.ToString("yyyy-MM-dd HH:mm"))
    }
}

Write-Step "Dernieres erreurs (logs)"
$logs = @(
    (Join-Path $RepoRoot "logs\backend-service.err.log"),
    (Join-Path $RepoRoot "logs\ia-service.err.log"),
    (Join-Path $RepoRoot "tools\nginx\logs\error.log")
)
foreach ($log in $logs) {
    Write-Host ("    --- " + $log)
    if (Test-Path $log) {
        Get-Content $log -Tail 8 -ErrorAction SilentlyContinue | ForEach-Object { Write-Host ("      " + $_) -ForegroundColor DarkGray }
    } else {
        Write-Host "      (absent)" -ForegroundColor DarkGray
    }
}

Write-Host ""
Write-Host "Diagnostic termine. Rapport a transmettre au support avec les journaux ci-dessus." -ForegroundColor Cyan
