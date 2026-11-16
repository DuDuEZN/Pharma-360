"""Shim de compatibilité — service du domaine Catalogue.

Le code source a été déplacé dans ``backend.modules.catalog.service``.
Ce fichier conserve l'ancien chemin d'import ``backend.services.product_service``
utilisé par ``barcode_service``, ``cache_service``, ``backend.services.__init__``
et les tests.
"""

from ..modules.catalog.service import ProductService, product_service

__all__ = ["ProductService", "product_service"]
