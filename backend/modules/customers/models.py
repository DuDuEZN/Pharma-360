"""Modèles appartenant au domaine Clients.

Phase 1 du monolithe modulaire : la classe SQLAlchemy reste physiquement dans
``backend.models`` (la base est partagée), mais le module Clients expose un
point d'accès unique. Une migration ultérieure pourra déplacer la classe sans
impacter les consommateurs du module.
"""

from ...models.customer import Customer

__all__ = ["Customer"]
