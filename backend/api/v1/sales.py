"""Shim de compatibilité — routeur du domaine Ventes.

Le code source a été déplacé dans ``backend.modules.sales.router``.
Le routeur est désormais inclus via le registre de modules
(``backend.modules.registry``) dans ``backend.main``. Ce fichier conserve
l'ancien chemin d'import ``backend.api.v1.sales`` pour compatibilité.
"""

from ...modules.sales.router import router

__all__ = ["router"]
