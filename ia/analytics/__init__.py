"""
Analytics Module for Pharmacie 360
Provides stock rotation analysis and rupture prediction
"""

from .stock_analysis import (
    stock_rotation_analysis,
    predict_stock_ruptures,
    generate_stock_kpis,
    StockAnalyzer,
)

__all__ = [
    "stock_rotation_analysis",
    "predict_stock_ruptures",
    "generate_stock_kpis",
    "StockAnalyzer",
]
