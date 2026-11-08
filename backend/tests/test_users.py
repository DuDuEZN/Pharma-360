"""
Tests unitaires pour le module Users
QA-005: Tests Unitaires Backend
"""

from unittest.mock import Mock

import pytest
from fastapi import Depends
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker

from backend.core.database import Base, get_db
from backend.core.security import get_current_user, get_current_user_with_role
from backend.main import app
from backend.models.user import User
from backend.schemas.user import UserCreate, UserUpdate

# Setup test database
SQLALCHEMY_DATABASE_URL = "sqlite:///./test.db"

engine = create_engine(
    SQLALCHEMY_DATABASE_URL, connect_args={"check_same_thread": False}
)
TestingSessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

# Create tables
Base.metadata.create_all(bind=engine)


@pytest.fixture
def client():
    """Create a fresh TestClient for each test"""
    with TestClient(app) as test_client:
        yield test_client


@pytest.fixture
def client_with_auth():
    """Create a test client with mocked authentication for admin role"""
    mock_user = Mock()
    mock_user.id = 1
    mock_user.username = "testuser"
    mock_user.role = "admin"
    mock_user.is_active = True

    def mock_get_current_user_with_role(required_role=None):
        async def dependency():
            return mock_user

        return dependency

    app.dependency_overrides[get_current_user] = lambda: mock_user
    app.dependency_overrides[get_current_user_with_role] = (
        mock_get_current_user_with_role
    )
    with TestClient(app) as test_client:
        yield test_client
    app.dependency_overrides.clear()


@pytest.fixture
def test_db():
    """Create a test database session"""
    db = TestingSessionLocal()
    try:
        yield db
    finally:
        db.close()


@pytest.fixture
def test_user(test_db):
    """Create a test user"""
    user_data = {
        "username": "testuser",
        "email": "test@example.com",
        "password": "testpassword",
        "full_name": "Test User",
        "role": "user",
    }

    # Create user in database
    user = User(**user_data)
    test_db.add(user)
    test_db.commit()
    test_db.refresh(user)

    return user


class TestUsers:
    """Tests for Users API endpoints"""

    def test_get_all_users(self, client_with_auth):
        """Test getting all users"""
        response = client_with_auth.get("/api/v1/users")
        assert response.status_code == 200
        data = response.json()
        assert "users" in data
        assert isinstance(data["users"], list)

    def test_get_user_by_id(self, client_with_auth):
        """Test getting a specific user by ID"""
        response = client_with_auth.get("/api/v1/users/1")
        assert response.status_code in [200, 404]
        if response.status_code == 200:
            assert "id" in response.json()
            assert "username" in response.json()

    def test_create_user(self, client_with_auth):
        """Test creating a new user"""
        import uuid

        user_data = {
            "username": f"newuser{uuid.uuid4().hex[:8]}",
            "email": f"new{uuid.uuid4().hex[:8]}@example.com",
            "password": "newpassword",
            "full_name": "New User",
            "role": "user",
        }
        response = client_with_auth.post("/api/v1/users", json=user_data)
        assert response.status_code in [200, 201]
        assert "id" in response.json()
        assert response.json()["username"] == user_data["username"]

    def test_update_user(self, client_with_auth):
        """Test updating a user"""
        update_data = {"username": "updateduser", "email": "updated@example.com"}
        response = client_with_auth.put("/api/v1/users/1", json=update_data)
        assert response.status_code in [200, 404]
        if response.status_code == 200:
            assert response.json()["username"] == update_data["username"]

    def test_delete_user(self, client_with_auth):
        """Test deleting a user"""
        response = client_with_auth.delete("/api/v1/users/1")
        assert response.status_code in [200, 400, 404]

    def test_get_users_by_role(self, client_with_auth):
        """Test filtering users by role"""
        response = client_with_auth.get("/api/v1/users?role=admin")
        assert response.status_code == 200
        data = response.json()
        assert "users" in data
        assert isinstance(data["users"], list)

    def test_get_users_paginated(self, client_with_auth):
        """Test paginated users list"""
        response = client_with_auth.get("/api/v1/users?page=1&page_size=10")
        assert response.status_code == 200
        data = response.json()
        assert "users" in data
        assert isinstance(data["users"], list)


class TestUserModel:
    """Tests for User model"""

    def test_user_creation(self, test_db):
        """Test user model creation"""
        import uuid

        user_data = {
            "username": f"modeluser{uuid.uuid4().hex[:8]}",
            "email": f"model{uuid.uuid4().hex[:8]}@example.com",
            "password": "modelpassword",
            "full_name": "Model User",
            "role": "user",
        }
        user = User(**user_data)
        test_db.add(user)
        test_db.commit()
        test_db.refresh(user)

        assert user.id is not None
        assert user.username == user_data["username"]
        assert user.email == user_data["email"]
        assert user.full_name == user_data["full_name"]
        assert user.role == user_data["role"]

        # Cleanup
        test_db.delete(user)
        test_db.commit()

    def test_user_unique_username(self, test_db):
        """Test that usernames are unique"""
        import uuid

        unique_username = f"unique{uuid.uuid4().hex[:8]}"
        user1 = User(
            username=unique_username,
            email=f"user1{uuid.uuid4().hex[:8]}@test.com",
            password="pass",
            role="user",
        )
        test_db.add(user1)
        test_db.commit()

        user2 = User(
            username=unique_username,
            email=f"user2{uuid.uuid4().hex[:8]}@test.com",
            password="pass",
            role="user",
        )
        test_db.add(user2)

        with pytest.raises(Exception):
            test_db.commit()

        # Cleanup
        test_db.rollback()
        test_db.delete(user1)
        test_db.commit()

    def test_user_unique_email(self, test_db):
        """Test that emails are unique"""
        import uuid

        unique_email = f"unique{uuid.uuid4().hex[:8]}@test.com"
        user1 = User(
            username=f"user1{uuid.uuid4().hex[:8]}",
            email=unique_email,
            password="pass",
            role="user",
        )
        test_db.add(user1)
        test_db.commit()

        user2 = User(
            username=f"user2{uuid.uuid4().hex[:8]}",
            email=unique_email,
            password="pass",
            role="user",
        )
        test_db.add(user2)

        with pytest.raises(Exception):
            test_db.commit()

        # Cleanup
        test_db.rollback()
        test_db.delete(user1)
        test_db.commit()


class TestUserSchema:
    """Tests for User schema"""

    def test_user_create_schema(self):
        """Test UserCreate schema"""
        data = {
            "username": "testuser",
            "email": "test@example.com",
            "password": "testpassword",
            "full_name": "Test User",
            "role": "user",
        }
        user = UserCreate(**data)
        assert user.username == data["username"]
        assert user.email == data["email"]

    def test_user_update_schema(self):
        """Test UserUpdate schema"""
        data = {
            "username": "updateduser",
            "email": "updated@example.com",
            "full_name": "Updated User",
        }
        user = UserUpdate(**data)
        assert user.username == data["username"]
        assert user.email == data["email"]
