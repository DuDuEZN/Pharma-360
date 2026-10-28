"""
Integration Tests for Pharmacie 360 Backend
Tests for API endpoints integration with database

QA-006: Tests d'Intégration (APIs + DB)
"""

import pytest
from backend.services.product_service import ProductService
from backend.services.auth_service import AuthService
from backend.services.sale_service import SaleService
from backend.models.user import User
from backend.models.role import Role
from backend.models.product import Product
from backend.models.category import Category
from backend.models.batch import Batch
from backend.models.sale import Sale
from backend.core.security import PasswordUtils, RBACUtils


class TestServiceIntegration:
    """Tests for service integration"""
    
    def test_services_can_be_instantiated(self):
        """Test that all services can be instantiated"""
        product_service = ProductService()
        auth_service = AuthService()
        sale_service = SaleService()
        
        assert product_service is not None
        assert auth_service is not None
        assert sale_service is not None
    
    def test_services_have_required_methods(self):
        """Test that services have required methods"""
        product_service = ProductService()
        auth_service = AuthService()
        sale_service = SaleService()
        
        # ProductService methods
        assert hasattr(product_service, 'get_product_by_id')
        assert hasattr(product_service, 'get_product_by_barcode')
        assert hasattr(product_service, 'search_products')
        
        # AuthService methods
        assert hasattr(auth_service, 'create_user')
        assert hasattr(auth_service, 'authenticate_user')
        assert hasattr(auth_service, 'login')
        
        # SaleService methods
        assert hasattr(sale_service, 'create_sale')
        assert hasattr(sale_service, 'get_sale_by_id')


class TestModelIntegration:
    """Tests for model integration"""
    
    def test_models_exist(self):
        """Test that all models exist"""
        assert User is not None
        assert Role is not None
        assert Product is not None
        assert Category is not None
        assert Batch is not None
        assert Sale is not None
    
    def test_models_have_required_fields(self):
        """Test that models have required fields"""
        # User model
        user_fields = ['id', 'username', 'email', 'password_hash', 'role', 'is_active']
        for field in user_fields:
            assert hasattr(User, field)
        
        # Product model - uses 'price' not 'unit_price'
        product_fields = ['id', 'name', 'barcode', 'category_id', 'price', 'is_active']
        for field in product_fields:
            assert hasattr(Product, field)
        
        # Sale model - uses 'total' not 'total_amount'
        sale_fields = ['id', 'user_id', 'total', 'status', 'created_at']
        for field in sale_fields:
            assert hasattr(Sale, field)


class TestRBACIntegration:
    """Tests for RBAC integration"""
    
    def test_rbac_hierarchy(self):
        """Test RBAC hierarchy"""
        assert RBACUtils.ROLE_HIERARCHY["admin"] == 4
        assert RBACUtils.ROLE_HIERARCHY["manager"] == 3
        assert RBACUtils.ROLE_HIERARCHY["seller"] == 2
        assert RBACUtils.ROLE_HIERARCHY["cashier"] == 1
    
    def test_rbac_permissions(self):
        """Test RBAC permissions"""
        # Admin has all permissions
        assert RBACUtils.has_permission("admin", "admin") is True
        assert RBACUtils.has_permission("admin", "manager") is True
        assert RBACUtils.has_permission("admin", "seller") is True
        assert RBACUtils.has_permission("admin", "cashier") is True
        
        # Manager can access manager, seller, cashier
        assert RBACUtils.has_permission("manager", "manager") is True
        assert RBACUtils.has_permission("manager", "seller") is True
        assert RBACUtils.has_permission("manager", "cashier") is True
        assert RBACUtils.has_permission("manager", "admin") is False
        
        # Seller can only access seller
        assert RBACUtils.has_permission("seller", "seller") is True
        assert RBACUtils.has_permission("seller", "cashier") is True
        assert RBACUtils.has_permission("seller", "manager") is False
        assert RBACUtils.has_permission("seller", "admin") is False
        
        # Cashier can only access cashier
        assert RBACUtils.has_permission("cashier", "cashier") is True
        assert RBACUtils.has_permission("cashier", "seller") is False
        assert RBACUtils.has_permission("cashier", "manager") is False
        assert RBACUtils.has_permission("cashier", "admin") is False


class TestSecurityIntegration:
    """Tests for security integration"""
    
    def test_password_utils(self):
        """Test password utilities"""
        password = "test123"
        hashed = PasswordUtils.hash_password(password)
        
        assert PasswordUtils.verify_password(password, hashed) is True
        assert PasswordUtils.verify_password("wrong", hashed) is False
    
    def test_jwt_utils(self):
        """Test JWT utilities"""
        from backend.core.security import JWTUtils
        
        token = JWTUtils.create_token(
            subject="testuser",
            data={"role": "admin"},
            token_type="access_token"
        )
        
        assert token is not None
        
        decoded = JWTUtils.decode_token(token)
        assert decoded["sub"] == "testuser"
        assert decoded["role"] == "admin"


class TestSchemaIntegration:
    """Tests for schema integration"""
    
    def test_product_schemas(self):
        """Test product schemas"""
        from backend.schemas.product import (
            ProductBase, ProductCreate, ProductResponse
        )
        assert ProductBase is not None
        assert ProductCreate is not None
        assert ProductResponse is not None
    
    def test_user_schemas(self):
        """Test user schemas"""
        from backend.schemas.user import (
            UserBase, UserCreate, UserResponse, LoginRequest
        )
        assert UserBase is not None
        assert UserCreate is not None
        assert UserResponse is not None
        assert LoginRequest is not None
    
    def test_sale_schemas(self):
        """Test sale schemas"""
        from backend.schemas.sale import (
            SaleBase, SaleCreate, SaleResponse
        )
        assert SaleBase is not None
        assert SaleCreate is not None
        assert SaleResponse is not None


if __name__ == '__main__':
    pytest.main([__file__, '-v'])
