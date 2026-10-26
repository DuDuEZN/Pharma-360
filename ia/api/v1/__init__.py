"""
API v1 for IA Module
"""

from .ocr import router as ocr_router
from .kpis import router as kpis_router
from .dashboard import router as dashboard_router
from .alerts import router as alerts_router

routers = [ocr_router, kpis_router, dashboard_router, alerts_router]
