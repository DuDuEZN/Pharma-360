# ARCH-003: Specifications API Inter-Modules

ID Tache: ARCH-003
Responsable: Superviseur
Duree: 5 jours (J5-J9)
Statut: TERMINE (J9 - 2025-01-13)
Priorite: Chemin critique
Dependances: ARCH-002

## Objectif
Definir les specifications completes des APIs pour la communication entre Frontend, Backend, IA et PostgreSQL.

## Architecture
Frontend <-> Backend <-> IA
Backend <-> PostgreSQL

## Security et RBAC
Roles: admin, seller, cashier, manager
Authentification: JWT (HS256, 30min expiration)

## Endpoints REST

### Authentification
POST /api/auth/login - Connexion
POST /api/auth/refresh - Rafraichir token
POST /api/auth/logout - Deconnexion
GET /api/auth/me - Infos utilisateur

### Utilisateurs (Admin)
GET /api/users/ - Liste
POST /api/users/ - Creer
GET /api/users/{id} - Details
PUT /api/users/{id} - Mettre a jour
DELETE /api/users/{id} - Supprimer

### Categories
GET /api/categories/ - Liste
POST /api/categories/ - Creer (manager)
GET /api/categories/{id} - Details
PUT /api/categories/{id} - Mettre a jour (manager)
DELETE /api/categories/{id} - Supprimer (manager)

### Produits
GET /api/products/ - Liste
POST /api/products/ - Creer (manager)
GET /api/products/{id} - Details
PUT /api/products/{id} - Mettre a jour (manager)
DELETE /api/products/{id} - Supprimer (manager)
GET /api/products/search - Recherche

### Fournisseurs
GET /api/suppliers/ - Liste
POST /api/suppliers/ - Creer (manager)
GET /api/suppliers/{id} - Details
PUT /api/suppliers/{id} - Mettre a jour (manager)
DELETE /api/suppliers/{id} - Supprimer (manager)

### Lots (FEFO/FIFO Core)
GET /api/batches/ - Liste
POST /api/batches/ - Creer (manager)
GET /api/batches/{id} - Details
PUT /api/batches/{id} - Mettre a jour (manager)
GET /api/batches/fefo/{product_id} - Selection FEFO automatique

### Stocks
GET /api/stock/ - Stock global
GET /api/stock/{product_id} - Stock par produit
GET /api/stock/low - Alertes stock bas (manager)
GET /api/stock/expiry - Alertes peremption (manager)

### Ventes
GET /api/sales/ - Liste (seller,cashier,manager)
POST /api/sales/ - Creer vente avec FEFO (seller)
GET /api/sales/{id} - Details
PUT /api/sales/{id}/status - Mettre a jour statut
GET /api/sales/today - Ventes du jour

### Caisse
GET /api/cashier/queue - File d'attente (cashier)
POST /api/cashier/{sale_id}/pay - Valider paiement (cashier)
POST /api/cashier/{sale_id}/ticket - Generer ticket (cashier)
GET /api/cashier/today - Ventes du jour (cashier,manager)

### Retours
GET /api/returns/ - Liste (manager)
POST /api/returns/ - Creer retour (manager)
GET /api/returns/{id} - Details (manager)

### Factures Fournisseurs
GET /api/invoices/ - Liste (manager)
POST /api/invoices/ - Creer (manager)
GET /api/invoices/{id} - Details (manager)
PUT /api/invoices/{id}/status - Mettre a jour statut (manager)
POST /api/invoices/{id}/ocr - Traiter OCR (manager)

### Rapports
GET /api/reports/sales - Rapport ventes (manager)
GET /api/reports/stock - Rapport stock (manager)
GET /api/reports/expiry - Alertes peremption (manager)
GET /api/reports/cashier - Rapport caisse (manager)

## WebSocket
URL: ws://localhost:8000/ws
Auth: Token JWT

### Evenements
- connect/disconnect: Connexion/Déconnexion
- new_sale: Nouvelle vente (seller -> Backend)
- sale_confirmed: Vente confirmée (Backend -> Frontend)
- payment_validated: Paiement validé (Backend -> Caisse)
- queue_update: Mise a jour file (Backend -> Caisse)
- stock_alert: Alerte stock bas (Backend -> All)
- expiry_alert: Alerte peremption (Backend -> All)
- new_return: Nouveau retour (Backend -> Manager)

## Contrats de Donnees (Simplifie)

### User
{id, username, email, full_name, role, is_active, created_at}

### Product
{id, name, dci, barcode, category_id, price, cost_price, stock_min, stock_max, unit, is_active}

### Batch (FEFO)
{id, product_id, batch_number, expiry_date, quantity, location, supplier_id, cost_price, selling_price, status}

### Sale
{id, sale_number, customer_id, user_id, status, subtotal, tax_amount, discount, total, items: [SaleItem]}

### SaleItem
{id, sale_id, batch_id, product_id, quantity, unit_price, total_price, expiry_date}

### Movement (Audit)
{id, type, reference_id, reference_type, product_id, batch_id, old_quantity, new_quantity, quantity_change, user_id, notes}

## Validation
Backend Lead: Validé
Frontend: Validé
IA: Validé
Superviseur: Validé

## Prochaines Etapes
J10-J11: ARCH-004 (Guide de Developpement)
J11-J15: BKND-001 (Authentification RBAC)

## Dependances
FEFO/FIFO: Selection automatique via idx_batches_active_quantity
Barcode Scanner: Index unique sur products.barcode
OCR: Structure JSONB dans invoices.ocr_data

Document cree: 2025-01-09
Document finalise: 2025-01-13
Responsable: agent-superviseur-de-projet
Statut: TERMINE
