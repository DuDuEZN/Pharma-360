<#
.SYNOPSIS
    Installation de Pharma 360 sur Windows 10/11 SANS Docker.

.DESCRIPTION
    Installe et configure l'application en natif :
      1. verification des prerequis (Python, Node.js, PostgreSQL, nginx, NSSM)
      2. creation des dossiers et de l'environnement Python (.venv)
      3. generation des secrets et des fichiers .env / .env.ia
      4. creation de la base PostgreSQL + schema (scripts\init-db.sql)
      5. build du frontend React (frontend\dist)
      6. configuration de nginx pour Windows
      7. creation des services Windows (backend, IA, nginx) via NSSM
      8. regle pare-feu + verification de sante

    A lancer en tant qu'Administrateur, depuis le dossier du projet :
      powershell -ExecutionPolicy Bypass -File .\deploy\windows\install-pharma360.ps1

.PARAMETER HttpPort
    Port HTTP servi par nginx (80 par defaut). Utiliser 8080 si un autre
    logiciel occupe deja le port 80 sur le serveur.

.PARAMETER PostgresAdminPassword
    Mot de passe du superutilisateur PostgreSQL (postgres). Si absent, il est
    demande de facon masquee. Utilise uniquement pour creer le role et la base.

.EXEMPLE
    .\install-pharma360.ps1 -HttpPort 8080

.EXEMPLE
    .\install-pharma360.ps1 -SkipServices -SkipDatabase
#>
[CmdletBinding()]
param(
    [int]$HttpPort = 80,
    [string]$DbHost = "127.0.0.1",
    [int]$DbPort = 5432,
    [string]$DbName = "pharma360_prod",
    [string]$DbUser = "pharma_admin",
    [string]$DbPassword,
    [string]$PostgresAdminUser = "postgres",
    [string]$PostgresAdminPassword,
    [switch]$SkipDatabase,
    [switch]$SkipFrontendBuild,
    [switch]$SkipServices,
    [switch]$RotateSecrets,
    [switch]$NoDownload
)

$ErrorActionPreference = "Stop"
$ProgressPreference = "SilentlyContinue"
try {
    [Net.ServicePointManager]::SecurityProtocol = [Net.SecurityProtocolType]::Tls12
} catch {
    # Windows ancien : on continue, le telechargement echouera proprement plus loin.
}

$script:PsqlExe = $null

function Write-Step  { param([string]$Text) Write-Host ""; Write-Host "==> $Text" -ForegroundColor Cyan }
function Write-Ok    { param([string]$Text) Write-Host "    [OK] $Text" -ForegroundColor Green }
function Write-Warn2 { param([string]$Text) Write-Host "    [!] $Text" -ForegroundColor Yellow }
function Write-Err2  { param([string]$Text) Write-Host "    [X] $Text" -ForegroundColor Red }

function Fail {
    param([string]$Text)
    Write-Err2 $Text
    Write-Host ""
    Write-Host "Installation interrompue." -ForegroundColor Red
    exit 1
}

function Test-Elevated {
    $identity = [Security.Principal.WindowsIdentity]::GetCurrent()
    $principal = New-Object Security.Principal.WindowsPrincipal($identity)
    return $principal.IsInRole([Security.Principal.WindowsBuiltInRole]::Administrator)
}

function New-Secret {
    param([int]$Length = 48)
    $chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-_"
    $bytes = New-Object byte[] $Length
    $rng = [System.Security.Cryptography.RandomNumberGenerator]::Create()
    $rng.GetBytes($bytes)
    $builder = New-Object System.Text.StringBuilder
    foreach ($b in $bytes) {
        [void]$builder.Append($chars[$b % $chars.Length])
    }
    return $builder.ToString()
}

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

function Write-EnvFile {
    param([string]$Path, [string[]]$Lines)
    $content = ($Lines -join "`r`n") + "`r`n"
    $utf8NoBom = New-Object System.Text.UTF8Encoding($false)
    [System.IO.File]::WriteAllText($Path, $content, $utf8NoBom)
}

function Resolve-Executable {
    param([string[]]$Candidates, [string]$CommandName)
    if ($CommandName) {
        $cmd = Get-Command $CommandName -ErrorAction SilentlyContinue
        if ($cmd) { return $cmd.Source }
    }
    foreach ($candidate in $Candidates) {
        if ($candidate -and (Test-Path $candidate)) { return $candidate }
    }
    return $null
}

function Invoke-Psql {
    param(
        [string]$User,
        [string]$Database,
        [string]$Password,
        [string[]]$Arguments
    )
    $argList = @("-h", $DbHost, "-p", "$DbPort", "-U", $User, "-d", $Database, "-v", "ON_ERROR_STOP=1") + $Arguments
    $env:PGPASSWORD = $Password
    $env:PGCLIENTENCODING = "UTF8"

    $previous = $ErrorActionPreference
    $ErrorActionPreference = "Continue"
    $raw = & $script:PsqlExe @argList 2>&1
    $code = $LASTEXITCODE
    $ErrorActionPreference = $previous

    $text = (($raw | ForEach-Object { "$_" }) -join "`n").Trim()
    return @{ Code = $code; Output = $text }
}

function Get-LocalIPv4 {
    $result = New-Object System.Collections.Generic.List[string]
    try {
        $addresses = Get-NetIPAddress -AddressFamily IPv4 -ErrorAction Stop
        foreach ($a in $addresses) {
            $ip = $a.IPAddress
            if ($ip -like "127.*" -or $ip -like "169.254.*") { continue }
            if (-not $result.Contains($ip)) { $result.Add($ip) }
        }
    } catch {
        try {
            $hostEntry = [System.Net.Dns]::GetHostAddresses([System.Net.Dns]::GetHostName())
            foreach ($a in $hostEntry) {
                if ($a.AddressFamily -ne [System.Net.Sockets.AddressFamily]::InterNetwork) { continue }
                if (-not $result.Contains($a.IPAddressToString)) { $result.Add($a.IPAddressToString) }
            }
        } catch { }
    }
    return $result
}

function Expand-ToolArchive {
    param(
        [string[]]$Urls,
        [string]$Destination,
        [string]$Label
    )
    if ($NoDownload) { return $false }
    $zip = Join-Path $env:TEMP ("pharma360_" + $Label + "_" + [guid]::NewGuid().ToString("N") + ".zip")
    $extract = Join-Path $env:TEMP ("pharma360_" + $Label + "_extract_" + [guid]::NewGuid().ToString("N"))
    foreach ($url in $Urls) {
        try {
            Write-Host ("    telechargement : " + $url)
            Invoke-WebRequest -Uri $url -OutFile $zip -UseBasicParsing -TimeoutSec 180
            New-Item -ItemType Directory -Force -Path $extract | Out-Null
            Expand-Archive -Path $zip -DestinationPath $extract -Force
            return $extract
        } catch {
            Write-Warn2 ("echec : " + $_.Exception.Message)
        } finally {
            if (Test-Path $zip) { Remove-Item $zip -Force -ErrorAction SilentlyContinue }
        }
    }
    return $false
}

# -----------------------------------------------------------------------------
# 0. Contexte
# -----------------------------------------------------------------------------
$RepoRoot = (Resolve-Path (Join-Path $PSScriptRoot "..\..")).Path
$RootFwd = $RepoRoot.Replace("\", "/")
$ToolsDir = Join-Path $RepoRoot "tools"
$LogsDir = Join-Path $RepoRoot "logs"
$BackupsDir = Join-Path $RepoRoot "backups"
$UploadsDir = Join-Path $RepoRoot "uploads"
$StaticDir = Join-Path $RepoRoot "static"
$FrontendDir = Join-Path $RepoRoot "frontend"
$VenvDir = Join-Path $RepoRoot ".venv"
$VenvPy = Join-Path $VenvDir "Scripts\python.exe"

Write-Host ""
Write-Host "=============================================================" -ForegroundColor Cyan
Write-Host "  PHARMA 360 - Installation native Windows (sans Docker)" -ForegroundColor Cyan
Write-Host "=============================================================" -ForegroundColor Cyan
Write-Host ("  Projet  : " + $RepoRoot)
Write-Host ("  HTTP    : port " + $HttpPort)
Write-Host ("  Base    : " + $DbUser + "@" + $DbHost + ":" + $DbPort + "/" + $DbName)

if (-not (Test-Path (Join-Path $RepoRoot "backend\main.py"))) {
    Fail ("Projet introuvable : " + (Join-Path $RepoRoot "backend\main.py") + ". Placez ce script dans <projet>\deploy\windows\.")
}
if ($DbUser -cnotmatch "^[a-z_][a-z0-9_]*$") { Fail "DbUser doit etre en minuscules (lettres, chiffres, underscore)." }
if ($DbName -cnotmatch "^[a-z_][a-z0-9_]*$") { Fail "DbName doit etre en minuscules (lettres, chiffres, underscore)." }

$isAdmin = Test-Elevated
if (-not $isAdmin) {
    Write-Warn2 "Console non administrateur : les services Windows et le pare-feu ne pourront pas etre installes."
}

# -----------------------------------------------------------------------------
# 1. Prerequis
# -----------------------------------------------------------------------------
Write-Step "1/9 Verification des prerequis"

$pythonExe = Resolve-Executable -CommandName "python" -Candidates @(
    "C:\Program Files\Python311\python.exe",
    "C:\Program Files\Python312\python.exe",
    "$env:LOCALAPPDATA\Programs\Python\Python311\python.exe"
)
if (-not $pythonExe) {
    Fail "Python introuvable. Installez Python 3.11+ (https://www.python.org/downloads/windows/) en cochant 'Add python.exe to PATH'."
}
$pyVersion = & $pythonExe -c "import sys;print('%d.%d' % sys.version_info[:2])"
if ($LASTEXITCODE -ne 0) { Fail "Python ne fonctionne pas correctement : $pythonExe" }
$pyParts = $pyVersion.Split(".")
if ([int]$pyParts[0] -lt 3 -or ([int]$pyParts[0] -eq 3 -and [int]$pyParts[1] -lt 11)) {
    Fail ("Python " + $pyVersion + " detecte : Python 3.11 ou superieur est requis.")
}
Write-Ok ("Python " + $pyVersion + " -> " + $pythonExe)

$npmExe = Resolve-Executable -CommandName "npm.cmd" -Candidates @("C:\Program Files\nodejs\npm.cmd")
if (-not $npmExe) {
    if ($SkipFrontendBuild) {
        Write-Warn2 "npm introuvable (build frontend ignore : frontend\dist doit deja exister)."
    } else {
        Fail "Node.js/npm introuvable. Installez Node.js 20 LTS (https://nodejs.org/) puis relancez."
    }
} else {
    $nodeVersion = & $npmExe --version
    Write-Ok ("npm " + $nodeVersion + " -> " + $npmExe)
}

if (-not $SkipDatabase) {
    $script:PsqlExe = Resolve-Executable -CommandName "psql" -Candidates @(
        "C:\Program Files\PostgreSQL\18\bin\psql.exe",
        "C:\Program Files\PostgreSQL\17\bin\psql.exe",
        "C:\Program Files\PostgreSQL\16\bin\psql.exe",
        "C:\Program Files\PostgreSQL\15\bin\psql.exe",
        "C:\Program Files\PostgreSQL\14\bin\psql.exe"
    )
    if (-not $script:PsqlExe) {
        Fail "PostgreSQL introuvable (psql.exe). Installez PostgreSQL 15+ : https://www.postgresql.org/download/windows/"
    }
    Write-Ok ("psql -> " + $script:PsqlExe)

    $pgService = Get-Service -Name "postgresql*" -ErrorAction SilentlyContinue | Select-Object -First 1
    if (-not $pgService) {
        Write-Warn2 "Aucun service PostgreSQL detecte. Verifiez que le serveur est demarre avant de continuer."
    } elseif ($pgService.Status -ne "Running") {
        Write-Warn2 ("Service " + $pgService.Name + " arrete : demarrage...")
        try { Start-Service -Name $pgService.Name } catch { Fail ("Impossible de demarrer " + $pgService.Name + " : " + $_.Exception.Message) }
        Write-Ok ("service " + $pgService.Name + " demarre")
    } else {
        Write-Ok ("service " + $pgService.Name + " en cours")
    }
}

# -----------------------------------------------------------------------------
# 2. Dossiers
# -----------------------------------------------------------------------------
Write-Step "2/9 Creation des dossiers"
$directories = @(
    $LogsDir, $BackupsDir, $UploadsDir, $StaticDir,
    (Join-Path $RepoRoot "ia\uploads"),
    (Join-Path $RepoRoot "ia\logs"),
    (Join-Path $RepoRoot "ia\models"),
    (Join-Path $ToolsDir "nginx\logs"),
    (Join-Path $ToolsDir "nginx\temp\client_body"),
    (Join-Path $ToolsDir "nginx\temp\proxy"),
    (Join-Path $ToolsDir "nginx\temp\fastcgi"),
    (Join-Path $ToolsDir "nginx\temp\uwsgi"),
    (Join-Path $ToolsDir "nginx\temp\scgi"),
    (Join-Path $ToolsDir "nginx\temp\cache")
)
foreach ($dir in $directories) {
    New-Item -ItemType Directory -Force -Path $dir | Out-Null
}
Write-Ok "dossiers logs, uploads, backups, tools prets"

# -----------------------------------------------------------------------------
# 3. Secrets et fichiers d'environnement
# -----------------------------------------------------------------------------
Write-Step "3/9 Configuration (.env et .env.ia)"

$envPath = Join-Path $RepoRoot ".env"
$envIaPath = Join-Path $RepoRoot ".env.ia"

$existingDbPassword = Get-EnvValue -Path $envPath -Key "POSTGRES_PASSWORD"
$existingAppSecret = Get-EnvValue -Path $envPath -Key "APP_SECRET_KEY"
$existingJwtSecret = Get-EnvValue -Path $envPath -Key "JWT_SECRET"

if ($RotateSecrets) {
    $appSecret = New-Secret 56
    $jwtSecret = New-Secret 56
    $DbPassword = New-Secret 40
    Write-Ok "nouveaux secrets generes"
} else {
    $appSecret = $existingAppSecret
    $jwtSecret = $existingJwtSecret
    if (-not $DbPassword) { $DbPassword = $existingDbPassword }
    if (-not $appSecret) { $appSecret = New-Secret 56 }
    if (-not $jwtSecret) { $jwtSecret = New-Secret 56 }
    if (-not $DbPassword) { $DbPassword = New-Secret 40 }
    Write-Ok "secrets existants conserves (utilisez -RotateSecrets pour les regenerer)"
}

if ($DbPassword -match "[^A-Za-z0-9_-]") {
    Fail "Le mot de passe PostgreSQL contient des caracteres non supportes. Utilisez -RotateSecrets pour en generer un nouveau."
}

$origins = New-Object System.Collections.Generic.List[string]
$origins.Add("http://localhost")
$origins.Add("http://127.0.0.1")
foreach ($ip in (Get-LocalIPv4)) {
    $origins.Add("http://$ip")
}
$hostname = $env:COMPUTERNAME
if ($hostname) { $origins.Add("http://$hostname") }
if ($HttpPort -ne 80) {
    $withPort = @()
    foreach ($origin in $origins) { $withPort += ($origin + ":" + $HttpPort) }
    foreach ($origin in $withPort) { $origins.Add($origin) }
}
$corsValue = ($origins | Select-Object -Unique) -join ","

$backendEnv = @(
    "# Genere par deploy\windows\install-pharma360.ps1 le " + (Get-Date -Format "yyyy-MM-dd HH:mm"),
    "APP_NAME=Pharma-360",
    "APP_ENV=production",
    "APP_DEBUG=false",
    "APP_SECRET_KEY=$appSecret",
    "",
    "POSTGRES_HOST=$DbHost",
    "POSTGRES_PORT=$DbPort",
    "POSTGRES_DB=$DbName",
    "POSTGRES_USER=$DbUser",
    "POSTGRES_PASSWORD=$DbPassword",
    "",
    "JWT_SECRET=$jwtSecret",
    "JWT_ALGORITHM=HS256",
    "JWT_EXPIRE_MINUTES=480",
    "",
    "BACKEND_HOST=127.0.0.1",
    "BACKEND_PORT=8000",
    "BACKEND_WORKERS=4",
    "BACKEND_TIMEOUT=60",
    "CORS_ORIGINS=$corsValue",
    "",
    "UPLOAD_DIR=$RootFwd/uploads",
    "MAX_UPLOAD_SIZE=10485760",
    "LOG_LEVEL=INFO",
    "LOG_FILE=$RootFwd/logs/app.log"
)
Write-EnvFile -Path $envPath -Lines $backendEnv
Write-Ok (".env ecrit (" + $envPath + ")")

$tessdata = "C:/Program Files/Tesseract-OCR/tessdata"
$iaEnv = @(
    "# Genere par deploy\windows\install-pharma360.ps1 le " + (Get-Date -Format "yyyy-MM-dd HH:mm"),
    "APP_NAME=Pharma-360 IA",
    "APP_ENV=production",
    "APP_DEBUG=false",
    "IA_HOST=127.0.0.1",
    "IA_PORT=8001",
    "",
    "POSTGRES_HOST=$DbHost",
    "POSTGRES_PORT=$DbPort",
    "POSTGRES_DB=$DbName",
    "POSTGRES_USER=$DbUser",
    "POSTGRES_PASSWORD=$DbPassword",
    "",
    "CORS_ORIGINS=$corsValue",
    "UPLOAD_DIR=$RootFwd/ia/uploads",
    "TESSDATA_PREFIX=$tessdata"
)
Write-EnvFile -Path $envIaPath -Lines $iaEnv
Write-Ok (".env.ia ecrit (" + $envIaPath + ")")

# Restriction des droits sur les fichiers de secrets (SYSTEM + Administrateurs + utilisateur courant)
try {
    $currentSid = [Security.Principal.WindowsIdentity]::GetCurrent().User.Value
    & icacls $envPath /inheritance:r /grant:r "*S-1-5-18:F" "*S-1-5-32-544:F" "*$currentSid:F" | Out-Null
    & icacls $envIaPath /inheritance:r /grant:r "*S-1-5-18:F" "*S-1-5-32-544:F" "*$currentSid:F" | Out-Null
    Write-Ok "droits restreints sur .env et .env.ia (SYSTEM, Administrateurs, utilisateur courant)"
} catch {
    Write-Warn2 ("restriction des droits impossible : " + $_.Exception.Message)
}

if (-not (Test-Path "C:\Program Files\Tesseract-OCR\tesseract.exe")) {
    Write-Warn2 "Tesseract OCR non installe : l'OCR des factures sera indisponible (le reste fonctionne)."
    Write-Warn2 "Installateur : https://github.com/UB-Mannheim/tesseract/wiki (ajouter au PATH)."
}

# -----------------------------------------------------------------------------
# 4. Base de donnees
# -----------------------------------------------------------------------------
if ($SkipDatabase) {
    Write-Step "4/9 Base de donnees : ignoree (-SkipDatabase)"
} else {
    Write-Step "4/9 Base de donnees PostgreSQL"

    if (-not $PostgresAdminPassword) {
        $secure = Read-Host ("Mot de passe du superutilisateur PostgreSQL (" + $PostgresAdminUser + ")") -AsSecureString
        $bstr = [Runtime.InteropServices.Marshal]::SecureStringToBSTR($secure)
        try {
            $PostgresAdminPassword = [Runtime.InteropServices.Marshal]::PtrToStringBSTR($bstr)
        } finally {
            [Runtime.InteropServices.Marshal]::ZeroFreeBSTR($bstr)
        }
    }
    if (-not $PostgresAdminPassword) { Fail "Mot de passe PostgreSQL vide." }

    $check = Invoke-Psql -User $PostgresAdminUser -Database "postgres" -Password $PostgresAdminPassword -Arguments @("-tAc", "SELECT 1")
    if ($check.Code -ne 0) {
        Fail ("Connexion PostgreSQL impossible (" + $PostgresAdminUser + "@" + $DbHost + ":" + $DbPort + "). Detail : " + $check.Output)
    }
    Write-Ok "connexion superutilisateur OK"

    $roleCheck = Invoke-Psql -User $PostgresAdminUser -Database "postgres" -Password $PostgresAdminPassword -Arguments @("-tAc", "SELECT 1 FROM pg_roles WHERE rolname = '$DbUser'")
    if ($roleCheck.Output.Trim() -ne "1") {
        $createRole = "CREATE ROLE $DbUser LOGIN PASSWORD '$DbPassword'"
        $r = Invoke-Psql -User $PostgresAdminUser -Database "postgres" -Password $PostgresAdminPassword -Arguments @("-c", $createRole)
        if ($r.Code -ne 0) { Fail ("Creation du role impossible : " + $r.Output) }
        Write-Ok ("role " + $DbUser + " cree")
    } else {
        $alterRole = "ALTER ROLE $DbUser PASSWORD '$DbPassword'"
        $r = Invoke-Psql -User $PostgresAdminUser -Database "postgres" -Password $PostgresAdminPassword -Arguments @("-c", $alterRole)
        if ($r.Code -ne 0) { Fail ("Mise a jour du mot de passe du role impossible : " + $r.Output) }
        Write-Ok ("role " + $DbUser + " existant (mot de passe synchronise)")
    }

    $dbCheck = Invoke-Psql -User $PostgresAdminUser -Database "postgres" -Password $PostgresAdminPassword -Arguments @("-tAc", "SELECT 1 FROM pg_database WHERE datname = '$DbName'")
    $dbCreated = $false
    if ($dbCheck.Output.Trim() -ne "1") {
        $createDb = "CREATE DATABASE $DbName OWNER $DbUser ENCODING 'UTF8'"
        $r = Invoke-Psql -User $PostgresAdminUser -Database "postgres" -Password $PostgresAdminPassword -Arguments @("-c", $createDb)
        if ($r.Code -ne 0) { Fail ("Creation de la base impossible : " + $r.Output) }
        $dbCreated = $true
        Write-Ok ("base " + $DbName + " creee")
    } else {
        Write-Ok ("base " + $DbName + " existante")
    }

    $prep = 'CREATE EXTENSION IF NOT EXISTS "uuid-ossp"; ALTER SCHEMA public OWNER TO ' + $DbUser + ';'
    $r = Invoke-Psql -User $PostgresAdminUser -Database $DbName -Password $PostgresAdminPassword -Arguments @("-c", $prep)
    if ($r.Code -ne 0) { Fail ("Preparation du schema impossible : " + $r.Output) }
    Write-Ok "extension uuid-ossp et schema public prets"

    $initSql = Join-Path $RepoRoot "scripts\init-db.sql"
    if (-not (Test-Path $initSql)) { Fail ("Script introuvable : " + $initSql) }
    $r = Invoke-Psql -User $DbUser -Database $DbName -Password $DbPassword -Arguments @("-f", $initSql)
    if ($r.Code -ne 0) { Fail ("Echec de l'initialisation du schema : " + $r.Output) }
    Write-Ok "schema, index et triggers initialises"

    if ($dbCreated) {
        $cleanup = "DELETE FROM suppliers WHERE email = 'contact@fournisseur.com'"
        Invoke-Psql -User $DbUser -Database $DbName -Password $DbPassword -Arguments @("-c", $cleanup) | Out-Null
        Write-Ok "donnees de demonstration retirees (le fournisseur generique)"
    }

    $env:PGPASSWORD = $null
}

# -----------------------------------------------------------------------------
# 5. Environnement Python + dependances
# -----------------------------------------------------------------------------
Write-Step "5/9 Environnement Python et dependances"
if (-not (Test-Path $VenvPy)) {
    Write-Host "    creation du venv : $VenvDir"
    & $pythonExe -m venv $VenvDir
    if ($LASTEXITCODE -ne 0) { Fail "Creation du venv impossible." }
}
Write-Ok ("venv : " + $VenvDir)

& $VenvPy -m pip install --upgrade pip setuptools wheel --quiet
if ($LASTEXITCODE -ne 0) { Write-Warn2 "mise a jour de pip en echec (on continue)" }

Write-Host "    installation des dependances backend (peut prendre quelques minutes)..."
& $VenvPy -m pip install -r (Join-Path $RepoRoot "backend\requirements.txt") --quiet
if ($LASTEXITCODE -ne 0) { Fail "Echec de l'installation des dependances backend." }
Write-Ok "dependances backend installees"

Write-Host "    installation des dependances IA (peut prendre quelques minutes)..."
& $VenvPy -m pip install -r (Join-Path $RepoRoot "ia\requirements.txt") --quiet
if ($LASTEXITCODE -ne 0) { Write-Warn2 "dependances IA incompletes : le service IA pourrait ne pas demarrer" }
else { Write-Ok "dependances IA installees" }

# -----------------------------------------------------------------------------
# 6. Frontend
# -----------------------------------------------------------------------------
Write-Step "6/9 Build du frontend React"
$distIndex = Join-Path $FrontendDir "dist\index.html"
if ($SkipFrontendBuild) {
    if (-not (Test-Path $distIndex)) { Fail "frontend\dist absent et -SkipFrontendBuild demande : impossible de continuer." }
    Write-Ok "build ignore (frontend\dist existant)"
} else {
    Push-Location $FrontendDir
    try {
        if (Test-Path (Join-Path $FrontendDir "package-lock.json")) {
            & $npmExe ci --no-audit --no-fund
        } else {
            & $npmExe install --no-audit --no-fund
        }
        if ($LASTEXITCODE -ne 0) { Fail "Echec de l'installation des dependances npm." }
        & $npmExe run build
        if ($LASTEXITCODE -ne 0) { Fail "Echec du build frontend (npm run build)." }
    } finally {
        Pop-Location
    }
    if (-not (Test-Path $distIndex)) { Fail "Build termine mais frontend\dist\index.html est absent." }
    Write-Ok "frontend compile dans frontend\dist"
}

# -----------------------------------------------------------------------------
# 7. nginx
# -----------------------------------------------------------------------------
Write-Step "7/9 Configuration de nginx"
$nginxDir = Join-Path $ToolsDir "nginx"
$nginxExe = Join-Path $nginxDir "nginx.exe"

if (-not (Test-Path $nginxExe)) {
    Write-Host "    nginx absent : telechargement..."
    $extract = Expand-ToolArchive -Label "nginx" -Destination $nginxDir -Urls @(
        "https://nginx.org/download/nginx-1.28.0.zip",
        "https://nginx.org/download/nginx-1.26.2.zip"
    )
    if (-not $extract) {
        Fail "nginx introuvable. Telechargez nginx pour Windows (https://nginx.org/en/download.html), extrayez-le dans tools\nginx (nginx.exe a la racine)."
    }
    $inner = Get-ChildItem -Path $extract -Directory | Select-Object -First 1
    if (-not $inner) { Fail "Archive nginx inattendue." }
    if (Test-Path $nginxDir) { Remove-Item $nginxDir -Recurse -Force }
    Move-Item -Path $inner.FullName -Destination $nginxDir
    Remove-Item $extract -Recurse -Force -ErrorAction SilentlyContinue
    foreach ($sub in @("logs", "temp\client_body", "temp\proxy", "temp\fastcgi", "temp\uwsgi", "temp\scgi", "temp\cache")) {
        New-Item -ItemType Directory -Force -Path (Join-Path $nginxDir $sub) | Out-Null
    }
    Write-Ok ("nginx installe : " + $nginxExe)
} else {
    Write-Ok ("nginx present : " + $nginxExe)
}

$template = Join-Path $PSScriptRoot "nginx.pharma360.conf"
if (-not (Test-Path $template)) { Fail ("Modele nginx introuvable : " + $template) }
$rendered = Get-Content $template -Raw
$rendered = $rendered.Replace("__PHARMA_ROOT__", $RootFwd).Replace("__HTTP_PORT__", "$HttpPort")

$confDir = Join-Path $nginxDir "conf"
New-Item -ItemType Directory -Force -Path $confDir | Out-Null
$targetConf = Join-Path $confDir "nginx.conf"
if ((Test-Path $targetConf) -and -not (Test-Path (Join-Path $confDir "nginx.default.conf"))) {
    Copy-Item $targetConf (Join-Path $confDir "nginx.default.conf")
}
$utf8NoBom = New-Object System.Text.UTF8Encoding($false)
[System.IO.File]::WriteAllText($targetConf, $rendered, $utf8NoBom)
Write-Ok ("configuration ecrite : " + $targetConf)

Push-Location $nginxDir
try {
    & $nginxExe -t -c conf/nginx.conf
    if ($LASTEXITCODE -ne 0) { Fail "Configuration nginx invalide (voir le detail ci-dessus)." }
} finally {
    Pop-Location
}
Write-Ok "configuration nginx valide"

# -----------------------------------------------------------------------------
# 8. NSSM + services Windows
# -----------------------------------------------------------------------------
Write-Step "8/9 Services Windows"
$nssmExe = Join-Path $ToolsDir "nssm.exe"
if (-not (Test-Path $nssmExe)) {
    Write-Host "    NSSM absent : telechargement..."
    $extract = Expand-ToolArchive -Label "nssm" -Destination $ToolsDir -Urls @(
        "https://nssm.cc/release/nssm-2.24.zip"
    )
    if ($extract) {
        $candidate = Get-ChildItem -Path $extract -Recurse -Filter "nssm.exe" |
            Where-Object { $_.FullName -like "*win64*" } | Select-Object -First 1
        if (-not $candidate) {
            $candidate = Get-ChildItem -Path $extract -Recurse -Filter "nssm.exe" | Select-Object -First 1
        }
        if ($candidate) {
            Copy-Item $candidate.FullName $nssmExe -Force
            Write-Ok ("NSSM installe : " + $nssmExe)
        }
        Remove-Item $extract -Recurse -Force -ErrorAction SilentlyContinue
    }
}

if ($SkipServices) {
    Write-Warn2 "services ignores (-SkipServices). Demarrage manuel :"
    Write-Host ("      cd `"" + $RepoRoot + "`"")
    Write-Host "      .\.venv\Scripts\python.exe -m uvicorn backend.main:app --host 127.0.0.1 --port 8000"
    Write-Host "      .\.venv\Scripts\python.exe -m uvicorn ia.main:app --host 127.0.0.1 --port 8001"
    Write-Host ("      cd `"" + $nginxDir + "`"; .\nginx.exe -c conf/nginx.conf")
} elseif (-not (Test-Path $nssmExe)) {
    Write-Warn2 "NSSM indisponible : services non installes."
    Write-Warn2 "Telechargez https://nssm.cc/release/nssm-2.24.zip, copiez win64\nssm.exe dans tools\, puis lancez :"
    Write-Host "      .\deploy\windows\services-pharma360.ps1 -Action install"
} elseif (-not $isAdmin) {
    Write-Warn2 "Droits administrateur requis : relancez cette commande dans une console admin :"
    Write-Host "      .\deploy\windows\services-pharma360.ps1 -Action install"
} else {
    & (Join-Path $PSScriptRoot "services-pharma360.ps1") -Action install -RepoRoot $RepoRoot -HttpPort $HttpPort
    if ($LASTEXITCODE -ne 0) { Write-Warn2 "Installation des services en echec (voir messages ci-dessus)." }
}

# -----------------------------------------------------------------------------
# 9. Pare-feu + verification
# -----------------------------------------------------------------------------
Write-Step "9/9 Pare-feu et verification"
if ($isAdmin) {
    $ruleName = "Pharma 360 HTTP"
    $existingRule = Get-NetFirewallRule -DisplayName $ruleName -ErrorAction SilentlyContinue
    if ($existingRule) {
        Write-Ok ("regle pare-feu existante : " + $ruleName)
    } else {
        try {
            New-NetFirewallRule -DisplayName $ruleName -Direction Inbound -Protocol TCP -LocalPort $HttpPort -Action Allow -Profile Any | Out-Null
            Write-Ok ("regle pare-feu creee (TCP " + $HttpPort + ")")
        } catch {
            Write-Warn2 ("regle pare-feu non creee : " + $_.Exception.Message)
        }
    }
} else {
    Write-Warn2 "pare-feu non configure (console non administrateur)"
}

Start-Sleep -Seconds 3
$siteOk = $false
try {
    $response = Invoke-WebRequest -Uri ("http://127.0.0.1:" + $HttpPort + "/health") -UseBasicParsing -TimeoutSec 10
    $siteOk = ($response.StatusCode -eq 200)
} catch { }

$apiOk = $false
try {
    $response = Invoke-WebRequest -Uri ("http://127.0.0.1:" + $HttpPort + "/api/health") -UseBasicParsing -TimeoutSec 10
    $apiOk = ($response.StatusCode -eq 200)
} catch { }

Write-Host ""
Write-Host "=============================================================" -ForegroundColor Cyan
Write-Host "  INSTALLATION TERMINEE" -ForegroundColor Green
Write-Host "=============================================================" -ForegroundColor Cyan
Write-Host ("  Application   : http://localhost" + $(if ($HttpPort -ne 80) { ":" + $HttpPort } else { "" }))
foreach ($ip in (Get-LocalIPv4)) {
    Write-Host ("  Reseau local  : http://" + $ip + $(if ($HttpPort -ne 80) { ":" + $HttpPort } else { "" }))
}
Write-Host ("  nginx         : " + $(if ($siteOk) { "OK" } else { "a verifier" }))
Write-Host ("  API backend   : " + $(if ($apiOk) { "OK" } else { "a verifier (logs\backend-service.err.log)" }))
Write-Host ""
Write-Host "  Etapes suivantes :"
Write-Host "    1. Creer le compte administrateur :"
Write-Host "       .\deploy\windows\new-admin-pharma360.ps1"
Write-Host "    2. Se connecter sur l'application avec ce compte."
Write-Host "    3. Planifier la sauvegarde quotidienne :"
Write-Host "       .\deploy\windows\backup-pharma360.ps1"
Write-Host ""
Write-Host "  Documentation : deploy\windows\README-WINDOWS-NATIF.md"
Write-Host "=============================================================" -ForegroundColor Cyan
