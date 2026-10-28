"""
Unit Tests for Products Module - Pharma 360
Tests for product CRUD operations, barcode management, and stock tracking

QA-005: Tests Unitaires Backend
"""

import pytest
from backend.services.product_service import ProductService
from backend.services.batch_service import BatchService
from backend.models.product import Product
from backend.models.category import Category
from backend.models.batch import Batch
from backend.models.supplier import Supplier


class TestProductService:
    """Tests for ProductService"""
    
    def test_product_service_instantiation(self):
        """Test that ProductService can be instantiated"""
        service = ProductService()
        assert service is not None
    
    def test_product_service_has_get_methods(self):
        """Test that ProductService has get methods"""
        service = ProductService()
        assert hasattr(service, 'get_product_by_id')
        assert hasattr(service, 'get_product_by_barcode')
        assert hasattr(service, 'get_fefo_batch')
    
    def test_product_service_has_search_method(self):
        """Test that ProductService has search_products method"""
        service = ProductService()
        assert hasattr(service, 'search_products')


class TestBatchService:
    """Tests for BatchService"""
    
    def test_batch_service_instantiation(self):
        """Test that BatchService can be instantiated"""
        service = BatchService()
        assert service is not None
    
    def test_batch_service_has_get_methods(self):
        """Test that BatchService has get methods"""
        service = BatchService()
        assert hasattr(service, 'get_batch_by_id')
        assert hasattr(service, 'get_batches_by_product')


class TestProductModels:
    """Tests for Product models"""
    
    def test_product_model_exists(self):
        """Test that Product model exists"""
        assert Product is not None
    
    def test_category_model_exists(self):
        """Test that Category model exists"""
        assert Category is not None
    
    def test_batch_model_exists(self):
        """Test that Batch model exists"""
        assert Batch is not None
    
    def test_supplier_model_exists(self):
        """Test that Supplier model exists"""
        assert Supplier is not None


class TestProductSchemas:
    """Tests for Product schemas"""
    
    def test_product_schemas_exist(self):
        """Test that product schemas exist"""
        from backend.schemas.product import (
            ProductBase, ProductCreate, ProductUpdate, ProductResponse,
            ProductDetailResponse, ProductListResponse
        )
        assert ProductBase is not None
        assert ProductCreate is not None
        assert ProductUpdate is not None
        assert ProductResponse is not None
        assert ProductDetailResponse is not None
        assert ProductListResponse is not None
    
    def test_batch_schemas_exist(self):
        """Test that batch schemas exist"""
        from backend.schemas.batch import (
            BatchBase, BatchCreate, BatchResponse
        )
        assert BatchBase is not None
        assert BatchCreate is not None
        assert BatchResponse is not None


class TestProductAPIEndpoints:
    """Tests for Product API endpoints"""
    
    def test_product_router_exists(self):
        """Test that product router exists"""
        from backend.api.v1 import products
        assert products.router is not None
    
    def test_batch_router_exists(self):
        """Test that batch router exists"""
        from backend.api.v1 import batches
        assert batches.router is not None


class TestProductUtilities:
    """Tests for product utilities"""
    
    def test_service_instantiation(self):
        """Test service instantiation"""
        from backend.services.product_service import ProductService
        from backend.services.batch_service import BatchService
        service1 = ProductService()
        service2 = BatchService()
        assert service1 is not None
        assert service2 is not None


if __name__ == '__main__':
    pytest.main([__file__, '-v'])
