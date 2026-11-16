"""Modèles appartenant au domaine Ventes.

Phase 1 du monolithe modulaire : les classes SQLAlchemy restent physiquement
dans ``backend.models`` (la base est partagée), mais le module Ventes expose
un point d'accès unique. Une migration ultérieure pourra déplacer les classes
sans impacter les consommateurs du module.
"""

from ...models.sale import Sale
from ...models.sale_item import SaleItem

__all__ = ["Sale", "SaleItem"]
