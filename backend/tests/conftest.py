"""
Pytest configuration and shared fixtures for backend tests
"""

import os
from unittest.mock import Mock

import pytest
from fastapi.testclient import TestClient

# Set APP_ENV to test to use SQLite database
os.environ["APP_ENV"] = "test"

from backend.core.database import engine, Base
from backend.models.base import Base as BaseModel


# Create tables before any tests run
import asyncio

async def create_test_tables():
    """Create all database tables for testing"""
    async with engine.begin() as conn:
        await conn.run_sync(BaseModel.metadata.create_all)


# Run table creation synchronously
asyncio.run(create_test_tables())


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
