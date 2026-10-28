"""
IA Module Tests for Pharmacie 360
Tests for OCR, Analytics, and Prediction modules

QA-008: Tests Module IA
"""

import pytest
import os
import tempfile
from datetime import date, timedelta
from PIL import Image
import numpy as np

from ia.services.ocr_service import OCRService
from ia.analytics.stock_analysis import StockAnalyzer
from ia.services.alert_service import AlertService
from ia.services.kpi_service import KPIService


class TestOCRService:
    """Tests for OCR service"""
    
    @pytest.fixture
    def ocr_service(self):
        """Create OCR service instance"""
        return OCRService()
    
    @pytest.fixture
    def sample_invoice_image(self):
        """Create a sample invoice image for testing"""
        # Create a simple image with text
        img = Image.new('RGB', (400, 200), color='white')
        # This would normally have text, but for testing we'll use a blank image
        return img
    
    @pytest.fixture
    def temp_image_file(self, sample_invoice_image):
        """Create a temporary image file"""
        with tempfile.NamedTemporaryFile(suffix='.png', delete=False) as tmp:
            sample_invoice_image.save(tmp.name)
            yield tmp.name
        os.unlink(tmp.name)
    
    def test_ocr_service_initialization(self, ocr_service):
        """Test OCR service initialization"""
        assert ocr_service is not None
    
    def test_preprocess_image(self, ocr_service, temp_image_file):
        """Test image preprocessing"""
        processed = ocr_service.preprocess_image(temp_image_file)
        assert processed is not None
    
    def test_extract_text(self, ocr_service, temp_image_file):
        """Test text extraction from image"""
        text = ocr_service.extract_text(temp_image_file)
        # Text extraction might return empty string for blank image
        assert isinstance(text, str)
    
    def test_parse_invoice_data(self, ocr_service):
        """Test invoice data parsing"""
        # Sample OCR text
        ocr_text = """
        FACTURE N: INV-2025-001
        Date: 2025-01-15
        Fournisseur: PHARMA SUPPLY
        
        Produit    Qté    Prix
        Paracétamol 100  500
        Ibuprofène 50   750
        
        Total: 50000 XOF
        """
        
        parsed = ocr_service.parse_invoice_data(ocr_text)
        
        assert parsed is not None
        assert "invoice_number" in parsed
        assert "date" in parsed
        assert "supplier" in parsed
        assert "items" in parsed
        assert "total_amount" in parsed
    
    def test_process_invoice(self, ocr_service, temp_image_file):
        """Test complete invoice processing"""
        result = ocr_service.process_invoice(temp_image_file)
        assert result is not None
        assert isinstance(result, dict)


class TestStockAnalysisService:
    """Tests for stock analysis service"""
    
    @pytest.fixture
    def stock_analysis_service(self):
        """Create stock analysis service instance"""
        return StockAnalysisService()
    
    @pytest.fixture
    def sample_sales_data(self):
        """Sample sales data for testing"""
        return [
            {"product_id": 1, "product_name": "Paracétamol", "category": "Analgésique", 
             "quantity": 100, "date": date.today().isoformat()},
            {"product_id": 2, "product_name": "Ibuprofène", "category": "Analgésique",
             "quantity": 50, "date": (date.today() - timedelta(days=1)).isoformat()},
            {"product_id": 3, "product_name": "Amoxicilline", "category": "Antibiotique",
             "quantity": 200, "date": date.today().isoformat()},
        ]
    
    def test_calculate_rotation_rate(self, stock_analysis_service, sample_sales_data):
        """Test rotation rate calculation"""
        rotation = stock_analysis_service.calculate_rotation_rate(
            sample_sales_data, "Analgésique"
        )
        assert rotation >= 0
    
    def test_identify_slow_moving(self, stock_analysis_service, sample_sales_data):
        """Test slow moving products identification"""
        slow_moving = stock_analysis_service.identify_slow_moving_products(
            sample_sales_data, threshold_days=30
        )
        assert isinstance(slow_moving, list)
    
    def test_identify_fast_moving(self, stock_analysis_service, sample_sales_data):
        """Test fast moving products identification"""
        fast_moving = stock_analysis_service.identify_fast_moving_products(
            sample_sales_data, threshold_days=30
        )
        assert isinstance(fast_moving, list)
    
    def test_predict_stockout(self, stock_analysis_service):
        """Test stockout prediction"""
        # Sample data: product ID, current stock, daily sales rate
        products_data = [
            {"product_id": 1, "current_stock": 50, "daily_sales": 10},
            {"product_id": 2, "current_stock": 200, "daily_sales": 5},
        ]
        
        predictions = stock_analysis_service.predict_stockout(products_data)
        
        assert isinstance(predictions, list)
        assert len(predictions) > 0
        assert "product_id" in predictions[0]
        assert "days_until_stockout" in predictions[0]


class TestAlertService:
    """Tests for alert service"""
    
    @pytest.fixture
    def alert_service(self):
        """Create alert service instance"""
        return AlertService()
    
    def test_check_low_stock(self, alert_service):
        """Test low stock alert"""
        products = [
            {"id": 1, "name": "Product 1", "current_stock": 5, "stock_min": 10},
            {"id": 2, "name": "Product 2", "current_stock": 15, "stock_min": 10},
        ]
        
        alerts = alert_service.check_low_stock_alerts(products)
        
        assert isinstance(alerts, list)
        assert len(alerts) == 1
        assert alerts[0]["product_id"] == 1
        assert alerts[0]["type"] == "low_stock"
    
    def test_check_expiry_alerts(self, alert_service):
        """Test expiry alerts"""
        from datetime import date, timedelta
        
        batches = [
            {"id": 1, "batch_number": "BATCH001", "expiry_date": (date.today() + timedelta(days=5)).isoformat()},
            {"id": 2, "batch_number": "BATCH002", "expiry_date": (date.today() + timedelta(days=15)).isoformat()},
            {"id": 3, "batch_number": "BATCH003", "expiry_date": (date.today() + timedelta(days=35)).isoformat()},
        ]
        
        alerts = alert_service.check_expiry_alerts(batches)
        
        assert isinstance(alerts, list)
        # BATCH001 (5 days) should be CRITICAL
        # BATCH002 (15 days) should be WARNING
        # BATCH003 (35 days) should not trigger
        assert len(alerts) == 2
    
    def test_check_overstock(self, alert_service):
        """Test overstock alerts"""
        products = [
            {"id": 1, "name": "Product 1", "current_stock": 200, "stock_max": 100},
            {"id": 2, "name": "Product 2", "current_stock": 50, "stock_max": 100},
        ]
        
        alerts = alert_service.check_overstock_alerts(products)
        
        assert isinstance(alerts, list)
        assert len(alerts) == 1
        assert alerts[0]["product_id"] == 1
        assert alerts[0]["type"] == "overstock"
    
    def test_prioritize_alerts(self, alert_service):
        """Test alert prioritization"""
        alerts = [
            {"type": "low_stock", "priority": "HIGH"},
            {"type": "expiry", "priority": "CRITICAL"},
            {"type": "overstock", "priority": "MEDIUM"},
        ]
        
        prioritized = alert_service.prioritize_alerts(alerts)
        
        assert len(prioritized) == 3
        # CRITICAL should come first
        assert prioritized[0]["priority"] == "CRITICAL"


class TestKPIService:
    """Tests for KPI service"""
    
    @pytest.fixture
    def kpi_service(self):
        """Create KPI service instance"""
        return KPIService()
    
    def test_generate_daily_kpis(self, kpi_service):
        """Test daily KPI generation"""
        kpis = kpi_service.generate_daily_kpis()
        
        assert isinstance(kpis, dict)
        assert "date" in kpis
        assert "sales_count" in kpis
        assert "total_revenue" in kpis
    
    def test_generate_weekly_kpis(self, kpi_service):
        """Test weekly KPI generation"""
        kpis = kpi_service.generate_weekly_kpis()
        
        assert isinstance(kpis, dict)
        assert "start_date" in kpis
        assert "end_date" in kpis
        assert "total_sales" in kpis
    
    def test_generate_monthly_kpis(self, kpi_service):
        """Test monthly KPI generation"""
        kpis = kpi_service.generate_monthly_kpis()
        
        assert isinstance(kpis, dict)
        assert "month" in kpis
        assert "year" in kpis
    
    def test_calculate_performance_score(self, kpi_service):
        """Test performance score calculation"""
        kpis = {
            "sales_count": 100,
            "total_revenue": 50000,
            "stock_turnover": 8,
            "supplier_count": 10
        }
        
        score = kpi_service.calculate_performance_score(kpis)
        
        assert isinstance(score, float)
        assert 0 <= score <= 100
    
    def test_get_performance_grade(self, kpi_service):
        """Test performance grade"""
        # Test different score ranges
        assert kpi_service.get_performance_grade(95) == "A"
        assert kpi_service.get_performance_grade(85) == "B"
        assert kpi_service.get_performance_grade(75) == "C"
        assert kpi_service.get_performance_grade(65) == "D"
        assert kpi_service.get_performance_grade(50) == "F"
