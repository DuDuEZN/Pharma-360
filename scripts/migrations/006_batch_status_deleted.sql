-- Migration 006 : autoriser le statut "deleted" sur les lots
--
-- La suppression d'un lot périmé (ou vide) ne supprime pas la ligne : le lot
-- est vidé et marqué "deleted" afin de conserver la traçabilité des ventes.
-- L'ancienne contrainte batches_status_check ne connaissait pas ce statut et
-- provoquait une erreur 500 (CheckViolationError) à la suppression.

ALTER TABLE batches
    DROP CONSTRAINT IF EXISTS batches_status_check;

ALTER TABLE batches
    ADD CONSTRAINT batches_status_check
    CHECK (status IN ('active', 'expired', 'returned', 'damaged', 'deleted'));

COMMENT ON COLUMN batches.status IS
    'Statut du lot : active, expired, returned, damaged ou deleted (sorti du stock, historique conservé)';
