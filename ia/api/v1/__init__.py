"""
API v1 for IA Module
"""

from .ocr import router as ocr_router
from .kpis import router as kpis_router

routers = [ocr_router, kpis_router]
