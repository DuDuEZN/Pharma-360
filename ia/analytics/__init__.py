"""
Analytics Module for Pharmacie 360
Provides stock rotation analysis and rupture prediction
"""

try:
    from .stock_analysis import (
        StockAnalyzer,
        generate_stock_kpis,
        predict_stock_ruptures,
        stock_rotation_analysis,
    )
except ModuleNotFoundError:
    stock_rotation_analysis = None
    predict_stock_ruptures = None
    generate_stock_kpis = None
    StockAnalyzer = None

__all__ = [
    "stock_rotation_analysis",
    "predict_stock_ruptures",
    "generate_stock_kpis",
    "StockAnalyzer",
]
