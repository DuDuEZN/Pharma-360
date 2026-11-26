# Simulation LAN — Pharma 360 (coexistence + multi-postes)

## Objectif
Simuler en local un environnement client où :
1. Un **autre logiciel** est déjà déployé (occupe les ports 80/443).
2. **Plusieurs postes de travail** (caisse, stock) accèdent à Pharma 360 simultanément.
3. Pharma 360 coexiste sans conflit (ports alternatifs, ressources limitées).

## Fichiers créés
- `docker/docker-compose.coexist.yml` — stack Pharma sur ports alternatifs + mock "autre logiciel" sur 80/443 + limites de ressources.
- `docker/nginx/nginx.coexist.conf` — reverse proxy Pharma (SPA + API + IA).
- `sim/otherapp/index.html` — page du logiciel existant simulé.
- `scripts/start-lan-sim.ps1` — lance la simulation (mock + 3 postes Chrome isolés).
- `scripts/stop-lan-sim.ps1` — arrête la simulation.

## Scénario A (proxy existant) — ports Pharma alternatifs
| Service | Port hôte |
|---|---|
| Logiciel existant (mock) | 80 / 443 |
| Nginx Pharma | 8080 / 8443 |
| Backend Pharma | 18000 |
| IA Pharma | 18001 |
| Postgres Pharma | non publié (interne) |

## Lancer la simulation (Windows)
```powershell
cd C:\Users\<vous>\Pharma-360
.\scripts\start-lan-sim.ps1
```
- Vérifie que Pharma répond sur http://localhost.
- Lance le mock "logiciel existant" sur http://localhost:8090.
- Ouvre 3 fenêtres Chrome isolées (profils PosteCaisse1/2, PosteStock) vers Pharma.
- Ouvre 1 fenêtre vers le logiciel existant.

## Arrêter
```powershell
.\scripts\stop-lan-sim.ps1
```

## Déployer la vraie stack coexistence (sur le serveur client)
```bash
docker compose -f docker/docker-compose.coexist.yml up -d
```
Temps estimé : 25–45 min (build inclus si images absentes).

## Limites de ressources (coexistence)
Chaque service Pharma a des `deploy.resources.limits` pour ne pas affamer l'autre logiciel.
Ajuster selon la machine (ne pas dépasser 60–70 % des ressources totales).

## Checklist de non-régression
- [ ] L'autre logiciel répond toujours sur ses URLs.
- [ ] Pharma 360 répond sur http://serveur:8080 (ou via proxy existant).
- [ ] Aucun conteneur en `Restarting`.
- [ ] Aucun conflit de port (`ss -tulpn` / `netstat`).
- [ ] Sauvegardes Pharma décalées (3h00) sans collision.
