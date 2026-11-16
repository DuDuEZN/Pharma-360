"""Shim de compatibilité — service du domaine Ventes.

Le code source a été déplacé dans ``backend.modules.sales.service``.
Ce fichier conserve l'ancien chemin d'import ``backend.services.sale_service``
utilisé par ``backend.api.websocket``, ``backend.services.__init__`` et les tests.
"""

from ..modules.sales.service import SaleService, sale_service

__all__ = ["SaleService", "sale_service"]
