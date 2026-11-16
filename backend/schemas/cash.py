"""Shim de compatibilité — schémas du domaine Caisse.

Le code source a été déplacé dans ``backend.modules.cash.schemas``.
Ce fichier conserve l'ancien chemin d'import ``backend.schemas.cash``.
"""

from ..modules.cash.schemas import (
    CashCurrentResponse,
    CashSessionClose,
    CashSessionListResponse,
    CashSessionOpen,
    CashSessionResponse,
)

__all__ = [
    "CashCurrentResponse",
    "CashSessionClose",
    "CashSessionListResponse",
    "CashSessionOpen",
    "CashSessionResponse",
]
