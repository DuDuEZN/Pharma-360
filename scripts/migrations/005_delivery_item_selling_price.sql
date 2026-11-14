-- Migration 005 : prix de vente saisi lors de l'initialisation de la livraison
--
-- Le gestionnaire doit pouvoir définir, pour chaque article reçu, le prix
-- d'achat (unit_price, déjà présent) et le prix de vente (selling_price).
-- Le prix de vente est reporté sur le lot créé lors de la validation de la
-- livraison. À défaut, le prix catalogue du produit reste utilisé.

ALTER TABLE delivery_items
    ADD COLUMN IF NOT EXISTS selling_price NUMERIC(10, 2);

COMMENT ON COLUMN delivery_items.selling_price IS
    'Prix de vente unitaire défini à la réception (fallback : products.price)';
