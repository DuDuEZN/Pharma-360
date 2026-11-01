# ===========================================
# IA Dockerfile - Pharma 360°
# ===========================================
# ID Tâche: QA-003
# Responsable: QA/DevOps
# Durée: 2 jours
# Statut: TERMINÉ
# Description: Dockerfile pour le service IA (OCR + Analytics + ML)
# ===========================================

# Étape 1: Build (pour installer Tesseract et les dépendances ML)
FROM python:3.11-slim-bookworm as builder

# Configuration du builder
WORKDIR /app

# Installer les dépendances système pour Tesseract OCR
RUN apt-get update && \
    apt-get install -y --no-install-recommends \
    tesseract-ocr \
    tesseract-ocr-fra \
    tesseract-ocr-eng \
    libtesseract-dev \
    libleptonica-dev \
    libopencv-dev \
    python3-opencv \
    gcc \
    python3-dev \
    && rm -rf /var/lib/apt/lists/*

# Installer les dépendances Python pour le build
RUN pip install --user --no-cache-dir \
    numpy==1.26.4 \
    pandas==2.2.1 \
    scikit-learn==1.4.1.post1 \
    opencv-python-headless==4.9.0.80 \
    pytesseract==0.3.10 \
    pillow==10.2.0

# Copier les fichiers de dépendances
COPY ia/requirements.txt .

# Installer les dépendances Python de l'application
RUN pip install --user -r requirements.txt

# Étape 2: Runtime (image finale optimisée)
FROM python:3.11-slim-bookworm

# Configuration de l'image finale
# Le code est copié dans le paquet /app/ia (imports "ia.*" et relatifs) et lancé
# depuis /app/ia afin que les chemins relatifs (./logs, ./uploads, ./models)
# correspondent aux volumes montés par docker-compose.
WORKDIR /app/ia

# Installer les dépendances système pour Tesseract (runtime)
RUN apt-get update && \
    apt-get install -y --no-install-recommends \
    tesseract-ocr \
    tesseract-ocr-fra \
    tesseract-ocr-eng \
    poppler-utils \
    libleptonica-dev \
    libopencv-dev \
    && rm -rf /var/lib/apt/lists/*

# Créer un utilisateur non-root pour la sécurité
RUN useradd --create-home --shell /bin/bash appuser && \
    mkdir -p /app/ia && \
    chown appuser:appuser /app /app/ia

# Copier les dépendances installées depuis le builder
COPY --from=builder /root/.local /home/appuser/.local

# Ajouter le chemin des binaires Python au PATH
ENV PATH=/home/appuser/.local/bin:$PATH

# Copier le code source
COPY ia/ /app/ia

# Créer les répertoires nécessaires
RUN mkdir -p /app/ia/logs /app/ia/uploads /app/ia/models /app/ia/tests

# Changer le propriétaire des fichiers
RUN chown -R appuser:appuser /app

# Basculer vers l'utilisateur non-root
USER appuser

# Variables d'environnement
ENV PYTHONUNBUFFERED=1 \
    PYTHONDONTWRITEBYTECODE=1 \
    PIP_NO_CACHE_DIR=1 \
    PIP_DISABLE_PIP_VERSION_CHECK=1 \
    PYTHONPATH=/app

# Port d'écoute
EXPOSE 8001

# Healthcheck pour vérifier que l'application est en bonne santé
HEALTHCHECK --interval=30s --timeout=10s --start-period=10s --retries=3 \
    CMD python -c "import httpx; httpx.get('http://localhost:8001/api/health').raise_for_status()" || exit 1

# Commande de démarrage
CMD ["uvicorn", "ia.main:app", "--host", "0.0.0.0", "--port", "8001"]
