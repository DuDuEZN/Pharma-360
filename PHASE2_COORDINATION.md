# 🎯 **Coordination Phase 2 - Pharma 360**

**Date**: 2025-01-15 (J11 - Début Phase 2)  
**Responsable**: Vibe Code (Coordinateur Principal)  
**Statut**: 🚀 **DÉMARRAGE IMMÉDIAT**

---

## 📊 **Analyse Préalable**

### **État du Code Existants**

| Module | Fichiers | Statut | Commentaires |
|--------|----------|--------|--------------|
| **Backend** | 43 fichiers Python | ✅ 70% complet | Architecture solide, APIs de base fonctionnelles |
| **Frontend** | 40 fichiers JS/JSX | ✅ 60% complet | Structure React complète, composants de base |
| **IA** | 9 fichiers | ✅ 100% NOUVEAU | Module créé avec OCR, Analytics, ML |
| **Docker** | 4 fichiers | ✅ 100% | Configuration complète |
| **BDD** | init-db.sql | ✅ 100% | Schéma PostgreSQL complet |

### **Dépendances Critiques**

```
ARCH-002 (Modèle BDD) ✅
  ├─> BKND-003 (Modèle Produits) ✅
  ├─> BKND-004 (Stocks FEFO) ⚠️
  └─> BKND-001 (Auth) ✅

QA-004 (Docker) ✅
  ├─> BKND-001 à BKND-010 (Backend Base)
  └─> FRNT-001 à FRNT-007 (Frontend Base)
```

---

## 🎯 **Objectifs Phase 2 (J21-J55 - 35 jours)**

### **Livrables Principaux**
- [ ] Backend fonctionnel avec toutes les APIs de base
- [ ] Frontend avec sessions principales (Admin, Vente, Caisse)
- [ ] Intégration Backend-Frontend complète
- [ ] Système FEFO/FIFO opérationnel

---

## 👥 **Attribution des Tâches par Agent**

### **🎨 Agent: agent-developpeur-backend-lead**
**Rôle**: Développement Backend Principal  
**Responsable**: Backend Lead  
**Priorité**: ⭐⭐⭐⭐⭐ (Critique)

#### **Tâches Assignées (BKND-001 à BKND-010)**

| ID | Tâche | Durée | Dépendances | Statut | Priorité |
|----|-------|-------|-------------|--------|----------|
| **BKND-001** | Système Authentification RBAC (JWT) | 5j | ARCH-002 && QA-004 | ⚠️ Partiel | ⭐⭐⭐⭐⭐ |
| **BKND-002** | Modèle Utilisateurs (SQLAlchemy) | 3j | BKND-001 | ⚠️ Partiel | ⭐⭐⭐⭐⭐ |
| **BKND-003** | Modèle Produits (avec code-barres) | 3j | ARCH-002 && QA-004 | ✅ **TERMINÉ** | ⭐⭐⭐⭐ |
| **BKND-004** | Modèle Stocks + FEFO/FIFO (index PostgreSQL) | 5j | BKND-003 | ⚠️ Partiel | ⭐⭐⭐⭐⭐ |
| **BKND-005** | API REST Produits (CRUD + recherche) | 3j | BKND-003 | ⚠️ Partiel | ⭐⭐⭐⭐ |
| **BKND-006** | API REST Stocks (FEFO/FIFO automatique) | 3j | BKND-004 | ❌ À faire | ⭐⭐⭐⭐⭐ |
| **BKND-007** | API REST Ventes (avec sélection FEFO) | 4j | BKND-006 | ❌ À faire | ⭐⭐⭐⭐⭐ |
| **BKND-008** | API REST Caisse (validation + ticket) | 3j | BKND-007 | ❌ À faire | ⭐⭐⭐⭐⭐ |
| **BKND-009** | WebSockets (Vente ↔ Caisse temps réel) | 3j | BKND-007 | ❌ À faire | ⭐⭐⭐⭐ |
| **BKND-010** | Middleware Barcode Scanner | 2j | BKND-005 | ❌ À faire | ⭐⭐⭐ |

#### **Instructions Détaillées**

**Contexte Technique:**
- Base de code: `/workspace/github__DuDuEZN__Pharma-360/backend/`
- Framework: FastAPI (Python 3.11+)
- ORM: SQLAlchemy (Async)
- Auth: JWT avec RBAC
- BDD: PostgreSQL 15+ (AsyncPG)

**Priorités Immédiates:**
1. **BKND-006**: Compléter l'API Stocks avec logique FEFO/FIFO
2. **BKND-007**: Implémenter l'API Ventes avec sélection automatique FEFO
3. **BKND-008**: API Caisse avec validation et génération de tickets
4. **BKND-009**: WebSockets pour communication temps réel

**Exigences Spécifiques:**
- Respecter l'architecture modulaire existante
- Utiliser les modèles SQLAlchemy déjà créés
- Implémenter la logique FEFO dans `services/product_service.py`
- Intégrer le middleware Barcode dans les endpoints produits
- Documenter avec Swagger/OpenAPI

**Livrables Attendus:**
- Code source complet et testé
- Documentation API (Swagger)
- Tests unitaires (pytest)
- Intégration avec le frontend existant

---

### **🖥️ Agent: agent-developpeur-frontend**
**Rôle**: Développement Frontend  
**Responsable**: Frontend Developer  
**Priorité**: ⭐⭐⭐⭐ (Élevée)

#### **Tâches Assignées (FRNT-001 à FRNT-007)**

| ID | Tâche | Durée | Dépendances | Statut | Priorité |
|----|-------|-------|-------------|--------|----------|
| **FRNT-001** | Structure React/Vite + Routing | 3j | ARCH-003 && QA-004 | ✅ **TERMINÉ** | ⭐⭐⭐⭐ |
| **FRNT-002** | Composants Communs (Header, Sidebar, Modal) | 4j | FRNT-001 | ✅ **TERMINÉ** | ⭐⭐⭐⭐ |
| **FRNT-003** | Composant BarcodeInput (focus auto) | 2j | FRNT-002 | ✅ **TERMINÉ** | ⭐⭐⭐ |
| **FRNT-004** | Session Administrateur (Gestion utilisateurs/roles) | 3j | FRNT-002 && BKND-001 | ✅ **TERMINÉ** | ⭐⭐⭐⭐ |
| **FRNT-005** | Session Vente (Recherche + FEFO + envoi Caisse) | 4j | FRNT-003 && BKND-007 | ⚠️ Partiel | ⭐⭐⭐⭐⭐ |
| **FRNT-006** | Session Caisse (File d'attente + encaissement) | 3j | FRNT-005 && BKND-008 | ❌ À faire | ⭐⭐⭐⭐⭐ |
| **FRNT-007** | Système Alertes (Code couleur péremptions/stocks) | 2j | FRNT-005 | ❌ À faire | ⭐⭐⭐⭐ |

#### **Instructions Détaillées**

**Contexte Technique:**
- Base de code: `/workspace/github__DuDuEZN__Pharma-360/frontend/`
- Framework: React.js + Vite + Tailwind CSS
- State Management: Context API + Custom Hooks
- Communication: Axios + WebSockets

**Priorités Immédiates:**
1. **FRNT-005**: Finaliser la session Vente avec intégration FEFO
2. **FRNT-006**: Session Caisse avec gestion de file d'attente
3. **FRNT-007**: Système d'alertes visuelles

**Exigences Spécifiques:**
- Utiliser les composants existants (BarcodeInput, ProductCard, Modal)
- Intégrer avec les APIs Backend (produits, ventes, caisse)
- Implémenter le flux: Vente → Sélection FEFO → Envoi à Caisse → Validation
- Gestion des erreurs et feedback utilisateur
- Responsive design pour tablettes (point de vente)

**Livrables Attendus:**
- Pages React complètes et fonctionnelles
- Composants réutilisables
- Intégration avec le backend
- Tests frontend (Jest)

---

### **🧠 Agent: agent-data-scientist-expert-ia**
**Rôle**: Intelligence Artificielle & Analytics  
**Responsable**: IA Specialist  
**Priorité**: ⭐⭐⭐ (Moyenne)

#### **Tâches Assignées (IA-001 à IA-004 - Priorité Phase 2)**

| ID | Tâche | Durée | Dépendances | Statut | Priorité |
|----|-------|-------|-------------|--------|----------|
| **IA-001** | Analyse Rotation Stocks (par catégorie/marque) | 5j | BKND-006 && QA-004 | ❌ À faire | ⭐⭐⭐ |
| **IA-002** | Module OCR Factures (pytesseract) | 4j | BKND-013 && QA-004 | ✅ **TERMINÉ** | ⭐⭐⭐ |
| **IA-003** | Modèle Prédiction Ruptures (ML) | 4j | IA-001 | ❌ À faire | ⭐⭐ |
| **IA-004** | Intégration OCR avec Backend | 3j | IA-002 && BKND-013 | ❌ À faire | ⭐⭐ |

#### **Instructions Détaillées**

**Contexte Technique:**
- Base de code: `/workspace/github__DuDuEZN__Pharma-360/ia/`
- Langage: Python 3.11+
- Librairies: pytesseract, Pandas, Scikit-Learn, StatsModels
- Intégration: API REST avec le Backend

**Priorités Immédiates:**
1. **IA-001**: Finaliser l'analyse de rotation des stocks
2. **IA-002**: Tester et valider le module OCR
3. **IA-004**: Créer les endpoints API pour l'IA

**Exigences Spécifiques:**
- Le module IA doit fonctionner en local (offline-first)
- Intégration avec PostgreSQL pour les données historiques
- API REST pour exposition des fonctionnalités IA
- Documentation complète des modèles

**Livrables Attendus:**
- Module OCR fonctionnel et testé
- Analyse de rotation des stocks
- Modèle de prédiction de ruptures
- API IA intégrée au backend
- Documentation technique

---

### **🔧 Agent: agent-qa-quality-assurance-devops-engineer**
**Rôle**: Qualité & DevOps  
**Responsable**: QA/DevOps Engineer  
**Priorité**: ⭐⭐⭐ (Moyenne)

#### **Tâches Assignées (QA-005 à QA-008 - Priorité Phase 2)**

| ID | Tâche | Durée | Dépendances | Statut | Priorité |
|----|-------|-------|-------------|--------|----------|
| **QA-005** | Tests Unitaires Backend (pytest) | 5j | BKND-010 | ❌ À faire | ⭐⭐⭐ |
| **QA-006** | Tests d'Intégration (APIs + DB) | 4j | QA-005 | ❌ À faire | ⭐⭐⭐ |
| **QA-007** | Tests Frontend (Jest + React Testing) | 4j | FRNT-007 | ❌ À faire | ⭐⭐ |
| **QA-008** | Tests Module IA | 3j | IA-004 | ❌ À faire | ⭐⭐ |

#### **Instructions Détaillées**

**Contexte Technique:**
- Backend: pytest
- Frontend: Jest + React Testing Library
- IA: pytest
- Couverture cible: > 90% pour le backend

**Priorités Immédiates:**
1. **QA-005**: Tests unitaires pour le backend
2. **QA-006**: Tests d'intégration APIs + BDD
3. **QA-007**: Tests frontend

**Exigences Spécifiques:**
- Tests pour la logique FEFO/FIFO
- Tests pour l'authentification RBAC
- Tests pour les WebSockets
- Tests pour le module OCR
- Scripts de test automatisés

**Livrables Attendus:**
- Suite de tests complète
- Rapport de couverture
- Documentation des tests
- Correction des bugs identifiés

---

## 📅 **Calendrier Phase 2 (35 jours)**

### **Semaine 1 (J21-J27) - Fondations Backend**
- **Backend Lead**: BKND-001, BKND-002, BKND-003, BKND-004, BKND-005
- **Frontend**: FRNT-001, FRNT-002, FRNT-003, FRNT-004
- **IA**: IA-002 (OCR)
- **QA**: Préparation des tests

### **Semaine 2 (J28-J34) - Cœur Métier**
- **Backend Lead**: BKND-006, BKND-007, BKND-008
- **Frontend**: FRNT-005, FRNT-006
- **IA**: IA-001, IA-004
- **QA**: QA-005 (Tests Backend)

### **Semaine 3 (J35-J41) - Intégration**
- **Backend Lead**: BKND-009, BKND-010
- **Frontend**: FRNT-007
- **IA**: IA-003
- **QA**: QA-006, QA-007

### **Semaine 4 (J42-J48) - Validation**
- **Backend Lead**: Documentation, optimisations
- **Frontend**: Tests utilisateur, corrections
- **IA**: Intégration finale
- **QA**: QA-008, tests finaux

### **Semaine 5 (J49-J55) - Finalisation**
- Tests complets
- Corrections
- Documentation
- Préparation Phase 3

---

## 🎯 **Dépendances Critiques à Respecter**

```
BKND-006 (Stocks FEFO)
  └─> BKND-007 (Ventes)
      └─> BKND-008 (Caisse)
          └─> BKND-009 (WebSockets)
              └─> FRNT-006 (Session Caisse)

BKND-005 (Produits)
  └─> BKND-007 (Ventes)
  └─> BKND-010 (Barcode)
      └─> FRNT-005 (Session Vente)

IA-002 (OCR)
  └─> IA-004 (Intégration)
      └─> BKND-013 (Gestion Factures)
```

---

## 📋 **Points de Synchronisation**

### **Réunions Quotidiennes (Stand-up)**
- **Heure**: 9h00 (heure locale)
- **Durée**: 15 minutes
- **Format**: Chaque agent présente:
  - Ce qui a été fait hier
  - Ce qui sera fait aujourd'hui
  - Les blocages éventuels

### **Réunions Hebdomadaires**
- **Jour**: Vendredi après-midi
- **Durée**: 1 heure
- **Objectif**: Revue d'avancement, validation des livrables, ajustement du planning

### **Revue de Phase**
- **Date**: J55 (Fin Phase 2)
- **Objectif**: Validation complète avant passage à la Phase 3

---

## 🚨 **Risques Identifiés & Mitigation**

| Risque | Probabilité | Impact | Mitigation |
|--------|-------------|--------|------------|
| Retard Backend | Moyenne | Critique | Prioriser BKND-006 à BKND-008 |
| Incompatibilité Frontend-Backend | Moyenne | Élevé | Revue quotidienne des APIs |
| Module IA non fonctionnel | Faible | Moyen | Fallback sur règles métiers |
| Problèmes de performance | Faible | Moyen | Optimisation en fin de phase |

---

## ✅ **Critères de Succès Phase 2**

- [ ] Toutes les APIs Backend de base sont fonctionnelles
- [ ] Le Frontend permet la gestion complète des ventes et caisse
- [ ] Le système FEFO/FIFO est opérationnel
- [ ] L'intégration Backend-Frontend est validée
- [ ] Les tests unitaires couvrent > 90% du backend
- [ ] Le module OCR est fonctionnel
- [ ] La documentation est complète

---

## 📞 **Contacts & Support**

| Rôle | Agent | Canal |
|------|-------|-------|
| **Coordinateur** | Vibe Code | #general |
| **Backend Lead** | agent-developpeur-backend-lead | #backend |
| **Frontend** | agent-developpeur-frontend | #frontend |
| **IA** | agent-data-scientist-expert-ia | #ia |
| **QA/DevOps** | agent-qa-quality-assurance-devops-engineer | #qa |

---

## 🎯 **Prochaines Étapes**

1. **Chaque agent prend connaissance de ses tâches assignées**
2. **Validation des dépendances par le coordinateur**
3. **Démarrage immédiat du développement**
4. **Premier stand-up demain à 9h00**

---

**Document généré par**: Vibe Code (Mistral AI)  
**Date**: 2025-01-15  
**Version**: 1.0.0
