# 📋 ARCH-003: Specifications API Inter-Modules

ID Tache: ARCH-003
Responsable: Superviseur (Agent Architecte)
Duree: 5 jours (J5-J9)
Statut: EN COURS (J5 - 2025-01-09)
Priorite: Chemin critique
Dependances: ARCH-002

## Objectif
Definir les specifications completes des APIs pour la communication entre modules.

## Architecture
Frontend <-> Backend <-> IA
Backend <-> PostgreSQL

## Endpoints Principaux

### Authentification
- POST /api/auth/login - Connexion
- POST /api/auth/refresh - Rafraichir token
- POST /api/auth/logout - Deconnexion
- GET /api/auth/me - Infos utilisateur

### Utilisateurs (Admin)
- GET /api/users/ - Liste
- POST /api/users/ - Creer
- GET /api/users/{id} - Details
- PUT /api/users/{id} - Mettre a jour
- DELETE /api/users/{id} - Supprimer

### Produits
- GET /api/products/ - Liste
- POST /api/products/ - Creer
- GET /api/products/{id} - Details
- PUT /api/products/{id} - Mettre a jour
- DELETE /api/products/{id} - Supprimer
- GET /api/products/search - Recherche

### Lots (FEFO/FIFO)
- GET /api/batches/ - Liste
- POST /api/batches/ - Creer
- GET /api/batches/{id} - Details
- GET /api/batches/fefo/{product_id} - Selection FEFO

### Ventes
- GET /api/sales/ - Liste
- POST /api/sales/ - Creer
- GET /api/sales/{id} - Details
- PUT /api/sales/{id}/status - Mettre a jour statut

### Caisse
- GET /api/cashier/queue - File d'attente
- POST /api/cashier/{sale_id}/pay - Valider paiement
- POST /api/cashier/{sale_id}/ticket - Generer ticket

### Retours
- GET /api/returns/ - Liste
- POST /api/returns/ - Creer
- GET /api/returns/{id} - Details

### Factures
- GET /api/invoices/ - Liste
- POST /api/invoices/ - Creer
- PUT /api/invoices/{id}/status - Mettre a jour statut
- POST /api/invoices/{id}/ocr - Traiter OCR

### Rapports
- GET /api/reports/sales - Rapport ventes
- GET /api/reports/stock - Rapport stock
- GET /api/reports/expiry - Alertes peremption

## WebSocket
- ws://localhost:8000/ws
- Evenements: new_sale, sale_confirmed, payment_validated, queue_update, stock_alert

## Validation
- Spécifications validées par Backend Lead
- Spécifications validées par Frontend
- Spécifications validées par IA
- Documentation complète

## Prochaines Etapes
J6-J9: Finaliser la documentation
J10: Demarrer ARCH-004
J11-J15: Demarrer BKND-001
