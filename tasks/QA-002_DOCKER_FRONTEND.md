# 🐳 **QA-002 : Dockerfile Frontend (Node 18 + Nginx)**

**ID Tâche** : QA-002  
**Responsable** : `agent-qa-quality-assurance-devops-engineer`  
**Durée** : 2 jours (J1-J2)  
**Statut** : ⏳ **À DÉMARRER** (J1)  
**Priorité** : ⭐⭐⭐⭐⭐ (Critique - Chemin critique)  
**Dépendances** : → ARCH-001 (Schéma d'Architecture Globale)  

---

## 📋 **Contexte et Objectifs**

Créer un **Dockerfile optimisé** pour le module **Frontend** de Pharmacie 360° afin de :
- **Conteneuriser** l'application React.js (Vite) en Node 18+
- **Builder** l'application en mode production
- **Servir** les fichiers statiques via Nginx
- **Isoler** les dépendances du frontend
- **Garantir** la reproductibilité et la performance

---

## 🎯 **Spécifications Techniques**

### **1. Environnement de Base**

| Élément | Valeur | Justification |
|---------|--------|---------------|
| **Image de base (Build)** | `node:18-alpine` | Node 18+ requis, Alpine pour réduire la taille |
| **Image de base (Runtime)** | `nginx:alpine` | Nginx léger pour servir les fichiers statiques |
| **Working Directory** | `/app` | Standard pour les applications Node |
| **Port exposé** | `3000` | Port par défaut pour le frontend en dev, `80` pour Nginx |

### **2. Dépendances**

**Fichier** : `frontend/package.json` (à créer si inexistant)

```json
{
  "name": "pharma360-frontend",
  "version": "1.0.0",
  "private": true,
  "type": "module",
  "scripts": {
    "dev": "vite",
    "build": "vite build",
    "preview": "vite preview",
    "lint": "eslint . --ext js,jsx --report-unused-disable-directives --max-warnings 0"
  },
  "dependencies": {
    "react": "^18.2.0",
    "react-dom": "^18.2.0",
    "react-router-dom": "^6.21.0",
    "axios": "^1.6.2",
    "socket.io-client": "^4.7.2",
    "tailwindcss": "^3.3.6",
    "postcss": "^8.4.32",
    "autoprefixer": "^10.4.16",
    "chart.js": "^4.4.1",
    "react-chartjs-2": "^5.2.0",
    "lucide-react": "^0.294.0",
    "clsx": "^2.0.0"
  },
  "devDependencies": {
    "@types/react": "^18.2.43",
    "@types/react-dom": "^18.2.17",
    "@vitejs/plugin-react": "^4.2.1",
    "vite": "^5.0.8",
    "eslint": "^8.55.0",
    "eslint-plugin-react": "^7.33.2",
    "eslint-plugin-react-hooks": "^4.6.0",
    "eslint-plugin-react-refresh": "^0.4.5"
  }
}
```

### **3. Configuration Vite**

**Fichier** : `frontend/vite.config.js`

```javascript
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    port: 3000,
    proxy: {
      '/api': {
        target: 'http://backend:8000',
        changeOrigin: true,
      },
      '/ws': {
        target: 'ws://backend:8000',
        ws: true,
      }
    }
  },
  build: {
    outDir: 'dist',
    sourcemap: false,
  }
})
```

### **4. Structure des Fichiers**

```
frontend/
├── public/
│   └── index.html
├── src/
│   ├── components/
│   ├── pages/
│   ├── hooks/
│   ├── services/
│   ├── context/
│   ├── utils/
│   ├── App.jsx
│   └── main.jsx
├── package.json
├── vite.config.js
├── tailwind.config.js
├── postcss.config.js
└── Dockerfile  <-- Ce fichier
```

---

## 📝 **Livrable : Dockerfile Frontend**

**Fichier** : `docker/frontend.Dockerfile`

```dockerfile
# =============================================================================
# PHARMACIE 360° - Frontend Dockerfile
# =============================================================================
# Base Image: Node 18 Alpine (Build) + Nginx Alpine (Runtime)
# Maintainer: QA/DevOps Team
# Version: 1.0.0
# =============================================================================

# Stage 1: Build with Node.js
FROM node:18-alpine as builder

# Set working directory
WORKDIR /app

# Install dependencies
COPY frontend/package.json .
COPY frontend/package-lock.json .

# Install all dependencies (including devDependencies for build)
RUN npm ci

# Copy source files
COPY frontend/ .

# Build the application
RUN npm run build

# =============================================================================
# Stage 2: Serve with Nginx
# =============================================================================

FROM nginx:alpine

# Remove default Nginx configuration
RUN rm /etc/nginx/conf.d/default.conf

# Copy built files from builder
COPY --from=builder /app/dist /usr/share/nginx/html

# Copy custom Nginx configuration
COPY docker/nginx.conf /etc/nginx/conf.d/pharma360.conf

# Copy health check script
COPY docker/healthcheck.sh /healthcheck.sh
RUN chmod +x /healthcheck.sh

# Expose port 80
EXPOSE 80

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
    CMD /healthcheck.sh || exit 1

# Start Nginx
CMD ["nginx", "-g", "daemon off;"]
```

---

## 📄 **Fichier Nginx**

**Fichier** : `docker/nginx.conf`

```nginx
# PHARMACIE 360° - Nginx Configuration
server {
    listen 80;
    server_name localhost;
    root /usr/share/nginx/html;
    index index.html;

    # Gzip compression
    gzip on;
    gzip_types text/plain text/css application/json application/javascript text/xml application/xml application/xml+rss text/javascript;
    gzip_min_length 1000;

    # Cache static assets
    location ~* \.(js|css|png|jpg|jpeg|gif|ico|svg|woff|woff2|ttf|eot)$ {
        expires 1y;
        add_header Cache-Control "public, immutable";
    }

    # Proxy API requests to backend
    location /api/ {
        proxy_pass http://backend:8000;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }

    # Proxy WebSocket connections
    location /ws/ {
        proxy_pass http://backend:8000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
    }

    # Serve single-page application
    location / {
        try_files $uri $uri/ /index.html;
    }

    # Health check endpoint
    location /health {
        access_log off;
        return 200 "healthy\n";
        add_header Content-Type text/plain;
    }
}
```

---

## 📄 **Script de Healthcheck**

**Fichier** : `docker/healthcheck.sh`

```bash
#!/bin/sh

# Health check for Nginx
if ! pgrep -x "nginx" > /dev/null; then
    echo "Nginx is not running"
    exit 1
fi

# Check if the health endpoint is accessible
if ! wget -q --spider http://localhost/health; then
    echo "Health endpoint not accessible"
    exit 1
fi

echo "Frontend is healthy"
exit 0
```

---

## 🔧 **Optimisations Appliquées**

| Optimisation | Description | Impact |
|--------------|-------------|--------|
| **Multi-stage build** | Build avec Node, runtime avec Nginx | Réduction taille image (~80%) |
| **Alpine Linux** | Images légères | Image < 200MB |
| **Cache Nginx** | Cache des assets statiques | Meilleure performance |
| **Gzip** | Compression des réponses | Réduction bande passante |
| **Healthcheck** | Vérification Nginx + endpoint | Fiabilité ✅ |
| **Proxy API** | Proxy vers le backend | Intégration transparente |

---

## ✅ **Validation et Tests**

### **1. Build de l'image**

```bash
# Depuis la racine du projet
docker build -f docker/frontend.Dockerfile -t pharma360-frontend:latest .
```

### **2. Lancement du conteneur**

```bash
# Lancement standalone (pour test)
docker run -d \
  --name pharma360-frontend \
  -p 80:80 \
  pharma360-frontend:latest
```

### **3. Vérifications**

- [ ] Le conteneur démarre sans erreur
- [ ] Le frontend est accessible sur `http://localhost`
- [ ] L'endpoint `/health` retourne `healthy`
- [ ] Les fichiers statiques sont correctement servis
- [ ] Le proxy API fonctionne (à tester avec backend en place)
- [ ] La taille de l'image est < 200MB

### **4. Tests d'Intégration**

```bash
# Test de l'endpoint health
curl -X GET http://localhost/health

# Test du frontend
curl -X GET http://localhost
```

---

## 📁 **Fichiers à Créer/Modifier**

| Fichier | Action | Statut |
|---------|--------|--------|
| `docker/frontend.Dockerfile` | **Créer** | ⏳ |
| `docker/nginx.conf` | Créer | ⏳ |
| `docker/healthcheck.sh` | Créer | ⏳ |
| `frontend/package.json` | Créer | ⏳ |
| `frontend/vite.config.js` | Créer | ⏳ |
| `frontend/public/index.html` | Vérifier | ⏳ |

---

## 🔄 **Intégration avec docker-compose**

Ce Dockerfile sera utilisé dans `docker-compose.yml` (tâche QA-004) :

```yaml
services:
  frontend:
    build:
      context: .
      dockerfile: docker/frontend.Dockerfile
    ports:
      - "80:80"
    depends_on:
      - backend
    restart: unless-stopped
```

---

## 📊 **Critères d'Acceptation**

- [ ] Dockerfile valide et fonctionnel
- [ ] Image buildable sans erreur
- [ ] Conteneur démarrable et accessible
- [ ] Taille de l'image optimisée (< 200MB)
- [ ] Nginx correctement configuré
- [ ] Proxy API vers le backend fonctionnel
- [ ] Healthcheck fonctionnel
- [ ] Intégrable avec docker-compose
- [ ] Documentation claire dans le Dockerfile

---

## 📞 **Points de Contact et Support**

| Rôle | Agent | Canal | Disponibilité |
|------|-------|-------|---------------|
| **Superviseur** | `agent-superviseur-de-projet` | `#general` | J1-J20 |
| **Architecte** | `agent-superviseur-de-projet` | `#architecture` | J1-J20 |
| **Frontend** | `agent-d-veloppeur-frontend` | `#frontend` | J1-J55 |

---

## 🎯 **Prochaines Étapes**

1. **J1** : Créer `docker/frontend.Dockerfile`, `docker/nginx.conf`, `docker/healthcheck.sh`
2. **J1** : Créer `frontend/package.json` et `frontend/vite.config.js`
3. **J1** : Builder et tester l'image localement
4. **J2** : Valider avec le superviseur
5. **J3** : Intégrer dans docker-compose (QA-004)

---

**Document créé** : 2025-01-05 (J1)  
**Responsable** : `agent-qa-quality-assurance-devops-engineer`  
**Statut** : ⏳ **À DÉMARRER**  
**Priorité** : ⭐⭐⭐⭐⭐
