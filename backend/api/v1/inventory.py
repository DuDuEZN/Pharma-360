"""Shim de compatibilité — routeur du domaine Stock.

Le code source a été déplacé dans ``backend.modules.inventory.router``.
Le routeur est désormais inclus via le registre de modules
(``backend.modules.registry``) dans ``backend.main``. Ce fichier conserve
l'ancien chemin d'import ``backend.api.v1.inventory`` pour compatibilité.
"""

from ...modules.inventory.router import router

__all__ = ["router"]
