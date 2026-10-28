"""
IA Module Tests for Pharmacie 360
Tests for OCR, Analytics, and Prediction modules

QA-008: Tests Module IA
"""

import pytest


class TestOCRService:
    """Tests for OCR service"""
    
    def test_ocr_service_instantiation(self):
        """Test that OCRService can be instantiated"""
        from ia.services.ocr_service import OCRService
        service = OCRService()
        assert service is not None
    
    def test_ocr_service_has_extract_method(self):
        """Test that OCRService has extract_text method"""
        from ia.services.ocr_service import OCRService
        service = OCRService()
        assert hasattr(service, 'extract_text')


class TestStockAnalyzer:
    """Tests for Stock Analyzer"""
    
    def test_stock_analyzer_instantiation(self):
        """Test that StockAnalyzer can be instantiated"""
        from ia.analytics.stock_analysis import StockAnalyzer
        analyzer = StockAnalyzer()
        assert analyzer is not None
    
    def test_stock_analyzer_has_predict_method(self):
        """Test that StockAnalyzer has predict_stockout method"""
        from ia.analytics.stock_analysis import StockAnalyzer
        analyzer = StockAnalyzer()
        assert hasattr(analyzer, 'predict_stockout')
    
    def test_stock_analyzer_has_analyze_method(self):
        """Test that StockAnalyzer has analyze_rotation method"""
        from ia.analytics.stock_analysis import StockAnalyzer
        analyzer = StockAnalyzer()
        assert hasattr(analyzer, 'analyze_rotation')


class TestAlertService:
    """Tests for Alert Service"""
    
    def test_alert_service_instantiation(self):
        """Test that AlertService can be instantiated"""
        from ia.services.alert_service import AlertService
        service = AlertService()
        assert service is not None
    
    def test_alert_service_has_check_method(self):
        """Test that AlertService has check_stock_alerts method"""
        from ia.services.alert_service import AlertService
        service = AlertService()
        assert hasattr(service, 'check_stock_alerts')


class TestKPIService:
    """Tests for KPI Service"""
    
    def test_kpi_service_instantiation(self):
        """Test that KPIService can be instantiated"""
        from ia.services.kpi_service import KPIService
        service = KPIService()
        assert service is not None
    
    def test_kpi_service_has_calculate_method(self):
        """Test that KPIService has calculate_kpis method"""
        from ia.services.kpi_service import KPIService
        service = KPIService()
        assert hasattr(service, 'calculate_kpis')


class TestIAModels:
    """Tests for IA models"""
    
    def test_ia_models_exist(self):
        """Test that IA models exist"""
        from ia.models.stock_prediction import StockPrediction
        assert StockPrediction is not None


class TestIASchemas:
    """Tests for IA schemas"""
    
    def test_ia_schemas_exist(self):
        """Test that IA schemas exist"""
        from ia.schemas.ocr import OCRRequest, OCRResponse
        from ia.schemas.alert import AlertResponse
        from ia.schemas.kpi import KPIResponse
        
        assert OCRRequest is not None
        assert OCRResponse is not None
        assert AlertResponse is not None
        assert KPIResponse is not None


if __name__ == '__main__':
    pytest.main([__file__, '-v'])
