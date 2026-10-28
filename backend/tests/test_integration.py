"""
Integration Tests for Pharmacie 360 Backend
Tests for API endpoints integration with database

QA-006: Tests d'Intégration (APIs + DB)
"""

import pytest
from fastapi.testclient import TestClient
from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession
from sqlalchemy.orm import sessionmaker

from backend.core.config import settings
from backend.core.database import get_db, Base
from backend.models.user import User
from backend.models.role import Role
from backend.models.product import Product
from backend.models.category import Category
from backend.models.batch import Batch
from backend.models.sale import Sale
from backend.main import app

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


app.dependency_overrides[get_db] = override_get_db


@pytest.fixture
def client():
    """Create a test client"""
    return TestClient(app)


@pytest.fixture(autouse=True)
async def setup_database():
    """Setup test database"""
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
    
    # Create test roles
    async with TestingSessionLocal() as session:
        admin_role = Role(name="admin", description="Administrator")
        seller_role = Role(name="seller", description="Seller")
        cashier_role = Role(name="cashier", description="Cashier")
        manager_role = Role(name="manager", description="Manager")
        
        session.add_all([admin_role, seller_role, cashier_role, manager_role])
        await session.commit()
    
    yield
    
    # Cleanup
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.drop_all)


# Test data fixtures
@pytest.fixture
def test_user_data():
    """Test user data"""
    return {
        "username": "testuser",
        "email": "test@example.com",
        "password": "testpass123",
        "role": "seller"
    }


@pytest.fixture
def test_product_data():
    """Test product data"""
    return {
        "name": "Paracétamol 500mg",
        "dci": "Paracétamol",
        "barcode": "123456789012",
        "category_id": 1,
        "price": 500.0,
        "cost_price": 300.0,
        "stock_min": 10,
        "stock_max": 100,
        "unit": "boîte",
        "is_active": True
    }


class TestAuthIntegration:
    """Integration tests for authentication"""
    
    @pytest.mark.asyncio
    async def test_user_registration_and_login(self, client, test_user_data):
        """Test user registration and login flow"""
        # Register user
        response = client.post("/api/v1/auth/register", json={
            **test_user_data,
            "password": test_user_data["password"]
        })
        
        assert response.status_code == 201
        assert response.json()["username"] == test_user_data["username"]
        
        # Login
        login_response = client.post("/api/v1/auth/login", data={
            "username": test_user_data["username"],
            "password": test_user_data["password"]
        })
        
        assert login_response.status_code == 200
        assert "access_token" in login_response.json()
        assert "token_type" in login_response.json()


class TestProductsIntegration:
    """Integration tests for products API"""
    
    @pytest.mark.asyncio
    async def test_product_crud(self, client, test_product_data):
        """Test product CRUD operations"""
        # Create category first
        category_response = client.post("/api/v1/categories", json={
            "name": "Médicaments",
            "description": "Médicaments divers"
        })
        
        category_id = category_response.json()["id"]
        test_product_data["category_id"] = category_id
        
        # Create product
        create_response = client.post(
            "/api/v1/products",
            json=test_product_data,
            headers={"Authorization": "Bearer admin-token"}
        )
        
        assert create_response.status_code == 201
        product_id = create_response.json()["id"]
        
        # Get product
        get_response = client.get(f"/api/v1/products/{product_id}")
        assert get_response.status_code == 200
        assert get_response.json()["name"] == test_product_data["name"]
        
        # Update product
        update_response = client.put(
            f"/api/v1/products/{product_id}",
            json={"name": "Paracétamol 500mg - Updated"}
        )
        assert update_response.status_code == 200
        assert update_response.json()["name"] == "Paracétamol 500mg - Updated"
        
        # List products
        list_response = client.get("/api/v1/products")
        assert list_response.status_code == 200
        assert len(list_response.json()["items"]) > 0


class TestBatchesIntegration:
    """Integration tests for batches API with FEFO"""
    
    @pytest.mark.asyncio
    async def test_batch_creation_and_fefo_selection(self, client):
        """Test batch creation and FEFO selection"""
        # Create product
        category_response = client.post("/api/v1/categories", json={
            "name": "Test Category",
            "description": "Test"
        })
        category_id = category_response.json()["id"]
        
        product_response = client.post("/api/v1/products", json={
            "name": "Test Product",
            "dci": "TEST",
            "barcode": "TEST001",
            "category_id": category_id,
            "price": 100.0,
            "cost_price": 50.0,
            "stock_min": 5,
            "stock_max": 100,
            "unit": "unit",
            "is_active": True
        })
        product_id = product_response.json()["id"]
        
        # Create batches with different expiry dates
        from datetime import date, timedelta
        
        batch1_date = (date.today() + timedelta(days=30)).isoformat()
        batch2_date = (date.today() + timedelta(days=60)).isoformat()
        batch3_date = (date.today() + timedelta(days=15)).isoformat()
        
        client.post(f"/api/v1/batches", json={
            "product_id": product_id,
            "batch_number": "BATCH001",
            "quantity": 100,
            "expiry_date": batch1_date,
            "received_date": date.today().isoformat(),
            "supplier_id": 1,
            "location": "A1"
        })
        
        client.post(f"/api/v1/batches", json={
            "product_id": product_id,
            "batch_number": "BATCH002",
            "quantity": 100,
            "expiry_date": batch2_date,
            "received_date": date.today().isoformat(),
            "supplier_id": 1,
            "location": "A2"
        })
        
        client.post(f"/api/v1/batches", json={
            "product_id": product_id,
            "batch_number": "BATCH003",
            "quantity": 100,
            "expiry_date": batch3_date,
            "received_date": date.today().isoformat(),
            "supplier_id": 1,
            "location": "A3"
        })
        
        # Test FEFO selection
        fefo_response = client.get(f"/api/v1/batches/fefo/{product_id}")
        assert fefo_response.status_code == 200
        
        # The batch with the earliest expiry date should be selected (BATCH003 - 15 days)
        fefo_batch = fefo_response.json()
        assert fefo_batch["batch_number"] == "BATCH003"


class TestSalesIntegration:
    """Integration tests for sales API"""
    
    @pytest.mark.asyncio
    async def test_sale_creation_with_fefo(self, client):
        """Test sale creation with automatic FEFO batch selection"""
        # Setup: Create product and batches
        category_response = client.post("/api/v1/categories", json={
            "name": "Test Category",
            "description": "Test"
        })
        category_id = category_response.json()["id"]
        
        product_response = client.post("/api/v1/products", json={
            "name": "Test Product",
            "dci": "TEST",
            "barcode": "TEST002",
            "category_id": category_id,
            "price": 100.0,
            "cost_price": 50.0,
            "stock_min": 5,
            "stock_max": 100,
            "unit": "unit",
            "is_active": True
        })
        product_id = product_response.json()["id"]
        
        from datetime import date, timedelta
        expiry_date = (date.today() + timedelta(days=30)).isoformat()
        
        batch_response = client.post(f"/api/v1/batches", json={
            "product_id": product_id,
            "batch_number": "TESTBATCH001",
            "quantity": 100,
            "expiry_date": expiry_date,
            "received_date": date.today().isoformat(),
            "supplier_id": 1,
            "location": "A1"
        })
        
        # Create sale
        sale_response = client.post("/api/v1/sales", json={
            "items": [
                {"product_id": product_id, "quantity": 2}
            ]
        })
        
        assert sale_response.status_code == 201
        sale_data = sale_response.json()
        assert "id" in sale_data
        assert len(sale_data["items"]) == 1


class TestReturnsIntegration:
    """Integration tests for returns API"""
    
    @pytest.mark.asyncio
    async def test_return_creation(self, client):
        """Test product return creation"""
        # Setup: Create product and batch
        category_response = client.post("/api/v1/categories", json={
            "name": "Test Category",
            "description": "Test"
        })
        category_id = category_response.json()["id"]
        
        product_response = client.post("/api/v1/products", json={
            "name": "Test Product",
            "dci": "TEST",
            "barcode": "TEST003",
            "category_id": category_id,
            "price": 100.0,
            "cost_price": 50.0,
            "stock_min": 5,
            "stock_max": 100,
            "unit": "unit",
            "is_active": True
        })
        product_id = product_response.json()["id"]
        
        from datetime import date
        
        batch_response = client.post(f"/api/v1/batches", json={
            "product_id": product_id,
            "batch_number": "TESTBATCH002",
            "quantity": 100,
            "expiry_date": date.today().isoformat(),
            "received_date": date.today().isoformat(),
            "supplier_id": 1,
            "location": "A1"
        })
        batch_id = batch_response.json()["id"]
        
        # Create return
        return_response = client.post("/api/v1/returns", json={
            "batch_id": batch_id,
            "quantity": 5,
            "reason": "damaged",
            "notes": "Test return"
        })
        
        assert return_response.status_code == 201
        return_data = return_response.json()
        assert "id" in return_data
        assert return_data["reason"] == "damaged"


class TestReportsIntegration:
    """Integration tests for reports API"""
    
    @pytest.mark.asyncio
    async def test_sales_report(self, client):
        """Test sales report generation"""
        from datetime import date, timedelta
        
        start_date = (date.today() - timedelta(days=30)).isoformat()
        end_date = date.today().isoformat()
        
        report_response = client.post("/api/v1/reports/sales", json={
            "start_date": start_date,
            "end_date": end_date
        })
        
        assert report_response.status_code == 200
        report_data = report_response.json()
        assert "total_sales" in report_data
        assert "total_revenue" in report_data


class TestWebSocketIntegration:
    """Integration tests for WebSocket functionality"""
    
    def test_websocket_connection(self, client):
        """Test WebSocket connection"""
        # This would need a running server to test properly
        # For now, just test the endpoint exists
        with client.websocket_connect("/api/ws") as websocket:
            pass  # Connection successful
