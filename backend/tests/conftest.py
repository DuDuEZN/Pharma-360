"""
Pytest configuration and shared fixtures for backend tests
"""

import pytest
from fastapi.testclient import TestClient
from unittest.mock import Mock


@pytest.fixture
def client():
    """Create a test client for FastAPI"""
    from backend.main import app
    return TestClient(app)


@pytest.fixture
def mock_current_user():
    """Create a mock current user for authentication"""
    user = Mock()
    user.id = 1
    user.username = "testuser"
    user.role = "admin"
    user.is_active = True
    return user
