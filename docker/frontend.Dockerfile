# ===========================================
# Frontend Dockerfile - Pharma 360
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
RUN npm ci && npm install --no-save @rollup/rollup-linux-x64-musl

# Copier le code source
COPY frontend/ .

# Builder l'application
RUN npm run build

# Étape 2: Runtime (nginx-unprivileged pour éviter les problèmes de permissions)
FROM nginxinc/nginx-unprivileged:alpine

# Copier les fichiers de build depuis le builder
COPY --from=builder /app/dist /usr/share/nginx/html

# Copier la configuration Nginx personnalisée
COPY docker/nginx/frontend.conf /etc/nginx/conf.d/default.conf

# Créer les répertoires nécessaires et régler les permissions
RUN mkdir -p /var/cache/nginx /var/log/nginx /etc/nginx/conf.d && \
    chown -R nginx:nginx /usr/share/nginx/html && \
    chown -R nginx:nginx /var/cache/nginx /var/log/nginx /etc/nginx/conf.d

# Port d'écoute
EXPOSE 8080

# Healthcheck pour vérifier que Nginx est en bonne santé
HEALTHCHECK --interval=30s --timeout=10s --start-period=5s --retries=3 \
    CMD wget --no-verbose --tries=1 --spider http://localhost:8080/ || exit 1

# Commande de démarrage
CMD ["nginx", "-g", "daemon off;"]
