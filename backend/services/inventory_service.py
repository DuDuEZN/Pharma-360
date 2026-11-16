"""Shim de compatibilité — service du domaine Stock.

Le code source a été déplacé dans ``backend.modules.inventory.service``.
Ce fichier conserve l'ancien chemin d'import ``backend.services.inventory_service``
utilisé par ``backend.services.__init__`` et les tests.
"""

from ..modules.inventory.service import InventoryService, inventory_service

__all__ = ["InventoryService", "inventory_service"]
