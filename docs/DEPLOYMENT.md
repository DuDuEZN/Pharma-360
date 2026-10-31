# Pharma 360 - Guide de Déploiement Production

**ID Tâche**: QA-016  
**Responsable**: QA/DevOps  
**Statut**: EN COURS  
**Version**: 1.0.0  

---

## Table des Matières

1. [Prérequis](#pr%C3%A9requis)
2. [Préparation de l'Environnement](#pr%C3%A9paration-de-lenvironnement)
3. [Configuration](#configuration)
4. [Déploiement](#d%C3%A9ploiement)
5. [Vérifications Post-Déploiement](#v%C3%A9rifications-post-d%C3%A9ploiement)
6. [Sauvegardes et Restauration](#sauvegardes-et-restauration)
7. [Surveillance et Maintenance](#surveillance-et-maintenance)
8. [Résolution des Problèmes](#r%C3%A9solution-des-probl%C3%A8mes)
9. [Mises à Jour](#mises-%C3%A0-jour)
10. [Sécurité](#s%C3%A9curit%C3%A9)

---

## 1. Prérequis

### 1.1 Système d'Exploitation
- **Recommandé**: Ubuntu 22.04 LTS ou Debian 12
- **Alternative**: CentOS 8+, Fedora 38+
- **Architecture**: x86_64 (64-bit)

### 1.2 Matériel Minimum
| Composant | Production | Développement |
|-----------|------------|---------------|
| CPU | 4 cœurs | 2 cœurs |
| RAM | 8 Go | 4 Go |
| Disque | 100 Go SSD | 50 Go |
| Espace Swap | 4 Go | 2 Go |

### 1.3 Logiciels Requis

#### 1.3.1 Docker et Docker Compose
```bash
# Ubuntu/Debian
sudo apt update
sudo apt install -y docker.io docker-compose-plugin

# CentOS/RHEL
sudo yum install -y docker docker-compose-plugin

# Vérifier l'installation
sudo docker --version
sudo docker-compose --version
```

#### 1.3.2 Git
```bash
# Ubuntu/Debian
sudo apt install -y git

# CentOS/RHEL
sudo yum install -y git

# Vérifier l'installation
git --version
```

#### 1.3.3 PostgreSQL Client (Optionnel)
```bash
# Ubuntu/Debian
sudo apt install -y postgresql-client

# CentOS/RHEL
sudo yum install -y postgresql
```

---

## 2. Préparation de l'Environnement

### 2.1 Cloner le Dépôt

```bash
# Cloner le dépôt
cd /opt
sudo mkdir -p pharma360
sudo chown $USER:$USER pharma360
cd pharma360
git clone https://github.com/DuDuEZN/Pharma-360 .

# Vérifier la branche
cd Pharma-360
git checkout main
git pull origin main
```

### 2.2 Créer les Répertoires de Données

```bash
# Répertoires de données
sudo mkdir -p /var/backups/pharma360
sudo mkdir -p /var/log/pharma360
sudo mkdir -p /opt/pharma360/backups
sudo mkdir -p /opt/pharma360/logs

# Permissions
sudo chown -R $USER:$USER /opt/pharma360
sudo chmod -R 755 /var/backups/pharma360
sudo chmod -R 755 /var/log/pharma360
```

### 2.3 Configurer les Variables d'Environnement

```bash
# Copier le fichier d'exemple
cd /opt/pharma360/Pharma-360
cp .env.example .env.production

# Modifier le fichier .env.production avec vos valeurs
nano .env.production
```

**Variables critiques à modifier**:
```bash
# Base de données
POSTGRES_DB=pharma360_prod
POSTGRES_USER=pharma_admin
POSTGRES_PASSWORD=Votre_Mot_De_Passe_Securise_2025

# Secrets
APP_SECRET_KEY=$(openssl rand -hex 64)
JWT_SECRET=$(openssl rand -hex 64)
```

---

## 3. Configuration

### 3.1 Configuration de Docker Compose

Le projet utilise deux fichiers de configuration:
- `docker/docker-compose.yml` - Développement
- `docker/docker-compose.prod.yml` - Production

### 3.2 Configuration Nginx

Le fichier `docker/nginx/nginx.prod.conf` contient la configuration optimisée pour la production:
- Compression Gzip
- Cache des réponses API
- Limitation de débit (Rate Limiting)
- En-têtes de sécurité
- Proxy inverse pour Backend, Frontend et IA

### 3.3 Configuration des Services

#### Backend (FastAPI)
- **Port**: 8000
- **Workers**: 8 (optimisé pour la production)
- **Timeout**: 60 secondes
- **Max Requests**: 5000

#### Frontend (React + Nginx)
- **Port**: 80
- **Static Files**: Servis par Nginx
- **Cache**: 30 jours pour les assets statiques

#### IA Service
- **Port**: 8001
- **Timeout**: 120 secondes (pour les opérations OCR/ML)

#### Base de Données (PostgreSQL)
- **Port**: 5432
- **Max Connections**: 200
- **Shared Buffers**: 2GB
- **Effective Cache Size**: 6GB
- **Work Mem**: 32MB

---

## 4. Déploiement

### 4.1 Méthode 1: Utilisation du Script de Déploiement

```bash
# Rendre le script exécutable
chmod +x scripts/deploy-prod.sh

# Exécuter le déploiement
./scripts/deploy-prod.sh
```

Le script effectue automatiquement:
1. Vérification des dépendances
2. Création des répertoires
3. Chargement de la configuration
4. Construction des images Docker
5. Démarrage des conteneurs
6. Vérification de la santé
7. Initialisation de la base de données
8. Configuration des sauvegardes
9. Vérifications finales

### 4.2 Méthode 2: Déploiement Manuel

#### Étape 1: Construire les Images

```bash
cd /opt/pharma360/Pharma-360

# Backend
docker-compose --project-directory . -f docker/docker-compose.prod.yml build pharma360-backend

# Frontend
docker-compose --project-directory . -f docker/docker-compose.prod.yml build pharma360-frontend

# IA
docker-compose --project-directory . -f docker/docker-compose.prod.yml build pharma360-ia
```

#### Étape 2: Démarrer les Conteneurs

```bash
# Arrêter les conteneurs existants
docker-compose --project-directory . -f docker/docker-compose.prod.yml down

# Démarrer les conteneurs
docker-compose --project-directory . -f docker/docker-compose.prod.yml up -d
```

#### Étape 3: Vérifier la Santé

```bash
# Vérifier les conteneurs
docker ps -a

# Vérifier les logs
docker-compose --project-directory . -f docker/docker-compose.prod.yml logs -f
```

#### Étape 4: Initialiser la Base de Données

```bash
# Exécuter les migrations
docker exec pharma360-backend-prod alembic upgrade head

# Créer l'utilisateur admin (si nécessaire)
docker exec pharma360-backend-prod python -c "
from backend.core.database import async_session_maker
from backend.models.user import User
from backend.core.security import PasswordUtils
import asyncio

async def create_admin():
    async with async_session_maker() as session:
        existing = await session.execute(\"SELECT 1 FROM users WHERE username = 'admin'\")
        if not existing.scalar():
            admin = User(
                username='admin',
                email='admin@pharma360.local',
                full_name='Administrateur Pharma 360',
                hashed_password=PasswordUtils.hash_password('Admin@2025'),
                is_active=True,
                is_superuser=True,
                role='admin'
            )
            session.add(admin)
            await session.commit()
            print('Utilisateur admin créé avec succès')
        else:
            print('Utilisateur admin existe déjà')

asyncio.run(create_admin())
"
```

---

## 5. Vérifications Post-Déploiement

### 5.1 Vérification des Services

```bash
# Vérifier que tous les conteneurs sont en cours d'exécution
docker ps

# Vérifier la santé de chaque service
docker exec pharma360-db-prod pg_isready -U pharma_admin -d pharma360_prod
curl http://localhost/api/health
curl http://localhost:8000/api/health
curl http://localhost:8001/api/health
```

### 5.2 Tests Fonctionnels

#### Test de l'API Backend
```bash
# Test de l'authentification
curl -X POST http://localhost:8000/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{"username": "admin", "password": "Admin@2025"}'

# Test des produits
curl -X GET http://localhost:8000/api/v1/products \
  -H "Authorization: Bearer VOTRE_TOKEN"
```

#### Test du Frontend
```bash
# Vérifier que le frontend est accessible
curl -I http://localhost
curl -I http://localhost/
```

#### Test du Service IA
```bash
# Test de l'OCR (si disponible)
curl -X POST http://localhost:8001/api/v1/ocr/invoice \
  -H "Content-Type: multipart/form-data" \
  -F "file=@/chemin/vers/facture.jpg"
```

### 5.3 Vérification de la Base de Données

```bash
# Se connecter à la base de données
docker exec -it pharma360-db-prod psql -U pharma_admin -d pharma360_prod

# Vérifier les tables
\dt

# Vérifier les données
SELECT * FROM users LIMIT 5;
SELECT * FROM products LIMIT 5;
```

---

## 6. Sauvegardes et Restauration

### 6.1 Sauvegardes Automatiques

Le système de sauvegardes est configuré automatiquement:
- **Fréquence**: Tous les jours à 2h00
- **Rétention**: 30 jours
- **Emplacement**: `/var/backups/pharma360`

#### Configuration de Cron

```bash
# Vérifier que la tâche cron est configurée
crontab -l | grep pharma360

# Si ce n'est pas le cas, l'ajouter
(crontab -l 2>/dev/null; echo "0 2 * * * /usr/local/bin/pharma360-backup") | crontab -
```

### 6.2 Sauvegarde Manuelle

```bash
# Exécuter une sauvegarde manuelle
./scripts/backup-db.sh

# Vérifier les sauvegardes
ls -la /var/backups/pharma360/
```

### 6.3 Restauration

```bash
# Restaurer depuis une sauvegarde
./scripts/restore-db.sh /var/backups/pharma360/pharma360_20250117_020000.sql

# Redémarrer les services
docker-compose --project-directory . -f docker/docker-compose.prod.yml restart pharma360-backend pharma360-frontend pharma360-ia
```

---

## 7. Surveillance et Maintenance

### 7.1 Surveillance des Conteneurs

```bash
# Voir les conteneurs en cours d'exécution
docker ps

# Voir les logs
docker logs pharma360-backend-prod -f
docker logs pharma360-db-prod -f

# Statistiques
docker stats
```

### 7.2 Surveillance des Performances

#### PostgreSQL
```bash
# Connexion à la base
docker exec -it pharma360-db-prod psql -U pharma_admin -d pharma360_prod

# Requêtes lentes
SELECT query, total_time, calls FROM pg_stat_statements ORDER BY total_time DESC LIMIT 10;

# Connexions actives
SELECT count(*) FROM pg_stat_activity;
```

#### Backend
```bash
# Vérifier les métriques
docker exec pharma360-backend-prod python -c "
import psutil
import json

# Mémoire
mem = psutil.virtual_memory()
print(f'Mémoire utilisée: {mem.used / 1024 / 1024:.2f} MB')
print(f'Mémoire disponible: {mem.available / 1024 / 1024:.2f} MB')

# CPU
cpu = psutil.cpu_percent(interval=1)
print(f'CPU utilisé: {cpu}%')
"
```

### 7.3 Nettoyage

```bash
# Nettoyer les conteneurs arrêtés
docker container prune

# Nettoyer les images inutilisées
docker image prune -a

# Nettoyer les volumes inutilisés
docker volume prune

# Nettoyer les sauvegardes anciennes (garder les 30 derniers jours)
find /var/backups/pharma360 -name "*.sql" -mtime +30 -delete
```

---

## 8. Résolution des Problèmes

### 8.1 Problèmes Courants

#### Problème: Les conteneurs ne démarrent pas
```bash
# Vérifier les logs des conteneurs
docker-compose --project-directory . -f docker/docker-compose.prod.yml logs

# Vérifier les ressources
docker stats

# Vérifier l'espace disque
df -h
```

#### Problème: La base de données n'est pas accessible
```bash
# Vérifier que PostgreSQL est en cours d'exécution
docker ps | grep pharma360-db-prod

# Tester la connexion
docker exec pharma360-db-prod pg_isready -U pharma_admin -d pharma360_prod

# Vérifier les logs de PostgreSQL
docker logs pharma360-db-prod
```

#### Problème: L'API retourne des erreurs 500
```bash
# Vérifier les logs du backend
docker logs pharma360-backend-prod

# Tester la connexion à la base depuis le backend
docker exec pharma360-backend-prod python -c "
import asyncio
from backend.core.database import async_session_maker

async def test_db():
    try:
        async with async_session_maker() as session:
            result = await session.execute('SELECT 1')
            print('Connexion à la base OK')
            print('Résultat:', result.scalar())
    except Exception as e:
        print('Erreur:', e)

asyncio.run(test_db())
"
```

#### Problème: Le frontend ne s'affiche pas
```bash
# Vérifier que le frontend est en cours d'exécution
docker ps | grep pharma360-frontend-prod

# Vérifier les logs
docker logs pharma360-frontend-prod

# Tester le service Nginx
docker exec pharma360-frontend-prod wget -O- http://localhost
```

### 8.2 Journalisation Centralisée

Tous les logs sont disponibles dans:
- `/var/log/pharma360/` - Logs de l'application
- `/var/log/nginx/` - Logs Nginx
- Logs Docker: `docker logs <container_name>`

---

## 9. Mises à Jour

### 9.1 Mise à Jour du Code

```bash
# Mettre à jour le code
cd /opt/pharma360/Pharma-360
git pull origin main

# Reconstruire les images
docker-compose --project-directory . -f docker/docker-compose.prod.yml build

# Redémarrer les conteneurs
docker-compose --project-directory . -f docker/docker-compose.prod.yml up -d --force-recreate
```

### 9.2 Mise à Jour des Dépendances

```bash
# Mettre à jour les dépendances Python
cd /opt/pharma360/Pharma-360
docker exec pharma360-backend-prod pip install --upgrade -r requirements.txt

# Mettre à jour les dépendances Node.js
docker exec pharma360-frontend-prod npm update

# Reconstruire les images
docker-compose --project-directory . -f docker/docker-compose.prod.yml build
```

### 9.3 Mise à Jour de la Base de Données

```bash
# Exécuter les nouvelles migrations
docker exec pharma360-backend-prod alembic upgrade head
```

---

## 10. Sécurité

### 10.1 Bonnes Pratiques

1. **Ne jamais commiter les fichiers .env**
   - Ils sont dans .gitignore
   - Utiliser des variables d'environnement externes en production

2. **Utiliser des mots de passe forts**
   - Minimum 16 caractères
   - Mélange de majuscules, minuscules, chiffres et caractères spéciaux

3. **Rotater les secrets régulièrement**
   - APP_SECRET_KEY: Tous les 6 mois
   - JWT_SECRET: Tous les 6 mois
   - Mots de passe PostgreSQL: Tous les 3 mois

4. **Accès restreint**
   - Seuls les administrateurs doivent avoir accès au serveur
   - Utiliser SSH avec clés publiques

### 10.2 Configuration SSL (Optionnel)

Pour activer HTTPS:

1. Obtenir un certificat SSL (Let's Encrypt)
```bash
sudo apt install -y certbot
sudo certbot certonly --standalone -d votre-domaine.com
```

2. Copier les certificats
```bash
sudo cp /etc/letsencrypt/live/votre-domaine.com/fullchain.pem /opt/pharma360/Pharma-360/docker/nginx/ssl/cert.pem
sudo cp /etc/letsencrypt/live/votre-domaine.com/privkey.pem /opt/pharma360/Pharma-360/docker/nginx/ssl/key.pem
sudo chown $USER:$USER /opt/pharma360/Pharma-360/docker/nginx/ssl/*.pem
```

3. Modifier `docker/nginx/nginx.prod.conf` pour activer SSL

4. Redémarrer Nginx
```bash
docker-compose --project-directory . -f docker/docker-compose.prod.yml restart pharma360-nginx
```

---

## Annexe A: Commandes Utiles

| Description | Commande |
|-------------|----------|
| Voir les logs | `docker-compose --project-directory . -f docker/docker-compose.prod.yml logs -f` |
| Arrêter les services | `docker-compose --project-directory . -f docker/docker-compose.prod.yml down` |
| Démarrer les services | `docker-compose --project-directory . -f docker/docker-compose.prod.yml up -d` |
| Reconstruire les images | `docker-compose --project-directory . -f docker/docker-compose.prod.yml build` |
| Exécuter une commande dans un conteneur | `docker exec -it <container> <command>` |
| Sauvegarder la base | `./scripts/backup-db.sh` |
| Restaurer la base | `./scripts/restore-db.sh <file>` |
| Vérifier la santé | `curl http://localhost/api/health` |

---

## Annexe B: Structure des Fichiers

```
/opt/pharma360/Pharma-360/
├── backend/
│   ├── core/
│   │   ├── config.py
│   │   ├── database.py
│   │   └── security.py
│   ├── models/
│   ├── api/
│   ├── services/
│   └── main.py
├── frontend/
│   ├── public/
│   ├── src/
│   └── dist/
├── ia/
│   ├── ocr/
│   ├── analytics/
│   └── services/
├── docker/
│   ├── backend.Dockerfile
│   ├── frontend.Dockerfile
│   ├── ia.Dockerfile
│   ├── docker-compose.yml
│   ├── docker-compose.prod.yml
│   └── nginx/
│       ├── nginx.conf
│       └── nginx.prod.conf
├── scripts/
│   ├── start.sh
│   ├── backup-db.sh
│   ├── restore-db.sh
│   └── deploy-prod.sh
├── docs/
│   └── DEPLOYMENT.md
├── .env.example
├── .env.production
├── docker-compose.yml
└── README.md
```

---

## Annexe C: Variables d'Environnement

### Variables Critiques

| Variable | Description | Valeur par défaut | Production |
|----------|-------------|-------------------|------------|
| APP_ENV | Environnement | development | production |
| APP_DEBUG | Mode debug | true | false |
| POSTGRES_DB | Nom de la base | pharma360_dev | pharma360_prod |
| POSTGRES_USER | Utilisateur PostgreSQL | pharma_user | pharma_admin |
| POSTGRES_PASSWORD | Mot de passe PostgreSQL | pharma_pass_2025 | [Sécurisé] |
| JWT_SECRET | Secret JWT | changer_par_une_cle | [Sécurisé] |
| APP_SECRET_KEY | Secret application | changer_par_une_cle | [Sécurisé] |

---

**Dernière mise à jour**: 2025-01-17  
**Responsable**: QA/DevOps  
**Statut**: EN COURS
