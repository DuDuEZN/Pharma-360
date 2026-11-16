"""Shim de compatibilité — service du domaine Caisse.

Le code source a été déplacé dans ``backend.modules.cash.service``.
Ce fichier conserve l'ancien chemin d'import ``backend.services.cash_service``.
"""

from ..modules.cash.service import CashService, CashServiceError, cash_service

__all__ = ["CashService", "CashServiceError", "cash_service"]
