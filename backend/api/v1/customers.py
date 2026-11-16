"""Shim de compatibilité — routeur du domaine Clients.

Le code source a été déplacé dans ``backend.modules.customers.router``.
Le routeur est désormais inclus via le registre de modules
(``backend.modules.registry``) dans ``backend.main``. Ce fichier conserve
l'ancien chemin d'import ``backend.api.v1.customers`` pour compatibilité.
"""

from ...modules.customers.router import router

__all__ = ["router"]
