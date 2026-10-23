# 🤖 **QA-003 : Dockerfile IA (Python 3.11 + Tesseract OCR)**

**ID Tâche** : QA-003  
**Responsable** : `agent-qa-quality-assurance-devops-engineer`  
**Durée** : 2 jours (J1-J2)  
**Statut** : ⏳ **À DÉMARRER** (J1)  
**Priorité** : ⭐⭐⭐⭐⭐ (Critique - Chemin critique)  
**Dépendances** : → ARCH-001 (Schéma d'Architecture Globale)  

---

## 📋 **Contexte et Objectifs**

Créer un **Dockerfile optimisé** pour le module **IA** de Pharmacie 360° afin de :
- **Conteneuriser** les algorithmes d'IA et le module OCR
- **Intégrer** Tesseract OCR pour la reconnaissance de factures
- **Isoler** les dépendances lourdes (Tesseract, ML libraries)
- **Garantir** la reproductibilité de l'environnement
- **Optimiser** la taille de l'image malgré les dépendances lourdes

---

## 🎯 **Spécifications Techniques**

### **1. Environnement de Base**

| Élément | Valeur | Justification |
|---------|--------|---------------|
| **Image de base** | `python:3.11-slim` | Python 3.11+ requis |
| **Working Directory** | `/app` | Standard pour les applications Python |
| **User** | `appuser` (non-root) | Sécurité : éviter root |
| **Port exposé** | `8001` | Port dédié pour le module IA |

### **2. Dépendances Système**

**Tesseract OCR** : Nécessite des dépendances système lourdes

```dockerfile
# Dépendances pour Tesseract OCR
RUN apt-get update && apt-get install -y --no-install-recommends \
    tesseract-ocr \
    tesseract-ocr-eng \
    tesseract-ocr-fra \
    libtesseract-dev \
    libleptonica-dev \
    # Dépendances pour OpenCV
    libopencv-dev \
    # Dépendances pour les modèles ML
    build-essential \
    && rm -rf /var/lib/apt/lists/*
```

### **3. Dépendances Python**

**Fichier** : `ia/requirements.txt` (à créer)

```text
# OCR
pytesseract==0.3.10
opencv-python-headless==4.8.1.78
Pillow==10.1.0

# Data Analysis
pandas==2.1.4
numpy==1.26.2
scipy==1.11.4

# Machine Learning
scikit-learn==1.3.2
# Optionnel pour les modèles plus avancés
# tensorflow==2.15.0
# pytorch==2.1.2

# API Client
httpx==0.26.0
fastapi==0.109.0
uvicorn==0.27.0

# Utilitaires
python-dotenv==1.0.0
python-multipart==0.0.6
```

### **4. Structure des Fichiers**

```
ia/
├── ocr/
│   ├── __init__.py
│   ├── scanner.py          # Traitement OCR des factures
│   ├── preprocessor.py     # Prétraitement des images
│   └── models/
│
├── analytics/
│   ├── __init__.py
│   ├── stock_rotation.py   # Analyse de rotation des stocks
│   ├── prediction.py       # Prédiction des ruptures
│   └── kpi_generator.py    # Génération de KPIs
│
├── models/
│   └── (modèles ML sauvegardés)
│
├── main.py                # Point d'entrée FastAPI
└── requirements.txt
```

---

## 📝 **Livrable : Dockerfile IA**

**Fichier** : `docker/ia.Dockerfile`

```dockerfile
# =============================================================================
# PHARMACIE 360° - IA Dockerfile
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
    PIP_DISABLE_PIP_VERSION_CHECK=1 \
    # Tesseract data path
    TESSDATA_PREFIX=/usr/share/tesseract-ocr/4.00/tessdata

# Install system dependencies for Tesseract and OpenCV
RUN apt-get update && apt-get install -y --no-install-recommends \
    # Tesseract OCR
    tesseract-ocr \
    tesseract-ocr-eng \
    tesseract-ocr-fra \
    libtesseract-dev \
    libleptonica-dev \
    # OpenCV
    libopencv-dev \
    # Build tools
    build-essential \
    # Clean up
    && rm -rf /var/lib/apt/lists/*

# Create and set working directory
WORKDIR /app

# Copy requirements first to leverage Docker cache
COPY ia/requirements.txt .

# Install Python dependencies
RUN pip install --user -r requirements.txt

# =============================================================================
# Stage 2: Runtime
# =============================================================================

FROM python:3.11-slim

# Set environment variables
ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1 \
    PATH="/root/.local/bin:$PATH" \
    TESSDATA_PREFIX=/usr/share/tesseract-ocr/4.00/tessdata

# Install runtime dependencies
RUN apt-get update && apt-get install -y --no-install-recommends \
    tesseract-ocr \
    tesseract-ocr-eng \
    tesseract-ocr-fra \
    libtesseract-dev \
    libleptonica-dev \
    libopencv-dev \
    && rm -rf /var/lib/apt/lists/*

# Create non-root user for security
RUN useradd -m -u 1000 appuser
WORKDIR /app
USER appuser

# Copy installed dependencies from builder
COPY --from=builder /root/.local /home/appuser/.local

# Copy application code
COPY ia/ .

# Ensure scripts in .local are usable
ENV PATH=/home/appuser/.local/bin:$PATH

# Expose port
EXPOSE 8001

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=10s --retries=3 \
    CMD python -c "import httpx; httpx.get('http://localhost:8001/api/health').raise_for_status()" || exit 1

# Entrypoint
CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8001"]
```

---

## 📄 **Fichier main.py pour le Module IA**

**Fichier** : `ia/main.py` (exemple de base)

```python
"""
Pharmacie 360° - IA Module
FastAPI application for AI services
"""

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

app = FastAPI(
    title="Pharmacie 360° - IA Module",
    description="Module d'Intelligence Artificielle pour l'analyse prédictive et OCR",
    version="1.0.0"
)

# CORS Configuration
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # À restreindre en production
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.get("/api/health")
async def health_check():
    """Health check endpoint"""
    return {"status": "healthy", "module": "ia"}


@app.get("/")
async def root():
    """Root endpoint"""
    return {
        "message": "Pharmacie 360° - IA Module",
        "endpoints": {
            "/api/health": "Health check",
            "/api/ocr": "OCR Processing (POST)",
            "/api/analytics/stock-rotation": "Stock Rotation Analysis",
            "/api/analytics/predictions": "Rupture Predictions",
            "/api/kpis": "KPIs Generation"
        }
    }


# Import and mount routers (à implémenter dans les tâches IA-*)
# from ocr.router import router as ocr_router
# from analytics.router import router as analytics_router
# app.include_router(ocr_router, prefix="/api/ocr")
# app.include_router(analytics_router, prefix="/api/analytics")
```

---

## 🔧 **Optimisations Appliquées**

| Optimisation | Description | Impact |
|--------------|-------------|--------|
| **Multi-stage build** | Séparation build/runtime | Réduction taille (~30%) |
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
docker build -f docker/ia.Dockerfile -t pharma360-ia:latest .
```

**⚠️ Note** : Le build peut prendre **10-15 minutes** à cause de Tesseract OCR.

### **2. Lancement du conteneur**

```bash
# Lancement avec variables d'environnement
docker run -d \
  --name pharma360-ia \
  -p 8001:8001 \
  -v ./ia/models:/app/models \  # Persistance des modèles
  pharma360-ia:latest
```

### **3. Vérifications**

- [ ] Le conteneur démarre sans erreur
- [ ] L'API IA est accessible sur `http://localhost:8001`
- [ ] Le endpoint `/api/health` retourne `{"status": "healthy", "module": "ia"}`
- [ ] Tesseract OCR est fonctionnel (test avec une image)
- [ ] Les dépendances sont correctement installées (`pip list`)
- [ ] L'utilisateur `appuser` existe et a les permissions

### **4. Test OCR de Base**

```bash
# Copier une image de test dans le conteneur
docker cp test_invoice.png pharma360-ia:/app/test_invoice.png

# Exécuter un test OCR
python -c "
import pytesseract
from PIL import Image
print(pytesseract.image_to_string(Image.open('test_invoice.png')))
"
```

---

## 📁 **Fichiers à Créer/Modifier**

| Fichier | Action | Statut |
|---------|--------|--------|
| `docker/ia.Dockerfile` | **Créer** | ⏳ |
| `ia/requirements.txt` | Créer | ⏳ |
| `ia/main.py` | Créer | ⏳ |
| `ia/ocr/__init__.py` | Créer | ⏳ |
| `ia/analytics/__init__.py` | Créer | ⏳ |

---

## 🔄 **Intégration avec docker-compose**

Ce Dockerfile sera utilisé dans `docker-compose.yml` (tâche QA-004) :

```yaml
services:
  ia:
    build:
      context: .
      dockerfile: docker/ia.Dockerfile
    ports:
      - "8001:8001"
    volumes:
      - ./ia/models:/app/models
    environment:
      - TESSDATA_PREFIX=/usr/share/tesseract-ocr/4.00/tessdata
    restart: unless-stopped
```

---

## 📊 **Critères d'Acceptation**

- [ ] Dockerfile valide et fonctionnel
- [ ] Image buildable sans erreur
- [ ] Conteneur démarrable et accessible
- [ ] Tesseract OCR fonctionnel (test avec image)
- [ ] API IA accessible et healthcheck OK
- [ ] Sécurité : non-root user, pas de secrets en dur
- [ ] Healthcheck fonctionnel
- [ ] Intégrable avec docker-compose
- [ ] Documentation claire dans le Dockerfile

---

## ⚠️ **Problèmes Connus et Solutions**

### **1. Tesseract OCR - Langues Additionnelles**

Si vous avez besoin de langues supplémentaires pour l'OCR :

```dockerfile
# Ajouter dans l'installation apt
RUN apt-get install -y --no-install-recommends \
    tesseract-ocr-spa \
    tesseract-ocr-ara \
    # ... autres langues
```

### **2. Problèmes de Permissions**

Si le conteneur n'a pas les permissions pour accéder aux volumes :

```dockerfile
# Ajouter dans le Dockerfile
RUN chown -R appuser:appuser /app
```

### **3. Taille de l'Image**

L'image peut être grande (>1GB) à cause de Tesseract. Pour réduire :
- Utiliser `tesseract-ocr-core` au lieu de `tesseract-ocr`
- Supprimer les fichiers de build après installation

---

## 📞 **Points de Contact et Support**

| Rôle | Agent | Canal | Disponibilité |
|------|-------|-------|---------------|
| **Superviseur** | `agent-superviseur-de-projet` | `#general` | J1-J20 |
| **Architecte** | `agent-superviseur-de-projet` | `#architecture` | J1-J20 |
| **IA** | `agent-data-scientist-expert-ia` | `#ia` | J1-J15 |

---

## 🎯 **Prochaines Étapes**

1. **J1** : Créer `docker/ia.Dockerfile` et `ia/requirements.txt`
2. **J1** : Créer `ia/main.py` et la structure de base
3. **J1-J2** : Builder l'image (peut prendre du temps)
4. **J2** : Tester Tesseract OCR avec une image de test
5. **J2** : Valider avec le superviseur
6. **J3** : Intégrer dans docker-compose (QA-004)

---

**Document créé** : 2025-01-05 (J1)  
**Responsable** : `agent-qa-quality-assurance-devops-engineer`  
**Statut** : ⏳ **À DÉMARRER**  
**Priorité** : ⭐⭐⭐⭐⭐

---

## 📚 **Ressources Utiles**

- [Tesseract OCR Documentation](https://github.com/tesseract-ocr/tesseract)
- [pytesseract Documentation](https://pypi.org/project/pytesseract/)
- [FastAPI Documentation](https://fastapi.tiangolo.com/)
- [Docker Multi-stage Builds](https://docs.docker.com/build/building/multi-stage/)
