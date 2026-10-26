"""
OCR Integration API Endpoints for Pharmacie 360
Integrates IA OCR module with backend
"""

from fastapi import APIRouter, UploadFile, File, Depends, HTTPException
from fastapi.responses import JSONResponse
from typing import Optional, List
from backend.core.config import settings
from ...core.logging import get_logger

# Make OCR import optional
try:
    from ia.services.ocr_service import ocr_service
    OCR_AVAILABLE = True
except ImportError:
    OCR_AVAILABLE = False
    ocr_service = None

router = APIRouter(prefix="/invoices", tags=["OCR"])

logger = get_logger(__name__)
