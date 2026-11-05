# Pharma 360 - Plateforme de Gestion de Pharmacie

## 📋 Description

Pharma 360 est une plateforme complète de gestion de pharmacie (ERP-style) conçue pour le marché béninois. Elle offre des fonctionnalités de gestion des ventes, des stocks, des fournisseurs, et de l'intelligence artificielle pour l'analyse prédictive.

## 🚀 Déploiement Rapide

### Prérequis

- **Docker** et **Docker Compose** installés
- **WSL** (pour Windows) ou Linux/macOS
- **Git** pour cloner le dépôt

### Étapes de déploiement

#### 1. Cloner le dépôt

```bash
git clone https://github.com/DuDuEZN/Pharma-360.git
cd Pharma-360
```

#### 2. Configurer l'environnement

Copier le fichier d'exemple et le personnaliser :

```bash
cp .env.example .env
```

Éditer le fichier `.env` pour configurer :
- Les identifiants de la base de données
- Les secrets JWT et de l'application
- Les ports des services

#### 3. Construire et démarrer les conteneurs

```bash
# Méthode 1: Utiliser docker-compose
docker-compose up -d --build

# Méthode 2: Utiliser make (si disponible)
make deploy
```

#### 4. Initialiser la base de données

La base de données est initialisée automatiquement au premier démarrage. Cependant, vous pouvez créer des données de test :

```bash
# Attendre que les services soient prêts (environ 30 secondes)
sleep 30

# Créer des données de test (utilisateurs, catégories, produits, etc.)
python scripts/create_test_data.py
```

#### 5. Accéder à l'application

- **Application Frontend** : http://localhost:3000
- **API Backend** : http://localhost:8000
- **Documentation API** : http://localhost:8000/docs
- **Service IA** : http://localhost:8001
- **IA Documentation** : http://localhost:8001/docs

## 📊 Services Disponibles

| Service | Port | Description |
|---------|------|-------------|
| pharma360-db | 5432 | Base de données PostgreSQL |
| pharma360-backend | 8000 | API Backend (FastAPI) |
| pharma360-frontend | 3000 | Interface utilisateur (React) |
| pharma360-ia | 8001 | Service IA (OCR, Analytics, Alertes) |
| pharma360-nginx | 80 | Reverse Proxy Nginx |

## 🔐 Authentification

### Compte par défaut

Après avoir exécuté `scripts/create_test_data.py`, les comptes suivants sont créés :

| Utilisateur | Mot de passe | Rôle |
|-------------|--------------|------|
| admin | admin123 | admin |
| seller1 | seller123 | seller |
| cashier1 | cashier123 | cashier |
| manager1 | manager123 | manager |

### Endpoints d'authentification

- **POST /api/auth/login** - Connexion
- **POST /api/auth/refresh** - Rafraîchir le token
- **POST /api/auth/register** - Créer un nouvel utilisateur (admin seulement)
- **GET /api/auth/me** - Obtenir l'utilisateur actuel

Exemple de requête de connexion :

```bash
curl -X POST http://localhost:8000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"username": "admin", "password": "admin123"}'
```

## 📦 Architecture du Projet

```
Pharma-360/
├── backend/           # API Backend (FastAPI)
│   ├── api/v1/        # Endpoints API
│   ├── core/          # Configuration, sécurité, base de données
│   ├── models/        # Modèles de données
│   ├── schemas/       # Schémas Pydantic
│   ├── services/      # Services métier
│   └── main.py        # Point d'entrée
├── frontend/          # Interface utilisateur (React)
│   ├── src/           # Code source
│   └── public/        # Assets statiques
├── ia/               # Module IA
│   ├── api/v1/        # Endpoints IA
│   ├── core/          # Configuration IA
│   ├── services/      # Services IA (OCR, KPIs, Alertes)
│   └── main.py        # Point d'entrée IA
├── docker/            # Configuration Docker
│   ├── backend.Dockerfile
│   ├── frontend.Dockerfile
│   └── ia.Dockerfile
├── scripts/           # Scripts utilitaires
│   ├── init-db.sql    # Initialisation de la base de données
│   ├── create_test_data.py  # Création des données de test
│   └── test_deployment.py    # Tests de déploiement
├── docker-compose.yml # Orchestration des services
├── Makefile           # Commandes utiles
└── README.md          # Documentation
```

## 🎯 Fonctionnalités Principales

### 1. Gestion des Ventes et Caisse
- Interface de recherche rapide des médicaments
- Sélection par nom, DCI, catégorie ou emplacement
- Gestion des files d'attente
- Encaissements et rendu de monnaie

### 2. Gestion des Stocks
- Suivi des lots avec principe FEFO (First Expired, First Out)
- Alertes de péremption proche
- Alertes de rupture de stock
- Traçabilité complète des mouvements

### 3. Intelligence Artificielle
- **OCR** : Reconnaissance optique des factures fournisseurs
- **Analytics** : Analyse prédictive des stocks
- **KPIs** : Indicateurs clés de performance
- **Alertes** : Système d'alertes intelligentes

### 4. Administration
- Gestion des utilisateurs avec RBAC (rôles : admin, seller, cashier, manager)
- Configuration des catégories et fournisseurs
- Sauvegardes automatiques de la base de données

## 📊 Endpoints API Principaux

### Authentification
- `POST /api/auth/login` - Connexion
- `POST /api/auth/refresh` - Rafraîchir le token
- `GET /api/auth/me` - Utilisateur actuel

### Utilisateurs
- `GET /api/v1/users/` - Lister les utilisateurs (admin)
- `POST /api/v1/users/` - Créer un utilisateur (admin)
- `GET /api/v1/users/{id}` - Détails d'un utilisateur
- `PUT /api/v1/users/{id}` - Mettre à jour un utilisateur

### Produits
- `GET /api/v1/products/` - Lister les produits
- `POST /api/v1/products/` - Créer un produit
- `GET /api/v1/products/{id}` - Détails d'un produit
- `PUT /api/v1/products/{id}` - Mettre à jour un produit
- `DELETE /api/v1/products/{id}` - Supprimer un produit

### Lots (Batches)
- `GET /api/v1/batches/` - Lister les lots
- `POST /api/v1/batches/` - Créer un lot
- `GET /api/v1/batches/{id}` - Détails d'un lot
- `PUT /api/v1/batches/{id}` - Mettre à jour un lot

### Ventes
- `GET /api/v1/sales/` - Lister les ventes
- `POST /api/v1/sales/` - Créer une vente
- `GET /api/v1/sales/{id}` - Détails d'une vente

### Fournisseurs
- `GET /api/v1/suppliers/` - Lister les fournisseurs
- `POST /api/v1/suppliers/` - Créer un fournisseur
- `GET /api/v1/suppliers/{id}` - Détails d'un fournisseur

### Module IA
- `POST /api/v1/ocr/invoices` - Traiter une facture avec OCR
- `GET /api/v1/kpis` - Obtenir les KPIs
- `GET /api/v1/alerts/` - Lister les alertes
- `GET /api/v1/dashboard/` - Tableau de bord IA

## 🔧 Commandes Utiles

### Démarrage
```bash
# Démarrer tous les services
docker-compose up -d

# Démarrer avec reconstruction
docker-compose up -d --build

# Démarrer un service spécifique
docker-compose up -d pharma360-backend
```

### Arrêt
```bash
# Arrêter tous les services
docker-compose down

# Arrêter et supprimer les volumes
docker-compose down -v
```

### Logs
```bash
# Voir les logs de tous les services
docker-compose logs -f

# Voir les logs d'un service spécifique
docker-compose logs -f pharma360-backend
```

### Base de données
```bash
# Accéder à la base de données
psql -U pharma_user -d pharma360_dev -h localhost -p 5432

# Sauvegarder la base de données
pg_dump -U pharma_user -d pharma360_dev > backup.sql
```

### Tests
```bash
# Exécuter les tests de déploiement
python scripts/test_deployment.py

# Créer des données de test
python scripts/create_test_data.py
```

## 📝 Résolution des Problèmes

### Problème : Les conteneurs ne démarrent pas

Vérifiez que Docker est en cours d'exécution :
```bash
docker info
```

Vérifiez les logs des conteneurs :
```bash
docker-compose logs
```

### Problème : La base de données n'est pas accessible

Attendez que le conteneur PostgreSQL soit prêt (environ 10-15 secondes) :
```bash
docker-compose logs pharma360-db
```

### Problème : Erreur de connexion à la base de données

Vérifiez que les identifiants dans `.env` correspondent à ceux du docker-compose.yml.

### Problème : Le service IA ne démarre pas

Assurez-vous que Tesseract OCR est installé dans le conteneur. Le Dockerfile IA l'installe automatiquement.

### Problème : Erreur de port déjà utilisé

Changez les ports dans le fichier `.env` ou arrêtez les services qui utilisent les mêmes ports.

## 🎓 Guide de Développement

### Configuration du développement

1. Cloner le dépôt
2. Créer un environnement virtuel :
   ```bash
   python -m venv venv
   source venv/bin/activate  # Linux/macOS
   venv\Scripts\activate   # Windows
   ```
3. Installer les dépendances :
   ```bash
   cd backend
   pip install -r requirements.txt
   ```

### Exécuter le backend en développement

```bash
cd backend
uvicorn main:app --reload --port 8000
```

### Exécuter le service IA en développement

```bash
cd ia
uvicorn main:app --reload --port 8001
```

## 📞 Support

Pour toute question ou problème :
- Vérifiez la section **Résolution des Problèmes** ci-dessus
- Consultez les logs des conteneurs
- Vérifiez que tous les services sont en cours d'exécution : `docker-compose ps`

## 📜 Licence

Tous droits réservés - Pharmacie 360 - 2025
