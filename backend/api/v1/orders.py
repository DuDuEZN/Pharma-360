"""Shim de compatibilité — routeur du domaine Commandes.

Le code source a été déplacé dans ``backend.modules.orders.router``.
Le routeur est désormais inclus via le registre de modules
(``backend.modules.registry``) dans ``backend.main``. Ce fichier conserve
l'ancien chemin d'import ``backend.api.v1.orders`` pour compatibilité.
"""

from ...modules.orders.router import router

__all__ = ["router"]
