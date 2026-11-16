"""Shim de compatibilité — service du domaine Rapports.

Le code source a été déplacé dans ``backend.modules.reports.service``.
Ce fichier conserve l'ancien chemin d'import ``backend.services.report_service``.
"""

from ..modules.reports.service import ReportService, report_service

__all__ = ["ReportService", "report_service"]
