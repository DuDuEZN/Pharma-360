"""
Tests unitaires pour le module Users
QA-005: Tests Unitaires Backend
"""

import pytest
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from fastapi import Depends

from backend.main import app
from backend.core.database import Base, get_db
from backend.models.user import User
from backend.schemas.user import UserCreate, UserUpdate

# Setup test database
SQLALCHEMY_DATABASE_URL = "sqlite:///./test.db"

engine = create_engine(SQLALCHEMY_DATABASE_URL, connect_args={"check_same_thread": False})
TestingSessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

# Create tables
Base.metadata.create_all(bind=engine)


@pytest.fixture
def client():
    """Create a fresh TestClient for each test"""
    with TestClient(app) as test_client:
        yield test_client


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
        "role": "user"
    }
    
    # Create user in database
    user = User(**user_data)
    test_db.add(user)
    test_db.commit()
    test_db.refresh(user)
    
    return user


class TestUsers:
    """Tests for Users API endpoints"""
    
    def test_get_all_users(self, client):
        """Test getting all users"""
        response = client.get("/api/v1/users")
        assert response.status_code == 200
        assert isinstance(response.json(), list)
    
    def test_get_user_by_id(self, client):
        """Test getting a specific user by ID"""
        response = client.get("/api/v1/users/1")
        assert response.status_code in [200, 404]
        if response.status_code == 200:
            assert "id" in response.json()
            assert "username" in response.json()
    
    def test_create_user(self, client):
        """Test creating a new user"""
        user_data = {
            "username": "newuser",
            "email": "new@example.com",
            "password": "newpassword",
            "full_name": "New User",
            "role": "user"
        }
        response = client.post("/api/v1/users", json=user_data)
        assert response.status_code == 201
        assert "id" in response.json()
        assert response.json()["username"] == user_data["username"]
    
    def test_update_user(self, client):
        """Test updating a user"""
        update_data = {
            "username": "updateduser",
            "email": "updated@example.com"
        }
        response = client.put("/api/v1/users/1", json=update_data)
        assert response.status_code in [200, 404]
        if response.status_code == 200:
            assert response.json()["username"] == update_data["username"]
    
    def test_delete_user(self, client):
        """Test deleting a user"""
        response = client.delete("/api/v1/users/1")
        assert response.status_code in [200, 404]
    
    def test_get_users_by_role(self, client):
        """Test filtering users by role"""
        response = client.get("/api/v1/users?role=admin")
        assert response.status_code == 200
        assert isinstance(response.json(), list)
    
    def test_get_users_paginated(self, client):
        """Test paginated users list"""
        response = client.get("/api/v1/users?skip=0&limit=10")
        assert response.status_code == 200
        assert isinstance(response.json(), list)


class TestUserModel:
    """Tests for User model"""
    
    def test_user_creation(self, test_db):
        """Test user model creation"""
        user_data = {
            "username": "modeluser",
            "email": "model@example.com",
            "password": "modelpassword",
            "full_name": "Model User",
            "role": "user"
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
    
    def test_user_unique_username(self, test_db):
        """Test that usernames are unique"""
        user1 = User(username="unique", email="user1@test.com", password="pass", role="user")
        test_db.add(user1)
        test_db.commit()
        
        user2 = User(username="unique", email="user2@test.com", password="pass", role="user")
        test_db.add(user2)
        
        with pytest.raises(Exception):
            test_db.commit()
    
    def test_user_unique_email(self, test_db):
        """Test that emails are unique"""
        user1 = User(username="user1", email="unique@test.com", password="pass", role="user")
        test_db.add(user1)
        test_db.commit()
        
        user2 = User(username="user2", email="unique@test.com", password="pass", role="user")
        test_db.add(user2)
        
        with pytest.raises(Exception):
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
            "role": "user"
        }
        user = UserCreate(**data)
        assert user.username == data["username"]
        assert user.email == data["email"]
    
    def test_user_update_schema(self):
        """Test UserUpdate schema"""
        data = {
            "username": "updateduser",
            "email": "updated@example.com",
            "full_name": "Updated User"
        }
        user = UserUpdate(**data)
        assert user.username == data["username"]
        assert user.email == data["email"]
