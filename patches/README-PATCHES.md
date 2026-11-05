# Pharma 360 - Correction Patches

## Liste des patches disponibles

### 🚨 **Patches Critiques (À appliquer en priorité)**

#### 000-CORRECTED-fix-docker-compose-all-issues.patch
**Corrige TOUS les problèmes dans docker-compose.yml**
- Supprime backup-db.sh du mount PostgreSQL initdb.d
- Corrige le healthcheck du frontend (wget -> curl)
- Corrige le healthcheck de nginx (wget -> curl)
- Corrige le port mapping du frontend (3000:80 -> 8080:8080)

#### 005-remove-backup-db-from-docker-compose.patch
**Supprime backup-db.sh du PostgreSQL container**
- Le script backup-db.sh nécessite pg_dump, gzip, curl qui ne sont pas dans postgres:15-alpine
- Causes des erreurs de démarrage du conteneur PostgreSQL

#### 004-CORRECTED-fix-frontend-healthcheck-and-ports.patch
**Corrige le healthcheck et le port du frontend**
- Change le port de 3000:80 à 8080:8080 (pour correspondre à frontend.conf)
- Change wget à curl (nginx-unprivileged n'a pas wget)

#### 007-fix-nginx-healthcheck-curl.patch
**Corrige le healthcheck de nginx**
- Change wget à curl (nginx:alpine n'a pas wget par défaut)

#### 008-fix-frontend-port-mapping.patch
**Corrige uniquement le port mapping du frontend**
- Change 3000:80 à 8080:8080

---

### ⚠️ **Patches Importants (Améliorations et corrections)**

#### 001-fix-backend-test_auth-fixture.patch
**Corrige les tests d'authentification du backend**
- Supprime `autouse=True` du fixture async (non supporté par pytest-asyncio)
- Ajoute `@pytest.mark.usefixtures("setup_test_database")` aux classes de test
- Permet d'exécuter les 24 tests d'authentification

#### 002-fix-frontend-migrate-to-vitest.patch
**Migre les tests frontend de Jest à Vitest**
- Remplace `jest.fn()` par `vi.fn()`
- Remplace `jest.mock()` par `vi.mock()`
- Remplace `jest.clearAllMocks()` par `vi.clearAllMocks()`
- Ajoute les imports vitest nécessaires

#### 003-fix-create_test_data-db-host.patch
**Corrige l'hôte PostgreSQL dans create_test_data.py**
- Change `localhost` à `pharma360-db`
- Permet au script de fonctionner depuis les conteneurs Docker

#### 006-fix-backend-dockerfile-remove-build-essential.patch
**Supprime build-essential du backend Dockerfile**
- build-essential (gcc, make, g++) n'est pas nécessaire
- Toutes les dépendances Python utilisent des versions binaires (psycopg2-binary)
- Réduit la taille de l'image et le temps de build

---

## Comment appliquer les patches

### Méthode 1: Appliquer tous les patches (Recommandé)

```bash
cd /workspace/github__DuDuEZN__Pharma-360
chmod +x patches/APPLY-PATCHES.sh
./patches/APPLY-PATCHES.sh
```

### Méthode 2: Appliquer les patches critiques manuellement

```bash
cd /workspace/github__DuDuEZN__Pharma-360

# Appliquer le patch complet pour docker-compose
patch -p1 < patches/000-CORRECTED-fix-docker-compose-all-issues.patch

# Ou appliquer les patches individuels
patch -p1 < patches/005-remove-backup-db-from-docker-compose.patch
patch -p1 < patches/004-CORRECTED-fix-frontend-healthcheck-and-ports.patch
patch -p1 < patches/007-fix-nginx-healthcheck-curl.patch
```

### Méthode 3: Appliquer tous les patches

```bash
cd /workspace/github__DuDuEZN__Pharma-360
for patch in patches/00*.patch; do
    patch -p1 < "$patch"
done
```

---

## Vérification après application

```bash
# Vérifier les changements
git diff

# Rebuild les conteneurs
docker compose build --no-cache

# Démarrer les conteneurs
docker compose up -d

# Vérifier l'état
docker compose ps

# Vérifier les logs
docker compose logs -f

# Tester les healthchecks
docker compose exec pharma360-frontend curl -f http://localhost:8080/
docker compose exec pharma360-nginx curl -f http://localhost/
```

---

## Problèmes résolus par chaque patch

| Patch | Problème | Impact | Statut |
|-------|----------|--------|--------|
| 000 | Tous les problèmes docker-compose | Critique | ✅ À appliquer |
| 005 | backup-db.sh dans PostgreSQL | Bloquant | ✅ À appliquer |
| 004-CORRECTED | Healthcheck + port frontend | Bloquant | ✅ À appliquer |
| 007 | Healthcheck nginx | Bloquant | ✅ À appliquer |
| 008 | Port mapping frontend | Bloquant | ✅ À appliquer |
| 001 | Tests auth backend | Tests échouent | ⚠️ Recommandé |
| 002 | Migration Jest→Vitest | Tests échouent | ⚠️ Recommandé |
| 003 | Hôte DB dans test_data | Fonctionnalité | ⚠️ Recommandé |
| 006 | build-essential | Optimisation | ℹ️ Optionnel |

---

## Notes importantes

1. **Le patch 000-CORRECTED** est le plus complet et corrige tous les problèmes de docker-compose.yml
2. **Les patches 004, 004-CORRECTED, 007, 008** sont liés - appliquez 004-CORRECTED ou 000-CORRECTED
3. **Le patch 005** doit être appliqué pour éviter les erreurs de démarrage PostgreSQL
4. **Les patches 001, 002, 003** corrigent des problèmes de tests et de configuration
5. **Le patch 006** est une optimisation optionnelle

---

## Structure des patches

```
patches/
├── 000-CORRECTED-fix-docker-compose-all-issues.patch  # Patch complet
├── 001-fix-backend-test_auth-fixture.patch             # Backend tests
├── 002-fix-frontend-migrate-to-vitest.patch            # Frontend tests
├── 003-fix-create_test_data-db-host.patch              # Script test data
├── 004-fix-frontend-healthcheck-wget.patch             # Ancienne version
├── 004-CORRECTED-fix-frontend-healthcheck-and-ports.patch # Version corrigée
├── 005-remove-backup-db-from-docker-compose.patch      # PostgreSQL
├── 006-fix-backend-dockerfile-remove-build-essential.patch # Optimisation
├── 007-fix-nginx-healthcheck-curl.patch                # Nginx healthcheck
├── 008-fix-frontend-port-mapping.patch                 # Port mapping
├── APPLY-PATCHES.sh                                     # Script d'application
└── README-PATCHES.md                                   # Ce fichier
```

---

## Support

Pour toute question ou problème avec les patches, contactez l'équipe QA/DevOps.
