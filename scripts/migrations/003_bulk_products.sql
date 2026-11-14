-- Migration 003 : produits vendables en vrac
--
-- Un produit "vrac" reste un seul et même produit (même code-barres) :
--   * products.units_per_box  : nombre d'unités contenues dans une boîte
--   * products.bulk_price     : prix de vente à l'unité (vrac)
--   * batches.bulk_quantity   : unités déjà reconditionnées, prêtes à la vente
--   * sale_items.sale_unit    : 'box' (boîte) ou 'bulk' (vrac)
--
-- Le stock d'un lot (batches.quantity) reste exprimé en boîtes scellées.
-- L'ouverture d'une boîte décrémente quantity et incrémente bulk_quantity.

ALTER TABLE products
    ADD COLUMN IF NOT EXISTS is_bulk BOOLEAN NOT NULL DEFAULT FALSE;

ALTER TABLE products
    ADD COLUMN IF NOT EXISTS units_per_box INTEGER NOT NULL DEFAULT 1;

ALTER TABLE products
    ADD COLUMN IF NOT EXISTS bulk_price NUMERIC(10, 2) NOT NULL DEFAULT 0;

ALTER TABLE batches
    ADD COLUMN IF NOT EXISTS bulk_quantity INTEGER NOT NULL DEFAULT 0;

ALTER TABLE sale_items
    ADD COLUMN IF NOT EXISTS sale_unit VARCHAR(10) NOT NULL DEFAULT 'box';

-- Un produit vrac doit avoir au moins 2 unités par boîte pour être cohérent.
UPDATE products SET units_per_box = 1 WHERE units_per_box IS NULL OR units_per_box < 1;
