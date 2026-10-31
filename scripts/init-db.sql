-- =============================================================================
-- PHARMACIE 360° - Script d'Initialisation de la Base de Données
-- =============================================================================
-- Version: 1.0.0
-- Date: 2025-01-06
-- Auteur: Superviseur (Agent Architecte)
-- Tâche: ARCH-002 (Modèle de Données PostgreSQL)
-- =============================================================================

-- NOTE: la base de données est créée par l'image postgres via POSTGRES_DB.
-- Ce script s'exécute donc directement dedans (pas de CREATE DATABASE / \c ici :
-- avec ON_ERROR_STOP=1 de l'entrypoint, cela interromprait toute l'initialisation).

-- Ce script crée toutes les tables, index et triggers nécessaires pour
-- la plateforme Pharmacie 360°. Il est exécuté automatiquement au
-- premier démarrage de PostgreSQL via docker-compose.

-- =============================================================================
-- 1. EXTENSIONS
-- =============================================================================

-- Créer l'extension UUID si nécessaire (pour les identifiants uniques)
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- =============================================================================
-- 2. FONCTIONS UTILITAIRES
-- =============================================================================

-- Fonction pour mettre à jour automatiquement le champ updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

-- =============================================================================
-- 3. CRÉATION DES TABLES (dans l'ordre des dépendances)
-- =============================================================================

-- 3.1. Table: categories (pas de dépendances)
-- Description: Catégories de produits (ex: Antipaludéens, Antibiotiques)
CREATE TABLE IF NOT EXISTS categories (
    id SERIAL PRIMARY KEY,
    name VARCHAR(50) UNIQUE NOT NULL,
    description TEXT,
    parent_id INTEGER REFERENCES categories(id) ON DELETE SET NULL,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 3.2. Table: suppliers (pas de dépendances)
-- Description: Fournisseurs de produits
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

-- 3.3. Table: customers (pas de dépendances)
-- Description: Clients (optionnel pour fidélisation)
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

-- 3.4. Table: users (pas de dépendances)
-- Description: Utilisateurs du système avec RBAC
CREATE TABLE IF NOT EXISTS users (
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

-- 3.5. Table: products (dépend de categories)
-- Description: Produits (médicaments, matériel médical)
CREATE TABLE IF NOT EXISTS products (
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

-- 3.6. Table: invoices (dépend de suppliers)
-- Description: Factures d'achat des fournisseurs
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
    file_path VARCHAR(255),  -- Chemin vers le fichier PDF/OCR
    ocr_processed BOOLEAN DEFAULT FALSE,
    ocr_data JSONB,  -- Données extraites par OCR
    notes TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 3.7. Table: batches (dépend de products, suppliers, invoices)
-- Description: LOTS - CŒUR DU SYSTÈME FEFO/FIFO
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

-- 3.8. Table: sales (dépend de users, customers)
-- Description: Ventes réalisées
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
    payment_reference VARCHAR(100),  -- Référence de paiement
    payment_date TIMESTAMP,
    notes TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 3.9. Table: sale_items (dépend de sales, batches, products)
-- Description: Articles vendus (avec traçabilité FEFO)
CREATE TABLE IF NOT EXISTS sale_items (
    id SERIAL PRIMARY KEY,
    sale_id INTEGER NOT NULL REFERENCES sales(id) ON DELETE CASCADE,
    batch_id INTEGER NOT NULL REFERENCES batches(id) ON DELETE CASCADE,
    product_id INTEGER NOT NULL REFERENCES products(id) ON DELETE CASCADE,
    quantity INTEGER NOT NULL,
    unit_price DECIMAL(10, 2) NOT NULL,
    total_price DECIMAL(12, 2) NOT NULL,
    expiry_date DATE,  -- Date de péremption au moment de la vente
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 3.10. Table: returns (dépend de batches, products, users)
-- Description: Retours (fournisseur, péremption, casse)
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

-- 3.11. Table: movements (dépend de products, batches, users)
-- Description: TABLE D'AUDIT - Traçabilité complète des mouvements de stock
CREATE TABLE IF NOT EXISTS movements (
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

-- =============================================================================
-- 4. CRÉATION DES INDEX (Optimisation des requêtes)
-- =============================================================================

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
CREATE INDEX IF NOT EXISTS idx_products_manufacturer ON products(manufacturer);

-- Index pour suppliers
CREATE INDEX IF NOT EXISTS idx_suppliers_name ON suppliers(name);
CREATE INDEX IF NOT EXISTS idx_suppliers_email ON suppliers(email);
CREATE INDEX IF NOT EXISTS idx_suppliers_phone ON suppliers(phone);

-- ⭐ INDEX CRITIQUES POUR FEFO/FIFO ⭐
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
CREATE INDEX IF NOT EXISTS idx_invoices_due_date ON invoices(due_date);

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
CREATE INDEX IF NOT EXISTS idx_returns_reason ON returns(reason);

-- Index pour movements
CREATE INDEX IF NOT EXISTS idx_movements_reference ON movements(reference_id, reference_type);
CREATE INDEX IF NOT EXISTS idx_movements_product ON movements(product_id);
CREATE INDEX IF NOT EXISTS idx_movements_batch ON movements(batch_id);
CREATE INDEX IF NOT EXISTS idx_movements_user ON movements(user_id);
CREATE INDEX IF NOT EXISTS idx_movements_date ON movements(created_at);
CREATE INDEX IF NOT EXISTS idx_movements_type ON movements(type);

-- =============================================================================
-- 5. CRÉATION DES TRIGGERS
-- =============================================================================

-- Trigger pour updated_at sur users
DROP TRIGGER IF EXISTS update_users_updated_at ON users;
CREATE TRIGGER update_users_updated_at
    BEFORE UPDATE ON users
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Trigger pour updated_at sur categories
DROP TRIGGER IF EXISTS update_categories_updated_at ON categories;
CREATE TRIGGER update_categories_updated_at
    BEFORE UPDATE ON categories
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Trigger pour updated_at sur suppliers
DROP TRIGGER IF EXISTS update_suppliers_updated_at ON suppliers;
CREATE TRIGGER update_suppliers_updated_at
    BEFORE UPDATE ON suppliers
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Trigger pour updated_at sur customers
DROP TRIGGER IF EXISTS update_customers_updated_at ON customers;
CREATE TRIGGER update_customers_updated_at
    BEFORE UPDATE ON customers
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Trigger pour updated_at sur products
DROP TRIGGER IF EXISTS update_products_updated_at ON products;
CREATE TRIGGER update_products_updated_at
    BEFORE UPDATE ON products
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Trigger pour updated_at sur invoices
DROP TRIGGER IF EXISTS update_invoices_updated_at ON invoices;
CREATE TRIGGER update_invoices_updated_at
    BEFORE UPDATE ON invoices
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Trigger pour updated_at sur batches
DROP TRIGGER IF EXISTS update_batches_updated_at ON batches;
CREATE TRIGGER update_batches_updated_at
    BEFORE UPDATE ON batches
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Trigger pour updated_at sur sales
DROP TRIGGER IF EXISTS update_sales_updated_at ON sales;
CREATE TRIGGER update_sales_updated_at
    BEFORE UPDATE ON sales
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Trigger pour updated_at sur returns
DROP TRIGGER IF EXISTS update_returns_updated_at ON returns;
CREATE TRIGGER update_returns_updated_at
    BEFORE UPDATE ON returns
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Trigger pour copier expiry_date depuis batches vers sale_items
CREATE OR REPLACE FUNCTION set_sale_item_expiry_date()
RETURNS TRIGGER AS $$
BEGIN
    NEW.expiry_date := (
        SELECT expiry_date FROM batches WHERE id = NEW.batch_id
    );
    RETURN NEW;
END;
$$ language 'plpgsql';

DROP TRIGGER IF EXISTS update_sale_item_expiry_date ON sale_items;
CREATE TRIGGER update_sale_item_expiry_date
    BEFORE INSERT ON sale_items
    FOR EACH ROW
    EXECUTE FUNCTION set_sale_item_expiry_date();

-- REC-002: Ajouter trigger pour sale_items.expiry_date sur UPDATE
CREATE OR REPLACE FUNCTION update_sale_item_expiry_date()
RETURNS TRIGGER AS $$
BEGIN
    -- Si batch_id a changé, recalculer expiry_date
    IF NEW.batch_id IS DISTINCT FROM OLD.batch_id THEN
        NEW.expiry_date := (
            SELECT expiry_date 
            FROM batches 
            WHERE id = NEW.batch_id
        );
    END IF;
    RETURN NEW;
END;
$$ language 'plpgsql';

DROP TRIGGER IF EXISTS update_sale_item_expiry_date_on_update ON sale_items;
CREATE TRIGGER update_sale_item_expiry_date_on_update
    BEFORE UPDATE ON sale_items
    FOR EACH ROW
    EXECUTE FUNCTION update_sale_item_expiry_date();

-- Trigger pour valider que quantity <= initial_quantity dans batches
CREATE OR REPLACE FUNCTION check_batch_quantity()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.quantity > NEW.initial_quantity THEN
        RAISE EXCEPTION 'Quantity cannot exceed initial_quantity';
    END IF;
    RETURN NEW;
END;
$$ language 'plpgsql';

DROP TRIGGER IF EXISTS validate_batch_quantity ON batches;
CREATE TRIGGER validate_batch_quantity
    BEFORE UPDATE ON batches
    FOR EACH ROW
    EXECUTE FUNCTION check_batch_quantity();

-- Trigger pour enregistrer automatiquement les mouvements de stock
-- Note: Ce trigger nécessite que app.current_user_id soit défini dans la session
CREATE OR REPLACE FUNCTION log_batch_quantity_change()
RETURNS TRIGGER AS $$
DECLARE
    current_user_id_val INTEGER;
BEGIN
    -- Récupérer l'ID de l'utilisateur courant depuis la variable de session
    -- En pratique, cela sera défini par l'application
    -- missing_ok = true : renvoie NULL (au lieu de lever une erreur) si la variable n'est pas définie
    current_user_id_val := NULLIF(current_setting('app.current_user_id', true), '')::INTEGER;
    
    IF current_user_id_val IS NULL THEN
        -- Utilisateur système par défaut : le plus ancien utilisateur existant
        -- (évite une violation de la clé étrangère movements.user_id -> users.id)
        SELECT MIN(id) INTO current_user_id_val FROM users;
    END IF;
    
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
            current_user_id_val,
            'Automatic quantity update'
        );
    END IF;
    RETURN NEW;
END;
$$ language 'plpgsql';
-- Trigger principal pour enregistrer automatiquement les mouvements de stock
-- Utilise current_setting('app.current_user_id') pour obtenir l'ID de l'utilisateur
DROP TRIGGER IF EXISTS log_batch_quantity_change_trigger ON batches;
CREATE TRIGGER log_batch_quantity_change_trigger
    AFTER UPDATE ON batches
    FOR EACH ROW
    WHEN (OLD.quantity IS DISTINCT FROM NEW.quantity)
    EXECUTE FUNCTION log_batch_quantity_change();

-- =============================================================================
-- 6. DONNÉES INITIALES (Optionnel - pour démonstration)
-- =============================================================================

-- Catégories par défaut
INSERT INTO categories (name, description) VALUES 
    ('Antipaludéens', 'Médicaments contre le paludisme'),
    ('Antibiotiques', 'Médicaments antibactériens'),
    ('Antidouleurs', 'Analgésiques et anti-inflammatoires'),
    ('Cardiovasculaires', 'Médicaments pour le cœur et la circulation'),
    ('Diabète', 'Médicaments pour le diabète'),
    ('Vitamines', 'Compléments vitaminés'),
    ('Matériel Médical', 'Matériel et dispositifs médicaux'),
    ('Autres', 'Autres produits')
ON CONFLICT (name) DO NOTHING;

-- Fournisseur par défaut (pour tests)
INSERT INTO suppliers (name, contact, email, phone, address, city, country) VALUES 
    ('Fournisseur Générique', 'Jean Dupont', 'contact@fournisseur.com', '+229 12 34 56 78', 
     '123 Rue de la Santé', 'Cotonou', 'Bénin')
ON CONFLICT DO NOTHING;

-- Utilisateur admin par défaut (à utiliser pour la première connexion)
-- NOTE: Le mot de passe doit être hashé avant insertion
-- Exemple: password_hash = '$2b$12$...' (généré avec bcrypt)
-- Pour l'instant, nous laissons vide, l'application devra créer le premier utilisateur

-- =============================================================================
-- 7. MESSAGE DE CONFIRMATION
-- =============================================================================

DO $$
BEGIN
    RAISE NOTICE '==========================================';
    RAISE NOTICE 'PHARMACIE 360° - Base de données initialisée';
    RAISE NOTICE '==========================================';
    RAISE NOTICE '';
    RAISE NOTICE 'Tables créées:';
    RAISE NOTICE '  ✓ categories';
    RAISE NOTICE '  ✓ suppliers';
    RAISE NOTICE '  ✓ customers';
    RAISE NOTICE '  ✓ users';
    RAISE NOTICE '  ✓ products';
    RAISE NOTICE '  ✓ invoices';
    RAISE NOTICE '  ✓ batches (CŒUR FEFO/FIFO)';
    RAISE NOTICE '  ✓ sales';
    RAISE NOTICE '  ✓ sale_items';
    RAISE NOTICE '  ✓ returns';
    RAISE NOTICE '  ✓ movements (AUDIT)';
    RAISE NOTICE '';
    RAISE NOTICE 'Index créés:';
    RAISE NOTICE '  ✓ Index standards pour toutes les tables';
    RAISE NOTICE '  ✓ Index FEFO/FIFO optimisés pour batches';
    RAISE NOTICE '  ✓ Index composites pour requêtes fréquentes';
    RAISE NOTICE '';
    RAISE NOTICE 'Triggers configurés:';
    RAISE NOTICE '  ✓ updated_at pour toutes les tables';
    RAISE NOTICE '  ✓ expiry_date automatique pour sale_items';
    RAISE NOTICE '  ✓ Validation quantity <= initial_quantity';
    RAISE NOTICE '  ✓ Audit des mouvements de stock';
    RAISE NOTICE '';
    RAISE NOTICE '==========================================';
END $$;
