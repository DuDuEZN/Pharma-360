# ===========================================
# Backend Dockerfile - Pharma 360°
# ===========================================
# ID Tâche: QA-001
# Responsable: QA/DevOps
# Durée: 2 jours
# Statut: TERMINÉ
# Description: Dockerfile pour le service Backend (FastAPI + PostgreSQL)
# ===========================================

# Étape 1: Build (pour compiler les dépendances)
FROM python:3.11-slim as builder

# Configuration du builder
WORKDIR /app

# Installer les dépendances de build
RUN apt-get update && \
    apt-get install -y --no-install-recommends \
    build-essential \
    && rm -rf /var/lib/apt/lists/*

# Copier les fichiers de dépendances
COPY backend/requirements.txt backend/requirements-dev.txt ./

# Installer les dépendances Python dans un dossier dédié
RUN pip install --user -r requirements.txt

# Étape 2: Runtime (image finale optimisée)
FROM python:3.11-slim

# Configuration de l'image finale
WORKDIR /app

# Créer un utilisateur non-root pour la sécurité
RUN useradd --create-home --shell /bin/bash appuser && \
    mkdir -p /app && \
    chown appuser:appuser /app

# Copier les dépendances installées depuis le builder
COPY --from=builder /root/.local /home/appuser/.local

# Ajouter le chemin des binaires Python au PATH
ENV PATH=/home/appuser/.local/bin:$PATH

# Copier le code source
COPY backend/ /app

# Créer les répertoires nécessaires
RUN mkdir -p /app/logs /app/uploads /app/tests

# Changer le propriétaire des fichiers
RUN chown -R appuser:appuser /app

# Basculer vers l'utilisateur non-root
USER appuser

# Variables d'environnement
ENV PYTHONUNBUFFERED=1 \
    PYTHONDONTWRITEBYTECODE=1 \
    PIP_NO_CACHE_DIR=1 \
    PIP_DISABLE_PIP_VERSION_CHECK=1

# Port d'écoute
EXPOSE 8000

# Healthcheck pour vérifier que l'application est en bonne santé
HEALTHCHECK --interval=30s --timeout=10s --start-period=5s --retries=3 \
    CMD python -c "import httpx; httpx.get('http://localhost:8000/api/health').raise_for_status()" || exit 1

# Commande de démarrage
CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000"]
