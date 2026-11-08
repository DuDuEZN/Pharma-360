"""
Tests unitaires pour le module Reports
QA-005: Tests Unitaires Backend
"""

import pytest
from fastapi.testclient import TestClient
from datetime import date

from backend.main import app


@pytest.fixture
def client():
    """Create a fresh TestClient for each test"""
    with TestClient(app) as test_client:
        yield test_client


class TestReports:
    """Tests for Reports API endpoints"""
    
    def test_get_sales_report(self, client):
        """Test getting sales report"""
        params = {
            "start_date": "2024-01-01",
            "end_date": "2024-01-31"
        }
        response = client.get("/api/v1/reports/sales", params=params)
        assert response.status_code == 200
        assert isinstance(response.json(), dict)
    
    def test_get_inventory_report(self, client):
        """Test getting inventory report"""
        response = client.get("/api/v1/reports/inventory")
        assert response.status_code == 200
        assert isinstance(response.json(), dict)
    
    def test_get_daily_sales_report(self, client):
        """Test getting daily sales report"""
        response = client.get("/api/v1/reports/daily-sales")
        assert response.status_code == 200
        assert isinstance(response.json(), list)
    
    def test_get_monthly_sales_report(self, client):
        """Test getting monthly sales report"""
        response = client.get("/api/v1/reports/monthly-sales")
        assert response.status_code == 200
        assert isinstance(response.json(), list)
    
    def test_get_product_sales_report(self, client):
        """Test getting product sales report"""
        params = {
            "start_date": "2024-01-01",
            "end_date": "2024-01-31"
        }
        response = client.get("/api/v1/reports/product-sales", params=params)
        assert response.status_code == 200
        assert isinstance(response.json(), list)
    
    def test_get_customer_purchases_report(self, client):
        """Test getting customer purchases report"""
        params = {
            "start_date": "2024-01-01",
            "end_date": "2024-01-31"
        }
        response = client.get("/api/v1/reports/customer-purchases", params=params)
        assert response.status_code == 200
        assert isinstance(response.json(), list)
    
    def test_get_supplier_purchases_report(self, client):
        """Test getting supplier purchases report"""
        params = {
            "start_date": "2024-01-01",
            "end_date": "2024-01-31"
        }
        response = client.get("/api/v1/reports/supplier-purchases", params=params)
        assert response.status_code == 200
        assert isinstance(response.json(), list)
    
    def test_get_profit_margin_report(self, client):
        """Test getting profit margin report"""
        response = client.get("/api/v1/reports/profit-margin")
        assert response.status_code == 200
        assert isinstance(response.json(), dict)
    
    def test_get_expired_products_report(self, client):
        """Test getting expired products report"""
        response = client.get("/api/v1/reports/expired-products")
        assert response.status_code == 200
        assert isinstance(response.json(), list)
    
    def test_get_low_stock_report(self, client):
        """Test getting low stock report"""
        response = client.get("/api/v1/reports/low-stock")
        assert response.status_code == 200
        assert isinstance(response.json(), list)
    
    def test_get_excess_stock_report(self, client):
        """Test getting excess stock report"""
        response = client.get("/api/v1/reports/excess-stock")
        assert response.status_code == 200
        assert isinstance(response.json(), list)


class TestReportGeneration:
    """Tests for report generation functionality"""
    
    def test_generate_pdf_report(self, client):
        """Test generating a PDF report"""
        params = {
            "report_type": "sales",
            "start_date": "2024-01-01",
            "end_date": "2024-01-31"
        }
        response = client.get("/api/v1/reports/generate-pdf", params=params)
        assert response.status_code == 200
        # Check if response is PDF
        assert response.headers.get("content-type") == "application/pdf"
    
    def test_generate_excel_report(self, client):
        """Test generating an Excel report"""
        params = {
            "report_type": "inventory",
            "format": "excel"
        }
        response = client.get("/api/v1/reports/generate", params=params)
        assert response.status_code == 200
        # Check if response is Excel
        assert "excel" in response.headers.get("content-type", "") or \
               "spreadsheet" in response.headers.get("content-type", "")
    
    def test_generate_custom_report(self, client):
        """Test generating a custom report"""
        report_config = {
            "type": "custom",
            "fields": ["product_name", "quantity", "price"],
            "filters": {
                "category": "Medicines"
            },
            "sort_by": "quantity",
            "sort_order": "desc"
        }
        response = client.post("/api/v1/reports/custom", json=report_config)
        assert response.status_code == 200
        assert isinstance(response.json(), list)


class TestReportScheduling:
    """Tests for report scheduling functionality"""
    
    def test_schedule_report(self, client):
        """Test scheduling a report"""
        schedule_data = {
            "report_type": "daily-sales",
            "schedule": "daily",
            "time": "08:00:00",
            "email": "admin@pharmacy.com"
        }
        response = client.post("/api/v1/reports/schedule", json=schedule_data)
        assert response.status_code in [200, 201]
        if response.status_code == 201:
            assert "schedule_id" in response.json()
    
    def test_get_scheduled_reports(self, client):
        """Test getting scheduled reports"""
        response = client.get("/api/v1/reports/scheduled")
        assert response.status_code == 200
        assert isinstance(response.json(), list)
    
    def test_delete_scheduled_report(self, client):
        """Test deleting a scheduled report"""
        # First create a scheduled report
        schedule_data = {
            "report_type": "daily-sales",
            "schedule": "daily",
            "time": "08:00:00",
            "email": "admin@pharmacy.com"
        }
        create_response = client.post("/api/v1/reports/schedule", json=schedule_data)
        
        if create_response.status_code == 201:
            schedule_id = create_response.json()["schedule_id"]
            # Delete the scheduled report
            response = client.delete(f"/api/v1/reports/schedule/{schedule_id}")
            assert response.status_code in [200, 204]


class TestReportData:
    """Tests for report data accuracy"""
    
    def test_sales_report_data_accuracy(self, client):
        """Test sales report data accuracy"""
        params = {
            "start_date": "2024-01-01",
            "end_date": "2024-01-31"
        }
        response = client.get("/api/v1/reports/sales", params=params)
        assert response.status_code == 200
        data = response.json()
        # Check that required fields are present
        assert "total_sales" in data
        assert "total_revenue" in data
        assert "total_profit" in data
    
    def test_inventory_report_data_accuracy(self, client):
        """Test inventory report data accuracy"""
        response = client.get("/api/v1/reports/inventory")
        assert response.status_code == 200
        data = response.json()
        # Check that required fields are present
        assert "total_products" in data
        assert "total_quantity" in data
        assert "total_value" in data
    
    def test_report_date_filtering(self, client):
        """Test report date filtering"""
        params = {
            "start_date": "2024-02-01",
            "end_date": "2024-02-28"
        }
        response = client.get("/api/v1/reports/sales", params=params)
        assert response.status_code == 200
        data = response.json()
        # All sales should be within the date range
        if "sales" in data:
            for sale in data["sales"]:
                sale_date = sale.get("date", "")
                assert sale_date >= "2024-02-01" and sale_date <= "2024-02-28"
