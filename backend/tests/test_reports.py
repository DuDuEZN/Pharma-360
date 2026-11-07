"""
Tests unitaires pour le module Reports
QA-005: Tests Unitaires Backend
"""

import pytest
from fastapi.testclient import TestClient
from datetime import date

from backend.main import app

client = TestClient(app)


class TestReports:
    """Tests for Reports API endpoints"""
    
    def test_get_sales_report(self):
        """Test getting sales report"""
        params = {
            "start_date": "2024-01-01",
            "end_date": "2024-01-31"
        }
        response = client.get("/api/v1/reports/sales", params=params)
        assert response.status_code == 200
        assert isinstance(response.json(), dict)
    
    def test_get_inventory_report(self):
        """Test getting inventory report"""
        response = client.get("/api/v1/reports/inventory")
        assert response.status_code == 200
        assert isinstance(response.json(), dict)
    
    def test_get_daily_sales_report(self):
        """Test getting daily sales report"""
        response = client.get("/api/v1/reports/daily-sales")
        assert response.status_code == 200
        assert isinstance(response.json(), list)
    
    def test_get_monthly_sales_report(self):
        """Test getting monthly sales report"""
        response = client.get("/api/v1/reports/monthly-sales")
        assert response.status_code == 200
        assert isinstance(response.json(), list)
    
    def test_get_product_sales_report(self):
        """Test getting product sales report"""
        params = {
            "start_date": "2024-01-01",
            "end_date": "2024-01-31"
        }
        response = client.get("/api/v1/reports/product-sales", params=params)
        assert response.status_code == 200
        assert isinstance(response.json(), list)
    
    def test_get_customer_sales_report(self):
        """Test getting customer sales report"""
        params = {
            "start_date": "2024-01-01",
            "end_date": "2024-01-31"
        }
        response = client.get("/api/v1/reports/customer-sales", params=params)
        assert response.status_code == 200
        assert isinstance(response.json(), list)


class TestReportGeneration:
    """Tests for Report Generation functionality"""
    
    def test_generate_pdf_report(self):
        """Test generating a PDF report"""
        params = {
            "type": "sales",
            "start_date": "2024-01-01",
            "end_date": "2024-01-31"
        }
        response = client.get("/api/v1/reports/generate-pdf", params=params)
        assert response.status_code == 200
        # PDF should be returned as bytes
        assert "application/pdf" in response.headers.get("content-type", "")
    
    def test_generate_excel_report(self):
        """Test generating an Excel report"""
        params = {
            "type": "inventory",
            "format": "excel"
        }
        response = client.get("/api/v1/reports/export", params=params)
        assert response.status_code == 200
    
    def test_schedule_report(self):
        """Test scheduling a report"""
        schedule_data = {
            "report_type": "daily-sales",
            "frequency": "daily",
            "time": "09:00",
            "email": "admin@example.com"
        }
        response = client.post("/api/v1/reports/schedule", json=schedule_data)
        assert response.status_code in [200, 201]
    
    def test_get_scheduled_reports(self):
        """Test getting scheduled reports"""
        response = client.get("/api/v1/reports/scheduled")
        assert response.status_code == 200
        assert isinstance(response.json(), list)


class TestReportTemplates:
    """Tests for Report Templates functionality"""
    
    def test_get_report_templates(self):
        """Test getting report templates"""
        response = client.get("/api/v1/reports/templates")
        assert response.status_code == 200
        assert isinstance(response.json(), list)
    
    def test_create_report_template(self):
        """Test creating a report template"""
        template_data = {
            "name": "Custom Report",
            "type": "custom",
            "fields": ["date", "product", "quantity", "total"],
            "filters": ["date_range", "category"]
        }
        response = client.post("/api/v1/reports/templates", json=template_data)
        assert response.status_code in [200, 201]
    
    def test_delete_report_template(self):
        """Test deleting a report template"""
        response = client.delete("/api/v1/reports/templates/1")
        assert response.status_code in [200, 404]


class TestReportValidation:
    """Tests for Report data validation"""
    
    def test_generate_report_without_type(self):
        """Test generating report without type"""
        params = {
            "start_date": "2024-01-01"
        }
        response = client.get("/api/v1/reports/sales", params=params)
        assert response.status_code == 422  # Validation error
    
    def test_generate_report_with_invalid_date(self):
        """Test generating report with invalid date"""
        params = {
            "start_date": "invalid-date",
            "end_date": "2024-01-31"
        }
        response = client.get("/api/v1/reports/sales", params=params)
        assert response.status_code == 422  # Validation error
