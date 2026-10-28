"""
IA Module for Pharmacie 360
Contains OCR, Analytics, and ML Models for the pharmacy management system
"""

from .ocr.invoice_ocr import InvoiceOCR as ocr_facture
from .analytics.stock_analysis import stock_rotation_analysis
from .analytics import predict_stock_ruptures
from .models import load_stock_prediction_model

__all__ = [
    "ocr_facture",
    "stock_rotation_analysis", 
    "predict_stock_ruptures",
    "load_stock_prediction_model",
]
