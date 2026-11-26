<#
.SYNOPSIS
    Sauvegarde de la base Pharma 360 (pg_dump) et des pieces jointes.

.DESCRIPTION
    Cree dans <projet>\backups :
      - pharma360_AAAAMMJJ_HHMMSS.dump   (format personnalise, restauration pg_restore)
      - pharma360_uploads_AAAAMMJJ_HHMMSS.zip (optionnel)

    Purge automatique des sauvegardes plus anciennes que -KeepDays.

.EXEMPLE
    .\backup-pharma360.ps1
    .\backup-pharma360.ps1 -KeepDays 60
    .\backup-pharma360.ps1 -SkipUploads

.NOTES
    Restauration :
      $env:PGPASSWORD = "<mot de passe>"
      & "C:\Program Files\PostgreSQL\15\bin\pg_restore.exe" -h 127.0.0.1 -p 5432 -U pharma_admin `
          -d pharma360_prod --clean --if-exists --no-owner backups\pharma360_....dump
#>
[CmdletBinding()]
param(
    [string]$RepoRoot,
    [string]$BackupDir,
    [int]$KeepDays = 30,
    [switch]$SkipUploads
)

$ErrorActionPreference = "Stop"

function Write-Step  { param([string]$Text) Write-Host ""; Write-Host "==> $Text" -ForegroundColor Cyan }
function Write-Ok    { param([string]$Text) Write-Host "    [OK] $Text" -ForegroundColor Green }
function Write-Warn2 { param([string]$Text) Write-Host "    [!] $Text" -ForegroundColor Yellow }
function Write-Err2  { param([string]$Text) Write-Host "    [X] $Text" -ForegroundColor Red }

if (-not $RepoRoot -or $RepoRoot.Trim() -eq "") {
    $RepoRoot = (Resolve-Path (Join-Path $PSScriptRoot "..\..")).Path
}
$RepoRoot = (Resolve-Path $RepoRoot).Path
if (-not $BackupDir) { $BackupDir = Join-Path $RepoRoot "backups" }
New-Item -ItemType Directory -Force -Path $BackupDir | Out-Null

function Get-EnvValue {
    param([string]$Path, [string]$Key)
    if (-not (Test-Path $Path)) { return $null }
    foreach ($line in (Get-Content $Path)) {
        if ($line -match "^\s*$([regex]::Escape($Key))\s*=\s*(.*)$") {
            return $Matches[1].Trim()
        }
    }
    return $null
}

$envPath = Join-Path $RepoRoot ".env"
if (-not (Test-Path $envPath)) {
    Write-Err2 ("Fichier .env introuvable : " + $envPath)
    exit 1
}

try {
    $DbHost = Get-EnvValue -Path $envPath -Key "POSTGRES_HOST"
    $DbPort = Get-EnvValue -Path $envPath -Key "POSTGRES_PORT"
    $DbName = Get-EnvValue -Path $envPath -Key "POSTGRES_DB"
    $DbUser = Get-EnvValue -Path $envPath -Key "POSTGRES_USER"
    $DbPassword = Get-EnvValue -Path $envPath -Key "POSTGRES_PASSWORD"
} catch {
    Write-Err2 "Impossible de lire .env : droits restreints (SYSTEM/Administrateurs)."
    Write-Err2 "Relancez ce script dans une console PowerShell administrateur."
    exit 1
}

if (-not $DbHost) { $DbHost = "127.0.0.1" }
if (-not $DbPort) { $DbPort = "5432" }

$pgDump = $null
$candidates = @(
    "C:\Program Files\PostgreSQL\18\bin\pg_dump.exe",
    "C:\Program Files\PostgreSQL\17\bin\pg_dump.exe",
    "C:\Program Files\PostgreSQL\16\bin\pg_dump.exe",
    "C:\Program Files\PostgreSQL\15\bin\pg_dump.exe",
    "C:\Program Files\PostgreSQL\14\bin\pg_dump.exe"
)
$cmd = Get-Command pg_dump.exe -ErrorAction SilentlyContinue
if ($cmd) {
    $pgDump = $cmd.Source
} else {
    foreach ($candidate in $candidates) {
        if (Test-Path $candidate) { $pgDump = $candidate; break }
    }
}
if (-not $pgDump) {
    Write-Err2 "pg_dump.exe introuvable. Installez PostgreSQL ou ajoutez son dossier bin au PATH."
    exit 1
}

$stamp = Get-Date -Format "yyyyMMdd_HHmmss"
$dumpPath = Join-Path $BackupDir ("pharma360_" + $stamp + ".dump")

Write-Step "Sauvegarde de la base $DbName"
$env:PGPASSWORD = $DbPassword
$previous = $ErrorActionPreference
$ErrorActionPreference = "Continue"
& $pgDump -h $DbHost -p $DbPort -U $DbUser -Fc -f $dumpPath $DbName
$code = $LASTEXITCODE
$ErrorActionPreference = $previous
$env:PGPASSWORD = $null

if ($code -ne 0 -or -not (Test-Path $dumpPath)) {
    Write-Err2 "Echec du pg_dump (code $code)."
    exit 1
}
$sizeMb = [math]::Round((Get-Item $dumpPath).Length / 1MB, 2)
Write-Ok ("base sauvegardee : " + $dumpPath + " (" + $sizeMb + " Mo)")

if (-not $SkipUploads) {
    $uploadsDir = Join-Path $RepoRoot "uploads"
    $hasFiles = $false
    if (Test-Path $uploadsDir) {
        $hasFiles = (Get-ChildItem $uploadsDir -Recurse -File -ErrorAction SilentlyContinue | Measure-Object).Count -gt 0
    }
    if ($hasFiles) {
        $zipPath = Join-Path $BackupDir ("pharma360_uploads_" + $stamp + ".zip")
        Write-Step "Archivage des pieces jointes"
        try {
            Compress-Archive -Path (Join-Path $uploadsDir "*") -DestinationPath $zipPath -CompressionLevel Optimal -Force
            $zipMb = [math]::Round((Get-Item $zipPath).Length / 1MB, 2)
            Write-Ok ("pieces jointes archivees : " + $zipPath + " (" + $zipMb + " Mo)")
        } catch {
            Write-Warn2 ("archivage des pieces jointes impossible : " + $_.Exception.Message)
        }
    } else {
        Write-Warn2 "aucune piece jointe a archiver"
    }
}

Write-Step ("Purge des sauvegardes de plus de " + $KeepDays + " jours")
$limit = (Get-Date).AddDays(-$KeepDays)
$old = Get-ChildItem -Path $BackupDir -File -ErrorAction SilentlyContinue |
    Where-Object { $_.Name -like "pharma360_*" -and $_.LastWriteTime -lt $limit }
if ($old) {
    foreach ($file in $old) {
        Remove-Item $file.FullName -Force
        Write-Ok ("supprime : " + $file.Name)
    }
} else {
    Write-Ok "aucune sauvegarde obsolete"
}

Write-Host ""
Write-Host ("Sauvegarde terminee : " + $dumpPath) -ForegroundColor Green
