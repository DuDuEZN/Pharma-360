"""Shim de compatibilité — service du domaine Commandes.

Le code source a été déplacé dans ``backend.modules.orders.service``.
Ce fichier conserve l'ancien chemin d'import ``backend.services.order_service``
utilisé par le routeur Livraisons et les tests.
"""

from ..modules.orders.service import DeliveryService, OrderService

__all__ = ["DeliveryService", "OrderService"]
