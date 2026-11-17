# Déploiement sur réseau LAN — Pharma-360

Ce guide décrit comment déployer Pharma-360 sur un réseau local (LAN) pour
que plusieurs postes (caisse, vendeurs, gestionnaire, admin) accèdent à
l'application via le serveur hôte.

## 1. Prérequis sur le serveur hôte

- Docker + Docker Compose installés.
- Ports libres : `80` (HTTP), optionnellement `443` (HTTPS), `5432` (PostgreSQL, optionnel), `8000`/`8001` (debug uniquement).
- IP LAN fixe du serveur (ex. `192.168.1.100`). Configurer une IP statique ou une réservation DHCP.

## 2. Configuration de l'environnement

Créer un fichier `.env` à la racine (à partir de `.env.example`) :

```env
APP_NAME=Pharma-360
APP_ENV=production
APP_DEBUG=false
APP_SECRET_KEY=<cle_longue_aleatoire>
POSTGRES_HOST=pharma360-db
POSTGRES_PORT=5432
POSTGRES_DB=pharma360_prod
POSTGRES_USER=pharma_admin
POSTGRES_PASSWORD=<mot_de_passe_fort>
JWT_SECRET=<cle_jwt_longue_aleatoire>
JWT_ALGORITHM=HS256
JWT_EXPIRE_MINUTES=480
CORS_ORIGINS=http://192.168.1.100,http://pharma360-nginx
BACKEND_HOST=0.0.0.0
BACKEND_PORT=8000
IA_HOST=0.0.0.0
IA_PORT=8001
FRONTEND_PORT=3000
NGINX_PORT=80
NGINX_SSL_PORT=443
LOG_LEVEL=INFO
```

Remplacer `192.168.1.100` par l'IP LAN réelle du serveur. Pour autoriser
tous les postes du LAN sans lister chaque IP, utiliser `CORS_ORIGINS=*`
(moins strict, acceptable sur un LAN de confiance).

## 3. Construction du frontend

Le frontend est compilé dans l'image Docker, mais le volume `./frontend/dist`
est monté dans nginx. Reconstruire après toute modification :

```bash
cd frontend
npm ci
npm run build
cd ..
```

`API_BASE_URL` et `WS_BASE_URL` sont relatifs à l'origine (`/api/v1` et
`ws://<host>`), donc **aucune URL absolue à changer** : l'application
fonctionne sur n'importe quelle IP LAN.

## 4. Lancement des services

Avec la configuration de production :

```bash
docker compose -f docker/docker-compose.prod.yml --env-file .env up -d --build
```

Ou, pour la configuration de développement (tests internes) :

```bash
docker compose --env-file .env up -d --build
```

Vérifier la santé :

```bash
curl http://192.168.1.100/api/v1/health/
```

## 5. Pare-feu Windows (serveur)

Autoriser le trafic entrant sur le port 80 (et 443 si HTTPS) :

```powershell
New-NetFirewallRule -DisplayName "Pharma360 HTTP" -Direction Inbound -Protocol TCP -LocalPort 80 -Action Allow
```

Optionnel : restreindre l'accès à la base de données au serveur lui-même
(ne pas exposer le port 5432 sur le LAN).

## 6. Accès depuis les postes clients

Depuis n'importe quel navigateur du LAN :

```
http://192.168.1.100
```

Le WebSocket (caisse / ventes en temps réel) passe par nginx (`/ws/...`),
donc il fonctionne automatiquement sur le même hôte.

## 7. HTTPS (optionnel mais recommandé)

1. Générer ou obtenir un certificat pour le domaine/IP.
2. Placer `cert.pem` et `key.pem` dans `docker/nginx/ssl/`.
3. Décommenter le bloc SSL dans `docker/nginx/nginx.prod.conf`.
4. Mettre à jour `CORS_ORIGINS` avec `https://...`.

## 8. Sauvegardes et données

- La base PostgreSQL est persistée dans le volume `pharma360-db-prod-data`.
- Les uploads sont dans `pharma360-backend-uploads`.
- Planifier des sauvegardes régulières du volume DB (ex. `pg_dump` via cron/planificateur).

## 9. Points d'attention

- **Secrets** : ne pas réutiliser les valeurs par défaut committées dans
  `.env.production` ; les remplacer par des valeurs fortes.
- **CSP nginx** : la configuration de production a été ajustée pour utiliser
  `connect-src 'self' ws: wss:` (pas de `localhost`), ce qui permet l'accès
  depuis n'importe quel poste du LAN.
- **`server_name`** : réglé sur `_` (catch-all) pour accepter toute IP LAN.
- **Modules** : l'activation se fait par `MODULE_<NAME>_ENABLED` dans `.env`
  (ex. `MODULE_ACCOUNTING_ENABLED=true` si le module existe).

## Vérification rapide

```bash
# Depuis le serveur
curl http://localhost/api/v1/health/

# Depuis un poste client
curl http://192.168.1.100/api/v1/health/
```

Les deux doivent renvoyer `{"status":"healthy",...}`.
