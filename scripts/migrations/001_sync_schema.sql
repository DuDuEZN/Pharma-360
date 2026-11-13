-- 001_sync_schema.sql
-- Aligne la base existante sur les modèles SQLAlchemy (idempotent : peut être rejoué).
--   products.code            -> modèle Product.code (code/SKU)
--   batches.reserved_quantity -> modèle Batch.reserved_quantity
ALTER TABLE products ADD COLUMN IF NOT EXISTS code VARCHAR(50);
CREATE UNIQUE INDEX IF NOT EXISTS ix_products_code ON products (code) WHERE code IS NOT NULL;

ALTER TABLE batches ADD COLUMN IF NOT EXISTS reserved_quantity INTEGER NOT NULL DEFAULT 0;
