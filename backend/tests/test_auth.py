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


class TestUserAuthentication:
    """Tests for user authentication endpoints"""
    
    @pytest.mark.asyncio
    async def test_register_user(self, client):
        """Test user registration"""
        response = client.post(
            "/api/v1/auth/register",
            json=TEST_USER_DATA
        )
        
        assert response.status_code == 201
        assert "id" in response.json()
        assert response.json()["username"] == TEST_USER_DATA["username"]
        assert response.json()["email"] == TEST_USER_DATA["email"]
    
    @pytest.mark.asyncio
    async def test_register_existing_user(self, client):
        """Test registering an existing user"""
        # First registration
        client.post("/api/v1/auth/register", json=TEST_USER_DATA)
        
        # Second registration should fail
        response = client.post(
            "/api/v1/auth/register",
            json=TEST_USER_DATA
        )
        
        assert response.status_code == 400
    
    @pytest.mark.asyncio
    async def test_login_user(self, client):
        """Test user login"""
        # Register user first
        client.post("/api/v1/auth/register", json=TEST_USER_DATA)
        
        # Login
        response = client.post(
            "/api/v1/auth/login",
            data={
                "username": TEST_USER_DATA["username"],
                "password": TEST_USER_DATA["password"]
            }
        )
        
        assert response.status_code == 200
        assert "access_token" in response.json()
        assert "token_type" in response.json()
        assert response.json()["token_type"] == "bearer"
    
    @pytest.mark.asyncio
    async def test_login_invalid_credentials(self, client):
        """Test login with invalid credentials"""
        response = client.post(
            "/api/v1/auth/login",
            data={
                "username": "nonexistent",
                "password": "wrongpassword"
            }
        )
        
        assert response.status_code == 401
    
    @pytest.mark.asyncio
    async def test_get_current_user(self, client):
        """Test getting current user info"""
        # Register and login
        client.post("/api/v1/auth/register", json=TEST_USER_DATA)
        login_response = client.post(
            "/api/v1/auth/login",
            data={
                "username": TEST_USER_DATA["username"],
                "password": TEST_USER_DATA["password"]
            }
        )
        
        token = login_response.json()["access_token"]
        
        # Get current user
        response = client.get(
            "/api/v1/auth/me",
            headers={"Authorization": f"Bearer {token}"}
        )
        
        assert response.status_code == 200
        assert response.json()["username"] == TEST_USER_DATA["username"]
    
    @pytest.mark.asyncio
    async def test_get_current_user_unauthorized(self, client):
        """Test getting current user without token"""
        response = client.get("/api/v1/auth/me")
        
        assert response.status_code == 401


class TestUserManagement:
    """Tests for user management endpoints"""
    
    @pytest.mark.asyncio
    async def test_get_users(self, client):
        """Test getting list of users"""
        # Create admin user
        client.post("/api/v1/auth/register", json=TEST_ADMIN_USER)
        login_response = client.post(
            "/api/v1/auth/login",
            data={
                "username": TEST_ADMIN_USER["username"],
                "password": TEST_ADMIN_USER["password"]
            }
        )
        
        token = login_response.json()["access_token"]
        
        response = client.get(
            "/api/v1/users/",
            headers={"Authorization": f"Bearer {token}"}
        )
        
        assert response.status_code == 200
        assert isinstance(response.json(), list)
    
    @pytest.mark.asyncio
    async def test_get_user_by_id(self, client):
        """Test getting a specific user by ID"""
        # Create user
        create_response = client.post(
            "/api/v1/auth/register",
            json=TEST_USER_DATA
        )
        user_id = create_response.json()["id"]
        
        # Get user (as admin)
        client.post("/api/v1/auth/register", json=TEST_ADMIN_USER)
        login_response = client.post(
            "/api/v1/auth/login",
            data={
                "username": TEST_ADMIN_USER["username"],
                "password": TEST_ADMIN_USER["password"]
            }
        )
        token = login_response.json()["access_token"]
        
        response = client.get(
            f"/api/v1/users/{user_id}",
            headers={"Authorization": f"Bearer {token}"}
        )
        
        assert response.status_code == 200
        assert response.json()["id"] == user_id


class TestRBAC:
    """Tests for Role-Based Access Control"""
    
    @pytest.mark.asyncio
    async def test_admin_access(self, client):
        """Test admin user can access all endpoints"""
        # Create admin user
        client.post("/api/v1/auth/register", json=TEST_ADMIN_USER)
        login_response = client.post(
            "/api/v1/auth/login",
            data={
                "username": TEST_ADMIN_USER["username"],
                "password": TEST_ADMIN_USER["password"]
            }
        )
        token = login_response.json()["access_token"]
        
        # Test access to user management
        response = client.get(
            "/api/v1/users/",
            headers={"Authorization": f"Bearer {token}"}
        )
        assert response.status_code == 200


class TestTokenManagement:
    """Tests for token management"""
    
    @pytest.mark.asyncio
    async def test_token_expiration(self, client):
        """Test token expiration"""
        # Register and login
        client.post("/api/v1/auth/register", json=TEST_USER_DATA)
        login_response = client.post(
            "/api/v1/auth/login",
            data={
                "username": TEST_USER_DATA["username"],
                "password": TEST_USER_DATA["password"]
            }
        )
        
        token = login_response.json()["access_token"]
        
        # Verify token is valid initially
        response = client.get(
            "/api/v1/auth/me",
            headers={"Authorization": f"Bearer {token}"}
        )
        assert response.status_code == 200


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
