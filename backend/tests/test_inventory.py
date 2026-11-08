"""
Tests unitaires pour le module Inventory
QA-005: Tests Unitaires Backend
"""

from datetime import date
from unittest.mock import Mock

import pytest
from fastapi.testclient import TestClient

from backend.core.security import get_current_user
from backend.main import app


@pytest.fixture
def client():
    """Create a fresh TestClient for each test"""
    with TestClient(app) as test_client:
        yield test_client


@pytest.fixture
def client_with_auth():
    """Create a test client with mocked authentication"""
    from backend.main import app

    mock_user = Mock()
    mock_user.id = 1
    mock_user.username = "testuser"
    mock_user.role = "admin"
    mock_user.is_active = True

    app.dependency_overrides[get_current_user] = lambda: mock_user
    with TestClient(app) as test_client:
        yield test_client
    # Clean up dependency overrides
    app.dependency_overrides.clear()


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
            assert "total_quantity" in response.json()

    def test_update_inventory(self, client):
        """Test updating inventory for a product"""
        update_data = {"quantity": 50, "location": "A1"}
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

    def test_record_stock_in(self, client_with_auth):
        """Test recording stock in movement"""
        client = client_with_auth

        # First create a test product
        product_data = {
            "name": "Test Product",
            "price": 10.0,
            "cost_price": 5.0,
            "unit": "unit",
        }
        product_response = client.post("/api/v1/products", json=product_data)
        product_id = product_response.json()["id"]

        # Now test the movement with the created product
        movement_data = {
            "product_id": product_id,
            "quantity": 10,
            "movement_type": "in",
            "reason": "purchase",
            "reference": "INV-001",
        }
        response = client.post("/api/v1/inventory/movements", json=movement_data)
        assert response.status_code in [200, 201]

    def test_record_stock_out(self, client_with_auth):
        """Test recording stock out movement"""
        client = client_with_auth

        # First create a test product
        product_data = {
            "name": "Test Product 2",
            "price": 15.0,
            "cost_price": 8.0,
            "unit": "unit",
        }
        product_response = client.post("/api/v1/products", json=product_data)
        product_id = product_response.json()["id"]

        # Now test the movement with the created product
        movement_data = {
            "product_id": product_id,
            "quantity": 5,
            "movement_type": "out",
            "reason": "sale",
            "reference": "SALE-001",
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
        update_data = {"quantity": -10}
        response = client.put("/api/v1/inventory/product/1", json=update_data)
        assert response.status_code == 422  # Validation error

    def test_record_movement_without_product(self, client):
        """Test recording movement without product"""
        movement_data = {"quantity": 10, "type": "in", "reason": "purchase"}
        response = client.post("/api/v1/inventory/movements", json=movement_data)
        assert response.status_code == 422  # Validation error
