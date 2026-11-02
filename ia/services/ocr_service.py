"""
OCR Service for Pharmacie 360
Integrates OCR module with backend and provides REST API endpoints
"""

import asyncio
import os
from datetime import datetime
from pathlib import Path
from typing import Any, Dict, List, Optional

from fastapi import File, HTTPException, UploadFile

from ia.core.config import settings
from ia.ocr.invoice_ocr import InvoiceOCR, extract_invoice_data


class OCRService:
    """
    Service for OCR invoice processing
    Handles file upload, processing, and data extraction
    """

    def __init__(self):
        self.ocr_processor = InvoiceOCR()
        self.upload_dir = Path(settings.upload_dir) / "ocr"
        self.upload_dir.mkdir(parents=True, exist_ok=True)

    async def process_invoice_upload(
        self, file: UploadFile, supplier_id: Optional[str] = None
    ) -> Dict[str, Any]:
        """
        Process uploaded invoice file

        Args:
            file: Uploaded file (image or PDF)
            supplier_id: Optional supplier ID to associate

        Returns:
            Dictionary with extracted data and processed file info
        """
        try:
            file_path = self._save_uploaded_file(file)
            ocr_data = self._process_file(file_path)

            # supplier matching disabled in standalone IA service
            # if not supplier_id and ocr_data.get('supplier'):
            #     supplier_id = await self._match_supplier(ocr_data['supplier'])

            result = {
                "status": "success",
                "supplier_id": supplier_id,
                "invoice_number": ocr_data.get("invoice_number"),
                "date": ocr_data.get("date"),
                "total_amount": ocr_data.get("total"),
                "currency": ocr_data.get("currency", "XOF"),
                "items": ocr_data.get("items", []),
                "file_path": str(file_path),
                "file_name": file.filename,
                "processed_at": datetime.now().isoformat(),
                "raw_text": ocr_data.get("raw_text", ""),
            }

            if file_path.exists():
                file_path.unlink()

            return result

        except Exception as e:
            return {
                "status": "error",
                "error": str(e),
                "processed_at": datetime.now().isoformat(),
            }

    def _save_uploaded_file(self, file: UploadFile) -> Path:
        """Save uploaded file to temporary location"""
        file_ext = Path(file.filename).suffix
        timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
        filename = f"invoice_{timestamp}{file_ext}"
        file_path = self.upload_dir / filename

        with open(file_path, "wb") as f:
            f.write(file.file.read())

        return file_path

    def _process_file(self, file_path: Path) -> Dict[str, Any]:
        """Process file with OCR"""
        try:
            if file_path.suffix.lower() == ".pdf":
                return self._process_pdf(file_path)

            return extract_invoice_data(str(file_path))

        except Exception as e:
            return {"status": "error", "error": f"Error processing file: {str(e)}"}

    def _process_pdf(self, pdf_path: Path) -> Dict[str, Any]:
        """Process PDF file by converting to image"""
        try:
            from pdf2image import convert_from_path

            images = convert_from_path(str(pdf_path), first_page=1, last_page=1)

            if images:
                temp_png = pdf_path.with_suffix(".png")
                images[0].save(str(temp_png))
                result = extract_invoice_data(str(temp_png))

                if temp_png.exists():
                    temp_png.unlink()

                return result

            return {"status": "error", "error": "No images extracted from PDF"}

        except ImportError:
            return {"status": "error", "error": "pdf2image not installed"}
        except Exception as e:
            return {"status": "error", "error": str(e)}

    async def _match_supplier(self, supplier_name: str) -> Optional[str]:
        """Match supplier name with existing suppliers - Disabled in standalone mode"""
        # Supplier matching requires backend integration
        # In standalone IA service, this is disabled
        return None

    async def extract_from_image_path(self, image_path: str) -> Dict[str, Any]:
        """Extract data from image file path"""
        try:
            return extract_invoice_data(image_path)
        except Exception as e:
            return {"status": "error", "error": str(e)}

    async def batch_process_invoices(
        self, files: List[UploadFile]
    ) -> List[Dict[str, Any]]:
        """Process multiple invoice files in batch"""
        results = []

        for file in files:
            result = await self.process_invoice_upload(file)
            results.append(result)

        return results


ocr_service = OCRService()
