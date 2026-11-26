# Pharma 360 — Installation sur Windows 10 sans Docker

> Cible : serveur Windows 10 (build 2023) sur lequel **Docker Desktop, WSL2 et Hyper-V ne sont pas disponibles**.
> Cette procédure installe l'application **en natif** : PostgreSQL, Python/FastAPI, service IA, frontend React servi par nginx, le tout en services Windows.

---

## 1. Pourquoi ce mode d'installation

Docker Desktop sous Windows 10 exige **WSL2** ou **Hyper-V**. Quand la virtualisation n'est pas disponible (BIOS verrouillé, composant Windows absent, build trop ancien), aucune variante de Docker ne peut fonctionner.

Le mode natif ne dépend d'aucune virtualisation :

| Contrainte du serveur | Mode natif |
|---|---|
| WSL2 / Hyper-V indisponibles | ✅ aucune dépendance |
| Docker interdit par la politique IT | ✅ pas de conteneur |
| Autre logiciel déjà installé sur le serveur | ✅ ports séparés, services indépendants |
| Droits administrateur limités | ⚠️ nécessaires pour les services et le pare-feu |

Le prix à payer est la maintenance : mises à jour via un script (`update-pharma360.ps1`) et non via `docker compose pull`.

---

## 2. Architecture installée

```
Postes du réseau local
        │  HTTP :80 (ou 8080)
        ▼
┌─────────────────────────────────────────────┐
│ nginx (Windows)  — service Pharma360Nginx   │
│  /            → frontend\dist  (React)      │
│  /api/        → 127.0.0.1:8000  (FastAPI)   │
│  /ws/         → 127.0.0.1:8000  (WebSocket) │
│  /ia/         → 127.0.0.1:8001  (service IA)│
│  /uploads/    → <projet>\uploads            │
└─────────────────────────────────────────────┘
        │
        ├── service Pharma360Backend  (uvicorn, 4 workers, port 8000)
        ├── service Pharma360IA       (uvicorn, port 8001, OCR)
        ▼
   PostgreSQL 15 (service Windows, port 5432, écoute locale)
```

Répertoires créés dans le dossier du projet :

| Chemin | Contenu |
|---|---|
| `.venv\` | environnement Python (backend + IA) |
| `.env` / `.env.ia` | configuration et secrets (droits restreints) |
| `frontend\dist\` | build React servi par nginx |
| `logs\` | journaux backend, IA, nginx, services |
| `uploads\` | pièces jointes (factures, documents) |
| `backups\` | sauvegardes `.dump` et archives ZIP |
| `tools\nginx\` | binaire nginx + configuration générée |
| `tools\nssm.exe` | utilitaire de gestion des services Windows |

---

## 3. Prérequis

| Composant | Version | Rôle | Téléchargement |
|---|---|---|---|
| Windows | 10 / 11, 64 bits | — | — |
| PowerShell | 5.1 (inclus) | exécution des scripts | — |
| PostgreSQL | 15 ou + | base de données | https://www.postgresql.org/download/windows/ (installeur EDB) |
| Python | **3.11 ou 3.12** (3.13+ non supporté) | backend + service IA | https://www.python.org/downloads/release/python-3129/ |
| Node.js | 20 LTS ou 22 LTS | compilation du frontend **uniquement** | https://nodejs.org/ |
| nginx | 1.26+ (Windows) | serveur web / reverse proxy | téléchargé automatiquement par le script |
| NSSM | 2.24 | services Windows | téléchargé automatiquement par le script |
| Tesseract OCR | 5.x + données `fra` | OCR des factures (optionnel) | https://github.com/UB-Mannheim/tesseract/wiki |

> **Python** : installer **Python 3.12** (ou 3.11) et cocher « Add python.exe to PATH ».
> Python 3.13 et supérieur **ne fonctionnent pas** : plusieurs dépendances épinglées (`greenlet==3.0.3`, `psycopg2-binary`, `reportlab`, `websockets==12.0`, `anyio==3.7.1`) n'ont pas encore de paquets binaires pour ces versions.
> Si Python est installé ailleurs, indiquer son chemin : `-PythonExe "C:\Program Files\Python312\python.exe"`.
> **PostgreSQL** : noter le mot de passe du superutilisateur `postgres`, conserver le port `5432`.
> **Tesseract** : cocher la langue française (`fra`) et ajouter le dossier au `PATH`.

---

## 4. Avant de commencer — checklist

1. **Console administrateur** : clic droit sur PowerShell → « Exécuter en tant qu'administrateur ».
2. **Adresse IP fixe** pour le serveur (ou réservation DHCP), pour que les postes gardent le même lien.
3. **Ports libres** : vérifier que `80`, `8000`, `8001`, `5432` ne sont pas utilisés :
   ```powershell
   netstat -ano | findstr ":80 :8000 :8001 :5432"
   ```
   Si le port 80 est pris par l'autre logiciel → utiliser `-HttpPort 8080` (voir §8).
4. **Antivirus** : ajouter une exclusion sur le dossier du projet (nginx et uvicorn sont parfois bloqués).
5. **Sauvegarde** : si une version précédente existe, sauvegarder la base avant toute manipulation.
6. **Espace disque** : 10 Go libres minimum (dépendances Python ≈ 1,5 Go, build ≈ 100 Mo, sauvegardes).
7. **Pas de chemins avec accents** : installer dans `C:\Pharma360` (recommandé).
8. **Copier le projet** sur le serveur (archive ZIP ou `git clone`).

---

## 5. Installation en 4 commandes

Depuis le dossier du projet, dans une console **administrateur** :

```powershell
cd C:\Pharma360

# 1) installation complète (base, dépendances, build, nginx, services)
powershell -ExecutionPolicy Bypass -File .\deploy\windows\install-pharma360.ps1

# 2) création du compte administrateur
powershell -ExecutionPolicy Bypass -File .\deploy\windows\new-admin-pharma360.ps1

# 3) vérification
powershell -ExecutionPolicy Bypass -File .\deploy\windows\diagnostic-pharma360.ps1

# 4) première sauvegarde
powershell -ExecutionPolicy Bypass -File .\deploy\windows\backup-pharma360.ps1
```

Le script demande **le mot de passe PostgreSQL** (`postgres`) pour créer le rôle applicatif et la base. Compter **20 à 40 minutes** (téléchargements + compilation du frontend).

À la fin, l'application est accessible sur `http://localhost` et sur `http://<IP-du-serveur>` depuis les postes du réseau.

---

## 6. Ce que fait le script d'installation

| Étape | Action |
|---|---|
| 1/9 | Vérifie Python 3.11/3.12, npm, `psql`, service PostgreSQL |
| 2/9 | Crée `logs\`, `uploads\`, `backups\`, `static\`, `tools\` |
| 3/9 | Génère les secrets (56/40 caractères), écrit `.env` et `.env.ia`, restreint leurs droits |
| 4/9 | Crée le rôle `pharma_admin`, la base `pharma360_prod`, l'extension `uuid-ossp`, puis exécute `scripts\init-db.sql` |
| 5/9 | Crée (ou recrée si la version Python a changé) `.venv` et installe les dépendances backend + IA |
| 6/9 | `npm ci` + `npm run build` → `frontend\dist` |
| 7/9 | Télécharge nginx (si absent), génère `tools\nginx\conf\nginx.conf`, valide avec `nginx -t` |
| 8/9 | Télécharge NSSM (si absent) et crée les 3 services Windows |
| 9/9 | Ouvre le port dans le pare-feu et vérifie `/health` et `/api/health` |

Paramètres utiles :

```powershell
# port 8080 au lieu de 80
.\deploy\windows\install-pharma360.ps1 -HttpPort 8080

# base sur un serveur PostgreSQL distant
.\deploy\windows\install-pharma360.ps1 -DbHost 192.168.1.20 -DbPort 5432

# régénérer tous les secrets (met aussi à jour le mot de passe du rôle)
.\deploy\windows\install-pharma360.ps1 -RotateSecrets

# réinstaller uniquement le code (base et services déjà en place)
.\deploy\windows\install-pharma360.ps1 -SkipDatabase -SkipServices
```

---

## 7. Installation manuelle de secours

Si un script est bloqué (politique PowerShell, téléchargement interdit), voici l'équivalent manuel.

### 7.1 PostgreSQL

1. Installer PostgreSQL 15+ (installeur EDB), port `5432`, mot de passe `postgres` robuste.
2. Ouvrir **pgAdmin** ou `psql` :

```powershell
$env:PGPASSWORD = "<mot de passe postgres>"
& "C:\Program Files\PostgreSQL\15\bin\psql.exe" -U postgres -h 127.0.0.1 -c "CREATE ROLE pharma_admin LOGIN PASSWORD '<mot de passe fort>';"
& "C:\Program Files\PostgreSQL\15\bin\psql.exe" -U postgres -h 127.0.0.1 -c "CREATE DATABASE pharma360_prod OWNER pharma_admin ENCODING 'UTF8';"
& "C:\Program Files\PostgreSQL\15\bin\psql.exe" -U postgres -h 127.0.0.1 -d pharma360_prod -c "ALTER SCHEMA public OWNER TO pharma_admin;"
# Extension uuid-ossp OPTIONNELLE (non utilisee par Pharma 360) :
#   si le paquet contrib est absent, ignorer l'erreur et continuer.
$env:PGPASSWORD = "<mot de passe pharma_admin>"
& "C:\Program Files\PostgreSQL\15\bin\psql.exe" -U pharma_admin -h 127.0.0.1 -d pharma360_prod -v ON_ERROR_STOP=1 -f .\scripts\init-db.sql
```

3. Vérifier que PostgreSQL n'écoute qu'en local (fichier `postgresql.conf`) :
   ```
   listen_addresses = 'localhost'
   ```

### 7.2 Backend et service IA

```powershell
cd C:\Pharma360
python -m venv .venv
.\.venv\Scripts\python.exe -m pip install --upgrade pip
.\.venv\Scripts\python.exe -m pip install -r backend\requirements.txt
.\.venv\Scripts\python.exe -m pip install -r ia\requirements.txt

# test manuel (deux consoles)
.\.venv\Scripts\python.exe -m uvicorn backend.main:app --host 127.0.0.1 --port 8000
.\.venv\Scripts\python.exe -m uvicorn ia.main:app --host 127.0.0.1 --port 8001
```

### 7.3 Frontend

```powershell
cd C:\Pharma360\frontend
npm ci
npm run build
```

### 7.4 nginx

1. Télécharger `nginx-1.28.0.zip` sur https://nginx.org/en/download.html.
2. Extraire dans `C:\Pharma360\tools\nginx` (`nginx.exe` à la racine de ce dossier).
3. Copier `deploy\windows\nginx.pharma360.conf` vers `tools\nginx\conf\nginx.conf`, puis remplacer `__PHARMA_ROOT__` par `C:/Pharma360` et `__HTTP_PORT__` par `80`.
4. Tester et démarrer :
   ```powershell
   cd C:\Pharma360\tools\nginx
   .\nginx.exe -t -c conf/nginx.conf
   .\nginx.exe -c conf/nginx.conf
   ```

### 7.5 Services Windows (NSSM)

```powershell
# nssm.exe doit être dans C:\Pharma360\tools\
.\deploy\windows\services-pharma360.ps1 -Action install
```

Le script crée :

| Service | Programme | Port |
|---|---|---|
| `Pharma360Backend` | `.venv\Scripts\python.exe -m uvicorn backend.main:app --workers 4` | 8000 |
| `Pharma360IA` | `.venv\Scripts\python.exe -m uvicorn ia.main:app` | 8001 |
| `Pharma360Nginx` | `tools\nginx\nginx.exe -c conf/nginx.conf -g "daemon off;"` | 80 (ou 8080) |

---

## 8. Coexistence avec l'autre logiciel du serveur

Le serveur héberge déjà une autre application. Trois règles suffisent :

1. **Ports séparés** : Pharma 360 n'utilise que `80` (ou `8080`), `8000`, `8001`, `5432`.
   ```powershell
   netstat -ano | findstr ":80 "
   ```
   Si le port 80 est occupé par l'autre logiciel :
   ```powershell
   .\deploy\windows\configure-nginx.ps1 -HttpPort 8080
   .\deploy\windows\services-pharma360.ps1 -Action restart -HttpPort 8080
   ```
   L'application sera alors sur `http://<serveur>:8080`.

2. **Aucun service partagé** : Pharma 360 a son propre PostgreSQL (port 5432), son propre nginx, son propre dossier. Il ne touche ni à IIS, ni à Apache, ni à la base de l'autre logiciel.

3. **Ressources** : le backend tourne avec 4 workers et l'IA à un seul processus. Pour un serveur modeste (8 Go), réduire à 2 workers :
   ```powershell
   # dans .env
   BACKEND_WORKERS=2
   ```
   puis redémarrer le service backend.

> Le port 443 n'est pas occupé par Pharma 360 tant que HTTPS n'est pas activé (§13).

---

## 9. Créer le compte administrateur

```powershell
.\deploy\windows\new-admin-pharma360.ps1
```

Le script demande :

| Champ | Valeur par défaut |
|---|---|
| Nom d'utilisateur | `admin` |
| Email | `admin@pharma360.local` |
| Nom complet | `Administrateur` |
| Mot de passe | saisi en masqué, 10 caractères minimum |

Le mot de passe n'est jamais écrit sur le disque : il est transmis par variable d'environnement au processus Python, qui calcule le hash bcrypt et l'insère en base.

> ⚠️ **Changez le mot de passe par défaut avant la mise en service client.** Ne réutilisez pas `Admin@2025`.

---

## 10. Exploitation quotidienne

### 10.1 Commandes de service

```powershell
.\deploy\windows\services-pharma360.ps1 -Action status
.\deploy\windows\services-pharma360.ps1 -Action start
.\deploy\windows\services-pharma360.ps1 -Action stop
.\deploy\windows\services-pharma360.ps1 -Action restart
.\deploy\windows\services-pharma360.ps1 -Action reload    # recharge nginx
```

Les services démarrent automatiquement au démarrage du serveur (`SERVICE_AUTO_START`).

### 10.2 Journaux

| Fichier | Contenu |
|---|---|
| `logs\app.log` | journal applicatif backend |
| `logs\backend-service.log` / `.err.log` | sortie du service backend |
| `logs\ia-service.log` / `.err.log` | sortie du service IA |
| `tools\nginx\logs\access.log` / `error.log` | trafic et erreurs nginx |

Rotation automatique à 10 Mo par NSSM (les anciens fichiers sont conservés en `.1`, `.2`, …).

### 10.3 Sauvegarde planifiée

Créer une tâche planifiée quotidienne (22h00) :

```powershell
schtasks /Create /TN "Pharma360 Backup" `
  /TR "powershell -ExecutionPolicy Bypass -File C:\Pharma360\deploy\windows\backup-pharma360.ps1" `
  /SC DAILY /ST 22:00 /RU SYSTEM /RL HIGHEST

schtasks /Run /TN "Pharma360 Backup"   # test immédiat
```

### 10.4 Vérification de santé

```powershell
.\deploy\windows\diagnostic-pharma360.ps1
```

Affiche versions, services, ports, sondes HTTP, espace disque, sauvegardes et dernières erreurs.

---

## 11. Sauvegarde et restauration

### Sauvegarde

```powershell
.\deploy\windows\backup-pharma360.ps1
.\deploy\windows\backup-pharma360.ps1 -KeepDays 60
```

Produit dans `backups\` :

- `pharma360_AAAAMMJJ_HHMMSS.dump` — base complète (format personnalisé `pg_dump -Fc`)
- `pharma360_uploads_AAAAMMJJ_HHMMSS.zip` — pièces jointes

### Restauration

```powershell
# 1) arrêter l'application
.\deploy\windows\services-pharma360.ps1 -Action stop

# 2) restaurer
$env:PGPASSWORD = "<mot de passe pharma_admin>"
& "C:\Program Files\PostgreSQL\15\bin\pg_restore.exe" `
    -h 127.0.0.1 -p 5432 -U pharma_admin -d pharma360_prod `
    --clean --if-exists --no-owner `
    .\backups\pharma360_20261126_220000.dump
$env:PGPASSWORD = $null

# 3) redémarrer
.\deploy\windows\services-pharma360.ps1 -Action start
```

Pour les pièces jointes : extraire le ZIP dans `C:\Pharma360\uploads`.

> Conserver au moins une copie **hors du serveur** (NAS, clé USB, sauvegarde réseau).

> Les fichiers `.env` sont restreints (SYSTEM, Administrateurs, utilisateur ayant fait l'installation). Les scripts `backup` et `update` doivent donc être lancés dans une console **administrateur** — la tâche planifiée ci-dessus tourne en `SYSTEM`, ce qui convient.

---

## 12. Mise à jour de l'application

```powershell
# 1) sauvegarde obligatoire
.\deploy\windows\backup-pharma360.ps1

# 2) mise à jour (git pull + pip + build + redémarrage)
.\deploy\windows\update-pharma360.ps1
```

Options : `-SkipGit`, `-SkipDeps`, `-SkipFrontend`, `-HttpPort 8080`.

En cas de problème, revenir à la version précédente :

```powershell
git log --oneline -5
git checkout <commit_precedent>
.\deploy\windows\update-pharma360.ps1 -SkipGit
```

---

## 13. Sécurité

1. **Mot de passe administrateur** : unique, ≥ 12 caractères, changé après la livraison.
2. **Secrets** : générés automatiquement, stockés dans `.env` / `.env.ia` avec droits restreints (SYSTEM + Administrateurs).
3. **Base de données** : `listen_addresses = 'localhost'` — jamais exposée au réseau.
4. **Pare-feu** : seule la règle « Pharma 360 HTTP » est ouverte. Restreindre le profil si le serveur n'est pas itinérant.
5. **HTTPS (recommandé)** :
   - déposer `fullchain.pem` et `privkey.pem` dans `tools\nginx\conf\ssl\` ;
   - décommenter le bloc `server { listen 443 ssl; ... }` dans `deploy\windows\nginx.pharma360.conf` ;
   - ajouter `return 301 https://$host$request_uri;` dans le serveur HTTP ;
   - relancer `configure-nginx.ps1` puis `services-pharma360.ps1 -Action reload`.
6. **Comptes** : un compte par utilisateur, aucun compte partagé ; désactiver les comptes partis.
7. **Sauvegardes** : elles contiennent des données de santé → dossier `backups\` à protéger et support de sauvegarde chiffré.

---

## 14. Dépannage

| Symptôme | Cause probable | Action |
|---|---|---|
| Page blanche / 404 sur `/` | `frontend\dist` absent ou vide | relancer `npm run build` puis vérifier `frontend\dist\index.html` |
| `502 Bad Gateway` sur `/api/` | service backend arrêté | `services-pharma360.ps1 -Action status`, lire `logs\backend-service.err.log` |
| `502` uniquement sur `/ia/` | service IA arrêté (souvent Tesseract absent) | lire `logs\ia-service.err.log`, installer Tesseract |
| `nginx: [emerg] bind() to 0.0.0.0:80 failed` | port 80 déjà utilisé | `configure-nginx.ps1 -HttpPort 8080` |
| Service ne démarre pas | erreur Python au démarrage | lancer la commande uvicorn manuellement pour voir l'erreur |
| `password authentication failed for user "pharma_admin"` | mot de passe `.env` ≠ base | `install-pharma360.ps1 -RotateSecrets` (met à jour le rôle) |
| `PREPARATION DU SCHEMA IMPOSSIBLE` / `LINE 1: CREATE EXTENSION IF NOT EXISTS "uuid-ossp"` | paquet `contrib` absent, ou extension non disponible sur ce PostgreSQL | **sans gravité** : l'extension est optionnelle. Mettre à jour `install-pharma360.ps1` et `scripts\init-db.sql` (version tolérante) puis relancer ; l'installation reprend où elle s'est arrêtée |
| `Attribution du schema public impossible` / `must be owner of schema public` | connexion avec un compte non superutilisateur | relancer avec le vrai compte `postgres` (`-PostgresAdminUser postgres`) |
| Connexion impossible alors que `/health` répond | compte admin non créé | `new-admin-pharma360.ps1` |
| OCR en échec | Tesseract absent du `PATH` | réinstaller Tesseract, cocher `fra`, redémarrer le service IA |
| Téléchargements bloqués pendant l'installation | proxy / pare-feu sortant | installer nginx et NSSM manuellement (§7.4 et §7.5) |
| Accès impossible depuis un poste du LAN | pare-feu ou mauvaise IP | vérifier la règle pare-feu, tester `http://<IP>:<port>/health` |
| `RuntimeError: uvloop does not support Windows` / `Failed to build 'uvloop'` | Python 3.13+ utilisé, ou ancien fichier `requirements.txt` | installer **Python 3.12**, supprimer `.venv`, relancer. Vérifier la ligne uvloop : `uvloop>=0.19.0; sys_platform != "win32"` |
| Lenteurs / mémoire saturée | workers trop nombreux | `BACKEND_WORKERS=2` dans `.env`, redémarrer |

Commandes utiles :

```powershell
Get-Service Pharma360* | Format-Table Name, Status, StartType
Get-Content .\logs\backend-service.err.log -Tail 50
Get-Content .\tools\nginx\logs\error.log -Tail 50
netstat -ano | findstr ":80 :8000 :8001 :5432"
```

---

## 15. Désinstallation

```powershell
# 1) services
.\deploy\windows\services-pharma360.ps1 -Action remove

# 2) pare-feu
Remove-NetFirewallRule -DisplayName "Pharma 360 HTTP"

# 3) (optionnel) base de données — IRRÉVERSIBLE
$env:PGPASSWORD = "<mot de passe postgres>"
& "C:\Program Files\PostgreSQL\15\bin\psql.exe" -U postgres -h 127.0.0.1 -c "DROP DATABASE pharma360_prod;"
& "C:\Program Files\PostgreSQL\15\bin\psql.exe" -U postgres -h 127.0.0.1 -c "DROP ROLE pharma_admin;"

# 4) fichiers de l'application
Remove-Item C:\Pharma360 -Recurse -Force
```

---

## 16. Checklist de mise en production

- [ ] PostgreSQL, Python, Node.js installés et détectés
- [ ] `install-pharma360.ps1` terminé sans erreur
- [ ] `/health` et `/api/health` répondent en HTTP 200
- [ ] Compte administrateur créé, mot de passe fort et **différent** de `Admin@2025`
- [ ] Connexion testée depuis un poste du réseau (pas seulement `localhost`)
- [ ] Vente de test, livraison de test, impression d'étiquettes vérifiées
- [ ] Sauvegarde manuelle exécutée et **restauration testée**
- [ ] Tâche planifiée de sauvegarde quotidienne active
- [ ] Pare-feu vérifié, ports de l'autre logiciel intacts
- [ ] Services en démarrage automatique après redémarrage du serveur
- [ ] Documentation remise au client (ce fichier + `deploy\README-DEPLOIEMENT.md`)
- [ ] Contacts de support et procédure d'escalade communiqués

---

## Fichiers du kit

| Fichier | Rôle |
|---|---|
| `install-pharma360.ps1` | installation complète |
| `new-admin-pharma360.ps1` | création du compte administrateur |
| `services-pharma360.ps1` | gestion des services Windows (install/start/stop/restart/status/reload/remove) |
| `configure-nginx.ps1` | régénération de la configuration nginx (port, chemins) |
| `backup-pharma360.ps1` | sauvegarde base + pièces jointes, purge automatique |
| `update-pharma360.ps1` | mise à jour code + dépendances + build + redémarrage |
| `diagnostic-pharma360.ps1` | état complet du serveur et des services |
| `nginx.pharma360.conf` | modèle de configuration nginx pour Windows |
