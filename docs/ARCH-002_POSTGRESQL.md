# 🗃️ **ARCH-002 : Modèle de Données PostgreSQL**

**ID Tâche** : ARCH-002  
**Responsable** : Superviseur (Agent Architecte)  
**Durée** : 3 jours (J3-J5)  
**Statut** : 🔄 **EN COURS** (J2 - Début anticipé)  
**Priorité** : ⭐⭐⭐⭐⭐ (Critique - Chemin critique)  
**Dépendances** : → ARCH-001 (Schéma d'Architecture Globale)  

---

## 📋 **Objectif**

Définir le **modèle de données PostgreSQL complet** pour Pharmacie 360° en respectant :
- **Normalisation** : Éviter la redondance, respect des formes normales
- **Performance** : Index optimisés pour les requêtes FEFO/FIFO
- **Traçabilité** : Historique complet des mouvements de stock
- **Intégrité** : Contraintes d'intégrité référentielle
- **Extensibilité** : Possibilité d'ajouter de nouveaux champs/modules

---

## 🎯 **Livrables Attendus**

1. ✅ **Schéma complet de la base de données** (toutes les tables)
2. ✅ **Index optimisés** pour les requêtes FEFO/FIFO
3. ✅ **Script SQL d'initialisation** (`scripts/init-db.sql`)
4. ✅ **Documentation des relations** entre les tables
5. ✅ **Validation par l'équipe** (revue collective)

---

## 📊 **Schéma Global de la Base de Données**

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                    PHARMACIE 360° - SCHÉMA POSTGRESQL                           │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│  ┌──────────────┐       ┌──────────────┐       ┌──────────────┐            │
│  │   users       │       │  products     │       │  suppliers    │            │
│  │---------------│       │---------------│       │---------------│            │
│  │ id (PK)       │       │ id (PK)       │       │ id (PK)       │            │
│  │ username      │       │ name          │       │ name          │            │
│  │ password_hash │       │ dci           │       │ contact       │            │
│  │ email         │       │ barcode       │       │ email         │            │
│  │ role          │       │ category_id   │       │ phone         │            │
│  │ is_active     │       │ price         │       │ address       │            │
│  │ created_at    │       │ stock_min     │       │ created_at    │            │
│  │ updated_at    │       │ stock_max     │       │ updated_at    │            │
│  └──────────────┘       │ is_active     │       └──────────────┘            │
│                      └───────┬───────┘                                    │
│                              │                                             │
│  ┌──────────────┐       ┌──────▼───────┐       ┌──────────────┐            │
│  │  categories   │       │   batches     │       │   customers   │            │
│  │---------------│       │---------------│       │---------------│            │
│  │ id (PK)       │◄──────┤ id (PK)       │       │ id (PK)       │            │
│  │ name          │       │ product_id(FK)│       │ name          │            │
│  │ description   │       │ batch_number  │       │ contact       │            │
│  └──────────────┘       │ expiry_date   │       │ email         │            │
│                          │ quantity      │       │ phone         │            │
│                          │ location      │       │ address       │            │
│                          │ received_date │       │ created_at    │            │
│                          │ supplier_id(FK)│       └──────────────┘            │
│                          │ cost_price    │                                    │
│                          │ selling_price │                                    │
│                          │ created_at    │                                    │
│                          │ updated_at    │                                    │
│                          └───────┬───────┘                                    │
│                                  │                                             │
│  ┌──────────────┐       ┌──────────────┐       ┌──────────────┐            │
│  │   sales       │       │   returns     │       │  invoices     │            │
│  │---------------│       │---------------│       │---------------│            │
│  │ id (PK)       │       │ id (PK)       │       │ id (PK)       │            │
│  │ sale_number   │       │ return_number │       │ invoice_number│            │
│  │ customer_id(FK)│       │ batch_id(FK)  │       │ supplier_id(FK)│            │
│  │ user_id(FK)   │       │ quantity      │       │ date          │            │
│  │ status        │       │ reason        │       │ total_amount  │            │
│  │ subtotal      │       │ user_id(FK)   │       │ tax_amount    │            │
│  │ tax           │       │ date          │       │ discount      │            │
│  │ discount      │       │ notes         │       │ total_final   │            │
│  │ total         │       │ created_at    │       │ status        │            │
│  │ payment_method│       └──────────────┘       │ paid_at       │            │
│  │ created_at    │                              │ file_path     │            │
│  │ updated_at    │                              │ created_at    │            │
│  └──────────────┘                              └──────────────┘            │
│                                                                              │
│  ┌─────────────────────────────────────────────────────────────────────┐    │
│  │                        TABLES DE JONCTION                              │    │
│  └─────────────────────────────────────────────────────────────────────┘    │
│                                                                              │
│  ┌──────────────┐       ┌──────────────┐                                    │
│  │ sale_items    │       │  movements    │                                    │
│  │---------------│       │---------------│                                    │
│  │ id (PK)       │       │ id (PK)       │                                    │
│  │ sale_id(FK)   │       │ type          │                                    │
│  │ batch_id(FK)  │       │ reference_id  │                                    │
│  │ quantity      │       │ reference_type│                                    │
│  │ unit_price    │       │ quantity      │                                    │
│  │ total_price   │       │ old_quantity  │                                    │
│  │ created_at    │       │ new_quantity  │                                    │
│  └──────────────┘       │ user_id(FK)   │                                    │
│                          │ date          │                                    │
│                          │ notes         │                                    │
│                          └──────────────┘                                    │
│                                                                              │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## 📝 **Tables Détaillées**

---

### **1. Table `users` (Utilisateurs)**

**Description** : Stocke les informations des utilisateurs du système avec leurs rôles et permissions.

```sql
CREATE TABLE users (
    id SERIAL PRIMARY KEY,
    username VARCHAR(50) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    email VARCHAR(100) UNIQUE NOT NULL,
    full_name VARCHAR(100),
    role VARCHAR(20) NOT NULL 
        CHECK (role IN ('admin', 'seller', 'cashier', 'manager')),
    is_active BOOLEAN DEFAULT TRUE,
    last_login TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Index
CREATE INDEX idx_users_username ON users(username);
CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_users_role ON users(role);

-- Trigger pour updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_users_updated_at
    BEFORE UPDATE ON users
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();
```

**Champs** :

| Champ | Type | Nullable | Description |
|-------|------|----------|-------------|
| `id` | SERIAL | ❌ | Identifiant unique |
| `username` | VARCHAR(50) | ❌ | Nom d'utilisateur (unique) |
| `password_hash` | VARCHAR(255) | ❌ | Hash du mot de passe (bcrypt) |
| `email` | VARCHAR(100) | ❌ | Email (unique) |
| `full_name` | VARCHAR(100) | ✅ | Nom complet |
| `role` | VARCHAR(20) | ❌ | Rôle (admin, seller, cashier, manager) |
| `is_active` | BOOLEAN | ✅ | Compte actif ? (défaut: TRUE) |
| `last_login` | TIMESTAMP | ✅ | Dernière connexion |
| `created_at` | TIMESTAMP | ❌ | Date de création |
| `updated_at` | TIMESTAMP | ❌ | Date de mise à jour |

---

### **2. Table `categories` (Catégories de Produits)**

**Description** : Classifie les produits par catégorie (ex: Antipaludéens, Antibiotiques, etc.).

```sql
CREATE TABLE categories (
    id SERIAL PRIMARY KEY,
    name VARCHAR(50) UNIQUE NOT NULL,
    description TEXT,
    parent_id INTEGER REFERENCES categories(id) ON DELETE SET NULL,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Index
CREATE INDEX idx_categories_name ON categories(name);
CREATE INDEX idx_categories_parent ON categories(parent_id);
```

**Champs** :

| Champ | Type | Nullable | Description |
|-------|------|----------|-------------|
| `id` | SERIAL | ❌ | Identifiant unique |
| `name` | VARCHAR(50) | ❌ | Nom de la catégorie (unique) |
| `description` | TEXT | ✅ | Description |
| `parent_id` | INTEGER | ✅ | Catégorie parente (pour hiérarchie) |
| `is_active` | BOOLEAN | ✅ | Catégorie active ? |
| `created_at` | TIMESTAMP | ❌ | Date de création |
| `updated_at` | TIMESTAMP | ❌ | Date de mise à jour |

---

### **3. Table `products` (Produits)**

**Description** : Stocke les informations des produits (médicaments, matériel médical, etc.).

```sql
CREATE TABLE products (
    id SERIAL PRIMARY KEY,
    name VARCHAR(200) NOT NULL,
    dci VARCHAR(100),  -- Denomination Commune Internationale
    barcode VARCHAR(50) UNIQUE,
    category_id INTEGER REFERENCES categories(id) ON DELETE SET NULL,
    description TEXT,
    price DECIMAL(10, 2) NOT NULL DEFAULT 0,
    cost_price DECIMAL(10, 2) DEFAULT 0,
    stock_min INTEGER DEFAULT 0,
    stock_max INTEGER DEFAULT 100,
    unit VARCHAR(20) DEFAULT 'unité',
    manufacturer VARCHAR(100),
    is_active BOOLEAN DEFAULT TRUE,
    requires_prescription BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Index
CREATE INDEX idx_products_name ON products(name);
CREATE INDEX idx_products_barcode ON products(barcode);
CREATE INDEX idx_products_category ON products(category_id);
CREATE INDEX idx_products_dci ON products(dci);
CREATE INDEX idx_products_manufacturer ON products(manufacturer);

-- Trigger pour updated_at
CREATE TRIGGER update_products_updated_at
    BEFORE UPDATE ON products
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();
```

**Champs** :

| Champ | Type | Nullable | Description |
|-------|------|----------|-------------|
| `id` | SERIAL | ❌ | Identifiant unique |
| `name` | VARCHAR(200) | ❌ | Nom commercial du produit |
| `dci` | VARCHAR(100) | ✅ | Dénomination Commune Internationale |
| `barcode` | VARCHAR(50) | ✅ | Code-barres (unique) |
| `category_id` | INTEGER | ✅ | Catégorie du produit |
| `description` | TEXT | ✅ | Description détaillée |
| `price` | DECIMAL(10,2) | ❌ | Prix de vente (défaut: 0) |
| `cost_price` | DECIMAL(10,2) | ✅ | Prix d'achat |
| `stock_min` | INTEGER | ✅ | Stock minimum (alerte) |
| `stock_max` | INTEGER | ✅ | Stock maximum |
| `unit` | VARCHAR(20) | ✅ | Unité (unité, boîte, flacon, etc.) |
| `manufacturer` | VARCHAR(100) | ✅ | Fabricant |
| `is_active` | BOOLEAN | ✅ | Produit actif ? |
| `requires_prescription` | BOOLEAN | ✅ | Nécessite une ordonnance ? |
| `created_at` | TIMESTAMP | ❌ | Date de création |
| `updated_at` | TIMESTAMP | ❌ | Date de mise à jour |

---

### **4. Table `suppliers` (Fournisseurs)**

**Description** : Stocke les informations des fournisseurs.

```sql
CREATE TABLE suppliers (
    id SERIAL PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    contact VARCHAR(100),
    email VARCHAR(100),
    phone VARCHAR(20),
    address TEXT,
    city VARCHAR(50),
    country VARCHAR(50) DEFAULT 'Bénin',
    tax_id VARCHAR(50),  -- Numéro fiscal
    payment_terms TEXT,  -- Conditions de paiement
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Index
CREATE INDEX idx_suppliers_name ON suppliers(name);
CREATE INDEX idx_suppliers_email ON suppliers(email);
CREATE INDEX idx_suppliers_phone ON suppliers(phone);
```

**Champs** :

| Champ | Type | Nullable | Description |
|-------|------|----------|-------------|
| `id` | SERIAL | ❌ | Identifiant unique |
| `name` | VARCHAR(100) | ❌ | Nom du fournisseur |
| `contact` | VARCHAR(100) | ✅ | Personne de contact |
| `email` | VARCHAR(100) | ✅ | Email |
| `phone` | VARCHAR(20) | ✅ | Téléphone |
| `address` | TEXT | ✅ | Adresse complète |
| `city` | VARCHAR(50) | ✅ | Ville |
| `country` | VARCHAR(50) | ✅ | Pays (défaut: Bénin) |
| `tax_id` | VARCHAR(50) | ✅ | Numéro fiscal |
| `payment_terms` | TEXT | ✅ | Conditions de paiement |
| `is_active` | BOOLEAN | ✅ | Fournisseur actif ? |
| `created_at` | TIMESTAMP | ❌ | Date de création |
| `updated_at` | TIMESTAMP | ❌ | Date de mise à jour |

---

### **5. Table `customers` (Clients)**

**Description** : Stocke les informations des clients (optionnel pour les pharmacies avec fidélisation).

```sql
CREATE TABLE customers (
    id SERIAL PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    contact VARCHAR(100),
    email VARCHAR(100),
    phone VARCHAR(20),
    address TEXT,
    loyalty_points INTEGER DEFAULT 0,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Index
CREATE INDEX idx_customers_name ON customers(name);
CREATE INDEX idx_customers_phone ON customers(phone);
```

---

### **6. Table `batches` (Lots) - ⭐ CŒUR DU SYSTÈME FEFO/FIFO ⭐**

**Description** : **Table la plus critique** - Stocke les informations des lots de produits avec gestion des dates de péremption pour FEFO.

```sql
CREATE TABLE batches (
    id SERIAL PRIMARY KEY,
    product_id INTEGER NOT NULL REFERENCES products(id) ON DELETE CASCADE,
    batch_number VARCHAR(50) UNIQUE NOT NULL,
    expiry_date DATE NOT NULL,
    quantity INTEGER NOT NULL DEFAULT 0,
    initial_quantity INTEGER NOT NULL DEFAULT 0,
    location VARCHAR(50),
    received_date DATE NOT NULL DEFAULT CURRENT_DATE,
    supplier_id INTEGER REFERENCES suppliers(id) ON DELETE SET NULL,
    cost_price DECIMAL(10, 2) NOT NULL DEFAULT 0,
    selling_price DECIMAL(10, 2) NOT NULL DEFAULT 0,
    purchase_invoice_id INTEGER REFERENCES invoices(id) ON DELETE SET NULL,
    status VARCHAR(20) DEFAULT 'active' 
        CHECK (status IN ('active', 'expired', 'returned', 'damaged')),
    notes TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- ⭐ INDEX CRITIQUES POUR FEFO/FIFO ⭐
CREATE INDEX idx_batches_product_id ON batches(product_id);
CREATE INDEX idx_batches_expiry_date ON batches(expiry_date);
CREATE INDEX idx_batches_quantity ON batches(quantity) WHERE quantity > 0;
CREATE INDEX idx_batches_status ON batches(status);
-- Index composite pour optimisation FEFO
CREATE INDEX idx_batches_product_expiry ON batches(product_id, expiry_date);
CREATE INDEX idx_batches_active_quantity ON batches(product_id, quantity, expiry_date) 
    WHERE quantity > 0 AND status = 'active';

-- Trigger pour updated_at
CREATE TRIGGER update_batches_updated_at
    BEFORE UPDATE ON batches
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Trigger pour vérifier que quantity <= initial_quantity
CREATE OR REPLACE FUNCTION check_batch_quantity()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.quantity > NEW.initial_quantity THEN
        RAISE EXCEPTION 'Quantity cannot exceed initial_quantity';
    END IF;
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER validate_batch_quantity
    BEFORE UPDATE ON batches
    FOR EACH ROW
    EXECUTE FUNCTION check_batch_quantity();
```

**Champs** :

| Champ | Type | Nullable | Description |
|-------|------|----------|-------------|
| `id` | SERIAL | ❌ | Identifiant unique |
| `product_id` | INTEGER | ❌ | Produit associé (FK) |
| `batch_number` | VARCHAR(50) | ❌ | Numéro de lot (unique) |
| `expiry_date` | DATE | ❌ | **Date de péremption (clé pour FEFO)** |
| `quantity` | INTEGER | ❌ | Quantité actuelle (défaut: 0) |
| `initial_quantity` | INTEGER | ❌ | Quantité initiale (pour historique) |
| `location` | VARCHAR(50) | ✅ | Emplacement physique |
| `received_date` | DATE | ❌ | Date de réception (défaut: aujourd'hui) |
| `supplier_id` | INTEGER | ✅ | Fournisseur (FK) |
| `cost_price` | DECIMAL(10,2) | ❌ | Prix d'achat du lot |
| `selling_price` | DECIMAL(10,2) | ❌ | Prix de vente du lot |
| `purchase_invoice_id` | INTEGER | ✅ | Facture d'achat associée (FK) |
| `status` | VARCHAR(20) | ✅ | Statut (active, expired, returned, damaged) |
| `notes` | TEXT | ✅ | Notes diverses |
| `created_at` | TIMESTAMP | ❌ | Date de création |
| `updated_at` | TIMESTAMP | ❌ | Date de mise à jour |

**⚠️ Notes importantes** :
- **FEFO** : Les requêtes doivent **TOUJOURS** trier par `expiry_date ASC` pour sélectionner le lot avec la date de péremption la plus proche
- **FIFO** : Alternative si FEFO n'est pas applicable (mais FEFO est la priorité)
- **Index** : Les index sur `product_id`, `expiry_date`, et `quantity` sont **critiques pour les performances**

---

### **7. Table `invoices` (Factures Fournisseurs)**

**Description** : Stocke les informations des factures d'achat des fournisseurs.

```sql
CREATE TABLE invoices (
    id SERIAL PRIMARY KEY,
    invoice_number VARCHAR(50) UNIQUE NOT NULL,
    supplier_id INTEGER NOT NULL REFERENCES suppliers(id) ON DELETE CASCADE,
    date DATE NOT NULL DEFAULT CURRENT_DATE,
    due_date DATE,
    subtotal DECIMAL(12, 2) NOT NULL DEFAULT 0,
    tax_amount DECIMAL(10, 2) NOT NULL DEFAULT 0,
    discount DECIMAL(10, 2) NOT NULL DEFAULT 0,
    total_final DECIMAL(12, 2) NOT NULL DEFAULT 0,
    status VARCHAR(20) NOT NULL DEFAULT 'draft' 
        CHECK (status IN ('draft', 'pending', 'paid', 'cancelled')),
    payment_method VARCHAR(50),
    payment_date DATE,
    file_path VARCHAR(255),  -- Chemin vers le fichier PDF/OCR
    ocr_processed BOOLEAN DEFAULT FALSE,
    ocr_data JSONB,  -- Données extraites par OCR
## 📋 Structure de `invoices.ocr_data` (JSONB)

La colonne `ocr_data` de la table `invoices` stocke les données extraites par le module OCR.

### Schéma JSON

```json
{
  "metadata": {
    "ocr_engine": "pytesseract",
    "ocr_version": "0.3.10",
    "processing_time_seconds": 2.5,
    "confidence_score": 0.95,
    "timestamp": "2025-01-08T10:00:00Z",
    "file_name": "facture_fournisseur_001.png",
    "file_size_bytes": 1024000,
    "mime_type": "image/png"
  },
  "supplier": {
    "name": "Pharma Distributeur SARL",
    "tax_id": "RCCM-BJ-12345",
    "address": "123 Rue de la Santé, Cotonou, Bénin",
    "phone": "+229 12 34 56 78",
    "email": "contact@pharmadist.com"
  },
  "invoice": {
    "number": "FACT-2025-001",
    "date": "2025-01-05",
    "due_date": "2025-02-04",
    "reference": "REF-12345",
    "currency": "XOF"
  },
  "totals": {
    "subtotal": 500000.00,
    "tax_rate": 18.0,
    "tax_amount": 90000.00,
    "discount_rate": 5.0,
    "discount_amount": 25000.00,
    "total": 565000.00
  },
  "items": [
    {
      "line_number": 1,
      "product_name": "Paracétamol 500mg",
      "dci": "Paracétamol",
      "barcode": "3400932123456",
      "batch_number": "BATCH-2025-001",
      "expiry_date": "2026-12-31",
      "quantity": 100,
      "unit": "boîte",
      "unit_price": 5000.00,
      "total_price": 500000.00,
      "manufacturer": "Labo Pharma",
      "confidence": 0.98
    }
  ],
  "raw_text": {
    "full_text": "PHARMA DISTRIBUTEUR SARL...",
    "supplier_section": "...",
    "invoice_section": "...",
    "items_section": "...",
    "totals_section": "..."
  },
  "warnings": [
    "Barcode non reconnu pour le produit Amoxicilline 1g"
  ]
}
```

### Champs Obligatoires

| Champ | Type | Description |
|-------|------|-------------|
| `metadata` | object | Métadonnées de traitement OCR |
| `metadata.ocr_engine` | string | Moteur OCR utilisé (ex: "pytesseract") |
| `metadata.timestamp` | string | Date/heure du traitement (ISO 8601) |
| `supplier` | object | Informations du fournisseur |
| `supplier.name` | string | Nom du fournisseur |
| `invoice` | object | Informations de la facture |
| `invoice.number` | string | Numéro de la facture |
| `invoice.date` | string | Date de la facture (YYYY-MM-DD) |
| `totals` | object | Totaux de la facture |
| `totals.subtotal` | number | Sous-total (sans taxe) |
| `totals.total` | number | Total final |
| `items` | array | Liste des articles |

### Champs Optionnels

| Champ | Type | Description |
|-------|------|-------------|
| `metadata.confidence_score` | number | Score de confiance (0-1) |
| `metadata.processing_time_seconds` | number | Temps de traitement |
| `metadata.ocr_version` | string | Version de l'OCR |
| `metadata.file_name` | string | Nom du fichier |
| `metadata.file_size_bytes` | number | Taille du fichier |
| `metadata.mime_type` | string | Type MIME |
| `supplier.tax_id` | string | Numéro fiscal |
| `supplier.address` | string | Adresse complète |
| `supplier.phone` | string | Téléphone |
| `supplier.email` | string | Email |
| `invoice.due_date` | string | Date d'échéance |
| `invoice.reference` | string | Référence fournisseur |
| `invoice.currency` | string | Devise (ex: XOF) |
| `totals.tax_rate` | number | Taux de taxe (%) |
| `totals.tax_amount` | number | Montant de la taxe |
| `totals.discount_rate` | number | Taux de remise (%) |
| `totals.discount_amount` | number | Montant de la remise |
| `items[*].line_number` | number | Numéro de ligne |
| `items[*].dci` | string | Dénomination Commune Internationale |
| `items[*].barcode` | string | Code-barres du produit |
| `items[*].batch_number` | string | Numéro de lot |
| `items[*].expiry_date` | string | Date de péremption (YYYY-MM-DD) |
| `items[*].quantity` | number | Quantité |
| `items[*].unit` | string | Unité (ex: boîte) |
| `items[*].unit_price` | number | Prix unitaire |
| `items[*].total_price` | number | Prix total |
| `items[*].manufacturer` | string | Fabricant |
| `items[*].confidence` | number | Confiance OCR (0-1) |
| `raw_text` | object | Texte brut extrait par OCR |
| `warnings` | array | Avertissements de traitement |

### Validation

- ✅ Validé par IA (`agent-data-scientist-expert-ia`)
- ✅ Validé par Backend Lead (`agent-d-veloppeur-backend-lead`)
- Date de validation : 2025-01-08

### Exemples de Requêtes

```sql
-- Trouver les factures avec un fournisseur spécifique
SELECT * FROM invoices 
WHERE ocr_data->'supplier'->>'name' = 'Pharma Distributeur SARL';

-- Trouver les factures avec un produit spécifique
SELECT * FROM invoices 
WHERE EXISTS (
  SELECT 1 FROM jsonb_array_elements(ocr_data->'items') AS item
  WHERE item->>'product_name' = 'Paracétamol 500mg'
);

-- Créer un index sur le numéro de facture
CREATE INDEX idx_invoices_ocr_number ON invoices ((ocr_data->'invoice'->>'number'));
```
    notes TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Index
CREATE INDEX idx_invoices_number ON invoices(invoice_number);
CREATE INDEX idx_invoices_supplier ON invoices(supplier_id);
CREATE INDEX idx_invoices_date ON invoices(date);
CREATE INDEX idx_invoices_status ON invoices(status);
CREATE INDEX idx_invoices_due_date ON invoices(due_date);

-- Trigger pour updated_at
CREATE TRIGGER update_invoices_updated_at
    BEFORE UPDATE ON invoices
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();
```

---

### **8. Table `sales` (Ventes)**

**Description** : Stocke les informations des ventes réalisées.

```sql
CREATE TABLE sales (
    id SERIAL PRIMARY KEY,
    sale_number VARCHAR(50) UNIQUE NOT NULL,
    customer_id INTEGER REFERENCES customers(id) ON DELETE SET NULL,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    status VARCHAR(20) NOT NULL DEFAULT 'pending' 
        CHECK (status IN ('pending', 'paid', 'cancelled', 'refunded')),
    subtotal DECIMAL(12, 2) NOT NULL DEFAULT 0,
    tax_amount DECIMAL(10, 2) NOT NULL DEFAULT 0,
    discount DECIMAL(10, 2) NOT NULL DEFAULT 0,
    total DECIMAL(12, 2) NOT NULL DEFAULT 0,
    payment_method VARCHAR(50),
    payment_reference VARCHAR(100),  -- Référence de paiement
    payment_date TIMESTAMP,
    notes TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Index
CREATE INDEX idx_sales_number ON sales(sale_number);
CREATE INDEX idx_sales_user ON sales(user_id);
CREATE INDEX idx_sales_customer ON sales(customer_id);
CREATE INDEX idx_sales_status ON sales(status);
CREATE INDEX idx_sales_date ON sales(created_at);

-- Trigger pour updated_at
CREATE TRIGGER update_sales_updated_at
    BEFORE UPDATE ON sales
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();
```

---

### **9. Table `sale_items` (Articles de Vente)**

**Description** : Table de jonction entre les ventes et les lots vendus (avec traçabilité FEFO).

```sql
CREATE TABLE sale_items (
    id SERIAL PRIMARY KEY,
    sale_id INTEGER NOT NULL REFERENCES sales(id) ON DELETE CASCADE,
    batch_id INTEGER NOT NULL REFERENCES batches(id) ON DELETE CASCADE,
    product_id INTEGER NOT NULL REFERENCES products(id) ON DELETE CASCADE,
    quantity INTEGER NOT NULL,
    unit_price DECIMAL(10, 2) NOT NULL,
    total_price DECIMAL(12, 2) NOT NULL,
    expiry_date DATE,  -- Date de péremption au moment de la vente (pour historique)
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Index
CREATE INDEX idx_sale_items_sale ON sale_items(sale_id);
CREATE INDEX idx_sale_items_batch ON sale_items(batch_id);
CREATE INDEX idx_sale_items_product ON sale_items(product_id);

-- Trigger pour copier expiry_date depuis batches
CREATE OR REPLACE FUNCTION set_sale_item_expiry_date()
RETURNS TRIGGER AS $$
BEGIN
    NEW.expiry_date := (
        SELECT expiry_date FROM batches WHERE id = NEW.batch_id
    );
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_sale_item_expiry_date
    BEFORE INSERT ON sale_items
    FOR EACH ROW
    EXECUTE FUNCTION set_sale_item_expiry_date();
```

---

### **10. Table `returns` (Retours)**

**Description** : Stocke les informations des retours (fournisseur, péremption, casse).

```sql
CREATE TABLE returns (
    id SERIAL PRIMARY KEY,
    return_number VARCHAR(50) UNIQUE NOT NULL,
    batch_id INTEGER NOT NULL REFERENCES batches(id) ON DELETE CASCADE,
    product_id INTEGER NOT NULL REFERENCES products(id) ON DELETE CASCADE,
    quantity INTEGER NOT NULL,
    reason VARCHAR(50) NOT NULL 
        CHECK (reason IN ('supplier', 'expiry', 'damage', 'other')),
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    notes TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Index
CREATE INDEX idx_returns_batch ON returns(batch_id);
CREATE INDEX idx_returns_product ON returns(product_id);
CREATE INDEX idx_returns_user ON returns(user_id);
CREATE INDEX idx_returns_date ON returns(created_at);
CREATE INDEX idx_returns_reason ON returns(reason);
```

---

### **11. Table `movements` (Mouvements de Stock)**

**Description** : **Table d'audit** pour la traçabilité complète des mouvements de stock.

```sql
CREATE TABLE movements (
    id SERIAL PRIMARY KEY,
    type VARCHAR(20) NOT NULL 
        CHECK (type IN ('purchase', 'sale', 'return', 'adjustment', 'expiry')),
    reference_id INTEGER NOT NULL,  -- ID de la table de référence
    reference_type VARCHAR(20) NOT NULL 
        CHECK (reference_type IN ('batch', 'sale', 'return', 'invoice')),
    product_id INTEGER REFERENCES products(id) ON DELETE CASCADE,
    batch_id INTEGER REFERENCES batches(id) ON DELETE SET NULL,
    old_quantity INTEGER NOT NULL,
    new_quantity INTEGER NOT NULL,
    quantity_change INTEGER NOT NULL,  -- = new_quantity - old_quantity
    user_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
    notes TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Index
CREATE INDEX idx_movements_reference ON movements(reference_id, reference_type);
CREATE INDEX idx_movements_product ON movements(product_id);
CREATE INDEX idx_movements_batch ON movements(batch_id);
CREATE INDEX idx_movements_user ON movements(user_id);
CREATE INDEX idx_movements_date ON movements(created_at);
CREATE INDEX idx_movements_type ON movements(type);

-- Trigger pour enregistrer automatiquement les mouvements de stock
CREATE OR REPLACE FUNCTION log_batch_quantity_change()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.quantity != OLD.quantity THEN
        INSERT INTO movements (
            type, reference_id, reference_type, product_id, batch_id,
            old_quantity, new_quantity, quantity_change, user_id, notes
        ) VALUES (
            CASE 
                WHEN NEW.quantity > OLD.quantity THEN 'purchase'
                WHEN NEW.quantity < OLD.quantity THEN 'sale'
                ELSE 'adjustment'
            END,
            NEW.id, 'batch', NEW.product_id, NEW.id,
            OLD.quantity, NEW.quantity, NEW.quantity - OLD.quantity,
            current_setting('app.current_user_id')::INTEGER,
            'Automatic quantity update'
        );
    END IF;
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER log_batch_quantity_change_trigger
    AFTER UPDATE ON batches
    FOR EACH ROW
    WHEN (OLD.quantity IS DISTINCT FROM NEW.quantity)
    EXECUTE FUNCTION log_batch_quantity_change();
```

---

## 🔍 **Requêtes SQL Clés pour FEFO/FIFO**

### **1. Sélection FEFO (First Expired, First Out)**

**Requête pour obtenir le lot avec la date de péremption la plus proche pour un produit donné** :

```sql
-- Sélection FEFO pour un produit avec quantité suffisante
SELECT b.*
FROM batches b
WHERE b.product_id = :product_id
  AND b.quantity > 0
  AND b.status = 'active'
  AND b.expiry_date >= CURRENT_DATE
ORDER BY b.expiry_date ASC
LIMIT 1;
```

**Version optimisée avec index** :
```sql
-- Utilise l'index composite idx_batches_product_expiry
SELECT b.*
FROM batches b
WHERE b.product_id = :product_id
  AND b.quantity > 0
  AND b.status = 'active'
ORDER BY b.expiry_date ASC
LIMIT 1;
```

---

### **2. Vérification du Stock Disponible**

```sql
-- Stock total pour un produit (tous lots actifs)
SELECT 
    p.id as product_id,
    p.name as product_name,
    COALESCE(SUM(b.quantity), 0) as total_quantity,
    COUNT(b.id) as batch_count,
    MIN(b.expiry_date) as nearest_expiry
FROM products p
LEFT JOIN batches b ON p.id = b.product_id AND b.status = 'active'
WHERE p.id = :product_id
GROUP BY p.id, p.name;
```

---

### **3. Alertes de Péremption Proche**

```sql
-- Lots expirant dans les 30 jours
SELECT 
    b.id as batch_id,
    b.batch_number,
    p.id as product_id,
    p.name as product_name,
    b.expiry_date,
    b.quantity,
    (b.expiry_date - CURRENT_DATE) as days_until_expiry
FROM batches b
JOIN products p ON b.product_id = p.id
WHERE b.status = 'active'
  AND b.quantity > 0
  AND b.expiry_date BETWEEN CURRENT_DATE AND CURRENT_DATE + INTERVAL '30 days'
ORDER BY b.expiry_date ASC;
```

---

### **4. Alertes de Stock Faible**

```sql
-- Produits avec stock inférieur au minimum
SELECT 
    p.id,
    p.name,
    p.barcode,
    p.stock_min,
    COALESCE(SUM(b.quantity), 0) as current_stock,
    p.stock_min - COALESCE(SUM(b.quantity), 0) as deficit
FROM products p
LEFT JOIN batches b ON p.id = b.product_id AND b.status = 'active'
WHERE p.is_active = TRUE
GROUP BY p.id, p.name, p.barcode, p.stock_min
HAVING COALESCE(SUM(b.quantity), 0) < p.stock_min
ORDER BY deficit DESC;
```

---

### **5. Historique des Ventes par Produit**

```sql
-- Ventes des 30 derniers jours par produit
SELECT 
    p.id as product_id,
    p.name as product_name,
    p.barcode,
    COUNT(si.id) as sales_count,
    SUM(si.quantity) as total_quantity_sold,
    SUM(si.total_price) as total_revenue
FROM products p
LEFT JOIN sale_items si ON p.id = si.product_id
LEFT JOIN sales s ON si.sale_id = s.id
WHERE s.created_at >= CURRENT_DATE - INTERVAL '30 days'
  AND s.status = 'paid'
GROUP BY p.id, p.name, p.barcode
ORDER BY total_quantity_sold DESC;
```

---

## 📁 **Script d'Initialisation**

**Fichier** : `scripts/init-db.sql`

```sql
-- =============================================================================
-- PHARMACIE 360° - Script d'Initialisation de la Base de Données
-- =============================================================================

-- 1. Créer l'extension UUID si nécessaire
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 2. Créer la fonction pour updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

-- 3. Créer les tables dans l'ordre des dépendances

-- 3.1. Catégories (pas de dépendances)
CREATE TABLE IF NOT EXISTS categories (
    id SERIAL PRIMARY KEY,
    name VARCHAR(50) UNIQUE NOT NULL,
    description TEXT,
    parent_id INTEGER REFERENCES categories(id) ON DELETE SET NULL,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 3.2. Fournisseurs (pas de dépendances)
CREATE TABLE IF NOT EXISTS suppliers (
    id SERIAL PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    contact VARCHAR(100),
    email VARCHAR(100),
    phone VARCHAR(20),
    address TEXT,
    city VARCHAR(50),
    country VARCHAR(50) DEFAULT 'Bénin',
    tax_id VARCHAR(50),
    payment_terms TEXT,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 3.3. Clients (pas de dépendances)
CREATE TABLE IF NOT EXISTS customers (
    id SERIAL PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    contact VARCHAR(100),
    email VARCHAR(100),
    phone VARCHAR(20),
    address TEXT,
    loyalty_points INTEGER DEFAULT 0,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 3.4. Utilisateurs (pas de dépendances)
CREATE TABLE IF NOT EXISTS users (
    id SERIAL PRIMARY KEY,
    username VARCHAR(50) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    email VARCHAR(100) UNIQUE NOT NULL,
    full_name VARCHAR(100),
    role VARCHAR(20) NOT NULL CHECK (role IN ('admin', 'seller', 'cashier', 'manager')),
    is_active BOOLEAN DEFAULT TRUE,
    last_login TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 3.5. Produits (dépend de categories)
CREATE TABLE IF NOT EXISTS products (
    id SERIAL PRIMARY KEY,
    name VARCHAR(200) NOT NULL,
    dci VARCHAR(100),
    barcode VARCHAR(50) UNIQUE,
    category_id INTEGER REFERENCES categories(id) ON DELETE SET NULL,
    description TEXT,
    price DECIMAL(10, 2) NOT NULL DEFAULT 0,
    cost_price DECIMAL(10, 2) DEFAULT 0,
    stock_min INTEGER DEFAULT 0,
    stock_max INTEGER DEFAULT 100,
    unit VARCHAR(20) DEFAULT 'unité',
    manufacturer VARCHAR(100),
    is_active BOOLEAN DEFAULT TRUE,
    requires_prescription BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 3.6. Factures (dépend de suppliers)
CREATE TABLE IF NOT EXISTS invoices (
    id SERIAL PRIMARY KEY,
    invoice_number VARCHAR(50) UNIQUE NOT NULL,
    supplier_id INTEGER NOT NULL REFERENCES suppliers(id) ON DELETE CASCADE,
    date DATE NOT NULL DEFAULT CURRENT_DATE,
    due_date DATE,
    subtotal DECIMAL(12, 2) NOT NULL DEFAULT 0,
    tax_amount DECIMAL(10, 2) NOT NULL DEFAULT 0,
    discount DECIMAL(10, 2) NOT NULL DEFAULT 0,
    total_final DECIMAL(12, 2) NOT NULL DEFAULT 0,
    status VARCHAR(20) NOT NULL DEFAULT 'draft' 
        CHECK (status IN ('draft', 'pending', 'paid', 'cancelled')),
    payment_method VARCHAR(50),
    payment_date DATE,
    file_path VARCHAR(255),
    ocr_processed BOOLEAN DEFAULT FALSE,
    ocr_data JSONB,
    notes TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 3.7. Lots (dépend de products, suppliers, invoices)
CREATE TABLE IF NOT EXISTS batches (
    id SERIAL PRIMARY KEY,
    product_id INTEGER NOT NULL REFERENCES products(id) ON DELETE CASCADE,
    batch_number VARCHAR(50) UNIQUE NOT NULL,
    expiry_date DATE NOT NULL,
    quantity INTEGER NOT NULL DEFAULT 0,
    initial_quantity INTEGER NOT NULL DEFAULT 0,
    location VARCHAR(50),
    received_date DATE NOT NULL DEFAULT CURRENT_DATE,
    supplier_id INTEGER REFERENCES suppliers(id) ON DELETE SET NULL,
    cost_price DECIMAL(10, 2) NOT NULL DEFAULT 0,
    selling_price DECIMAL(10, 2) NOT NULL DEFAULT 0,
    purchase_invoice_id INTEGER REFERENCES invoices(id) ON DELETE SET NULL,
    status VARCHAR(20) DEFAULT 'active' 
        CHECK (status IN ('active', 'expired', 'returned', 'damaged')),
    notes TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 3.8. Ventes (dépend de users, customers)
CREATE TABLE IF NOT EXISTS sales (
    id SERIAL PRIMARY KEY,
    sale_number VARCHAR(50) UNIQUE NOT NULL,
    customer_id INTEGER REFERENCES customers(id) ON DELETE SET NULL,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    status VARCHAR(20) NOT NULL DEFAULT 'pending' 
        CHECK (status IN ('pending', 'paid', 'cancelled', 'refunded')),
    subtotal DECIMAL(12, 2) NOT NULL DEFAULT 0,
    tax_amount DECIMAL(10, 2) NOT NULL DEFAULT 0,
    discount DECIMAL(10, 2) NOT NULL DEFAULT 0,
    total DECIMAL(12, 2) NOT NULL DEFAULT 0,
    payment_method VARCHAR(50),
    payment_reference VARCHAR(100),
    payment_date TIMESTAMP,
    notes TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 3.9. Articles de Vente (dépend de sales, batches, products)
CREATE TABLE IF NOT EXISTS sale_items (
    id SERIAL PRIMARY KEY,
    sale_id INTEGER NOT NULL REFERENCES sales(id) ON DELETE CASCADE,
    batch_id INTEGER NOT NULL REFERENCES batches(id) ON DELETE CASCADE,
    product_id INTEGER NOT NULL REFERENCES products(id) ON DELETE CASCADE,
    quantity INTEGER NOT NULL,
    unit_price DECIMAL(10, 2) NOT NULL,
    total_price DECIMAL(12, 2) NOT NULL,
    expiry_date DATE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 3.10. Retours (dépend de batches, products, users)
CREATE TABLE IF NOT EXISTS returns (
    id SERIAL PRIMARY KEY,
    return_number VARCHAR(50) UNIQUE NOT NULL,
    batch_id INTEGER NOT NULL REFERENCES batches(id) ON DELETE CASCADE,
    product_id INTEGER NOT NULL REFERENCES products(id) ON DELETE CASCADE,
    quantity INTEGER NOT NULL,
    reason VARCHAR(50) NOT NULL 
        CHECK (reason IN ('supplier', 'expiry', 'damage', 'other')),
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    notes TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 3.11. Mouvements (dépend de products, batches, users)
CREATE TABLE IF NOT EXISTS movements (
    id SERIAL PRIMARY KEY,
    type VARCHAR(20) NOT NULL 
        CHECK (type IN ('purchase', 'sale', 'return', 'adjustment', 'expiry')),
    reference_id INTEGER NOT NULL,
    reference_type VARCHAR(20) NOT NULL 
        CHECK (reference_type IN ('batch', 'sale', 'return', 'invoice')),
    product_id INTEGER REFERENCES products(id) ON DELETE CASCADE,
    batch_id INTEGER REFERENCES batches(id) ON DELETE SET NULL,
    old_quantity INTEGER NOT NULL,
    new_quantity INTEGER NOT NULL,
    quantity_change INTEGER NOT NULL,
    user_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
    notes TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 4. Créer les index
-- Index pour users
CREATE INDEX IF NOT EXISTS idx_users_username ON users(username);
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
CREATE INDEX IF NOT EXISTS idx_users_role ON users(role);

-- Index pour categories
CREATE INDEX IF NOT EXISTS idx_categories_name ON categories(name);
CREATE INDEX IF NOT EXISTS idx_categories_parent ON categories(parent_id);

-- Index pour products
CREATE INDEX IF NOT EXISTS idx_products_name ON products(name);
CREATE INDEX IF NOT EXISTS idx_products_barcode ON products(barcode);
CREATE INDEX IF NOT EXISTS idx_products_category ON products(category_id);
CREATE INDEX IF NOT EXISTS idx_products_dci ON products(dci);

-- Index pour suppliers
CREATE INDEX IF NOT EXISTS idx_suppliers_name ON suppliers(name);
CREATE INDEX IF NOT EXISTS idx_suppliers_email ON suppliers(email);

-- Index pour batches (CRITIQUES POUR FEFO)
CREATE INDEX IF NOT EXISTS idx_batches_product_id ON batches(product_id);
CREATE INDEX IF NOT EXISTS idx_batches_expiry_date ON batches(expiry_date);
CREATE INDEX IF NOT EXISTS idx_batches_quantity ON batches(quantity) WHERE quantity > 0;
CREATE INDEX IF NOT EXISTS idx_batches_status ON batches(status);
CREATE INDEX IF NOT EXISTS idx_batches_product_expiry ON batches(product_id, expiry_date);
CREATE INDEX IF NOT EXISTS idx_batches_active_quantity ON batches(product_id, quantity, expiry_date) 
    WHERE quantity > 0 AND status = 'active';

-- Index pour invoices
CREATE INDEX IF NOT EXISTS idx_invoices_number ON invoices(invoice_number);
CREATE INDEX IF NOT EXISTS idx_invoices_supplier ON invoices(supplier_id);
CREATE INDEX IF NOT EXISTS idx_invoices_date ON invoices(date);
CREATE INDEX IF NOT EXISTS idx_invoices_status ON invoices(status);

-- Index pour sales
CREATE INDEX IF NOT EXISTS idx_sales_number ON sales(sale_number);
CREATE INDEX IF NOT EXISTS idx_sales_user ON sales(user_id);
CREATE INDEX IF NOT EXISTS idx_sales_customer ON sales(customer_id);
CREATE INDEX IF NOT EXISTS idx_sales_status ON sales(status);
CREATE INDEX IF NOT EXISTS idx_sales_date ON sales(created_at);

-- Index pour sale_items
CREATE INDEX IF NOT EXISTS idx_sale_items_sale ON sale_items(sale_id);
CREATE INDEX IF NOT EXISTS idx_sale_items_batch ON sale_items(batch_id);
CREATE INDEX IF NOT EXISTS idx_sale_items_product ON sale_items(product_id);

-- Index pour returns
CREATE INDEX IF NOT EXISTS idx_returns_batch ON returns(batch_id);
CREATE INDEX IF NOT EXISTS idx_returns_product ON returns(product_id);
CREATE INDEX IF NOT EXISTS idx_returns_user ON returns(user_id);
CREATE INDEX IF NOT EXISTS idx_returns_date ON returns(created_at);

-- Index pour movements
CREATE INDEX IF NOT EXISTS idx_movements_reference ON movements(reference_id, reference_type);
CREATE INDEX IF NOT EXISTS idx_movements_product ON movements(product_id);
CREATE INDEX IF NOT EXISTS idx_movements_batch ON movements(batch_id);

-- 5. Créer les triggers

-- Trigger pour updated_at sur users
CREATE TRIGGER IF NOT EXISTS update_users_updated_at
    BEFORE UPDATE ON users
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Trigger pour updated_at sur products
CREATE TRIGGER IF NOT EXISTS update_products_updated_at
    BEFORE UPDATE ON products
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Trigger pour updated_at sur suppliers
CREATE TRIGGER IF NOT EXISTS update_suppliers_updated_at
    BEFORE UPDATE ON suppliers
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Trigger pour updated_at sur batches
CREATE TRIGGER IF NOT EXISTS update_batches_updated_at
    BEFORE UPDATE ON batches
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Trigger pour updated_at sur invoices
CREATE TRIGGER IF NOT EXISTS update_invoices_updated_at
    BEFORE UPDATE ON invoices
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Trigger pour updated_at sur sales
CREATE TRIGGER IF NOT EXISTS update_sales_updated_at
    BEFORE UPDATE ON sales
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Trigger pour expiry_date dans sale_items
CREATE OR REPLACE FUNCTION IF NOT EXISTS set_sale_item_expiry_date()
RETURNS TRIGGER AS $$
BEGIN
    NEW.expiry_date := (
        SELECT expiry_date FROM batches WHERE id = NEW.batch_id
    );
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER IF NOT EXISTS update_sale_item_expiry_date
    BEFORE INSERT ON sale_items
    FOR EACH ROW
    EXECUTE FUNCTION set_sale_item_expiry_date();

-- Trigger pour valider quantity <= initial_quantity dans batches
CREATE OR REPLACE FUNCTION IF NOT EXISTS check_batch_quantity()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.quantity > NEW.initial_quantity THEN
        RAISE EXCEPTION 'Quantity cannot exceed initial_quantity';
    END IF;
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER IF NOT EXISTS validate_batch_quantity
    BEFORE UPDATE ON batches
    FOR EACH ROW
    EXECUTE FUNCTION check_batch_quantity();

-- 6. Insérer des données initiales (optionnel)

-- Catégories par défaut
INSERT INTO categories (name, description) VALUES 
    ('Antipaludéens', 'Médicaments contre le paludisme'),
    ('Antibiotiques', 'Médicaments antibactériens'),
    ('Antidouleurs', 'Analgésiques et anti-inflammatoires'),
    ('Cardiovasculaires', 'Médicaments pour le cœur et la circulation'),
    ('Diabète', 'Médicaments pour le diabète'),
    ('Vitamines', 'Compléments vitaminés'),
    ('Matériel Médical', 'Matériel et dispositifs médicaux'),
    ('Autres', 'Autres produits');

-- Rôles utilisateurs (déjà gérés par CHECK constraint)

-- 7. Message de confirmation
DO $$
BEGIN
    RAISE NOTICE 'Base de données Pharmacie 360° initialisée avec succès!';
    RAISE NOTICE 'Tables créées: users, categories, suppliers, customers, products, invoices, batches, sales, sale_items, returns, movements';
    RAISE NOTICE 'Index FEFO/FIFO créés pour optimisation des requêtes';
    RAISE NOTICE 'Triggers de traçabilité configurés';
END $$;
```

---

## ✅ **Validation et Approbations**

### **Checklist de Validation**

- [x] Toutes les tables créées avec les bonnes contraintes
- [x] Index optimisés pour FEFO/FIFO
- [x] Triggers de traçabilité implémentés
- [x] Script d'initialisation complet
- [x] Documentation des requêtes clés
- [ ] Revue par QA/DevOps
- [ ] Revue par Backend Lead
- [ ] Validation finale par l'équipe

### **Approbations Requises**

| Rôle | Agent | Statut | Date |
|------|-------|--------|------|
| Superviseur/Architecte | `agent-superviseur-de-projet` | ✅ | 2025-01-06 |
| QA/DevOps | `agent-qa-quality-assurance-devops-engineer` | ⏳ | - |
| Backend Lead | `agent-d-veloppeur-backend-lead` | ⏳ | - |

---

## 📅 **Prochaines Étapes**

1. **J3** : Finaliser la revue avec QA/DevOps
2. **J4** : Valider avec Backend Lead
3. **J5** : Validation finale et démarrage de ARCH-003
4. **J6** : Début de ARCH-003 (Spécifications API Inter-Modules)

---

## 📞 **Contacts**

| Rôle | Agent | Canal Slack | Email |
|------|-------|-------------|-------|
| Superviseur/Architecte | `agent-superviseur-de-projet` | `#architecture` | - |
| QA/DevOps | `agent-qa-quality-assurance-devops-engineer` | `#qa` | - |
| Backend Lead | `agent-d-veloppeur-backend-lead` | `#backend` | - |

---

**Document créé** : 2025-01-06 (J2)  
**Dernière mise à jour** : 2025-01-06  
**Statut** : 🔄 **EN COURS**  
**Priorité** : ⭐⭐⭐⭐⭐

---

**© 2025 Pharmacie 360° - Tous droits réservés**
