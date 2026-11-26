# Pharma 360 — Procédure détaillée de déploiement en production

> Version : 1.0 — Cible : serveur Linux (Ubuntu 22.04 LTS) avec ou sans application existante.

---

## 1. Prérequis

### Matériel recommandé
| Rôle | Minimum | Recommandé |
|---|---|---|
| CPU | 4 cœurs | 8 cœurs |
| RAM | 8 Go | 16 Go |
| Disque | 40 Go SSD | 100 Go SSD |
| Réseau | 100 Mbps | 1 Gbps |

### Logiciels
- Docker Engine ≥ 24 + Docker Compose v2
- Git, curl, openssl

---

## 2. Tailles & durées estimées

| Élément | Taille |
|---|---|
| Code source (sans node_modules) | ~13 Mo |
| Image postgres:15-alpine | ~250 Mo |
| Image backend (Python 3.11) | ~450 Mo |
| Image frontend (Node + nginx) | ~100 Mo |
| Image IA (Tesseract + ML) | ~1,8–2,5 Go |
| **Total images** | **~2,7–3,4 Go** |

| Étape | Durée |
|---|---|
| Installation Docker/Git | 5–10 min |
| Clonage | 1–3 min |
| Configuration | 5–10 min |
| Certificats TLS | 5–15 min |
| Build des images (1ʳᵉ fois) | 20–40 min |
| Démarrage + healthchecks | 3–8 min |
| Vérifications | 5–10 min |
| **Total premier déploiement** | **45–90 min** |
| Mise à jour ultérieure | 5–15 min |

---

## 3. Installation

### 3.1 Préparer le serveur
```bash
sudo apt update && sudo apt upgrade -y
curl -fsSL https://get.docker.com | sh
sudo usermod -aG docker $USER
newgrp docker
sudo apt install -y docker-compose-plugin git curl openssl
```

### 3.2 Récupérer le code
```bash
sudo mkdir -p /opt/pharma360 && sudo chown $USER:$USER /opt/pharma360
cd /opt/pharma360
git clone https://github.com/DuDuEZN/Pharma-360.git .
```

### 3.3 Configurer l'environnement
```bash
cp deploy/.env.production.example .env.production
# Éditer .env.production et remplacer les secrets
nano .env.production
```
Générer des secrets forts :
```bash
openssl rand -hex 64   # APP_SECRET_KEY, JWT_SECRET
openssl rand -base64 32 # POSTGRES_PASSWORD
```

### 3.4 Créer les répertoires
```bash
mkdir -p backups logs backend/logs backend/uploads ia/logs ia/models ia/uploads ia/static docker/nginx/ssl
```

### 3.5 Certificats TLS
**Let's Encrypt :**
```bash
sudo apt install -y certbot
sudo certbot certonly --standalone -d pharma.votre-domaine.com
sudo cp /etc/letsencrypt/live/pharma.votre-domaine.com/fullchain.pem docker/nginx/ssl/
sudo cp /etc/letsencrypt/live/pharma.votre-domaine.com/privkey.pem docker/nginx/ssl/
```
**Auto-signé (LAN/test) :**
```bash
openssl req -x509 -nodes -days 365 -newkey rsa:2048 \
  -keyout docker/nginx/ssl/privkey.pem -out docker/nginx/ssl/fullchain.pem \
  -subj "/CN=pharma.local"
```

---

## 4. Déploiement standard (serveur dédié)

```bash
cd /opt/pharma360
# Build
docker compose --project-directory . -f docker/docker-compose.prod.yml build
# Démarrage
docker compose --project-directory . -f docker/docker-compose.prod.yml up -d
# Vérification
docker compose --project-directory . -f docker/docker-compose.prod.yml ps
curl -s http://localhost/api/health
```

Accès : `https://pharma.votre-domaine.com` — identifiants par défaut `admin` / `Admin@2025` → **changer immédiatement**.

---

## 5. Déploiement en coexistence (serveur avec autre logiciel)

Si un autre logiciel occupe déjà les ports 80/443 :

### Option A — intégrer au proxy existant (recommandé)
1. Ne pas démarrer `pharma360-nginx-prod`.
2. Ajouter Pharma au réseau du proxy existant (external network).
3. Configurer le proxy existant pour router `pharma.votre-domaine.com` → frontend/backend/IA.

### Option B — ports alternatifs
Utiliser `docker/docker-compose.coexist.yml` :
```bash
docker compose -f docker/docker-compose.coexist.yml up -d
```
Accès : `http://serveur:8080` (ou `https://serveur:8443`).

Voir `SIMULATION-COEXIST.md` pour le détail.

---

## 6. Sauvegardes automatiques

```bash
sudo cp scripts/backup-db.sh /usr/local/bin/pharma360-backup
sudo chmod +x /usr/local/bin/pharma360-backup
(crontab -l 2>/dev/null; echo "0 2 * * * /usr/local/bin/pharma360-backup") | crontab -
```
- Fréquence : quotidienne à 2h00.
- Rétention : 30 jours.
- Répertoire : `/var/backups/pharma360`.

**Test mensuel de restauration** dans un conteneur jetable.

---

## 7. Mise à jour

```bash
cd /opt/pharma360
git pull origin main
docker compose --project-directory . -f docker/docker-compose.prod.yml build
docker compose --project-directory . -f docker/docker-compose.prod.yml up -d
```
Durée : 5–15 min. Rollback possible via l'image précédente taguée.

---

## 8. Restauration (disaster recovery)

```bash
docker compose --project-directory . -f docker/docker-compose.prod.yml down
gunzip -c /var/backups/pharma360/pharma360_YYYYMMDD.sql.gz | \
  docker exec -i pharma360-db-prod psql -U pharma_admin -d pharma360_prod
docker compose --project-directory . -f docker/docker-compose.prod.yml up -d
```

---

## 9. Sécurité

- Firewall : n'exposer que 80/443 (et SSH restreint par IP).
- DB et IA : ne jamais publier leurs ports sur l'hôte.
- Changer les identifiants par défaut.
- Rotation des secrets tous les 6 mois.
- Sauvegardes chiffrées hors site hebdomadaires.

---

## 10. Checklist de mise en production

- [ ] `.env.production` rempli et non commité
- [ ] Certificats TLS en place
- [ ] Build des images réussi
- [ ] Tous les conteneurs `healthy`
- [ ] `/api/health` répond `healthy`
- [ ] Frontend accessible
- [ ] Compte admin créé, mot de passe changé
- [ ] Sauvegarde automatique configurée et testée
- [ ] Test de restauration effectué
- [ ] Firewall configuré
- [ ] Documentation remise au client

---
*Pharma 360 — Procédure de déploiement v1.0*
