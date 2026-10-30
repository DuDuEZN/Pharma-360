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

# Étape 2: Runtime (nginx-unprivileged)
FROM nginxinc/nginx-unprivileged:alpine

# Installer wget pour le healthcheck
RUN apk add --no-cache wget

COPY --from=builder /app/dist /usr/share/nginx/html
COPY docker/nginx/frontend.conf /etc/nginx/conf.d/default.conf

EXPOSE 8080
