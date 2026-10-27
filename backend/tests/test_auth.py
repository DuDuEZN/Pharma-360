"""
Unit Tests for Authentication Module - Pharma 360
Tests for JWT authentication, user management, and RBAC

QA-005: Tests Unitaires Backend
"""

import pytest
from datetime import datetime, timedelta
from jose import jwt
from fastapi.testclient import TestClient
from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession
from sqlalchemy.orm import sessionmaker

from backend.core.config import settings
from backend.core.database import get_db, Base
from backend.models.user import User
from backend.core.security import PasswordUtils, JWTUtils

# Test database setup
TEST_DATABASE_URL = "sqlite+aiosqlite:///:memory:"

engine = create_async_engine(TEST_DATABASE_URL)
TestingSessionLocal = sessionmaker(
    autocommit=False,
    autoflush=False,
    bind=engine,
    class_=AsyncSession,
    expire_on_commit=False
)


# Dependency override for testing
async def override_get_db():
    async with TestingSessionLocal() as session:
        yield session


@pytest.fixture
def client():
    """Create a test client"""
    # Import here to avoid circular dependencies
    from backend.main import app
    app.dependency_overrides[get_db] = override_get_db
    return TestClient(app)


@pytest.fixture(autouse=True)
async def setup_database():
    """Setup test database"""
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
    
    # Create test users with different roles
    async with TestingSessionLocal() as session:
        from backend.models.user import User
        
        # Create users with different roles
        admin_user = User(
            username="admin",
            email="admin@test.com",
            password_hash=PasswordUtils.hash_password("admin123"),
            full_name="Admin User",
            role="admin",
            is_active=True
        )
        seller_user = User(
            username="seller",
            email="seller@test.com",
            password_hash=PasswordUtils.hash_password("seller123"),
            full_name="Seller User",
            role="seller",
            is_active=True
        )
        cashier_user = User(
            username="cashier",
            email="cashier@test.com",
            password_hash=PasswordUtils.hash_password("cashier123"),
            full_name="Cashier User",
            role="cashier",
            is_active=True
        )
        manager_user = User(
            username="manager",
            email="manager@test.com",
            password_hash=PasswordUtils.hash_password("manager123"),
            full_name="Manager User",
            role="manager",
            is_active=True
        )
        
        session.add_all([admin_user, seller_user, cashier_user, manager_user])
        await session.commit()
    
    yield
    
    # Cleanup
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.drop_all)


# Test data - Use shorter passwords to avoid bcrypt 72-byte limit
TEST_USER_DATA = {
    "username": "testuser",
    "email": "test@example.com",
    "password": "test123",
    "full_name": "Test User",
    "phone": "+22912345678",
    "is_active": True
}

TEST_ADMIN_USER = {
    "username": "admin",
    "email": "admin@pharma360.bj",
    "password": "admin123",
    "full_name": "Admin User",
    "phone": "+22998765432",
    "is_active": True,
    "role": "admin"
}


class TestPasswordUtils:
    """Tests for PasswordUtils class"""
    
    def test_hash_password(self):
        """Test password hashing"""
        password = "test123"
        hashed = PasswordUtils.hash_password(password)
        
        assert hashed != password
        assert len(hashed) > 0
    
    def test_verify_password(self):
        """Test password verification"""
        password = "test123"
        hashed = PasswordUtils.hash_password(password)
        
        assert PasswordUtils.verify_password(password, hashed) is True
        assert PasswordUtils.verify_password("wrongpass", hashed) is False


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
    
    def test_expired_token(self):
        """Test expired token handling"""
        data = {"sub": "testuser"}
        # Create token with very short expiration
        token = JWTUtils.create_token(
            subject="testuser",
            data=data,
            token_type="access_token",
            expires_delta=timedelta(seconds=-1)
        )
        
        with pytest.raises(Exception):
            JWTUtils.decode_token(token)


class TestAuthServiceDirect:
    """Tests for AuthService using direct database calls"""
    
    @pytest.mark.asyncio
    async def test_create_user_direct(self):
        """Test user creation directly through service"""
        from backend.services.auth_service import AuthService
        from backend.schemas.user import UserCreate
        
        auth_service = AuthService()
        
        user_data = UserCreate(
            username="testuser_direct",
            email="testdirect@example.com",
            password="test123456",
            full_name="Test User Direct",
            role="seller",
            is_active=True
        )
        
        async with TestingSessionLocal() as session:
            result = await auth_service.create_user(user_data, session)
            
            assert result.username == "testuser_direct"
            assert result.email == "testdirect@example.com"
    
    @pytest.mark.asyncio
    async def test_authenticate_user_direct(self):
        """Test user authentication directly"""
        from backend.services.auth_service import AuthService
        from backend.schemas.user import LoginRequest
        
        auth_service = AuthService()
        
        login_data = LoginRequest(
            username="admin",
            password="admin123"
        )
        
        async with TestingSessionLocal() as session:
            user = await auth_service.authenticate_user(login_data, session)
            
            assert user is not None
            assert user.username == "admin"


class TestPasswordSecurity:
    """Tests for password security"""
    
    def test_password_hashing_strong(self):
        """Test that password hashing is strong"""
        # Hash the same password multiple times
        password = "test123"
        hash1 = PasswordUtils.hash_password(password)
        hash2 = PasswordUtils.hash_password(password)
        
        # Hashes should be different (due to salt)
        assert hash1 != hash2
        
        # Both should verify correctly
        assert PasswordUtils.verify_password(password, hash1)
        assert PasswordUtils.verify_password(password, hash2)


# Run tests
if __name__ == "__main__":
    pytest.main([__file__, "-v"])
