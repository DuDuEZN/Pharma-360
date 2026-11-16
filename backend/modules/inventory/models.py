"""Modèles appartenant au domaine Stock.

Phase 1 du monolithe modulaire : les classes SQLAlchemy restent physiquement
dans ``backend.models`` (la base est partagée), mais le module Stock expose un
point d'accès unique pour les lots et les mouvements de stock.
"""

from ...models.batch import Batch
from ...models.movement import Movement

__all__ = ["Batch", "Movement"]
