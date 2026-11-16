"""Modèles appartenant au domaine Caisse.

Phase 1 du monolithe modulaire : la classe SQLAlchemy reste physiquement dans
``backend.models`` (la base est partagée), mais le module Caisse expose un
point d'accès unique.
"""

from ...models.cash_session import CashSession

__all__ = ["CashSession"]
