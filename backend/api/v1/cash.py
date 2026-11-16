"""Shim de compatibilité — routeur du domaine Caisse.

Le code source a été déplacé dans ``backend.modules.cash.router``.
Le routeur est désormais inclus via le registre de modules
(``backend.modules.registry``) dans ``backend.main``. Ce fichier conserve
l'ancien chemin d'import ``backend.api.v1.cash`` pour compatibilité.
"""

from ...modules.cash.router import router

__all__ = ["router"]
