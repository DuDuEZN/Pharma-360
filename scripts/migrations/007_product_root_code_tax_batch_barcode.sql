-- Migration 007 : code racine produit, TVA par produit et code-barres par lot
--
-- 1. Chaque produit possède un code racine unique (8 chiffres), préfixe des
--    codes-barres de tous ses lots. Les produits existants reçoivent un code
--    déterministe basé sur leur identifiant.
-- 2. La TVA est activée par défaut (18 %) et peut être désactivée produit par
--    produit. Les lignes de vente conservent le taux et le montant appliqués.
-- 3. Chaque lot possède son propre code-barres : code racine + '-' + n° lot.

-- Produits : TVA
ALTER TABLE products
    ADD COLUMN IF NOT EXISTS apply_tax BOOLEAN NOT NULL DEFAULT TRUE;

ALTER TABLE products
    ADD COLUMN IF NOT EXISTS tax_rate NUMERIC(5, 2) NOT NULL DEFAULT 18.00;

COMMENT ON COLUMN products.code IS
    'Code racine produit (unique), préfixe du code-barres de chaque lot';
COMMENT ON COLUMN products.apply_tax IS
    'Appliquer la TVA à ce produit (activée par défaut)';
COMMENT ON COLUMN products.tax_rate IS
    'Taux de TVA du produit en pourcentage (18 par défaut)';

-- Lots : code-barres propre au lot
ALTER TABLE batches
    ADD COLUMN IF NOT EXISTS barcode VARCHAR(50);

CREATE UNIQUE INDEX IF NOT EXISTS ix_batches_barcode
    ON batches (barcode)
    WHERE barcode IS NOT NULL;

COMMENT ON COLUMN batches.barcode IS
    'Code-barres du lot : code racine produit + tiret + numéro de lot';

-- Lignes de vente : TVA appliquée
ALTER TABLE sale_items
    ADD COLUMN IF NOT EXISTS tax_rate NUMERIC(5, 2) NOT NULL DEFAULT 0.00;

ALTER TABLE sale_items
    ADD COLUMN IF NOT EXISTS tax_amount NUMERIC(12, 2) NOT NULL DEFAULT 0.00;

-- Backfill des codes racine manquants (8 chiffres, uniques)
UPDATE products
SET code = lpad((10000000 + id)::text, 8, '0')
WHERE code IS NULL OR btrim(code) = '';

-- Backfill des codes-barres de lots existants
UPDATE batches b
SET barcode = p.code || '-' || b.batch_number
FROM products p
WHERE b.product_id = p.id
  AND (b.barcode IS NULL OR btrim(b.barcode) = '')
  AND p.code IS NOT NULL
  AND btrim(p.code) <> '';
