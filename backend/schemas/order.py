"""Shim de compatibilité — schémas du domaine Commandes.

Le code source a été déplacé dans ``backend.modules.orders.schemas``.
Ce fichier conserve l'ancien chemin d'import ``backend.schemas.order``.
"""

from ..modules.orders.schemas import (
    OrderCreate,
    OrderItemCreate,
    OrderItemResponse,
    OrderListResponse,
    OrderResponse,
    OrderUpdate,
)

__all__ = [
    "OrderCreate",
    "OrderItemCreate",
    "OrderItemResponse",
    "OrderListResponse",
    "OrderResponse",
    "OrderUpdate",
]
