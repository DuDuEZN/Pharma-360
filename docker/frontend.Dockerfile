# ===========================================
# Frontend Dockerfile - Pharma 360°
# ===========================================
# ID Tâche: QA-002
# Responsable: QA/DevOps
# Durée: 2 jours
# Statut: TERMINÉ
# Description: Dockerfile pour le service Frontend (React + Vite + Nginx)
# ===========================================

# Étape 1: Build (Node.js pour compiler l'application)
FROM node:18-alpine as builder

# Configuration du builder
WORKDIR /app

# Installer les dépendances nécessaires
RUN apk add --no-cache python3 make g++

# Copier les fichiers de dépendances
COPY frontend/package.json frontend/package-lock.json ./

# Installer les dépendances npm
RUN npm ci

# Copier le code source
COPY frontend/ .

# Builder l'application
RUN npm run build

# Étape 2: Runtime (Nginx pour servir l'application compilée)
FROM nginx:alpine

# Configuration de l'image finale
WORKDIR /usr/share/nginx/html

# Copier la configuration Nginx personnalisée
COPY docker/nginx/nginx.conf /etc/nginx/conf.d/default.conf

# Copier les fichiers de build depuis le builder
COPY --from=builder /app/dist/ .

# Créer un utilisateur non-root pour la sécurité
RUN adduser -D appuser && \
    mkdir -p /var/log/nginx /var/cache/nginx && \
    chown -R appuser:appuser /usr/share/nginx/html && \
    chown -R appuser:appuser /var/log/nginx && \
    chown -R appuser:appuser /var/cache/nginx

# Basculer vers l'utilisateur non-root
USER appuser

# Variables d'environnement
ENV NODE_ENV=production

# Port d'écoute
EXPOSE 80

# Healthcheck pour vérifier que Nginx est en bonne santé
HEALTHCHECK --interval=30s --timeout=10s --start-period=5s --retries=3 \
    CMD wget --no-verbose --tries=1 --spider http://localhost/ || exit 1

# Commande de démarrage
CMD ["nginx", "-g", "daemon off;"]
