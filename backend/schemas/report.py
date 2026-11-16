"""Shim de compatibilité — schémas du domaine Rapports.

Le code source a été déplacé dans ``backend.modules.reports.schemas``.
Ce fichier conserve l'ancien chemin d'import ``backend.schemas.report``.
"""

from ..modules.reports.schemas import (
    CashReportRequest,
    ReportBase,
    ReportCreate,
    ReportDownloadResponse,
    ReportGenerationRequest,
    ReportListResponse,
    ReportResponse,
    ReportStatsResponse,
    SalesReportRequest,
    StockReportRequest,
)

__all__ = [
    "CashReportRequest",
    "ReportBase",
    "ReportCreate",
    "ReportDownloadResponse",
    "ReportGenerationRequest",
    "ReportListResponse",
    "ReportResponse",
    "ReportStatsResponse",
    "SalesReportRequest",
    "StockReportRequest",
]
