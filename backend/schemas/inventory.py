"""Shim de compatibilité — schémas du domaine Stock.

Le code source a été déplacé dans ``backend.modules.inventory.schemas``.
Ce fichier conserve l'ancien chemin d'import ``backend.schemas.inventory``
utilisé par ``movement_service`` et les tests.
"""

from ..modules.inventory.schemas import (
    InventoryItemResponse,
    InventorySummaryResponse,
    LowStockItemResponse,
    MovementCreate,
    MovementResponse,
    StockUpdate,
)

__all__ = [
    "InventoryItemResponse",
    "LowStockItemResponse",
    "MovementCreate",
    "MovementResponse",
    "StockUpdate",
    "InventorySummaryResponse",
]
