"""
IA Module for Pharmacie 360
Contains OCR, Analytics, and ML Models for the pharmacy management system
"""

try:
    from .ocr.invoice_ocr import InvoiceOCR as ocr_facture
except ModuleNotFoundError:
    ocr_facture = None

try:
    from .analytics.stock_analysis import stock_rotation_analysis
except ModuleNotFoundError:
    stock_rotation_analysis = None

try:
    from .analytics import predict_stock_ruptures
except ModuleNotFoundError:
    predict_stock_ruptures = None

try:
    from .models import load_stock_prediction_model
except ModuleNotFoundError:
    load_stock_prediction_model = None

__all__ = [
    "ocr_facture",
    "stock_rotation_analysis",
    "predict_stock_ruptures",
    "load_stock_prediction_model",
]
