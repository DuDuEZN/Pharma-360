"""Accès PostgreSQL partagé pour le module IA.

Le module IA lit directement la base de production ``pharma360_prod`` en
lecture seule (produits, lots, ventes, livraisons). Le pool est créé
paresseusement afin que le service puisse démarrer même si ``asyncpg`` n'est
pas encore installé ou si la base est momentanément indisponible.
"""

from __future__ import annotations

import asyncio
import logging
from typing import Any

from .config import settings

logger = logging.getLogger(__name__)

_pool: Any = None
_pool_lock = asyncio.Lock()


async def get_pool() -> Any:
    """Retourne (et crée au besoin) le pool de connexions ``asyncpg``."""
    global _pool
    if _pool is not None:
        return _pool

    async with _pool_lock:
        if _pool is not None:
            return _pool

        try:
            import asyncpg  # import paresseux : dépendance optionnelle au démarrage
        except ImportError as exc:  # pragma: no cover - dépend de l'environnement
            raise RuntimeError(
                "asyncpg est requis pour les analyses IA (pip install asyncpg)"
            ) from exc

        _pool = await asyncpg.create_pool(
            host=settings.postgres_host,
            port=settings.postgres_port,
            database=settings.postgres_db,
            user=settings.postgres_user,
            password=settings.postgres_password,
            min_size=1,
            max_size=5,
            command_timeout=60,
        )
        logger.info(
            "IA database pool created (%s:%s/%s)",
            settings.postgres_host,
            settings.postgres_port,
            settings.postgres_db,
        )
        return _pool


async def close_pool() -> None:
    """Ferme proprement le pool (arrêt du service)."""
    global _pool
    if _pool is not None:
        try:
            await _pool.close()
        finally:
            _pool = None


async def reset_pool() -> None:
    """Réinitialise le pool après une erreur de connexion."""
    await close_pool()
