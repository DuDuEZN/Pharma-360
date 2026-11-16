"""Shim de compatibilité — schémas du domaine Ventes.

Le code source a été déplacé dans ``backend.modules.sales.schemas``.
Ce fichier conserve l'ancien chemin d'import ``backend.schemas.sale``
utilisé par les tests, le WebSocket et d'éventuels intégrateurs.
"""

from ..modules.sales.schemas import (
    BulkLabel,
    QueueItem,
    SaleBase,
    SaleCreate,
    SaleDetailResponse,
    SaleItemCreate,
    SaleItemResponse,
    SaleListResponse,
    SalePayment,
    SalePaymentResponse,
    SaleResponse,
    SaleUpdate,
    SaleValidationResponse,
)

__all__ = [
    "SaleBase",
    "SaleItemCreate",
    "SaleItemResponse",
    "SaleCreate",
    "SaleUpdate",
    "SaleResponse",
    "SaleDetailResponse",
    "SaleListResponse",
    "BulkLabel",
    "SaleValidationResponse",
    "SalePayment",
    "SalePaymentResponse",
    "QueueItem",
]
