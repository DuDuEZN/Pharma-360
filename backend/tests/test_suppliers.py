"""
Tests unitaires pour le module Suppliers
QA-005: Tests Unitaires Backend
"""

import pytest
from fastapi.testclient import TestClient

from backend.main import app

client = TestClient(app)


class TestSuppliers:
    """Tests for Suppliers API endpoints"""
    
    def test_get_all_suppliers(self):
        """Test getting all suppliers"""
        response = client.get("/api/v1/suppliers")
        assert response.status_code == 200
        assert isinstance(response.json(), list)
    
    def test_get_supplier_by_id(self):
        """Test getting a specific supplier by ID"""
        response = client.get("/api/v1/suppliers/1")
        assert response.status_code in [200, 404]
        if response.status_code == 200:
            assert "id" in response.json()
            assert "name" in response.json()
    
    def test_create_supplier(self):
        """Test creating a new supplier"""
        supplier_data = {
            "name": "Test Supplier",
            "contact": "contact@supplier.com",
            "phone": "1234567890",
            "address": "123 Test Street",
            "city": "Test City",
            "country": "Test Country"
        }
        response = client.post("/api/v1/suppliers", json=supplier_data)
        assert response.status_code == 201
        assert "id" in response.json()
        assert response.json()["name"] == supplier_data["name"]
    
    def test_update_supplier(self):
        """Test updating a supplier"""
        update_data = {
            "name": "Updated Supplier",
            "contact": "updated@supplier.com"
        }
        response = client.put("/api/v1/suppliers/1", json=update_data)
        assert response.status_code in [200, 404]
        if response.status_code == 200:
            assert response.json()["name"] == update_data["name"]
    
    def test_delete_supplier(self):
        """Test deleting a supplier"""
        response = client.delete("/api/v1/suppliers/1")
        assert response.status_code in [200, 404]
    
    def test_get_suppliers_by_name(self):
        """Test filtering suppliers by name"""
        response = client.get("/api/v1/suppliers?name=Test")
        assert response.status_code == 200
        assert isinstance(response.json(), list)
    
    def test_get_suppliers_paginated(self):
        """Test paginated suppliers list"""
        response = client.get("/api/v1/suppliers?skip=0&limit=10")
        assert response.status_code == 200
        assert isinstance(response.json(), list)


class TestSupplierProducts:
    """Tests for Supplier Products functionality"""
    
    def test_get_supplier_products(self):
        """Test getting products from a supplier"""
        response = client.get("/api/v1/suppliers/1/products")
        assert response.status_code in [200, 404]
        if response.status_code == 200:
            assert isinstance(response.json(), list)
    
    def test_add_product_to_supplier(self):
        """Test adding a product to a supplier"""
        product_data = {
            "product_id": 1,
            "supplier_price": 10.0,
            "supplier_sku": "SKU123"
        }
        response = client.post("/api/v1/suppliers/1/products", json=product_data)
        assert response.status_code in [200, 201, 404]
    
    def test_remove_product_from_supplier(self):
        """Test removing a product from a supplier"""
        response = client.delete("/api/v1/suppliers/1/products/1")
        assert response.status_code in [200, 404]


class TestSupplierInvoices:
    """Tests for Supplier Invoices functionality"""
    
    def test_get_supplier_invoices(self):
        """Test getting invoices from a supplier"""
        response = client.get("/api/v1/suppliers/1/invoices")
        assert response.status_code in [200, 404]
        if response.status_code == 200:
            assert isinstance(response.json(), list)
    
    def test_create_supplier_invoice(self):
        """Test creating an invoice for a supplier"""
        invoice_data = {
            "invoice_number": "INV-001",
            "date": "2024-01-01",
            "total": 100.0,
            "items": [
                {"product_id": 1, "quantity": 10, "unit_price": 10.0}
            ]
        }
        response = client.post("/api/v1/suppliers/1/invoices", json=invoice_data)
        assert response.status_code in [200, 201, 404]


class TestSupplierValidation:
    """Tests for Supplier data validation"""
    
    def test_create_supplier_without_name(self):
        """Test creating a supplier without name"""
        supplier_data = {
            "contact": "contact@supplier.com",
            "phone": "1234567890"
        }
        response = client.post("/api/v1/suppliers", json=supplier_data)
        assert response.status_code == 422  # Validation error
    
    def test_create_supplier_with_invalid_email(self):
        """Test creating a supplier with invalid email"""
        supplier_data = {
            "name": "Test Supplier",
            "contact": "invalid-email",
            "phone": "1234567890"
        }
        response = client.post("/api/v1/suppliers", json=supplier_data)
        assert response.status_code == 422  # Validation error
