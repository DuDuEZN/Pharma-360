"""
API v1 for IA Module
"""

from .ocr import router as ocr_router

routers = [ocr_router]
