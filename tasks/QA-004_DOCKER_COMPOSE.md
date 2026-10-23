# 🐳 **QA-004 : docker-compose.yml + nginx.conf + .env**

**ID Tâche** : QA-004  
**Responsable** : `agent-qa-quality-assurance-devops-engineer`  
**Durée** : 1 jour (J3)  
**Statut** : ⏳ **À DÉMARRER** (J3)  
**Priorité** : ⭐⭐⭐⭐⭐ (Critique - Chemin critique)  
**Dépendances** : → QA-001 **||** QA-002 **||** QA-003  

---

## 📋 **Contexte et Objectifs**

Créer la **configuration Docker Compose** complète pour orchestrer tous les services de Pharmacie 360° :
- **Backend** (FastAPI)
- **Frontend** (React + Nginx)
- **IA** (FastAPI + Tesseract)
- **PostgreSQL** (Base de données)
- **Nginx** (Reverse Proxy optionnel)

**Objectifs** :
- Orchestrer tous les services en un seul fichier
- Définir les réseaux et volumes nécessaires
- Configurer les dépendances entre services
- Faciliter le déploiement local
- Intégrer la configuration environnementale

---

## 🎯 **Spécifications Techniques**

### **1. Architecture des Services**

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                        DOCKER COMPOSE ARCHITECTURE                           │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│  ┌─────────────────────────────────────────────────────────────────────┐    │
│  │                              CLIENT (Navigateur)                          │    │
│  └─────────────────────────────────────────────────────────────────────┘    │
│                                      │                                        │
│                                      ▼                                        │
│  ┌─────────────────────────────────────────────────────────────────────┐    │
│  │                            NGINX (Reverse Proxy)                          │    │
│  │                         (Port 80/443)                                   │    │
│  └───────────────────────────────┬─────────────────────────────────────┘    │
│                                      │                                        │
│              ┌───────────────────────┼───────────────────────┐              │
│              ▼                       ▼                       ▼              │
│  ┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐        │
│  │   **Frontend**   │    │    **Backend**   │    │      **IA**      │        │
│  │   (Nginx)        │    │   (FastAPI)      │    │   (FastAPI)      │        │
│  │   Port: 3000     │    │   Port: 8000     │    │   Port: 8001     │        │
│  └─────────────────┘    └────────┬────────┘    └─────────────────┘        │
│                                      │                                        │
│                                      ▼                                        │
│  ┌─────────────────────────────────────────────────────────────────────┐    │
│  │                         POSTGRESQL (Port 5432)                          │    │
│  │                         Volume: pg_data                                │    │
│  └─────────────────────────────────────────────────────────────────────┘    │
│                                                                              │
└─────────────────────────────────────────────────────────────────────────────┘
```

### **2. Réseaux Docker**

| Réseau | Description | Services Connectés |
|--------|-------------|---------------------|
| `pharma360_network` | Réseau principal pour la communication inter-services | Tous |

### **3. Volumes Docker**

| Volume | Description | Monté sur |
|--------|-------------|------------|
| `pg_data` | Données PostgreSQL | `/var/lib/postgresql/data` |
| `ia_models` | Modèles ML pour le module IA | `/app/models` |

---

## 📝 **Livrable 1 : docker-compose.yml**

**Fichier** : `docker-compose.yml`

```yaml
# =============================================================================
# PHARMACIE 360° - Docker Compose Configuration
# =============================================================================
# Version: 1.0.0
# Maintainer: QA/DevOps Team
# =============================================================================

version: '3.8'

# -----------------------------------------------------------------------------
# Services
# -----------------------------------------------------------------------------

services:
  # ===========================================================================
  # PostgreSQL Database
  # ===========================================================================
  postgres:
    image: postgres:15-alpine
    container_name: pharma360-postgres
    restart: unless-stopped
    environment:
      - POSTGRES_DB=${POSTGRES_DB:-pharma360}
      - POSTGRES_USER=${POSTGRES_USER:-pharma_user}
      - POSTGRES_PASSWORD=${POSTGRES_PASSWORD:-pharma_pass}
    volumes:
      - pg_data:/var/lib/postgresql/data
      - ./scripts/init-db.sql:/docker-entrypoint-initdb.d/init-db.sql
    ports:
      - "5432:5432"
    networks:
      - pharma360_network
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U ${POSTGRES_USER:-pharma_user} -d ${POSTGRES_DB:-pharma360}"]
      interval: 5s
      timeout: 5s
      retries: 5
    
    # Configuration pour les sauvegardes
    command: postgres -c config_file=/etc/postgresql/postgresql.conf

  # ===========================================================================
  # Backend Service (FastAPI)
  # ===========================================================================
  backend:
    build:
      context: .
      dockerfile: docker/backend.Dockerfile
    container_name: pharma360-backend
    restart: unless-stopped
    environment:
      - DATABASE_URL=postgresql://${POSTGRES_USER:-pharma_user}:${POSTGRES_PASSWORD:-pharma_pass}@postgres:5432/${POSTGRES_DB:-pharma360}
      - SECRET_KEY=${SECRET_KEY:-your-secret-key-change-in-production}
      - ALGORITHM=${ALGORITHM:-HS256}
      - ACCESS_TOKEN_EXPIRE_MINUTES=${ACCESS_TOKEN_EXPIRE_MINUTES:-30}
      - IA_API_URL=http://ia:8001
    ports:
      - "8000:8000"
    depends_on:
      postgres:
        condition: service_healthy
    volumes:
      - ./backend:/app
    networks:
      - pharma360_network
    healthcheck:
      test: ["CMD", "python", "-c", "import httpx; httpx.get('http://localhost:8000/api/health').raise_for_status()"]
      interval: 30s
      timeout: 10s
      retries: 3
      start_period: 10s

  # ===========================================================================
  # IA Service (FastAPI + Tesseract OCR)
  # ===========================================================================
  ia:
    build:
      context: .
      dockerfile: docker/ia.Dockerfile
    container_name: pharma360-ia
    restart: unless-stopped
    environment:
      - TESSDATA_PREFIX=/usr/share/tesseract-ocr/4.00/tessdata
      - BACKEND_API_URL=http://backend:8000
    ports:
      - "8001:8001"
    volumes:
      - ./ia/models:/app/models
    networks:
      - pharma360_network
    healthcheck:
      test: ["CMD", "python", "-c", "import httpx; httpx.get('http://localhost:8001/api/health').raise_for_status()"]
      interval: 30s
      timeout: 10s
      retries: 3
      start_period: 15s
    
    # Limiter les ressources (Tesseract peut être gourmand)
    deploy:
      resources:
        limits:
          memory: 2G

  # ===========================================================================
  # Frontend Service (Nginx)
  # ===========================================================================
  frontend:
    build:
      context: .
      dockerfile: docker/frontend.Dockerfile
    container_name: pharma360-frontend
    restart: unless-stopped
    environment:
      - API_URL=http://backend:8000
      - WS_URL=ws://backend:8000
    ports:
      - "3000:80"
    depends_on:
      - backend
      - ia
    networks:
      - pharma360_network
    healthcheck:
      test: ["CMD", "wget", "-q", "--spider", "http://localhost/health"]
      interval: 30s
      timeout: 5s
      retries: 3
      start_period: 10s

  # ===========================================================================
  # Nginx Reverse Proxy (Optionnel - pour production)
  # ===========================================================================
  nginx:
    image: nginx:alpine
    container_name: pharma360-nginx
    restart: unless-stopped
    ports:
      - "80:80"
      - "443:443"
    volumes:
      - ./docker/nginx.conf:/etc/nginx/conf.d/default.conf
      - ./docker/ssl:/etc/nginx/ssl
    depends_on:
      - frontend
      - backend
      - ia
    networks:
      - pharma360_network
    profiles:
      - production
    healthcheck:
      test: ["CMD", "wget", "-q", "--spider", "http://localhost"]
      interval: 30s
      timeout: 5s
      retries: 3

# -----------------------------------------------------------------------------
# Volumes
# -----------------------------------------------------------------------------

volumes:
  pg_data:
    driver: local

# -----------------------------------------------------------------------------
# Networks
# -----------------------------------------------------------------------------

networks:
  pharma360_network:
    driver: bridge
```

---

## 📝 **Livrable 2 : nginx.conf (Production)**

**Fichier** : `docker/nginx.conf`

```nginx
# PHARMACIE 360° - Nginx Reverse Proxy Configuration
# Utilisé pour le déploiement en production

# Configuration globale
user nginx;
worker_processes auto;

# Configuration des logs
error_log /var/log/nginx/error.log warn;
pid /var/run/nginx.pid;

# Configuration des événements
events {
    worker_connections 1024;
}

# Configuration HTTP
http {
    include /etc/nginx/mime.types;
    default_type application/octet-stream;

    # Logging
    log_format main '$remote_addr - $remote_user [$time_local] "$request" '
                    '$status $body_bytes_sent "$http_referer" '
                    '"$http_user_agent" "$http_x_forwarded_for"';
    access_log /var/log/nginx/access.log main;

    # Performance
    sendfile on;
    tcp_nopush on;
    tcp_nodelay on;
    keepalive_timeout 65;
    types_hash_max_size 2048;

    # Gzip compression
    gzip on;
    gzip_vary on;
    gzip_proxied any;
    gzip_comp_level 6;
    gzip_types text/plain text/css text/xml application/json application/javascript 
               application/xml application/xml+rss text/javascript image/svg+xml;

    # Cache
    proxy_cache_path /var/cache/nginx levels=1:2 keys_zone=pharma_cache:10m 
                       inactive=60m use_temp_path=off;

    # Server configuration
    server {
        listen 80;
        server_name localhost;
        return 301 https://$host$request_uri;
    }

    server {
        listen 443 ssl;
        server_name localhost;

        # SSL Configuration
        ssl_certificate /etc/nginx/ssl/pharma360.crt;
        ssl_certificate_key /etc/nginx/ssl/pharma360.key;
        ssl_protocols TLSv1.2 TLSv1.3;
        ssl_prefer_server_ciphers on;
        ssl_ciphers 'ECDHE-ECDSA-AES128-GCM-SHA256:ECDHE-RSA-AES128-GCM-SHA256';

        # Root location
        location / {
            proxy_pass http://frontend:80;
            proxy_set_header Host $host;
            proxy_set_header X-Real-IP $remote_addr;
            proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
            proxy_set_header X-Forwarded-Proto $scheme;
        }

        # Backend API
        location /api/ {
            proxy_pass http://backend:8000;
            proxy_set_header Host $host;
            proxy_set_header X-Real-IP $remote_addr;
            proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
            proxy_set_header X-Forwarded-Proto $scheme;
            
            # Cache des réponses GET
            proxy_cache pharma_cache;
            proxy_cache_key "$scheme$request_method$host$request_uri";
            proxy_cache_valid 200 302 10m;
            proxy_cache_valid 404 1m;
        }

        # IA API
        location /ia/ {
            proxy_pass http://ia:8001;
            proxy_set_header Host $host;
            proxy_set_header X-Real-IP $remote_addr;
            proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
            proxy_set_header X-Forwarded-Proto $scheme;
        }

        # WebSocket
        location /ws/ {
            proxy_pass http://backend:8000;
            proxy_http_version 1.1;
            proxy_set_header Upgrade $http_upgrade;
            proxy_set_header Connection "upgrade";
            proxy_set_header Host $host;
            proxy_set_header X-Real-IP $remote_addr;
        }

        # Static files caching
        location ~* \.(js|css|png|jpg|jpeg|gif|ico|svg|woff|woff2|ttf|eot)$ {
            proxy_pass http://frontend;
            expires 1y;
            add_header Cache-Control "public, immutable";
        }

        # Health check
        location /health {
            access_log off;
            return 200 "healthy\n";
            add_header Content-Type text/plain;
        }
    }
}
```

---

## 📝 **Livrable 3 : .env (Configuration Environnementale)**

**Fichier** : `.env` (à ne **pas commiter** dans Git !)

```ini
# =============================================================================
# PHARMACIE 360° - Configuration Environnementale
# =============================================================================

# -----------------------------------------------------------------------------
# PostgreSQL Configuration
# -----------------------------------------------------------------------------
POSTGRES_DB=pharma360
POSTGRES_USER=pharma_user
POSTGRES_PASSWORD=pharma_pass_secure_123
POSTGRES_HOST=postgres
POSTGRES_PORT=5432

# -----------------------------------------------------------------------------
# Backend Configuration
# -----------------------------------------------------------------------------
DATABASE_URL=postgresql://${POSTGRES_USER}:${POSTGRES_PASSWORD}@${POSTGRES_HOST}:${POSTGRES_PORT}/${POSTGRES_DB}
SECRET_KEY=your-very-secure-secret-key-change-in-production-1234567890
ALGORITHM=HS256
ACCESS_TOKEN_EXPIRE_MINUTES=30

# -----------------------------------------------------------------------------
# IA Configuration
# -----------------------------------------------------------------------------
TESSDATA_PREFIX=/usr/share/tesseract-ocr/4.00/tessdata
BACKEND_API_URL=http://backend:8000

# -----------------------------------------------------------------------------
# Frontend Configuration
# -----------------------------------------------------------------------------
API_URL=http://backend:8000
WS_URL=ws://backend:8000

# -----------------------------------------------------------------------------
# Production Configuration (optionnel)
# -----------------------------------------------------------------------------
# PRODUCTION=true
# DEBUG=False
```

**Fichier** : `.env.example` (à commiter pour référence)

```ini
# =============================================================================
# PHARMACIE 360° - Configuration Environnementale (Exemple)
# =============================================================================
# Copiez ce fichier en .env et modifiez les valeurs

# PostgreSQL Configuration
POSTGRES_DB=pharma360
POSTGRES_USER=pharma_user
POSTGRES_PASSWORD=your_secure_password
POSTGRES_HOST=postgres
POSTGRES_PORT=5432

# Backend Configuration
DATABASE_URL=postgresql://${POSTGRES_USER}:${POSTGRES_PASSWORD}@${POSTGRES_HOST}:${POSTGRES_PORT}/${POSTGRES_DB}
SECRET_KEY=your-very-secure-secret-key-change-in-production
ALGORITHM=HS256
ACCESS_TOKEN_EXPIRE_MINUTES=30

# IA Configuration
TESSDATA_PREFIX=/usr/share/tesseract-ocr/4.00/tessdata
BACKEND_API_URL=http://backend:8000

# Frontend Configuration
API_URL=http://backend:8000
WS_URL=ws://backend:8000
```

---

## 📁 **Fichiers à Créer/Modifier**

| Fichier | Action | Statut |
|---------|--------|--------|
| `docker-compose.yml` | **Créer** | ⏳ |
| `docker/nginx.conf` | Créer/Modifier | ⏳ |
| `.env` | Créer (ne pas commiter) | ⏳ |
| `.env.example` | Créer | ⏳ |
| `scripts/init-db.sql` | Créer (optionnel) | ⏳ |

---

## ✅ **Validation et Tests**

### **1. Lancement des Services**

```bash
# Démarrer tous les services
docker-compose up -d

# Vérifier le statut
docker-compose ps
```

### **2. Vérifications Individuelles**

```bash
# Vérifier PostgreSQL
docker-compose exec postgres psql -U pharma_user -d pharma360 -c "SELECT 1;"

# Vérifier Backend
curl -X GET http://localhost:8000/api/health

# Vérifier IA
curl -X GET http://localhost:8001/api/health

# Vérifier Frontend
curl -X GET http://localhost:3000/health
```

### **3. Tests de Communication Inter-Services**

```bash
# Test Backend → PostgreSQL
curl -X GET http://localhost:8000/api/health

# Test Frontend → Backend (via proxy)
# (À tester une fois le frontend développé)

# Test IA → Backend
# (À tester une fois l'IA développée)
```

### **4. Tests de Healthcheck**

```bash
# Vérifier tous les healthchecks
docker-compose ps

# Voir les logs d'un service spécifique
docker-compose logs backend
```

---

## 🔧 **Script de Lancement (start.sh)**

**Fichier** : `scripts/start.sh`

```bash
#!/bin/bash

# PHARMACIE 360° - Script de Lancement
# Ce script lance tous les services Docker

# Couleurs pour les messages
green='\033[0;32m'
blue='\033[0;34m'
red='\033[0;31m'
nc='\033[0m' # No Color

# Fonction pour afficher les messages
function message {
    echo -e "${blue}[PHARMA360]${nc} $1"
}

function success {
    echo -e "${green}[SUCCESS]${nc} $1"
}

function error {
    echo -e "${red}[ERROR]${nc} $1"
}

# Vérifier Docker
message "Vérification de Docker..."
if ! command -v docker &> /dev/null; then
    error "Docker n'est pas installé. Veuillez installer Docker et réessayer."
    exit 1
fi

# Vérifier docker-compose
message "Vérification de docker-compose..."
if ! command -v docker-compose &> /dev/null; then
    error "docker-compose n'est pas installé. Veuillez installer docker-compose et réessayer."
    exit 1
fi

# Vérifier le fichier .env
message "Vérification du fichier .env..."
if [ ! -f ".env" ]; then
    error "Fichier .env introuvable. Copiez .env.example en .env et configurez-le."
    exit 1
fi

# Arrêter les conteneurs existants
message "Arrêt des conteneurs existants..."
docker-compose down

# Lancer les services
message "Lancement des services..."
docker-compose up -d --build

# Attendre que les services soient prêts
message "Attente du démarrage des services..."
sleep 10

# Vérifier les services
SERVICES=("postgres" "backend" "ia" "frontend")
ALL_HEALTHY=true

for service in "${SERVICES[@]}"; do
    message "Vérification de $service..."
    if [ "$service" == "postgres" ]; then
        if docker-compose exec postgres pg_isready -U ${POSTGRES_USER:-pharma_user} -d ${POSTGRES_DB:-pharma360} &> /dev/null; then
            success "$service est prêt"
        else
            error "$service n'est pas prêt"
            ALL_HEALTHY=false
        fi
    else
        if docker-compose ps | grep -q "$service.*Up (healthy)"; then
            success "$service est prêt"
        else
            error "$service n'est pas prêt"
            ALL_HEALTHY=false
        fi
    fi
done

if [ "$ALL_HEALTHY" = true ]; then
    success "Tous les services sont prêts !"
    echo ""
    echo "Accès aux services :"
    echo "  - Frontend: http://localhost:3000"
    echo "  - Backend API: http://localhost:8000"
    echo "  - IA API: http://localhost:8001"
    echo "  - PostgreSQL: localhost:5432"
else
    error "Certains services ne sont pas prêts. Voir les logs pour plus de détails."
    exit 1
fi
```

---

## 📄 **Fichier init-db.sql (Optionnel)**

**Fichier** : `scripts/init-db.sql`

```sql
-- PHARMACIE 360° - Initialisation de la Base de Données
-- Ce script est exécuté automatiquement au premier démarrage de PostgreSQL

-- Créer les extensions nécessaires
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Créer les tables de base (à compléter avec ARCH-002)
-- Voir docs/ARCH-001_SPECIFICATIONS.md pour le schéma complet

-- Message de confirmation
DO $$
BEGIN
    RAISE NOTICE 'Base de données initialisée pour Pharmacie 360°';
END $$;
```

---

## 📊 **Critères d'Acceptation**

- [ ] `docker-compose.yml` valide et fonctionnel
- [ ] Tous les services démarrent sans erreur
- [ ] Communication inter-services fonctionnelle
- [ ] Healthchecks configurés et fonctionnels
- [ ] `.env.example` documenté
- [ ] `start.sh` fonctionnel
- [ ] Nginx configuré pour la production (optionnel)
- [ ] Documentation claire dans les fichiers

---

## 🎯 **Prochaines Étapes**

1. **J3** : Créer `docker-compose.yml`
2. **J3** : Finaliser `docker/nginx.conf`
3. **J3** : Créer `.env.example` et `.env` (local)
4. **J3** : Créer `scripts/start.sh`
5. **J3** : Tester l'orchestration complète
6. **J3** : Valider avec le superviseur

---

## 📞 **Points de Contact et Support**

| Rôle | Agent | Canal | Disponibilité |
|------|-------|-------|---------------|
| **Superviseur** | `agent-superviseur-de-projet` | `#general` | J1-J20 |
| **Architecte** | `agent-superviseur-de-projet` | `#architecture` | J1-J20 |
| **Backend Lead** | `agent-d-veloppeur-backend-lead` | `#backend` | J1-J55 |
| **Frontend** | `agent-d-veloppeur-frontend` | `#frontend` | J1-J55 |
| **IA** | `agent-data-scientist-expert-ia` | `#ia` | J1-J15 |

---

**Document créé** : 2025-01-05 (J1)  
**Responsable** : `agent-qa-quality-assurance-devops-engineer`  
**Statut** : ⏳ **À DÉMARRER** (J3)  
**Priorité** : ⭐⭐⭐⭐⭐

---

## 📚 **Ressources Utiles**

- [Docker Compose Documentation](https://docs.docker.com/compose/)
- [Nginx Configuration Guide](https://nginx.org/en/docs/)
- [PostgreSQL Docker Image](https://hub.docker.com/_/postgres)
- [FastAPI Docker Guide](https://fastapi.tiangolo.com/deployment/docker/)
