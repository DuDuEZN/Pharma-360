# 🤖 IA Module - Pharmacie 360

**Module d'Intelligence Artificielle pour la gestion intelligente des stocks et l'analyse prédictive**

## 📋 Description

Le module IA de Pharmacie 360 fournit des fonctionnalités avancées d'analyse prédictive, de reconnaissance optique (OCR) et de génération d'alertes intelligentes pour aider à la gestion optimale des stocks de pharmacie.

## ✨ Fonctionnalités

### 1. **Analyse Prédictive des Stocks**
- Analyse de la vitesse de rotation des stocks par catégorie et par marque
- Détection des produits à faible rotation (risque de surstockage)
- Détection des produits à forte rotation (risque de rupture)
- Génération de prédictions de réapprovisionnement automatique
- Calcul des indicateurs clés (KPIs) de performance

### 2. **Module OCR (Reconnaissance Optique de Caractères)**
- Numérisation des factures fournisseurs
- Extraction automatique des informations :
  - Numéro de facture
  - Date
  - Montant total
  - Détails des produits (nom, quantité, prix)
  - Fournisseur
- Prise en charge des formats : PDF, JPG, PNG
- Intégration avec le backend pour enregistrement automatique

### 3. **Alertes Intelligentes**
- Détection automatique des situations critiques :
  - **Rupture de stock imminente** : Stock ≤ seuil minimum
  - **Péremption proche** : Produits expirant dans ≤ 7 jours (CRITIQUE) ou ≤ 30 jours (AVERTISSEMENT)
  - **Surstockage** : Stock > seuil maximum
  - **Tendances de ventes** : Anomalies détectées dans les patterns de vente
- Système de priorisation (CRITIQUE, ÉLEVÉ, MOYEN, FAIBLE)
- Notifications temps réel via WebSockets

### 4. **Tableaux de Bord IA**
- Visualisation des KPIs en temps réel
- Affichage des alertes actives
- Prédictions de rupture de stock
- Recommandations d'actions

## 🏗️ Architecture

```
ia/
├── api/
│   └── v1/
│       ├── __init__.py          # Export des routeurs
│       ├── ocr.py               # API OCR (IA-002, IA-004)
│       ├── kpis.py              # API KPIs (IA-005)
│       ├── dashboard.py         # API Dashboard IA (IA-006)
│       └── alerts.py            # API Alertes (IA-007)
├── analytics/
│   ├── __init__.py
│   └── stock_analysis.py        # Analyse de rotation (IA-001)
├── models/
│   ├── __init__.py
│   └── stock_prediction.py      # Modèles ML (IA-003, IA-008)
├── ocr/
│   ├── __init__.py
│   └── invoice_ocr.py           # Traitement OCR factures
├── services/
│   ├── __init__.py
│   ├── ocr_service.py          # Service OCR (IA-002, IA-004)
│   ├── kpi_service.py          # Service KPIs (IA-005)
│   └── alert_service.py        # Service Alertes (IA-007)
└── tests/
    ├── __init__.py
    ├── test_invoice_ocr.py      # Tests OCR
    └── test_stock_analysis.py   # Tests analyse stock
```

## 🚀 Installation

### Prérequis

- Python 3.11+
- Bibliothèques requises (voir `requirements.txt`)
- Tesseract OCR (pour le module OCR)

### Installation des dépendances

```bash
cd ia
pip install -r ../backend/requirements.txt
pip install pytesseract pillow opencv-python pandas scikit-learn
```

### Installation de Tesseract OCR

**Sur Ubuntu/Debian :**
```bash
sudo apt update
sudo apt install tesseract-ocr
sudo apt install libtesseract-dev
sudo apt install tesseract-ocr-fra  # Pour le français
```

**Sur macOS :**
```bash
brew install tesseract
brew install tesseract-lang  # Pour les langues supplémentaires
```

**Sur Windows :**
Télécharger et installer depuis [UB Mannheim](https://github.com/UB-Mannheim/tesseract/wiki)

## 📊 API Endpoints

### OCR
- `POST /api/v1/ocr/process` - Traiter une facture (upload fichier)
- `GET /api/v1/ocr/history` - Historique des traitements OCR

### KPIs
- `GET /api/v1/kpis` - Obtenir tous les KPIs
- `GET /api/v1/kpis/daily` - KPIs quotidiens
- `GET /api/v1/kpis/weekly` - KPIs hebdomadaires
- `GET /api/v1/kpis/monthly` - KPIs mensuels

### Dashboard IA
- `GET /api/v1/dashboard/` - Tableau de bord complet
- `GET /api/v1/dashboard/kpis` - Résumé des KPIs
- `GET /api/v1/dashboard/alerts` - Alertes actives
- `GET /api/v1/dashboard/predictions` - Prédictions de stock
- `GET /api/v1/dashboard/recommendations` - Recommandations IA
- `GET /api/v1/dashboard/rotation-analysis` - Analyse de rotation
- `GET /api/v1/dashboard/health` - État de santé

### Alertes
- `GET /api/v1/alerts/` - Toutes les alertes actives
- `GET /api/v1/alerts/stats` - Statistiques des alertes
- `GET /api/v1/alerts/{alert_id}` - Alerte spécifique
- `POST /api/v1/alerts/generate` - Générer des alertes
- `POST /api/v1/alerts/stock-alerts` - Générer des alertes stock
- `POST /api/v1/alerts/sales-alerts` - Générer des alertes ventes
- `PUT /api/v1/alerts/{alert_id}/dismiss` - Ignorer une alerte
- `POST /api/v1/alerts/clear-expired` - Effacer les alertes expirées
- `GET /api/v1/alerts/critical` - Alertes critiques
- `GET /api/v1/alerts/high` - Alertes haute priorité
- `GET /api/v1/alerts/by-type/{alert_type}` - Alertes par type
- `GET /api/v1/alerts/health` - État de santé

## 🔧 Configuration

### Variables d'Environnement

```bash
# Configuration PostgreSQL
POSTGRES_HOST=pharma360-db
POSTGRES_PORT=5432
POSTGRES_DB=pharma360_dev
POSTGRES_USER=pharma_user
POSTGRES_PASSWORD=pharma_pass_2025

# Configuration IA
IA_HOST=0.0.0.0
IA_PORT=8001
TESSDATA_PREFIX=/usr/share/tesseract-ocr/4.00/tessdata
```

### Fichier `.env`

Créer un fichier `.env` dans le dossier `ia/` avec les variables ci-dessus.

## 📈 Modèles de Données

### Produit
```python
{
    "id": int,
    "name": str,
    "code": str,
    "category_id": int,
    "current_stock": int,
    "min_stock": int,
    "max_stock": int,
    "unit_price": float,
    "expiry_date": str (ISO format),
    "supplier_id": int,
    "is_active": bool
}
```

### Alerte
```python
{
    "alert_id": str,
    "type": str,  # STOCK_RUPTURE, EXPIRY_ALERT, OVERSTOCK, SALES_TREND
    "priority": str,  # CRITICAL, HIGH, MEDIUM, LOW
    "category": str,
    "title": str,
    "message": str,
    "product_id": int (optional),
    "current_stock": int (optional),
    "min_stock": int (optional),
    "max_stock": int (optional),
    "expiry_date": str (optional),
    "days_until_expiry": int (optional),
    "status": str,  # ACTIVE, DISMISSED
    "created_at": str (ISO format),
    "expires_at": str (ISO format),
    "dismissed_at": str (ISO format, optional)
}
```

### KPI
```python
{
    "metric": str,
    "value": float,
    "previous_value": float,
    "change": float,
    "change_percent": float,
    "target": float (optional),
    "status": str,  # GOOD, WARNING, CRITICAL
    "trend": str,  # UP, DOWN, STABLE
    "last_updated": str (ISO format)
}
```

## 🎯 Tâches Implémentées

### Phase 3 - Modules Complémentaires

| ID | Tâche | Statut | Description |
|----|-------|--------|-------------|
| **IA-001** | Analyse Rotation Stocks | ✅ TERMINÉ | Analyse de la rotation par catégorie/marque |
| **IA-002** | Module OCR Factures | ✅ TERMINÉ | Traitement OCR avec pytesseract |
| **IA-003** | Modèle Prédiction Ruptures | ✅ TERMINÉ | Prédiction ML des ruptures de stock |
| **IA-004** | Intégration OCR Backend | ✅ TERMINÉ | Intégration avec le backend |
| **IA-005** | Génération KPIs Automatiques | ✅ TERMINÉ | Génération des indicateurs clés |
| **IA-006** | Tableaux de Bord IA | ✅ TERMINÉ | Dashboard avec visualisation |
| **IA-007** | Alertes Intelligentes | ✅ TERMINÉ | Système d'alertes temps réel |
| **IA-008** | Optimisation FEFO/FIFO | ✅ TERMINÉ | Algorithmes d'optimisation |
| **IA-009** | Documentation Module IA | 🟡 EN COURS | Documentation complète |

## 🔍 Exemples d'Utilisation

### 1. Générer des alertes de stock

```python
from ia.services.alert_service import alert_service

# Récupérer les produits depuis la base de données
products = [...]  # Liste des produits

# Générer des alertes
alerts = await alert_service.generate_stock_alerts(products, [])

# Ajouter les alertes au service
for alert in alerts:
    await alert_service.add_alert(alert)
```

### 2. Obtenir les KPIs actuels

```python
from ia.services.kpi_service import kpi_service

# Récupérer les KPIs
kpis = await kpi_service.get_current_kpis()
print(kpis)
```

### 3. Traiter une facture avec OCR

```python
from ia.services.ocr_service import ocr_service

# Traiter un fichier
result = await ocr_service.process_file("/path/to/invoice.pdf")
print(result)
```

### 4. Obtenir les prédictions de stock

```python
from ia.models.stock_prediction import StockPredictionModel

# Créer le modèle
model = StockPredictionModel()

# Prédire les besoins en stock
predictions = model.predict_stock_needs(historical_data)
print(predictions)
```

## 🧪 Tests

### Exécuter les tests

```bash
cd ia
python -m pytest tests/ -v
```

### Tests disponibles

- `tests/test_invoice_ocr.py` - Tests du module OCR
- `tests/test_stock_analysis.py` - Tests de l'analyse de stock

### Couverture de test

Le module IA vise une couverture de test > 80%.

## 📚 Documentation Complémentaire

- [Architecture Globale](../../docs/ARCHITECTURE.md)
- [Spécifications API](../../docs/ARCH-003_API_SPECIFICATIONS.md)
- [Modèle de Données PostgreSQL](../../docs/ARCH-002_POSTGRESQL.md)
- [Guide de Développement](../../docs/ARCH-004_DEVELOPMENT_GUIDE.md)

## 🛠️ Bonnes Pratiques

1. **Code Propre** : Respecter les conventions PEP 8
2. **Documentation** : Documenter toutes les fonctions et classes
3. **Gestion des Erreurs** : Utiliser try/except pour toutes les opérations critiques
4. **Logging** : Utiliser le logger pour le débogage et le suivi
5. **Tests** : Écrire des tests pour toutes les nouvelles fonctionnalités
6. **Performance** : Optimiser les algorithmes pour les grands datasets

## 🤝 Contribution

1. Créer une branche pour la nouvelle fonctionnalité
2. Écrire des tests pour la nouvelle fonctionnalité
3. Documenter le code
4. Créer une Pull Request vers `main`
5. Attendre la validation du superviseur

## 📞 Support

Pour toute question ou problème concernant le module IA :
- Canal Slack : `#ia`
- Responsable : `agent-data-scientist-expert-ia`

## 📄 Licence

Tous droits réservés - Pharmacie 360 - 2025
