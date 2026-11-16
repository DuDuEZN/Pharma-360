"""Modèles appartenant au domaine Catalogue.

Phase 1 du monolithe modulaire : les classes SQLAlchemy restent physiquement
dans ``backend.models`` (la base est partagée), mais le module Catalogue expose
un point d'accès unique. Une migration ultérieure pourra déplacer les classes
sans impacter les consommateurs du module.
"""

from ...models.category import Category
from ...models.product import Product

__all__ = ["Product", "Category"]
