"""
OCR API Endpoints for Pharmacie 360
Provides REST API for OCR invoice processing
"""

from typing import List, Optional

from fastapi import APIRouter, File, HTTPException, UploadFile
from fastapi.responses import JSONResponse

from ia.services.ocr_service import ocr_service

router = APIRouter(prefix="/ocr", tags=["OCR"])


@router.post("/invoices", summary="Process Invoice OCR")
async def process_invoice_ocr(
    file: UploadFile = File(...), supplier_id: Optional[str] = None
):
    """
    Process supplier invoice using OCR

    Extracts supplier information, invoice number, date, items, and total amount
    from uploaded image or PDF file.
    """
    try:
        result = await ocr_service.process_invoice_upload(file, supplier_id)

        if result.get("status") == "error":
            raise HTTPException(
                status_code=400, detail=result.get("error", "Error processing invoice")
            )

        return JSONResponse(content=result)

    except Exception as e:
        raise HTTPException(
            status_code=500, detail=f"Error processing invoice: {str(e)}"
        )


@router.post("/invoices/batch", summary="Batch Process Invoices")
async def batch_process_invoices(files: List[UploadFile] = File(...)):
    """
    Process multiple invoices in batch
    """
    try:
        if len(files) > 10:
            raise HTTPException(
                status_code=400, detail="Maximum 10 files allowed in batch"
            )

        results = await ocr_service.batch_process_invoices(files)

        errors = [r for r in results if r.get("status") == "error"]
        if errors:
            return JSONResponse(
                content={
                    "results": results,
                    "error_count": len(errors),
                    "success_count": len(results) - len(errors),
                }
            )

        return JSONResponse(
            content={
                "results": results,
                "error_count": 0,
                "success_count": len(results),
            }
        )

    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error processing batch: {str(e)}")


@router.get("/health", summary="OCR Service Health Check")
async def ocr_health_check():
    """
    Check OCR service health
    """
    return {
        "status": "healthy",
        "service": "OCR",
        "version": "1.0.0",
        "capabilities": [
            "invoice_processing",
            "text_extraction",
            "pdf_conversion",
            "batch_processing",
        ],
        "supported_formats": ["jpg", "jpeg", "png", "pdf", "tiff"],
    }
