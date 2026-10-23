# 🐳 **QA-001 : Dockerfile Backend (Python 3.11 + FastAPI)**

**ID Tâche** : QA-001  
**Responsable** : `agent-qa-quality-assurance-devops-engineer`  
**Durée** : 2 jours (J1-J2)  
**Statut** : ⏳ **À DÉMARRER** (J1)  
**Priorité** : ⭐⭐⭐⭐⭐ (Critique - Chemin critique)  
**Dépendances** : → ARCH-001 (Schéma d'Architecture Globale)  

---

## 📋 **Contexte et Objectifs**

Créer un **Dockerfile optimisé** pour le module **Backend** de Pharmacie 360° afin de :
- **Conteneuriser** l'application FastAPI en Python 3.11+
- **Isoler** les dépendances du backend
- **Garantir** la reproductibilité de l'environnement
- **Optimiser** la taille de l'image et le temps de build
- **Intégrer** avec docker-compose pour le déploiement multi-services

---

## 🎯 **Spécifications Techniques**

### **1. Environnement de Base**

| Élément | Valeur | Justification |
|---------|--------|---------------|
| **Image de base** | `python:3.11-slim` | Python 3.11+ requis, slim pour réduire la taille |
| **Working Directory** | `/app` | Standard pour les applications Python |
| **User** | `appuser` (non-root) | Sécurité : éviter root |
| **Port exposé** | `8000` | Port par défaut de FastAPI |

### **2. Dépendances Système**

```dockerfile
# Dépendances système pour psycopg2 (PostgreSQL) et autres
RUN apt-get update && apt-get install -y --no-install-recommends \
    build-essential \
    libpq-dev \
    && rm -rf /var/lib/apt/lists/*
```

### **3. Dépendances Python**

**Fichier** : `backend/requirements.txt` (à créer si inexistant)

```text
# Framework
fastapi==0.109.0
uvicorn[standard]==0.27.0
python-multipart==0.0.6

# Base de données
sqlalchemy==2.0.25
psycopg2-binary==2.9.9
alembic==1.13.1

# Authentification
python-jose[cryptography]==3.3.0
passlib[bcrypt]==1.7.4
python-dotenv==1.0.0

# Validation
pydantic==2.5.3
pydantic-settings==2.1.0

# WebSockets
python-socketio==5.10.0

# Utilitaires
httpx==0.26.0

# Développement (optionnel, à exclure en production)
# pytest==7.4.4
# black==24.1.1
# isort==5.13.2
```

### **4. Structure des Fichiers**

```
backend/
├── core/
│   ├── __init__.py
│   ├── config.py
│   ├── database.py
│   └── security.py
├── models/
├── schemas/
├── api/
├── services/
├── main.py
├── requirements.txt
└── Dockerfile  <-- Ce fichier
```

---

## 📝 **Livrable : Dockerfile Backend**

**Fichier** : `docker/backend.Dockerfile`

```dockerfile
# =============================================================================
# PHARMACIE 360° - Backend Dockerfile
# =============================================================================
# Base Image: Python 3.11 Slim
# Maintainer: QA/DevOps Team
# Version: 1.0.0
# =============================================================================

# Stage 1: Build
FROM python:3.11-slim as builder

# Set environment variables
ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1 \
    PIP_NO_CACHE_DIR=1 \
    PIP_DISABLE_PIP_VERSION_CHECK=1

# Install system dependencies
RUN apt-get update && apt-get install -y --no-install-recommends \
    build-essential \
    libpq-dev \
    && rm -rf /var/lib/apt/lists/*

# Create and set working directory
WORKDIR /app

# Copy requirements first to leverage Docker cache
COPY backend/requirements.txt .

# Install Python dependencies
RUN pip install --user -r requirements.txt

# =============================================================================
# Stage 2: Runtime
# =============================================================================

FROM python:3.11-slim

# Set environment variables
ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1 \
    PATH="/root/.local/bin:$PATH"

# Install runtime dependencies
RUN apt-get update && apt-get install -y --no-install-recommends \
    libpq5 \
    && rm -rf /var/lib/apt/lists/*

# Create non-root user for security
RUN useradd -m -u 1000 appuser
WORKDIR /app
USER appuser

# Copy installed dependencies from builder
COPY --from=builder /root/.local /home/appuser/.local

# Copy application code
COPY backend/ .

# Ensure scripts in .local are usable
ENV PATH=/home/appuser/.local/bin:$PATH

# Expose port
EXPOSE 8000

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
    CMD python -c "import httpx; httpx.get('http://localhost:8000/api/health').raise_for_status()" || exit 1

# Entrypoint
CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8000", "--reload"]
```

---

## 🔧 **Optimisations Appliquées**

| Optimisation | Description | Impact |
|--------------|-------------|--------|
| **Multi-stage build** | Séparation build/runtime | Réduction taille image (~50%) |
| **Non-root user** | Exécution en tant qu'utilisateur non-privilégié | Sécurité ✅ |
| **Cache Docker** | Copie de requirements.txt avant le code | Build plus rapide |
| **Nettoyage cache** | `rm -rf /var/lib/apt/lists/*` | Image plus légère |
| **Variables ENV** | `PYTHONDONTWRITEBYTECODE=1` | Pas de fichiers .pyc |
| **Healthcheck** | Vérification périodique | Fiabilité ✅ |

---

## ✅ **Validation et Tests**

### **1. Build de l'image**

```bash
# Depuis la racine du projet
docker build -f docker/backend.Dockerfile -t pharma360-backend:latest .
```

### **2. Lancement du conteneur**

```bash
# Lancement avec variables d'environnement
docker run -d \
  --name pharma360-backend \
  -p 8000:8000 \
  -e DATABASE_URL=postgresql://user:password@postgres:5432/pharma360 \
  -e SECRET_KEY=your-secret-key \
  pharma360-backend:latest
```

### **3. Vérifications**

- [ ] Le conteneur démarre sans erreur
- [ ] L'API est accessible sur `http://localhost:8000`
- [ ] Le endpoint `/api/health` retourne `{"status": "healthy"}`
- [ ] Les dépendances sont correctement installées (`pip list`)
- [ ] L'utilisateur `appuser` existe et a les permissions
- [ ] La taille de l'image est < 500MB

### **4. Tests d'Intégration**

```bash
# Test de connexion à l'API
curl -X GET http://localhost:8000/api/health

# Test des endpoints de base (à implémenter dans ARCH-001)
curl -X GET http://localhost:8000/api/
```

---

## 📁 **Fichiers à Créer/Modifier**

| Fichier | Action | Statut |
|---------|--------|--------|
| `docker/backend.Dockerfile` | **Créer** | ⏳ |
| `backend/requirements.txt` | Créer | ⏳ |
| `backend/main.py` | Vérifier (existe) | ⏳ |

---

## 🔄 **Intégration avec docker-compose**

Ce Dockerfile sera utilisé dans `docker-compose.yml` (tâche QA-004) :

```yaml
services:
  backend:
    build:
      context: .
      dockerfile: docker/backend.Dockerfile
    ports:
      - "8000:8000"
    environment:
      - DATABASE_URL=postgresql://user:password@postgres:5432/pharma360
      - SECRET_KEY=${SECRET_KEY}
    depends_on:
      - postgres
    volumes:
      - ./backend:/app
    restart: unless-stopped
```

---

## 📊 **Critères d'Acceptation**

- [ ] Dockerfile valide et fonctionnel
- [ ] Image buildable sans erreur
- [ ] Conteneur démarrable et accessible
- [ ] Taille de l'image optimisée (< 500MB)
- [ ] Sécurité : non-root user, pas de secrets en dur
- [ ] Healthcheck fonctionnel
- [ ] Intégrable avec docker-compose
- [ ] Documentation claire dans le Dockerfile

---

## 📞 **Points de Contact et Support**

| Rôle | Agent | Canal | Disponibilité |
|------|-------|-------|---------------|
| **Superviseur** | `agent-superviseur-de-projet` | `#general` | J1-J20 |
| **Architecte** | `agent-superviseur-de-projet` | `#architecture` | J1-J20 |
| **Backend Lead** | `agent-d-veloppeur-backend-lead` | `#backend` | J1-J55 |

---

## 🎯 **Prochaines Étapes**

1. **J1** : Créer `docker/backend.Dockerfile` et `backend/requirements.txt`
2. **J1** : Builder et tester l'image localement
3. **J2** : Valider avec le superviseur
4. **J3** : Intégrer dans docker-compose (QA-004)

---

**Document créé** : 2025-01-05 (J1)  
**Responsable** : `agent-qa-quality-assurance-devops-engineer`  
**Statut** : ⏳ **À DÉMARRER**  
**Priorité** : ⭐⭐⭐⭐⭐
