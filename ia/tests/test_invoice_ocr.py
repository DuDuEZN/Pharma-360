"""
Tests for Invoice OCR Module
Tests for IA-002 task
"""

import os
import tempfile
from pathlib import Path

import pytest

try:
    import numpy as np
    from PIL import Image

    from ..ocr.invoice_ocr import (InvoiceOCR, extract_invoice_data,
                                   process_invoice_image)

    HAS_OCR = True
except ModuleNotFoundError:
    HAS_OCR = False


@pytest.fixture
def sample_image_path():
    if not HAS_OCR:
        pytest.skip("OCR dependencies not available")
    """Create a sample invoice image for testing"""
    # Create a blank white image
    img = Image.new("RGB", (800, 600), color="white")

    # Save to temp file
    with tempfile.NamedTemporaryFile(suffix=".png", delete=False) as tmp:
        img.save(tmp.name)
        yield tmp.name

        # Cleanup
        try:
            os.unlink(tmp.name)
        except:
            pass


@pytest.fixture
def ocr_processor():
    if not HAS_OCR:
        pytest.skip("OCR dependencies not available")
    """Create an OCR processor instance"""
    return InvoiceOCR()


@pytest.fixture
def sample_pil_image():
    if not HAS_OCR:
        pytest.skip("OCR dependencies not available")
    """Create a sample PIL image"""
    img = Image.new("RGB", (400, 300), color="white")
    return img


@pytest.mark.skipif(not HAS_OCR, reason="OCR dependencies not available")
class TestInvoiceOCR:
    """Tests for InvoiceOCR class"""

    def test_preprocess_image(self, ocr_processor, sample_image_path):
        """Test image preprocessing"""
        img = ocr_processor.preprocess_image(sample_image_path)

        assert img is not None
        assert img.mode == "L"  # Should be grayscale

    def test_extract_text(self, ocr_processor, sample_pil_image):
        """Test text extraction"""
        # This will extract text from the blank image
        text = ocr_processor.extract_text(sample_pil_image)

        assert isinstance(text, str)
        # Blank image should return empty or minimal text
        assert text is not None

    def test_parse_date(self, ocr_processor):
        """Test date parsing"""
        # Test various date formats
        assert ocr_processor._parse_date("15/01/2025") == "2025-01-15"
        assert ocr_processor._parse_date("15-01-2025") == "2025-01-15"
        assert ocr_processor._parse_date("2025-01-15") == "2025-01-15"
        assert ocr_processor._parse_date("01/15/2025") == "2025-01-15"

        # Invalid format
        assert ocr_processor._parse_date("invalid") is None

    def test_parse_amount(self, ocr_processor):
        """Test amount parsing"""
        # Test various amount formats
        assert ocr_processor._parse_amount("1000") == 1000.0
        assert ocr_processor._parse_amount("1,000") == 1000.0
        assert ocr_processor._parse_amount("1.000") == 1000.0
        assert ocr_processor._parse_amount("1,000.00") == 1000.00
        assert ocr_processor._parse_amount("1 000") == 1000.0
        assert ocr_processor._parse_amount("1000 FCFA") == 1000.0
        assert ocr_processor._parse_amount("1000 XOF") == 1000.0

        # Invalid format
        assert ocr_processor._parse_amount("invalid") is None

    def test_parse_invoice_text(self, ocr_processor):
        """Test invoice text parsing"""
        sample_text = """
        Facture N°: INV-2025-001
        Date: 15/01/2025
        Fournisseur: Pharma Distributeur
        
        Produit          Qté    Prix
        Paracetamol      100   500 XOF
        Amoxicillin      50    1000 XOF
        
        Total: 100 000 XOF
        """

        result = ocr_processor.parse_invoice_text(sample_text)

        assert isinstance(result, dict)
        assert "invoice_number" in result
        assert "date" in result
        assert "items" in result
        assert "total" in result

    def test_parse_invoice_number_keeps_first_match(self, ocr_processor):
        """Le n° de facture (1re occurrence) ne doit pas être écrasé par une ligne suivante"""
        result = ocr_processor.parse_invoice_text(
            "Facture N° FAC-2026-0042\nDate: 30/10/2026\nRéf. interne num 77 à classer\nTotal: 1000"
        )
        assert result["invoice_number"] == "FAC-2026-0042"

    def test_parse_invoice_mixed_case_items_and_total(self, ocr_processor):
        """Lignes produit en casse mixte, quantité/prix/total de ligne, TOTAL TTC"""
        result = ocr_processor.parse_invoice_text(
            "Paracetamol 500mg   100   250.00   25000.00\nTOTAL TTC: 45000.00 FCFA"
        )
        assert result["total"] == 45000.0
        assert result["items"][0]["name"] == "Paracetamol 500mg"
        assert result["items"][0]["quantity"] == 100.0
        assert result["items"][0]["unit_price"] == 250.0
        assert result["items"][0]["total"] == 25000.0

    def test_process_invoice(self, ocr_processor, sample_image_path):
        """Test full invoice processing"""
        result = ocr_processor.process_invoice(sample_image_path)

        assert isinstance(result, dict)
        assert "status" in result
        assert "processed_at" in result


@pytest.mark.skipif(not HAS_OCR, reason="OCR dependencies not available")
class TestModuleFunctions:
    """Tests for module-level functions"""

    def test_extract_invoice_data(self, sample_image_path):
        """Test extract_invoice_data function"""
        result = extract_invoice_data(sample_image_path)

        assert isinstance(result, dict)
        assert "status" in result

    def test_process_invoice_image(self, sample_pil_image):
        """Test process_invoice_image function"""
        result = process_invoice_image(sample_pil_image)

        assert isinstance(result, dict)
        assert "status" in result


@pytest.mark.skipif(not HAS_OCR, reason="OCR dependencies not available")
class TestOCRPatterns:
    """Tests for OCR pattern matching"""

    def test_invoice_number_pattern(self, ocr_processor):
        """Test invoice number pattern"""
        import re

        text = "Facture: INV-2025-001"
        match = re.search(ocr_processor.patterns["invoice_number"], text, re.IGNORECASE)

        assert match is not None
        assert match.group(1) == "INV-2025-001"

    def test_date_pattern(self, ocr_processor):
        """Test date pattern"""
        import re

        text = "Date: 15/01/2025"
        match = re.search(ocr_processor.patterns["date"], text, re.IGNORECASE)

        assert match is not None
        assert match.group(1) == "15/01/2025"

    def test_supplier_pattern(self, ocr_processor):
        """Test supplier pattern"""
        import re

        text = "Fournisseur: Pharma SA"
        match = re.search(ocr_processor.patterns["supplier_name"], text, re.IGNORECASE)

        assert match is not None
        assert "Pharma SA" in match.group(1)


@pytest.mark.skipif(not HAS_OCR, reason="OCR dependencies not available")
class TestEdgeCases:
    """Tests for edge cases"""

    def test_nonexistent_image(self, ocr_processor):
        """Test with non-existent image"""
        with pytest.raises(Exception):
            ocr_processor.preprocess_image("/nonexistent/path.png")

    def test_empty_text(self, ocr_processor):
        """Test with empty text"""
        result = ocr_processor.parse_invoice_text("")

        assert isinstance(result, dict)
        assert result["invoice_number"] is None
        assert result["date"] is None

    def test_invalid_date_formats(self, ocr_processor):
        """Test with invalid date formats"""
        assert ocr_processor._parse_date("") is None
        assert ocr_processor._parse_date("not a date") is None
        assert ocr_processor._parse_date("99/99/9999") is None


if __name__ == "__main__":
    pytest.main([__file__, "-v"])
