"""
Invoice OCR Module for Pharmacie 360
Uses pytesseract to extract data from supplier invoices
"""

import re
import json
import logging
from pathlib import Path
from typing import Optional, Dict, Any
from datetime import datetime

import pytesseract
from PIL import Image
import cv2
import numpy as np

# Configure logging
logger = logging.getLogger(__name__)


class InvoiceOCR:
    """
    OCR processor for supplier invoices
    Extracts product information, quantities, prices, and supplier details
    """
    
    def __init__(self, tessdata_prefix: Optional[str] = None):
        """
        Initialize OCR processor
        
        Args:
            tessdata_prefix: Path to Tesseract data directory
        """
        if tessdata_prefix:
            pytesseract.pytesseract.tesseract_cmd = tessdata_prefix
        
        self.patterns = {
            # French/Benin invoice patterns
            'invoice_number': r'(?:facture|n°|num\.?|invoice)[\s:]*([a-zA-Z0-9\-\_\/]+)',
            'date': r'(?:date|le|au)[\s:]*(\d{1,2}[\/\-\.]\d{1,2}[\/\-\.]\d{2,4})',
            'supplier_name': r'(?:fournisseur|de|par)[\s:]*([A-Z\s&\.]+)',
            'total_amount': r'(?:total|montant|prix)[\s:]*([\d\s.,]+)',
            'product_line': r'([A-Z\s\-]+)\s+(\d+[.,]?\d*)\s+([\d\s.,]+)',
            'price': r'([\d\s.,]+)[\s]*(?:FCFA|XOF|\$|€)',
            'quantity': r'(\d+[.,]?\d*)\s+(?:unité|kg|g|l|ml|boîte|box)',
        }
    
    def preprocess_image(self, image_path: str) -> Image.Image:
        """
        Preprocess image for better OCR accuracy
        
        Args:
            image_path: Path to the invoice image
            
        Returns:
            Preprocessed PIL Image
        """
        try:
            # Open image
            img = Image.open(image_path)
            
            # Convert to grayscale
            img = img.convert('L')
            
            # Apply thresholding (Otsu choisit le seuil ; pas de conversion en mode '1'
            # qui produirait un tableau booleen refuse par cv2.threshold)
            img_np = np.array(img)
            _, img_np = cv2.threshold(img_np, 0, 255, cv2.THRESH_BINARY + cv2.THRESH_OTSU)
            img = Image.fromarray(img_np)
            
            return img
            
        except Exception as e:
            logger.error(f"Error preprocessing image: {e}")
            raise
    
    def extract_text(self, image: Image.Image) -> str:
        """
        Extract text from image using Tesseract OCR
        
        Args:
            image: PIL Image to process
            
        Returns:
            Extracted text
        """
        try:
            # Use French language for Benin context
            text = pytesseract.image_to_string(
                image,
                lang='fra+eng',
                config='--psm 6 --oem 3'
            )
            return text
            
        except Exception as e:
            logger.error(f"Error extracting text: {e}")
            raise
    
    def parse_invoice_text(self, text: str) -> Dict[str, Any]:
        """
        Parse extracted text to extract invoice data
        
        Args:
            text: Extracted text from OCR
            
        Returns:
            Dictionary with invoice data
        """
        invoice_data = {
            'supplier': None,
            'invoice_number': None,
            'date': None,
            'items': [],
            'total': None,
            'currency': 'XOF',  # Default to West African CFA Franc
        }
        
        lines = text.split('\n')
        
        for line in lines:
            line = line.strip()
            if not line:
                continue
            
            # Extract invoice number
            if not invoice_data['invoice_number']:
                match = re.search(self.patterns['invoice_number'], line, re.IGNORECASE)
                if match:
                    invoice_data['invoice_number'] = match.group(1).strip()
            
            # Extract date
            if not invoice_data['date']:
                match = re.search(self.patterns['date'], line, re.IGNORECASE)
                if match:
                    date_str = match.group(1).strip()
                    invoice_data['date'] = self._parse_date(date_str)
            
            # Extract supplier
            if not invoice_data['supplier']:
                match = re.search(self.patterns['supplier_name'], line, re.IGNORECASE)
                if match:
                    invoice_data['supplier'] = match.group(1).strip()
            
            # Extract total
            if not invoice_data['total']:
                match = re.search(self.patterns['total_amount'], line, re.IGNORECASE)
                if match:
                    amount_str = match.group(1).strip()
                    invoice_data['total'] = self._parse_amount(amount_str)
            
            # Extract product lines (simplified pattern)
            # Look for lines with product name, quantity, price
            product_match = re.match(
                r'([A-Z\s\-\.]+)\s+(\d+[.,]?\d*)\s+([\d\s.,]+)',
                line,
                re.IGNORECASE
            )
            if product_match and len(invoice_data['items']) < 50:  # Limit items
                name = product_match.group(1).strip()
                quantity = float(product_match.group(2).replace(',', '.'))
                price = self._parse_amount(product_match.group(3))
                
                invoice_data['items'].append({
                    'name': name,
                    'quantity': quantity,
                    'unit_price': price,
                    'total': quantity * price if price else 0
                })
        
        return invoice_data
    
    def _parse_date(self, date_str: str) -> Optional[str]:
        """Parse date string into ISO format"""
        try:
            # Try different date formats
            formats = [
                '%d/%m/%Y',
                '%d-%m-%Y', 
                '%d.%m.%Y',
                '%m/%d/%Y',
                '%Y-%m-%d',
            ]
            
            for fmt in formats:
                try:
                    dt = datetime.strptime(date_str, fmt)
                    return dt.strftime('%Y-%m-%d')
                except ValueError:
                    continue
            
            return None
        except Exception:
            return None
    
    def _parse_amount(self, amount_str: str) -> Optional[float]:
        """Parse amount string into float"""
        try:
            # Remove currency symbols and spaces
            amount_str = amount_str.replace('FCFA', '').replace('XOF', '') \
                               .replace('$', '').replace('€', '') \
                               .replace(' ', '').replace(',', '.')
            
            # Handle thousands separators
            if '.' in amount_str:
                parts = amount_str.split('.')
                if len(parts) == 2 and len(parts[1]) == 3:
                    # European format: 1.000,00
                    amount_str = amount_str.replace('.', '').replace(',', '.')
                elif len(parts) > 2:
                    # Multiple dots - likely thousands separators
                    amount_str = amount_str.replace('.', '')
            
            return float(amount_str)
        except Exception:
            return None
    
    def process_invoice(self, image_path: str) -> Dict[str, Any]:
        """
        Process invoice image and extract data
        
        Args:
            image_path: Path to invoice image
            
        Returns:
            Dictionary with extracted invoice data
        """
        try:
            # Preprocess image
            img = self.preprocess_image(image_path)
            
            # Extract text
            text = self.extract_text(img)
            
            # Parse text
            invoice_data = self.parse_invoice_text(text)
            
            # Add metadata
            invoice_data['processed_at'] = datetime.now().isoformat()
            invoice_data['status'] = 'success'
            
            return invoice_data
            
        except Exception as e:
            logger.error(f"Error processing invoice: {e}")
            return {
                'status': 'error',
                'error': str(e),
                'processed_at': datetime.now().isoformat()
            }


# Global OCR instance
ocr_processor = InvoiceOCR()


def extract_invoice_data(image_path: str) -> Dict[str, Any]:
    """
    Extract invoice data from image file
    
    Args:
        image_path: Path to invoice image
        
    Returns:
        Dictionary with invoice data
    """
    return ocr_processor.process_invoice(image_path)


def process_invoice_image(image: Image.Image) -> Dict[str, Any]:
    """
    Process invoice from PIL Image
    
    Args:
        image: PIL Image object
        
    Returns:
        Dictionary with invoice data
    """
    # Save to temp file and process
    import tempfile
    import os
    
    with tempfile.NamedTemporaryFile(suffix='.png', delete=False) as tmp:
        image.save(tmp.name)
        try:
            result = ocr_processor.process_invoice(tmp.name)
        finally:
            os.unlink(tmp.name)
    
    return result
