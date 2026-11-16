"""Shim de compatibilité — routeur du domaine Rapports.

Le code source a été déplacé dans ``backend.modules.reports``. Le module expose
un routeur composite agrégant ``/reports`` et ``/manager/reports``.
Ce fichier conserve l'ancien chemin d'import ``backend.api.v1.reports``.
"""

from ...modules.reports.router import router

__all__ = ["router"]
