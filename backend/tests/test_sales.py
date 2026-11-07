"""
Tests unitaires pour le module Sales
QA-005: Tests Unitaires Backend
"""

import pytest
from fastapi.testclient import TestClient
from datetime import datetime, date

from backend.main import app

client = TestClient(app)


class TestSales:
    """Tests for Sales API endpoints"""
    
    def test_get_all_sales(self):
        """Test getting all sales"""
        response = client.get("/api/v1/sales")
        assert response.status_code == 200
        assert isinstance(response.json(), list)
    
    def test_get_sale_by_id(self):
        """Test getting a specific sale by ID"""
        response = client.get("/api/v1/sales/1")
        assert response.status_code in [200, 404]
        if response.status_code == 200:
            assert "id" in response.json()
            assert "total" in response.json()
    
    def test_create_sale(self):
        """Test creating a new sale"""
        sale_data = {
            "customer_id": 1,
            "items": [
                {"product_id": 1, "quantity": 2, "unit_price": 10.0}
            ],
            "total": 20.0,
            "payment_method": "cash",
            "date": date.today().isoformat()
        }
        response = client.post("/api/v1/sales", json=sale_data)
        assert response.status_code == 201
        assert "id" in response.json()
        assert response.json()["total"] == sale_data["total"]
    
    def test_update_sale(self):
        """Test updating a sale"""
        update_data = {
            "total": 25.0,
            "payment_method": "card"
        }
        response = client.put("/api/v1/sales/1", json=update_data)
        assert response.status_code in [200, 404]
    
    def test_delete_sale(self):
        """Test deleting a sale"""
        response = client.delete("/api/v1/sales/1")
        assert response.status_code in [200, 404]
    
    def test_get_sales_by_date(self):
        """Test filtering sales by date"""
        today = date.today().isoformat()
        response = client.get(f"/api/v1/sales?date={today}")
        assert response.status_code == 200
        assert isinstance(response.json(), list)
    
    def test_get_sales_by_customer(self):
        """Test filtering sales by customer"""
        response = client.get("/api/v1/sales?customer_id=1")
        assert response.status_code == 200
        assert isinstance(response.json(), list)
    
    def test_get_sales_paginated(self):
        """Test paginated sales list"""
        response = client.get("/api/v1/sales?skip=0&limit=10")
        assert response.status_code == 200
        assert isinstance(response.json(), list)
    
    def test_get_daily_sales(self):
        """Test getting daily sales summary"""
        response = client.get("/api/v1/sales/daily")
        assert response.status_code == 200
        assert isinstance(response.json(), list)
    
    def test_get_monthly_sales(self):
        """Test getting monthly sales summary"""
        response = client.get("/api/v1/sales/monthly")
        assert response.status_code == 200
        assert isinstance(response.json(), list)


class TestSaleItems:
    """Tests for Sale Items functionality"""
    
    def test_add_item_to_sale(self):
        """Test adding an item to a sale"""
        item_data = {
            "product_id": 1,
            "quantity": 1,
            "unit_price": 10.0
        }
        response = client.post("/api/v1/sales/1/items", json=item_data)
        assert response.status_code in [200, 201, 404]
    
    def test_remove_item_from_sale(self):
        """Test removing an item from a sale"""
        response = client.delete("/api/v1/sales/1/items/1")
        assert response.status_code in [200, 404]
    
    def test_update_sale_item(self):
        """Test updating a sale item"""
        update_data = {
            "quantity": 3,
            "unit_price": 15.0
        }
        response = client.put("/api/v1/sales/1/items/1", json=update_data)
        assert response.status_code in [200, 404]


class TestSaleStatus:
    """Tests for Sale status management"""
    
    def test_complete_sale(self):
        """Test marking a sale as complete"""
        response = client.post("/api/v1/sales/1/complete")
        assert response.status_code in [200, 404]
    
    def test_cancel_sale(self):
        """Test canceling a sale"""
        response = client.post("/api/v1/sales/1/cancel")
        assert response.status_code in [200, 404]


class TestSaleValidation:
    """Tests for Sale data validation"""
    
    def test_create_sale_without_items(self):
        """Test creating a sale without items"""
        sale_data = {
            "customer_id": 1,
            "total": 0.0
        }
        response = client.post("/api/v1/sales", json=sale_data)
        assert response.status_code == 422  # Validation error
    
    def test_create_sale_with_negative_total(self):
        """Test creating a sale with negative total"""
        sale_data = {
            "customer_id": 1,
            "items": [],
            "total": -10.0
        }
        response = client.post("/api/v1/sales", json=sale_data)
        assert response.status_code == 422  # Validation error
    
    def test_create_sale_with_invalid_payment_method(self):
        """Test creating a sale with invalid payment method"""
        sale_data = {
            "customer_id": 1,
            "items": [],
            "total": 10.0,
            "payment_method": "invalid"
        }
        response = client.post("/api/v1/sales", json=sale_data)
        assert response.status_code == 422  # Validation error
