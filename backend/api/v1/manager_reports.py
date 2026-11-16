"""Shim de compatibilité — routeur des rapports gestionnaire.

Le code source a été déplacé dans ``backend.modules.reports``. Le module expose
un routeur composite agrégant ``/reports`` et ``/manager/reports``.
Ce fichier conserve l'ancien chemin d'import ``backend.api.v1.manager_reports``.
"""

from ...modules.reports.router import router

__all__ = ["router"]
