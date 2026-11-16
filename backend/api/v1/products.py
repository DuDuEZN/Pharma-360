"""Shim de compatibilité — routeur du domaine Catalogue.

Le code source a été déplacé dans ``backend.modules.catalog.router``.
Le routeur est désormais inclus via le registre de modules
(``backend.modules.registry``) dans ``backend.main``. Ce fichier conserve
l'ancien chemin d'import ``backend.api.v1.products`` pour compatibilité.
"""

from ...modules.catalog.router import router

__all__ = ["router"]
