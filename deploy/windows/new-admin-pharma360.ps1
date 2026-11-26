<#
.SYNOPSIS
    Cree le compte administrateur de Pharma 360 (installation native Windows).

.DESCRIPTION
    Le mot de passe est demande de facon masquee et n'est jamais ecrit sur le
    disque : il est transmis au processus Python par variable d'environnement,
    puis oublie.

.EXEMPLE
    powershell -ExecutionPolicy Bypass -File .\new-admin-pharma360.ps1

.EXEMPLE
    .\new-admin-pharma360.ps1 -Username admin -Email admin@pharma.local -FullName "Administrateur"
#>
[CmdletBinding()]
param(
    [string]$Username = "admin",
    [string]$Email = "admin@pharma360.local",
    [string]$FullName = "Administrateur",
    [string]$Password,
    [string]$RepoRoot
)

$ErrorActionPreference = "Stop"

function Write-Step  { param([string]$Text) Write-Host ""; Write-Host "==> $Text" -ForegroundColor Cyan }
function Write-Ok    { param([string]$Text) Write-Host "    [OK] $Text" -ForegroundColor Green }
function Write-Err2  { param([string]$Text) Write-Host "    [X] $Text" -ForegroundColor Red }

if (-not $RepoRoot -or $RepoRoot.Trim() -eq "") {
    $RepoRoot = (Resolve-Path (Join-Path $PSScriptRoot "..\..")).Path
}
$RepoRoot = (Resolve-Path $RepoRoot).Path
$VenvPy = Join-Path $RepoRoot ".venv\Scripts\python.exe"

if (-not (Test-Path $VenvPy)) {
    Write-Err2 ("Environnement Python introuvable : " + $VenvPy)
    Write-Err2 "Lancez d'abord install-pharma360.ps1."
    exit 1
}
if (-not (Test-Path (Join-Path $RepoRoot ".env"))) {
    Write-Err2 ("Fichier .env introuvable dans " + $RepoRoot)
    exit 1
}

if ($Password) {
    $plain = $Password
} else {
    $secure1 = Read-Host "Mot de passe (10 caracteres minimum)" -AsSecureString
    $secure2 = Read-Host "Confirmer le mot de passe" -AsSecureString

    $bstr1 = [Runtime.InteropServices.Marshal]::SecureStringToBSTR($secure1)
    $bstr2 = [Runtime.InteropServices.Marshal]::SecureStringToBSTR($secure2)
    try {
        $plain = [Runtime.InteropServices.Marshal]::PtrToStringBSTR($bstr1)
        $confirm = [Runtime.InteropServices.Marshal]::PtrToStringBSTR($bstr2)
    } finally {
        [Runtime.InteropServices.Marshal]::ZeroFreeBSTR($bstr1)
        [Runtime.InteropServices.Marshal]::ZeroFreeBSTR($bstr2)
    }
    if ($plain -ne $confirm) {
        Write-Err2 "Les deux mots de passe ne correspondent pas."
        exit 1
    }
}

if ($plain.Length -lt 10) {
    Write-Err2 "Mot de passe trop court (10 caracteres minimum)."
    exit 1
}

$pythonScript = @'
import asyncio
import os
import sys

from sqlalchemy import text

from backend.core.database import engine
from backend.core.security import PasswordUtils


async def main() -> int:
    username = os.environ["PHARMA_ADMIN_USER"]
    email = os.environ["PHARMA_ADMIN_EMAIL"]
    full_name = os.environ["PHARMA_ADMIN_NAME"]
    password = os.environ["PHARMA_ADMIN_PASSWORD"]

    async with engine.begin() as conn:
        existing = await conn.execute(
            text("SELECT id FROM users WHERE username = :u OR email = :e"),
            {"u": username, "e": email},
        )
        if existing.first():
            print("EXISTS")
            return 1
        await conn.execute(
            text(
                "INSERT INTO users (username, email, full_name, role, password_hash, is_active) "
                "VALUES (:u, :e, :n, 'admin', :h, true)"
            ),
            {
                "u": username,
                "e": email,
                "n": full_name,
                "h": PasswordUtils.hash_password(password),
            },
        )
    await engine.dispose()
    print("CREATED")
    return 0


sys.exit(asyncio.run(main()))
'@

$tempScript = Join-Path $env:TEMP ("pharma360_create_admin_" + [guid]::NewGuid().ToString("N") + ".py")
$utf8NoBom = New-Object System.Text.UTF8Encoding($false)
[System.IO.File]::WriteAllText($tempScript, $pythonScript, $utf8NoBom)

$env:PHARMA_ADMIN_USER = $Username
$env:PHARMA_ADMIN_EMAIL = $Email
$env:PHARMA_ADMIN_NAME = $FullName
$env:PHARMA_ADMIN_PASSWORD = $plain

Write-Step ("Creation du compte administrateur '" + $Username + "'")

Push-Location $RepoRoot
try {
    $output = & $VenvPy $tempScript 2>&1
    $code = $LASTEXITCODE
} finally {
    Pop-Location
    Remove-Item $tempScript -Force -ErrorAction SilentlyContinue
    Remove-Item Env:\PHARMA_ADMIN_PASSWORD -ErrorAction SilentlyContinue
    Remove-Item Env:\PHARMA_ADMIN_USER -ErrorAction SilentlyContinue
    Remove-Item Env:\PHARMA_ADMIN_EMAIL -ErrorAction SilentlyContinue
    Remove-Item Env:\PHARMA_ADMIN_NAME -ErrorAction SilentlyContinue
    $plain = $null
}

$text = (($output | ForEach-Object { "$_" }) -join "`n")
if ($code -eq 0 -and $text -match "CREATED") {
    Write-Ok ("compte '" + $Username + "' cree (role admin)")
    Write-Host ""
    Write-Host "  Connexion : http://localhost" -ForegroundColor Cyan
    Write-Host ("  Identifiant : " + $Username)
    Write-Host "  Changez ce mot de passe apres la premiere connexion."
} elseif ($text -match "EXISTS") {
    Write-Err2 "Un utilisateur avec ce nom ou cet email existe deja : rien n'a ete modifie."
    exit 1
} else {
    Write-Err2 "Echec de la creation du compte :"
    Write-Host $text
    exit 1
}
