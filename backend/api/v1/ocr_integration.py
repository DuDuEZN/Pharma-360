"""
OCR Integration API Endpoints for Pharmacie 360
Integrates IA OCR module with backend
"""

from fastapi import APIRouter, UploadFile, File, Depends, HTTPException
from fastapi.responses import JSONResponse
from typing import Optional, List
from backend.core.config import settings
from ia.services.ocr_service import ocr_service

router = APIRouter(prefix="/invoices", tags=["OCR"])

logger = get_logger(__name__)


@router.post("/ocr", summary="Process Invoice OCR")
async def process_invoice_ocr(
    file: UploadFile = File(...),
    supplier_id: Optional[str] = None
):
    """
    Process supplier invoice using OCR
    
    Extracts supplier information, invoice number, date, items, and total amount
    from uploaded image or PDF file.
    
    This endpoint integrates the IA module OCR functionality with the backend.
    """
    try:
        result = await ocr_service.process_invoice_upload(file, supplier_id)
        
        if result.get('status') == 'error':
            raise HTTPException(
                status_code=400,
                detail=result.get('error', 'Error processing invoice')
            )
        
        return JSONResponse(content=result)
        
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Error processing invoice: {str(e)}"
        )


@router.post("/ocr/batch", summary="Batch Process Invoices OCR")
async def batch_process_invoices_ocr(
    files: List[UploadFile] = File(...)
):
    """
    Process multiple invoices using OCR in batch
    """
    try:
        if len(files) > 10:
            raise HTTPException(
                status_code=400,
                detail="Maximum 10 files allowed in batch"
            )
        
        results = await ocr_service.batch_process_invoices(files)
        
        errors = [r for r in results if r.get('status') == 'error']
        
        return JSONResponse(
            content={
                'results': results,
                'error_count': len(errors),
                'success_count': len(results) - len(errors),
                'processed_at': results[0].get('processed_at') if results else None
            }
        )
        
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Error processing batch: {str(e)}"
        )
