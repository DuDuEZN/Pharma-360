"""
Tests unitaires pour le module Customers
QA-005: Tests Unitaires Backend
"""

import pytest
from fastapi.testclient import TestClient

from backend.main import app

client = TestClient(app)


class TestCustomers:
    """Tests for Customers API endpoints"""
    
    def test_get_all_customers(self):
        """Test getting all customers"""
        response = client.get("/api/v1/customers")
        assert response.status_code == 200
        assert isinstance(response.json(), list)
    
    def test_get_customer_by_id(self):
        """Test getting a specific customer by ID"""
        response = client.get("/api/v1/customers/1")
        assert response.status_code in [200, 404]
        if response.status_code == 200:
            assert "id" in response.json()
            assert "name" in response.json()
    
    def test_create_customer(self):
        """Test creating a new customer"""
        customer_data = {
            "name": "Test Customer",
            "contact": "contact@customer.com",
            "phone": "1234567890",
            "address": "123 Test Street",
            "city": "Test City",
            "country": "Test Country",
            "tax_id": "TAX123"
        }
        response = client.post("/api/v1/customers", json=customer_data)
        assert response.status_code == 201
        assert "id" in response.json()
        assert response.json()["name"] == customer_data["name"]
    
    def test_update_customer(self):
        """Test updating a customer"""
        update_data = {
            "name": "Updated Customer",
            "contact": "updated@customer.com"
        }
        response = client.put("/api/v1/customers/1", json=update_data)
        assert response.status_code in [200, 404]
        if response.status_code == 200:
            assert response.json()["name"] == update_data["name"]
    
    def test_delete_customer(self):
        """Test deleting a customer"""
        response = client.delete("/api/v1/customers/1")
        assert response.status_code in [200, 404]
    
    def test_get_customers_by_name(self):
        """Test filtering customers by name"""
        response = client.get("/api/v1/customers?name=Test")
        assert response.status_code == 200
        assert isinstance(response.json(), list)
    
    def test_get_customers_by_phone(self):
        """Test filtering customers by phone"""
        response = client.get("/api/v1/customers?phone=123")
        assert response.status_code == 200
        assert isinstance(response.json(), list)
    
    def test_get_customers_paginated(self):
        """Test paginated customers list"""
        response = client.get("/api/v1/customers?skip=0&limit=10")
        assert response.status_code == 200
        assert isinstance(response.json(), list)


class TestCustomerOrders:
    """Tests for Customer Orders functionality"""
    
    def test_get_customer_orders(self):
        """Test getting orders from a customer"""
        response = client.get("/api/v1/customers/1/orders")
        assert response.status_code in [200, 404]
        if response.status_code == 200:
            assert isinstance(response.json(), list)
    
    def test_get_customer_invoices(self):
        """Test getting invoices from a customer"""
        response = client.get("/api/v1/customers/1/invoices")
        assert response.status_code in [200, 404]
        if response.status_code == 200:
            assert isinstance(response.json(), list)


class TestCustomerLoyalty:
    """Tests for Customer Loyalty functionality"""
    
    def test_get_customer_purchase_history(self):
        """Test getting purchase history for a customer"""
        response = client.get("/api/v1/customers/1/purchases")
        assert response.status_code in [200, 404]
        if response.status_code == 200:
            assert isinstance(response.json(), list)
    
    def test_get_customer_stats(self):
        """Test getting statistics for a customer"""
        response = client.get("/api/v1/customers/1/stats")
        assert response.status_code in [200, 404]
        if response.status_code == 200:
            assert "total_purchases" in response.json()
            assert "total_spent" in response.json()


class TestCustomerValidation:
    """Tests for Customer data validation"""
    
    def test_create_customer_without_name(self):
        """Test creating a customer without name"""
        customer_data = {
            "contact": "contact@customer.com",
            "phone": "1234567890"
        }
        response = client.post("/api/v1/customers", json=customer_data)
        assert response.status_code == 422  # Validation error
    
    def test_create_customer_with_invalid_email(self):
        """Test creating a customer with invalid email"""
        customer_data = {
            "name": "Test Customer",
            "contact": "invalid-email",
            "phone": "1234567890"
        }
        response = client.post("/api/v1/customers", json=customer_data)
        assert response.status_code == 422  # Validation error
