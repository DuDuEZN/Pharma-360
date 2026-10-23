# 🏥 Pharmacie 360° - Plateforme de Gestion ERP

**Version** : 1.0.0  
**Statut** : 🚀 **DÉMARRAGE** (J1 - Phase 1: Fondations & Architecture)  
**Date de début** : 2025-01-05  
**Durée estimée** : 93 jours (13,3 semaines)  

---

## 📋 **Description du Projet**

**Pharmacie 360°** est une **plateforme web locale (offline-first)** de gestion de pharmacie conçue pour le marché béninois. Elle intègre :

- **Gestion des ventes et caisse** (avec sélection FEFO/FIFO automatique)
- **Gestion des stocks et péremptions** (traçabilité complète des lots)
- **Intelligence artificielle locale** (analyse prédictive, OCR pour factures)
- **Administration et sécurité** (RBAC, sauvegardes automatiques)
- **Architecture modulaire** (type ERP) pour une extensibilité future

---

## 🎯 **Architecture Globale**

```
Pharmacie-360/
├── backend/                  # API FastAPI (Python 3.11+)
│   ├── core/                # Modèles SQLAlchemy + Logique métier
│   ├── api/                 # Endpoints RESTful
│   ├── schemas/             # Pydantic Models
│   ├── services/            # Services métiers
│   ├── config/              # Configuration (Docker, .env)
│   └── tests/               # Tests unitaires (pytest)
│
├── frontend/                # React.js + Vite + Tailwind CSS
│   ├── public/              # Assets statiques
│   ├── src/
│   │   ├── components/      # Composants réutilisables
│   │   ├── pages/           # Pages par session (Admin, Vente, Caisse, Gestionnaire)
│   │   ├── hooks/           # Custom Hooks
│   │   ├── services/        # Appels API
│   │   ├── context/         # React Context (Auth, WebSocket)
│   │   └── utils/           # Fonctions utilitaires
│   └── tests/               # Tests frontend (Jest)
│
├── ia/                      # Module IA (Python 3.11+)
│   ├── ocr/                 # OCR Factures (pytesseract)
│   ├── analytics/           # Analyse prédictive (Pandas, Scikit-Learn)
│   ├── models/              # Modèles ML (Stock Rotation, Rupture Prediction)
│   └── tests/               # Tests IA
│
├── docker/                  # Configuration Docker
│   ├── backend.Dockerfile
│   ├── frontend.Dockerfile
│   ├── ia.Dockerfile
│   ├── docker-compose.yml
│   └── nginx.conf
│
├── scripts/                 # Scripts utilitaires
│   ├── backup_db.sh         # Sauvegarde PostgreSQL
│   ├── restore_db.sh        # Restauration
│   └── start.sh             # Lancement complet
│
├── docs/                    # Documentation
│   ├── ARCHITECTURE.md      # Schéma d'architecture (Mermaid)
│   ├── API_DOCS.md          # Documentation Swagger/OpenAPI
│   ├── DEV_GUIDE.md         # Guide de développement
│   └── DEPLOYMENT.md        # Guide de déploiement
│
├── .github/                 # GitHub Configuration
│   ├── workflows/           # GitHub Actions (CI/CD)
│   └── PULL_REQUEST_TEMPLATE.md
│
└── README.md                # Ce fichier
```

---

## 🛠 **Stack Technique**

| Composant          | Technologie                          | Version       |
|--------------------|--------------------------------------|---------------|
| **Backend**        | Python (FastAPI)                     | 3.11+         |
| **Frontend**       | React.js + Vite + Tailwind CSS        | Node 18+      |
| **Base de Données**| PostgreSQL                           | 15+           |
| **IA/OCR**         | Python (pytesseract, Pandas, Scikit-Learn) | 3.11+     |
| **Conteneurisation**| Docker + Docker Compose              | Latest        |
| **WebServer**      | Nginx                                | Latest        |
| **Tests**          | pytest (Backend), Jest (Frontend)     | Latest        |

---

## 📅 **Calendrier du Projet**

### **Phases et Jalons**

| Phase | Durée | Début | Fin | Livrables |
|-------|-------|-------|-----|-----------|
| **Phase 1** | 20j | J1 | J20 | Architecture validée, Docker fonctionnel |
| **Phase 2** | 35j | J21 | J55 | Backend Base + Frontend Base |
| **Phase 3** | 18j | J56 | J73 | Modules complémentaires + IA |
| **Phase 4** | 20j | J74 | J93 | Tests + Déploiement |

### **Jalons Clés**

| Jalon | Date | Description |
|-------|------|-------------|
| **M0** | J1 | Début du Projet |
| **M1** | J20 | **Architecture Validée** |
| **M2** | J55 | **Backend Base Prêt** |
| **M3** | J73 | **Frontend Base Prêt** |
| **M4** | J88 | **Tous Modules Intégrés** |
| **M5** | J93 | **Application Déployée** |

---

## 👥 **Équipe et Rôles**

| Rôle | Agent | Responsabilités |
|------|-------|------------------|
| **Superviseur** | `agent-superviseur-de-projet` | Coordination, validation des tâches, suivi global |
| **Architecte** | `agent-superviseur-de-projet` | ARCH-001 à ARCH-004, VALID-001 |
| **Backend Lead** | `agent-d-veloppeur-backend-lead` | BKND-001 à BKND-019 |
| **Frontend** | `agent-d-veloppeur-frontend` | FRNT-001 à FRNT-015 |
| **IA** | `agent-data-scientist-expert-ia` | IA-001 à IA-009 |
| **QA/DevOps** | `agent-qa-quality-assurance-devops-engineer` | QA-001 à QA-016 |

---

## 🚀 **Démarrage Rapide**

### **Prérequis**
- Docker + Docker Compose
- Git
- Python 3.11+ (pour développement local)
- Node.js 18+ (pour développement frontend local)

### **Installation**
```bash
# Cloner le dépôt
git clone https://github.com/DuDuEZN/Pharma-360.git
cd Pharma-360

# Lancer l'application complète (via Docker)
./scripts/start.sh
```

### **Accès aux Services**
| Service | URL | Port |
|---------|-----|------|
| Frontend | `http://localhost:3000` | 3000 |
| Backend API | `http://localhost:8000` | 8000 |
| API Docs (Swagger) | `http://localhost:8000/docs` | 8000 |
| PostgreSQL | `localhost:5432` | 5432 |

---

## 📂 **Structure des Tâches**

### **Phase 1: Fondations & Architecture (J1-J20)**
- ✅ **ARCH-001** : Schéma d'Architecture Globale (Mermaid, modules, flux) - *5j*
- ⏳ **ARCH-002** : Modèle de Données PostgreSQL (toutes tables + index FEFO/FIFO) - *3j*
- ⏳ **QA-001** : Dockerfile Backend (Python 3.11 + FastAPI) - *2j*
- ⏳ **QA-002** : Dockerfile Frontend (Node 18 + Nginx) - *2j*
- ⏳ **QA-003** : Dockerfile IA (Python 3.11 + Tesseract OCR) - *2j*
- ⏳ **QA-004** : docker-compose.yml + nginx.conf + .env - *1j*
- ⏳ **ARCH-003** : Spécifications API Inter-Modules - *2j*
- ⏳ **ARCH-004** : Guide de Développement - *2j*
- ⏳ **VALID-001** : Validation ARCH-001 par tous les agents - *1j*
- ⏳ **TEST-001** : Test Configuration Docker (start.sh) - *1j*

### **Phase 2: Développement Backend & Frontend Base (J21-J55)**
- **Backend** : BKND-001 à BKND-010 (Authentification, Produits, Stocks FEFO, Ventes, Caisse, WebSockets, Barcode)
- **Frontend** : FRNT-001 à FRNT-007 (Structure React, Composants, BarcodeInput, Sessions Admin/Vente/Caisse)

### **Phase 3: Modules Complémentaires (J56-J73)**
- **Backend** : BKND-011 à BKND-019 (Retours, Facturation, Historique, Rapports, Optimisation, Cache Redis, Logs, Docs)
- **Frontend** : FRNT-008 à FRNT-015 (Session Gestionnaire, Tableaux de Bord, OCR, Export PDF, Recherche Avancée, Notifications)
- **IA** : IA-001 à IA-009 (Analyse Rotation, OCR Factures, Prédiction Ruptures, Intégration, KPIs, Alertes, Optimisation FEFO, Docs)

### **Phase 4: Tests & Déploiement (J74-J93)**
- **Tests** : QA-005 à QA-016 (Unitaires, Intégration, Frontend, IA, Robustesse Offline, Barcode, Performance, Sauvegardes, Docs, Corrections, Finaux, Déploiement)

---

## 🔗 **Dépendances Critiques**

```
ARCH-001 
  ├─→ ARCH-002 
  │    └─→ ARCH-003 
  │         └─→ ARCH-004 
  │
  ├─→ QA-001 (Backend Docker)
  ├─→ QA-002 (Frontend Docker)
  └─→ QA-003 (IA Docker)
       └─→ QA-004 (docker-compose)
            └─→ BKND-001 (Authentification)
                 └─→ BKND-002, BKND-003
                      └─→ BKND-004 (Stocks FEFO)
                           └─→ BKND-006 → BKND-007 → BKND-008/BKND-009
```

---

## 📊 **Suivi du Projet**

### **Outils**
- **Suivi** : [GitHub Projects](https://github.com/DuDuEZN/Pharma-360/projects) (Tableau Kanban)
- **Communication** : Slack (canaux : `#architecture`, `#backend`, `#frontend`, `#ia`, `#qa`)
- **Documentation** : `/docs/` (Notion/Confluence pour les spécifications détaillées)
- **Code** : GitHub (branches par feature)
- **CI/CD** : GitHub Actions

### **Réunions**
- **Stand-up quotidiens** : 15 min/jour à 9h00 (heure locale)
- **Réunions hebdomadaires** : 1h/semaine (vendredi après-midi)
- **Revue de phase** : À chaque jalon (M1, M2, M3, M4, M5)

---

## 📌 **Conventions et Bonnes Pratiques**

### **Git**
- **Branching** : `feature/<ID_TACHE>` (ex: `feature/ARCH-001`)
- **Commits** : Messages clairs et atomiques
- **Pull Requests** : 1 PR par tâche, validation par le responsable du module + QA

### **Code**
- **Backend** : Respect des conventions PEP 8, typage strict avec Pydantic
- **Frontend** : Components modulaires, props typées (TypeScript si possible)
- **IA** : Code documenté, modèles versionnés
- **Tests** : Couverture > 90% pour le backend

### **Sécurité**
- **RBAC** : Contrôle d'accès strict selon les rôles
- **Données** : Pas de stockage de données sensibles en clair
- **Sauvegardes** : Automatiques et quotidiennes (script `backup_db.sh`)

---

## ⚠️ **Risques et Mitigation**

| Risque | Probabilité | Impact | Mitigation |
|-------|-------------|--------|------------|
| Retard ARCH-001 | Moyenne | Critique | Réaffecter ressources, simplifier scope |
| Problème Docker | Faible | Élevé | Configuration alternative, support QA |
| Backend en retard | Moyenne | Élevé | Prioriser BKND-001 à BKND-007 |
| Frontend bloqué | Moyenne | Élevé | Commencer par FRNT-001 à FRNT-007 |
| IA non fonctionnelle | Faible | Moyen | Règles métiers simples en fallback |
| Tests échouent | Moyenne | Élevé | Session de debug collective |

---

## 🎉 **Livrables Finaux**

- ✅ Application **100% locale** (offline-first)
- ✅ **Modulaire** (intégration future de nouveaux modules)
- ✅ **Gestion des stocks FEFO/FIFO** automatique
- ✅ **Ventes et caisse** avec sélection intelligente des lots
- ✅ **IA intégrée** (analyse prédictive, OCR factures)
- ✅ **Sécurisée** (RBAC, sauvegardes automatiques)
- ✅ **Documentée** (API, développement, déploiement)
- ✅ **Testée** (couverture > 90%, robustesse offline)

---

## 📞 **Contact et Support**

- **Superviseur** : `agent-superviseur-de-projet`
- **Backend Lead** : `agent-d-veloppeur-backend-lead`
- **Frontend** : `agent-d-veloppeur-frontend`
- **IA** : `agent-data-scientist-expert-ia`
- **QA/DevOps** : `agent-qa-quality-assurance-devops-engineer`

---

**© 2025 Pharmacie 360° - Tous droits réservés**
