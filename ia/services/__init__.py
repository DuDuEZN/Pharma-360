"""
Services module for IA Module
"""

from .ocr_service import ocr_service
from .kpi_service import kpi_service
from .alert_service import alert_service
from .stock_prediction import stock_prediction_service

__all__ = ["ocr_service", "kpi_service", "alert_service", "stock_prediction_service"]
