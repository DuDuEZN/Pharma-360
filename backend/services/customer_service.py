"""Shim de compatibilité — service du domaine Clients.

Le code source a été déplacé dans ``backend.modules.customers.service``.
Ce fichier conserve l'ancien chemin d'import ``backend.services.customer_service``
utilisé par ``backend.services.__init__`` et les tests.
"""

from ..modules.customers.service import CustomerService, customer_service

__all__ = ["CustomerService", "customer_service"]
