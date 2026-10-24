"""
Barcode API Endpoints for Pharmacie 360 Backend
FastAPI endpoints for barcode scanning and processing (BKND-010)
"""

from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.ext.asyncio import AsyncSession

from ...core.database import get_db
from ...core.security import get_current_user
from ...models.user import User
from ...schemas.product import BarcodeScanRequest, BarcodeScanResponse
from ...services.barcode_service import BarcodeService


# Create router
router = APIRouter(prefix="/barcode", tags=["barcode"])


@router.post(
    "/scan",
    response_model=BarcodeScanResponse,
    summary="Scan a barcode",
    description="Scan a barcode and get product with FEFO batch selection"
)
async def scan_barcode(
    scan_data: BarcodeScanRequest,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
) -> BarcodeScanResponse:
    """Scan barcode endpoint"""
    return await BarcodeService.scan_barcode(
        barcode=scan_data.barcode,
        db=db
    )


@router.get(
    "/scan",
    response_model=BarcodeScanResponse,
    summary="Scan a barcode via GET",
    description="Scan a barcode using GET request (for testing or direct links)"
)
async def scan_barcode_get(
    barcode: Annotated[str, Query(min_length=1)] = "",
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
) -> BarcodeScanResponse:
    """Scan barcode via GET endpoint"""
    return await BarcodeService.scan_barcode(
        barcode=barcode,
        db=db
    )


@router.post(
    "/scan-and-select",
    summary="Scan and select batch with quantity",
    description="Scan barcode and select FEFO batch with quantity validation"
)
async def scan_and_select(
    barcode: str,
    quantity: Annotated[int, Query(ge=1)] = 1,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
) -> dict:
    """Scan and select endpoint"""
    product, batch, error = await BarcodeService.scan_and_select(
        barcode=barcode,
        quantity=quantity,
        db=db
    )
    
    if error:
        return {
            "success": False,
            "error": error,
            "product": product.dict() if product else None,
            "batch": batch.dict() if batch else None
        }
    
    return {
        "success": True,
        "product": product.dict(),
        "batch": batch.dict(),
        "error": None
    }


@router.post(
    "/validate",
    summary="Validate barcode format",
    description="Validate if a barcode has a valid format"
)
async def validate_barcode(
    barcode: str
) -> dict:
    """Validate barcode format endpoint"""
    is_valid = BarcodeService.validate_barcode(barcode)
    normalized = BarcodeService.normalize_barcode(barcode)
    
    return {
        "barcode": barcode,
        "normalized": normalized,
        "is_valid": is_valid,
        "format": BarcodeService.detect_barcode_format(normalized)
    }


@router.get(
    "/test",
    summary="Test barcode scanning",
    description="Test endpoint for barcode scanning functionality"
)
async def test_barcode():
    """Test barcode endpoint"""
    return {
        "message": "Barcode API is working",
        "endpoints": [
            "/barcode/scan (POST)",
            "/barcode/scan (GET)",
            "/barcode/scan-and-select (POST)",
            "/barcode/validate (POST)"
        ]
    }


# Add format detection to BarcodeService
class BarcodeFormatDetector:
    """Detect barcode format"""
    
    @staticmethod
    def detect_barcode_format(barcode: str) -> str:
        """Detect the format of a barcode"""
        if not barcode:
            return "unknown"
        
        length = len(barcode)
        
        if length == 8 and barcode.isdigit():
            return "EAN-8"
        elif length == 12 and barcode.isdigit():
            return "UPC-A"
        elif length == 13 and barcode.isdigit():
            return "EAN-13"
        elif length == 14 and barcode.isdigit():
            return "EAN-14 (ITF-14)"
        elif barcode.startswith('*') and barcode.endswith('*'):
            return "Code 39"
        elif any(c.isalpha() for c in barcode):
            return "Code 128"
        else:
            return "Unknown"


# Update BarcodeService with format detection
BarcodeService.detect_barcode_format = staticmethod(BarcodeFormatDetector.detect_barcode_format)
