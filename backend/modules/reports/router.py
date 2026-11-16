"""Routeur composite du module Rapports.

Le module Rapports possède deux points d'entrée historiques :
- ``/reports`` (rapports standards) ;
- ``/manager/reports`` (alias gestionnaire).

Les deux routeurs ont été migrés dans le module et sont agrégés ici pour
conserver un point d'entrée unique côté registre et côté shims.
"""

from fastapi import APIRouter

from .manager_router import router as manager_reports_router
from .reports_router import router as reports_router

router = APIRouter()
router.include_router(reports_router)
router.include_router(manager_reports_router)

__all__ = ["router", "reports_router", "manager_reports_router"]
