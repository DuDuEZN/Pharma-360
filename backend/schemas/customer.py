"""Shim de compatibilité — schémas du domaine Clients.

Le code source a été déplacé dans ``backend.modules.customers.schemas``.
Ce fichier conserve l'ancien chemin d'import ``backend.schemas.customer``.
"""

from ..modules.customers.schemas import (
    CustomerBase,
    CustomerCreate,
    CustomerDetailResponse,
    CustomerResponse,
    CustomerStatsResponse,
    CustomerUpdate,
)

__all__ = [
    "CustomerBase",
    "CustomerCreate",
    "CustomerUpdate",
    "CustomerResponse",
    "CustomerDetailResponse",
    "CustomerStatsResponse",
]
