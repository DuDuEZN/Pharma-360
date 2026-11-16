"""Registre des modules métier (monolithe modulaire).

Chaque module expose un ``ModuleSpec``. Le registre permet :
- d'activer/désactiver un module par variable d'environnement ;
- de connaître ses dépendances déclaratives ;
- de préparer un futur activation par licence/abonnement.

Aucun import de routeur legacy ici : seuls les modules déjà migrés sont
enregistrés. Les routeurs historiques restent inclus par
``backend.api.v1.routers`` pendant la migration.
"""

import os
from dataclasses import dataclass, field

from fastapi import APIRouter

from .sales import router as sales_router


@dataclass(frozen=True)
class ModuleSpec:
    """Description d'un bloc métier."""

    name: str
    router: APIRouter
    enabled: bool = True
    depends_on: tuple[str, ...] = field(default_factory=tuple)
    license_feature: str | None = None
    description: str = ""


def _module_flag(name: str, default: bool = True) -> bool:
    """Lit ``MODULE_<NAME>_ENABLED`` (true/false, 1/0, yes/no, on/off)."""
    raw = os.getenv(f"MODULE_{name.upper()}_ENABLED")
    if raw is None:
        return default
    return raw.strip().lower() not in {"0", "false", "no", "off", "disabled"}


MODULES: tuple[ModuleSpec, ...] = (
    ModuleSpec(
        name="sales",
        router=sales_router,
        enabled=_module_flag("sales"),
        depends_on=(),
        license_feature="sales",
        description="Ventes, encaissement, annulation et file d'attente caisse.",
    ),
)


def get_module(name: str) -> ModuleSpec | None:
    return next((module for module in MODULES if module.name == name), None)


def enabled_modules() -> list[ModuleSpec]:
    return [module for module in MODULES if module.enabled]


__all__ = [
    "ModuleSpec",
    "MODULES",
    "enabled_modules",
    "get_module",
]
