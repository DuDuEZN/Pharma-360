"""Modèles appartenant au domaine Rapports.

Phase 1 du monolithe modulaire : la classe SQLAlchemy reste physiquement dans
``backend.models`` (la base est partagée), mais le module Rapports expose un
point d'accès unique.
"""

from ...models.report import Report

__all__ = ["Report"]
