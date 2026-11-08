"""
Tests unitaires pour le module Inventory
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


class TestInventory:
    """Tests for Inventory API endpoints"""
    
    def test_get_inventory(self, client):
        """Test getting inventory"""
        response = client.get("/api/v1/inventory")
        assert response.status_code == 200
        assert isinstance(response.json(), list)
    
    def test_get_inventory_by_product(self, client):
        """Test getting inventory for a specific product"""
        response = client.get("/api/v1/inventory/product/1")
        assert response.status_code in [200, 404]
        if response.status_code == 200:
            assert "product_id" in response.json()
            assert "quantity" in response.json()
    
    def test_update_inventory(self, client):
        """Test updating inventory for a product"""
        update_data = {
            "quantity": 50,
            "location": "A1"
        }
        response = client.put("/api/v1/inventory/product/1", json=update_data)
        assert response.status_code in [200, 404]
    
    def test_get_low_stock_items(self, client):
        """Test getting low stock items"""
        response = client.get("/api/v1/inventory/low-stock")
        assert response.status_code == 200
        assert isinstance(response.json(), list)
    
    def test_get_expiring_soon_items(self, client):
        """Test getting items expiring soon"""
        response = client.get("/api/v1/inventory/expiring-soon")
        assert response.status_code == 200
        assert isinstance(response.json(), list)
    
    def test_get_inventory_by_category(self, client):
        """Test filtering inventory by category"""
        response = client.get("/api/v1/inventory?category=medicine")
        assert response.status_code == 200
        assert isinstance(response.json(), list)


class TestStockMovements:
    """Tests for Stock Movements functionality"""
    
    def test_record_stock_in(self, client):
        """Test recording stock in movement"""
        movement_data = {
            "product_id": 1,
            "quantity": 10,
            "movement_type": "in",
            "reason": "purchase",
            "reference": "INV-001"
        }
        response = client.post("/api/v1/inventory/movements", json=movement_data)
        assert response.status_code in [200, 201]
    
    def test_record_stock_out(self, client):
        """Test recording stock out movement"""
        movement_data = {
            "product_id": 1,
            "quantity": 5,
            "movement_type": "out",
            "reason": "sale",
            "reference": "SALE-001"
        }
        response = client.post("/api/v1/inventory/movements", json=movement_data)
        assert response.status_code in [200, 201]
    
    def test_get_stock_movements(self, client):
        """Test getting stock movements"""
        response = client.get("/api/v1/inventory/movements")
        assert response.status_code == 200
        assert isinstance(response.json(), list)
    
    def test_get_stock_movements_by_product(self, client):
        """Test getting stock movements for a product"""
        response = client.get("/api/v1/inventory/movements/product/1")
        assert response.status_code == 200
        assert isinstance(response.json(), list)


class TestInventoryReports:
    """Tests for Inventory Reports functionality"""
    
    def test_get_inventory_summary(self, client):
        """Test getting inventory summary"""
        response = client.get("/api/v1/inventory/summary")
        assert response.status_code == 200
        assert "total_products" in response.json()
        assert "total_quantity" in response.json()
    
    def test_get_inventory_by_location(self, client):
        """Test getting inventory by location"""
        response = client.get("/api/v1/inventory/location/A1")
        assert response.status_code in [200, 404]
        if response.status_code == 200:
            assert isinstance(response.json(), list)


class TestInventoryValidation:
    """Tests for Inventory data validation"""
    
    def test_update_inventory_with_negative_quantity(self, client):
        """Test updating inventory with negative quantity"""
        update_data = {
            "quantity": -10
        }
        response = client.put("/api/v1/inventory/product/1", json=update_data)
        assert response.status_code == 422  # Validation error
    
    def test_record_movement_without_product(self, client):
        """Test recording movement without product"""
        movement_data = {
            "quantity": 10,
            "type": "in",
            "reason": "purchase"
        }
        response = client.post("/api/v1/inventory/movements", json=movement_data)
        assert response.status_code == 422  # Validation error
