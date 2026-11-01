"""
Barcode Service for Pharmacie 360 Backend
Handles barcode scanning, processing, and middleware for hardware integration
"""

import re
from typing import Optional, Tuple

from sqlalchemy.ext.asyncio import AsyncSession

from ..models.batch import Batch
from ..models.product import Product
from ..schemas.product import BarcodeScanResponse
from ..services.product_service import ProductService


class BarcodeService:
    """Service for handling barcode operations"""

    @staticmethod
    def validate_barcode(barcode: str) -> bool:
        """
        Validate a barcode format

        Supports common barcode formats:
        - EAN-8 (8 digits)
        - EAN-13 (13 digits)
        - UPC-A (12 digits)
        - Code 39 (variable length, alphanumeric)
        - Code 128 (variable length, alphanumeric)
        """
        if not barcode or not isinstance(barcode, str):
            return False

        # Remove whitespace
        barcode = barcode.strip()

        if not barcode:
            return False

        # Check length (most common: 8, 12, 13 digits)
        if len(barcode) in [8, 12, 13] and barcode.isdigit():
            return True

        # Check for Code 39 or Code 128 (alphanumeric, typically 6-20 chars)
        if 6 <= len(barcode) <= 20:
            # Code 39 starts and ends with *
            if barcode.startswith("*") and barcode.endswith("*"):
                return True
            # Alphanumeric without special chars
            if re.match(r"^[A-Za-z0-9\-\.\s]+$", barcode):
                return True

        return False

    @staticmethod
    def normalize_barcode(barcode: str) -> str:
        """
        Normalize barcode by removing whitespace and special characters
        """
        if not barcode:
            return ""

        # Remove whitespace, asterisks, and other special chars
        normalized = re.sub(r"[\s\*\-\.]", "", barcode)

        # Convert to uppercase (for alphanumeric barcodes)
        return normalized.upper()

    @staticmethod
    async def scan_barcode(barcode: str, db: AsyncSession) -> BarcodeScanResponse:
        """
        Scan a barcode and return product with FEFO batch selection

        This is the main entry point for barcode scanning from hardware or manual input.

        Args:
            barcode: The barcode string to scan
            db: Database session

        Returns:
            BarcodeScanResponse with product, batch, or error
        """
        # Normalize the barcode
        normalized_barcode = BarcodeService.normalize_barcode(barcode)

        # Validate format
        if not BarcodeService.validate_barcode(normalized_barcode):
            return BarcodeScanResponse(
                product=None,
                batch=None,
                error=f"Format de code-barres invalide: {barcode}",
            )

        # Try to find product by barcode
        product = await ProductService.get_product_by_barcode(normalized_barcode, db)

        if not product:
            # Try with original barcode (not normalized)
            product = await ProductService.get_product_by_barcode(barcode, db)

        if not product:
            return BarcodeScanResponse(
                product=None,
                batch=None,
                error=f"Produit non trouvé avec le code-barres: {barcode}",
            )

        # Get FEFO batch for this product
        return await ProductService.scan_barcode(barcode, db)

    @staticmethod
    async def scan_and_select(
        barcode: str, quantity: int = 1, db: AsyncSession = None
    ) -> Tuple[Optional[Product], Optional[Batch], Optional[str]]:
        """
        Scan barcode and select FEFO batch with quantity check

        Args:
            barcode: Barcode to scan
            quantity: Requested quantity
            db: Database session

        Returns:
            Tuple of (product, batch, error_message)
        """
        scan_response = await BarcodeService.scan_barcode(barcode, db)

        if scan_response.error:
            return None, None, scan_response.error

        if not scan_response.product:
            return None, None, "Produit non trouvé"

        if not scan_response.batch:
            return (
                scan_response.product,
                None,
                scan_response.error or "Aucun lot disponible",
            )

        # Check if batch has enough quantity
        if scan_response.batch.quantity < quantity:
            return (
                scan_response.product,
                scan_response.batch,
                f"Stock insuffisant: {scan_response.batch.quantity} disponible, {quantity} demandé",
            )

        return scan_response.product, scan_response.batch, None

    @staticmethod
    def parse_barcode_from_input(input_text: str) -> str:
        """
        Parse barcode from various input formats

        Handles:
        - Raw barcode string
        - Barcode with prefix/suffix
        - Barcode from scanner (may include special chars)
        """
        if not input_text:
            return ""

        # Remove common scanner prefixes/suffixes
        cleaned = input_text.strip()

        # Remove common scanner control characters
        cleaned = cleaned.replace("\r", "").replace("\n", "").replace("\t", "")

        # Remove trailing characters that might be added by scanner
        # (some scanners add line feed or other control chars)
        cleaned = re.sub(r"[^A-Za-z0-9\*\-\.\s]", "", cleaned)

        return cleaned.strip()

    @staticmethod
    async def batch_scan_process(barcode: str, db: AsyncSession) -> dict:
        """
        Process a barcode scan for batch operations

        This is used for:
        - Sales: Scan product to add to sale
        - Stock management: Scan to view/update batch
        - Returns: Scan to identify product for return

        Returns a dictionary with all relevant information
        """
        # Parse and normalize
        parsed_barcode = BarcodeService.parse_barcode_from_input(barcode)
        normalized_barcode = BarcodeService.normalize_barcode(parsed_barcode)

        # Validate
        if not BarcodeService.validate_barcode(normalized_barcode):
            return {
                "success": False,
                "error": f"Code-barres invalide: {barcode}",
                "barcode": barcode,
                "normalized_barcode": normalized_barcode,
            }

        # Scan
        scan_response = await BarcodeService.scan_barcode(normalized_barcode, db)

        if scan_response.error:
            return {
                "success": False,
                "error": scan_response.error,
                "barcode": barcode,
                "normalized_barcode": normalized_barcode,
            }

        # Build result
        result = {
            "success": True,
            "barcode": barcode,
            "normalized_barcode": normalized_barcode,
            "product": scan_response.product.dict() if scan_response.product else None,
            "batch": scan_response.batch.dict() if scan_response.batch else None,
            "error": None,
        }

        # Add warnings if applicable
        if scan_response.batch:
            if scan_response.batch.is_expiring_soon:
                result["warning"] = (
                    f"Lot proche de la péremption ({scan_response.batch.days_until_expiry} jours)"
                )
            if scan_response.batch.quantity < 10:
                result["warning"] = (
                    f"Stock faible: {scan_response.batch.quantity} unités restantes"
                )

        return result


# Singleton instance
barcode_service = BarcodeService()
