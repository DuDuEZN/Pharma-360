-- Migration 004 : autoriser le type de mouvement 'reconditioning'
--
-- Le reconditionnement d'une boîte de produit vrac en unités vendables à
-- l'unité est tracé dans la table `movements`. Le type 'reconditioning'
-- n'était pas autorisé par la contrainte CHECK existante.

ALTER TABLE movements
    DROP CONSTRAINT IF EXISTS movements_type_check;

ALTER TABLE movements
    ADD CONSTRAINT movements_type_check
    CHECK (
        type::text = ANY (
            ARRAY[
                'purchase'::character varying,
                'sale'::character varying,
                'return'::character varying,
                'adjustment'::character varying,
                'expiry'::character varying,
                'reconditioning'::character varying
            ]::text[]
        )
    );
