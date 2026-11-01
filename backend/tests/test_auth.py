"""
Unit Tests for Authentication Module - Pharma 360
Tests for JWT authentication, user management, and RBAC

QA-005: Tests Unitaires Backend
"""

import pytest
from datetime import datetime, timedelta
from jose import jwt
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from sqlalchemy import text

from backend.core.config import settings
from backend.core.database import get_db
from backend.models.user import User
from backend.models.base import Base
from backend.core.security import PasswordUtils, JWTUtils, RBACUtils

# Test database setup
TEST_DATABASE_URL = "sqlite:///:memory:"

engine = create_engine(TEST_DATABASE_URL)
TestingSessionLocal = sessionmaker(
    autocommit=False,
    autoflush=False,
    bind=engine,
    expire_on_commit=False
)


# Dependency override for testing
def override_get_db():
    with TestingSessionLocal() as session:
        yield session


@pytest.fixture
def client():
    """Create a test client"""
    from backend.main import app
    app.dependency_overrides[get_db] = override_get_db
    return TestClient(app)


@pytest.fixture(scope="module")
def test_db_session():
    """Create database session for testing"""
    return TestingSessionLocal


@pytest.fixture(scope="module")
def setup_test_database(test_db_session):
    """Setup test database with all tables and test data once per module"""
    # Import all models to ensure they're registered with Base
    from backend.models import __all__
    
    # Create all tables
    Base.metadata.create_all(engine)
    
    # Create test users
    session = test_db_session()
    users = [
        User(
            username="admin",
            email="admin@test.com",
            password_hash=PasswordUtils.hash_password("admin123"),
            full_name="Admin User",
            role="admin",
            is_active=True
        ),
        User(
            username="seller",
            email="seller@test.com",
            password_hash=PasswordUtils.hash_password("seller123"),
            full_name="Seller User",
            role="seller",
            is_active=True
        ),
        User(
            username="cashier",
            email="cashier@test.com",
            password_hash=PasswordUtils.hash_password("cashier123"),
            full_name="Cashier User",
            role="cashier",
            is_active=True
        ),
        User(
            username="manager",
            email="manager@test.com",
            password_hash=PasswordUtils.hash_password("manager123"),
            full_name="Manager User",
            role="manager",
            is_active=True
        )
    ]
    session.add_all(users)
    session.commit()
    yield session
    
    # Cleanup
    session.close()
    Base.metadata.drop_all(engine)


# Test data
TEST_USER_DATA = {
    "username": "testuser",
    "email": "test@example.com",
    "password": "test123",
    "full_name": "Test User",
    "phone": "+22912345678",
    "is_active": True
}


# ============================================================================
# SYNCHRONOUS TESTS - Password and JWT Utilities
# ============================================================================

@pytest.mark.usefixtures("setup_test_database")
class TestPasswordUtils:
    """Tests for PasswordUtils class"""
    
    def test_hash_password(self):
        """Test password hashing produces different output"""
        password = "test123"
        hashed = PasswordUtils.hash_password(password)
        
        assert hashed != password
        assert len(hashed) > 0
        assert isinstance(hashed, str)
    
    def test_verify_password_success(self):
        """Test password verification with correct password"""
        password = "test123"
        hashed = PasswordUtils.hash_password(password)
        
        assert PasswordUtils.verify_password(password, hashed) is True
    
    def test_verify_password_failure(self):
        """Test password verification with wrong password"""
        password = "test123"
        hashed = PasswordUtils.hash_password(password)
        
        assert PasswordUtils.verify_password("wrongpass", hashed) is False
    
    def test_verify_password_empty(self):
        """Test password verification with empty password"""
        password = "test123"
        hashed = PasswordUtils.hash_password(password)
        
        assert PasswordUtils.verify_password("", hashed) is False
    
    def test_hash_different_passwords(self):
        """Test that different passwords produce different hashes"""
        password1 = "test123"
        password2 = "test456"
        
        hash1 = PasswordUtils.hash_password(password1)
        hash2 = PasswordUtils.hash_password(password2)
        
        assert hash1 != hash2
    
    def test_hash_same_password_different_salts(self):
        """Test that same password produces different hashes due to salt"""
        password = "test123"
        hash1 = PasswordUtils.hash_password(password)
        hash2 = PasswordUtils.hash_password(password)
        
        # Both hashes should be different (due to salt)
        assert hash1 != hash2
        
        # Both should verify correctly
        assert PasswordUtils.verify_password(password, hash1) is True
        assert PasswordUtils.verify_password(password, hash2) is True
    
    def test_generate_temp_password(self):
        """Test temporary password generation"""
        temp_pass = PasswordUtils.generate_temp_password(12)
        
        # token_urlsafe generates URL-safe text, length may vary slightly
        assert len(temp_pass) >= 12
        assert isinstance(temp_pass, str)
        
        temp_pass2 = PasswordUtils.generate_temp_password(16)
        assert len(temp_pass2) >= 16


@pytest.mark.usefixtures("setup_test_database")
class TestJWTUtils:
    """Tests for JWTUtils class"""
    
    def test_create_access_token(self):
        """Test JWT token creation"""
        data = {"sub": "testuser", "role": "admin"}
        token = JWTUtils.create_token(
            subject="testuser",
            data=data,
            token_type="access_token"
        )
        
        assert token is not None
        assert len(token) > 0
        assert isinstance(token, str)
    
    def test_decode_token(self):
        """Test JWT token decoding"""
        data = {"sub": "testuser", "role": "admin"}
        token = JWTUtils.create_token(
            subject="testuser",
            data=data,
            token_type="access_token"
        )
        
        decoded = JWTUtils.decode_token(token)
        
        assert decoded["sub"] == "testuser"
        assert decoded["role"] == "admin"
        assert decoded["type"] == "access_token"
        assert "exp" in decoded
        assert "iat" in decoded
    
    def test_decode_token_invalid(self):
        """Test decoding invalid token"""
        with pytest.raises(Exception):
            JWTUtils.decode_token("invalid.token.here")
    
    def test_expired_token(self):
        """Test expired token handling"""
        data = {"sub": "testuser"}
        # Create token with very short expiration (already expired)
        token = JWTUtils.create_token(
            subject="testuser",
            data=data,
            token_type="access_token",
            expires_delta=timedelta(seconds=-1)
        )
        
        with pytest.raises(Exception):
            JWTUtils.decode_token(token)
    
    def test_refresh_token_creation(self):
        """Test refresh token creation with longer expiration"""
        data = {"sub": "testuser"}
        token = JWTUtils.create_token(
            subject="testuser",
            data=data,
            token_type="refresh_token"
        )
        
        assert token is not None
        
        decoded = JWTUtils.decode_token(token)
        assert decoded["type"] == "refresh_token"
    
    def test_verify_token_type(self):
        """Test token type verification"""
        access_token = JWTUtils.create_token(
            subject="testuser",
            token_type="access_token"
        )
        refresh_token = JWTUtils.create_token(
            subject="testuser",
            token_type="refresh_token"
        )
        
        assert JWTUtils.verify_token_type(access_token, "access_token") is True
        assert JWTUtils.verify_token_type(access_token, "refresh_token") is False
        assert JWTUtils.verify_token_type(refresh_token, "refresh_token") is True
        assert JWTUtils.verify_token_type(refresh_token, "access_token") is False


# ============================================================================
# RBAC Tests
# ============================================================================

@pytest.mark.usefixtures("setup_test_database")
class TestRBAC:
    """Tests for RBAC utilities"""
    
    def test_role_hierarchy(self):
        """Test role hierarchy levels"""
        assert RBACUtils.ROLE_HIERARCHY["admin"] == 4
        assert RBACUtils.ROLE_HIERARCHY["manager"] == 3
        assert RBACUtils.ROLE_HIERARCHY["seller"] == 2
        assert RBACUtils.ROLE_HIERARCHY["cashier"] == 1
    
    def test_has_permission_admin(self):
        """Test admin has all permissions"""
        assert RBACUtils.has_permission("admin", "admin") is True
        assert RBACUtils.has_permission("admin", "manager") is True
        assert RBACUtils.has_permission("admin", "seller") is True
        assert RBACUtils.has_permission("admin", "cashier") is True
    
    def test_has_permission_manager(self):
        """Test manager permissions"""
        assert RBACUtils.has_permission("manager", "manager") is True
        assert RBACUtils.has_permission("manager", "seller") is True
        assert RBACUtils.has_permission("manager", "cashier") is True
        assert RBACUtils.has_permission("manager", "admin") is False
    
    def test_has_permission_seller(self):
        """Test seller permissions"""
        assert RBACUtils.has_permission("seller", "seller") is True
        # With current hierarchy: admin(4) > manager(3) > seller(2) > cashier(1)
        # seller (2) can access cashier (1) since 2 >= 1, but NOT manager (3) or admin (4)
        assert RBACUtils.has_permission("seller", "cashier") is True
        assert RBACUtils.has_permission("seller", "manager") is False
        assert RBACUtils.has_permission("seller", "admin") is False
    
    def test_has_permission_cashier(self):
        """Test cashier permissions"""
        assert RBACUtils.has_permission("cashier", "cashier") is True
        assert RBACUtils.has_permission("cashier", "seller") is False
        assert RBACUtils.has_permission("cashier", "manager") is False
        assert RBACUtils.has_permission("cashier", "admin") is False
    
    def test_has_permission_none_required(self):
        """Test that no required role means access granted"""
        assert RBACUtils.has_permission("cashier", None) is True
        assert RBACUtils.has_permission("seller", None) is True
        assert RBACUtils.has_permission("admin", None) is True
    
    def test_can_access_resource_admin(self):
        """Test admin can access all resources"""
        resource_permissions = {
            "admin": ["read", "write", "delete"],
            "manager": ["read", "write"],
            "seller": ["read"],
            "cashier": ["read"]
        }
        
        assert RBACUtils.can_access_resource("admin", resource_permissions) is True
    
    def test_can_access_resource_non_admin(self):
        """Test non-admin resource access"""
        resource_permissions = {
            "admin": ["read", "write", "delete"],
            "manager": ["read", "write"],
            "seller": ["read"],
            "cashier": []
        }
        
        assert RBACUtils.can_access_resource("manager", resource_permissions) is True
        assert RBACUtils.can_access_resource("seller", resource_permissions) is True
        assert RBACUtils.can_access_resource("cashier", resource_permissions) is False


# ============================================================================
# EDGE CASES AND SECURITY TESTS
# ============================================================================

@pytest.mark.usefixtures("setup_test_database")
class TestSecurityEdgeCases:
    """Tests for security edge cases"""
    
    def test_password_hashing_long_password(self):
        """Test password hashing with long password"""
        # Password longer than 72 bytes - sha256_crypt can handle it but truncates at 72
        long_password = "a" * 100
        hashed = PasswordUtils.hash_password(long_password)
        
        # Verify with truncated password (72 chars max for sha256_crypt)
        assert PasswordUtils.verify_password(long_password[:72], hashed) is True
    
    def test_password_hashing_unicode(self):
        """Test password hashing with unicode characters"""
        unicode_password = "tëst123🔒"
        hashed = PasswordUtils.hash_password(unicode_password)
        
        assert PasswordUtils.verify_password(unicode_password, hashed) is True
    
    def test_jwt_token_with_special_characters(self):
        """Test JWT token with special characters in payload"""
        data = {"sub": "user@domain.com", "role": "admin", "special": "test🎉"}
        token = JWTUtils.create_token(
            subject="user@domain.com",
            data=data,
            token_type="access_token"
        )
        
        decoded = JWTUtils.decode_token(token)
        assert decoded["sub"] == "user@domain.com"
        assert decoded["special"] == "test🎉"


# Run tests
if __name__ == "__main__":
    pytest.main([__file__, "-v"])
