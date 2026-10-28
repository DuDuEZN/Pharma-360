"""
Unit Tests for Products Module - Pharma 360
Tests for product CRUD operations, barcode management, and stock tracking

QA-005: Tests Unitaires Backend
"""

import pytest
from fastapi.testclient import TestClient
from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession
from sqlalchemy.orm import sessionmaker
from sqlalchemy import text

from backend.core.database import get_db, Base
from backend.models.product import Product
from backend.models.category import Category
from backend.models.batch import Batch
from backend.models.supplier import Supplier
from backend.models.user import User
from backend.core.security import PasswordUtils

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


@pytest.fixture(scope="session", autouse=True)
async def setup_test_database():
    """Setup test database with all tables and test data once per session"""
    # Create all tables
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
    
    # Create test users
    async with TestingSessionLocal() as session:
        # Create admin user
        admin_user = User(
            username="admin",
            email="admin@test.com",
            password_hash=PasswordUtils.hash_password("admin123"),
            full_name="Admin User",
            role="admin",
            is_active=True
        )
        session.add(admin_user)
        await session.commit()
        
        # Create categories
        category1 = Category(name="Médicaments", description="Médicaments divers")
        category2 = Category(name="Antipaludéens", description="Traitement du paludisme")
        
        session.add_all([category1, category2])
        await session.commit()
        
        # Create suppliers
        supplier1 = Supplier(
            name="Fournisseur A",
            contact="Contact A",
            email="a@fournisseur.com",
            phone="+22912345678",
            address="Adresse A"
        )
        supplier2 = Supplier(
            name="Fournisseur B",
            contact="Contact B",
            email="b@fournisseur.com",
            phone="+22987654321",
            address="Adresse B"
        )
        
        session.add_all([supplier1, supplier2])
        await session.commit()
    
    yield
    
    # Cleanup
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.drop_all)


@pytest.fixture
def client():
    """Create a test client with database override"""
    from backend.main import app
    app.dependency_overrides[get_db] = override_get_db
    return TestClient(app)


# Test data
TEST_PRODUCT_DATA = {
    "name": "Paracétamol 500mg",
    "code": "PAR500",
    "barcode": "123456789012",
    "category_id": 1,
    "supplier_id": 1,
    "description": "Comprimés de paracétamol 500mg",
    "unit_price": 500.0,
    "cost_price": 300.0,
    "min_stock": 10,
    "max_stock": 100,
    "is_active": True
}

TEST_ADMIN_USER = {
    "username": "admin",
    "email": "admin@pharma360.bj",
    "password": "admin123",
    "full_name": "Admin User",
    "phone": "+22998765432",
    "is_active": True
}


def get_auth_token(client):
    """Helper to get authentication token"""
    login_response = client.post(
        "/api/v1/auth/login",
        json={
            "username": "admin",
            "password": "admin123"
        }
    )
    assert login_response.status_code == 200
    return login_response.json()["access_token"]


class TestProductCRUD:
    """Tests for Product CRUD operations"""
    
    def test_create_product(self, client):
        """Test creating a new product"""
        token = get_auth_token(client)
        
        response = client.post(
            "/api/v1/products/",
            json=TEST_PRODUCT_DATA,
            headers={"Authorization": f"Bearer {token}"}
        )
        
        assert response.status_code == 201
        assert "id" in response.json()
        assert response.json()["name"] == TEST_PRODUCT_DATA["name"]
        assert response.json()["code"] == TEST_PRODUCT_DATA["code"]
        assert response.json()["barcode"] == TEST_PRODUCT_DATA["barcode"]
    
    def test_create_product_duplicate_code(self, client):
        """Test creating product with duplicate code"""
        token = get_auth_token(client)
        
        # Create first product
        client.post(
            "/api/v1/products/",
            json=TEST_PRODUCT_DATA,
            headers={"Authorization": f"Bearer {token}"}
        )
        
        # Try to create second product with same code
        response = client.post(
            "/api/v1/products/",
            json=TEST_PRODUCT_DATA,
            headers={"Authorization": f"Bearer {token}"}
        )
        
        assert response.status_code == 400
    
    def test_get_products(self, client):
        """Test getting list of products"""
        token = get_auth_token(client)
        
        # Create a product
        client.post(
            "/api/v1/products/",
            json=TEST_PRODUCT_DATA,
            headers={"Authorization": f"Bearer {token}"}
        )
        
        response = client.get(
            "/api/v1/products/",
            headers={"Authorization": f"Bearer {token}"}
        )
        
        assert response.status_code == 200
        assert len(response.json()["products"]) >= 1
    
    def test_get_product_by_id(self, client):
        """Test getting a product by ID"""
        token = get_auth_token(client)
        
        # Create a product
        create_response = client.post(
            "/api/v1/products/",
            json=TEST_PRODUCT_DATA,
            headers={"Authorization": f"Bearer {token}"}
        )
        product_id = create_response.json()["id"]
        
        response = client.get(
            f"/api/v1/products/{product_id}",
            headers={"Authorization": f"Bearer {token}"}
        )
        
        assert response.status_code == 200
        assert response.json()["id"] == product_id
        assert response.json()["name"] == TEST_PRODUCT_DATA["name"]
    
    def test_get_product_by_barcode(self, client):
        """Test getting a product by barcode"""
        token = get_auth_token(client)
        
        # Create a product
        client.post(
            "/api/v1/products/",
            json=TEST_PRODUCT_DATA,
            headers={"Authorization": f"Bearer {token}"}
        )
        
        response = client.get(
            f"/api/v1/products/barcode/{TEST_PRODUCT_DATA['barcode']}",
            headers={"Authorization": f"Bearer {token}"}
        )
        
        assert response.status_code == 200
        assert response.json()["barcode"] == TEST_PRODUCT_DATA["barcode"]
    
    def test_update_product(self, client):
        """Test updating a product"""
        token = get_auth_token(client)
        
        # Create a product
        create_response = client.post(
            "/api/v1/products/",
            json=TEST_PRODUCT_DATA,
            headers={"Authorization": f"Bearer {token}"}
        )
        product_id = create_response.json()["id"]
        
        # Update the product
        updated_data = TEST_PRODUCT_DATA.copy()
        updated_data["name"] = "Paracétamol 500mg Updated"
        updated_data["unit_price"] = 600.0
        
        response = client.put(
            f"/api/v1/products/{product_id}",
            json=updated_data,
            headers={"Authorization": f"Bearer {token}"}
        )
        
        assert response.status_code == 200
        assert response.json()["name"] == "Paracétamol 500mg Updated"
        assert response.json()["unit_price"] == 600.0
    
    def test_delete_product(self, client):
        """Test deleting a product"""
        token = get_auth_token(client)
        
        # Create a product
        create_response = client.post(
            "/api/v1/products/",
            json=TEST_PRODUCT_DATA,
            headers={"Authorization": f"Bearer {token}"}
        )
        product_id = create_response.json()["id"]
        
        response = client.delete(
            f"/api/v1/products/{product_id}",
            headers={"Authorization": f"Bearer {token}"}
        )
        
        assert response.status_code == 204
        
        # Verify deletion
        get_response = client.get(
            f"/api/v1/products/{product_id}",
            headers={"Authorization": f"Bearer {token}"}
        )
        assert get_response.status_code == 404


class TestProductSearch:
    """Tests for Product search functionality"""
    
    def test_search_products_by_name(self, client):
        """Test searching products by name"""
        token = get_auth_token(client)
        
        # Create a product
        client.post(
            "/api/v1/products/",
            json=TEST_PRODUCT_DATA,
            headers={"Authorization": f"Bearer {token}"}
        )
        
        response = client.get(
            "/api/v1/products/search?q=Paracétamol",
            headers={"Authorization": f"Bearer {token}"}
        )
        
        assert response.status_code == 200
        assert len(response.json()["products"]) >= 1
    
    def test_search_products_by_category(self, client):
        """Test searching products by category"""
        token = get_auth_token(client)
        
        # Create a product
        client.post(
            "/api/v1/products/",
            json=TEST_PRODUCT_DATA,
            headers={"Authorization": f"Bearer {token}"}
        )
        
        response = client.get(
            "/api/v1/products/search?category=Médicaments",
            headers={"Authorization": f"Bearer {token}"}
        )
        
        assert response.status_code == 200
        assert len(response.json()["products"]) >= 1
    
    def test_search_products_by_barcode(self, client):
        """Test searching products by barcode"""
        token = get_auth_token(client)
        
        # Create a product
        client.post(
            "/api/v1/products/",
            json=TEST_PRODUCT_DATA,
            headers={"Authorization": f"Bearer {token}"}
        )
        
        response = client.get(
            f"/api/v1/products/search?barcode={TEST_PRODUCT_DATA['barcode']}",
            headers={"Authorization": f"Bearer {token}"}
        )
        
        assert response.status_code == 200
        assert len(response.json()["products"]) >= 1


class TestProductCategories:
    """Tests for Product Categories"""
    
    def test_get_categories(self, client):
        """Test getting all categories"""
        token = get_auth_token(client)
        
        response = client.get(
            "/api/v1/categories/",
            headers={"Authorization": f"Bearer {token}"}
        )
        
        assert response.status_code == 200
        assert len(response.json()["categories"]) >= 2
    
    def test_create_category(self, client):
        """Test creating a new category"""
        token = get_auth_token(client)
        
        new_category = {
            "name": "Nouvelle Catégorie",
            "description": "Description de la nouvelle catégorie"
        }
        
        response = client.post(
            "/api/v1/categories/",
            json=new_category,
            headers={"Authorization": f"Bearer {token}"}
        )
        
        assert response.status_code == 201
        assert response.json()["name"] == new_category["name"]


class TestProductBatches:
    """Tests for Product Batches"""
    
    def test_create_batch(self, client):
        """Test creating a new batch"""
        token = get_auth_token(client)
        
        # Create a product first
        create_response = client.post(
            "/api/v1/products/",
            json=TEST_PRODUCT_DATA,
            headers={"Authorization": f"Bearer {token}"}
        )
        product_id = create_response.json()["id"]
        
        batch_data = {
            "product_id": product_id,
            "batch_number": "BATCH001",
            "quantity": 100,
            "expiry_date": "2025-12-31",
            "cost_price": 300.0,
            "supplier_id": 1
        }
        
        response = client.post(
            "/api/v1/batches/",
            json=batch_data,
            headers={"Authorization": f"Bearer {token}"}
        )
        
        assert response.status_code == 201
        assert response.json()["batch_number"] == batch_data["batch_number"]
    
    def test_get_batches_by_product(self, client):
        """Test getting batches by product ID"""
        token = get_auth_token(client)
        
        # Create a product
        create_response = client.post(
            "/api/v1/products/",
            json=TEST_PRODUCT_DATA,
            headers={"Authorization": f"Bearer {token}"}
        )
        product_id = create_response.json()["id"]
        
        # Create a batch
        batch_data = {
            "product_id": product_id,
            "batch_number": "BATCH002",
            "quantity": 50,
            "expiry_date": "2025-11-30",
            "cost_price": 350.0,
            "supplier_id": 1
        }
        client.post(
            "/api/v1/batches/",
            json=batch_data,
            headers={"Authorization": f"Bearer {token}"}
        )
        
        response = client.get(
            f"/api/v1/products/{product_id}/batches",
            headers={"Authorization": f"Bearer {token}"}
        )
        
        assert response.status_code == 200
        assert len(response.json()["batches"]) >= 1


class TestBarcodeOperations:
    """Tests for Barcode operations"""
    
    def test_barcode_unique(self, client):
        """Test barcode uniqueness"""
        token = get_auth_token(client)
        
        # Create first product
        client.post(
            "/api/v1/products/",
            json=TEST_PRODUCT_DATA,
            headers={"Authorization": f"Bearer {token}"}
        )
        
        # Try to create second product with same barcode
        product_data_2 = TEST_PRODUCT_DATA.copy()
        product_data_2["code"] = "PAR501"
        
        response = client.post(
            "/api/v1/products/",
            json=product_data_2,
            headers={"Authorization": f"Bearer {token}"}
        )
        
        assert response.status_code == 400
    
    def test_scan_barcode(self, client):
        """Test scanning a barcode"""
        token = get_auth_token(client)
        
        # Create a product
        client.post(
            "/api/v1/products/",
            json=TEST_PRODUCT_DATA,
            headers={"Authorization": f"Bearer {token}"}
        )
        
        response = client.get(
            f"/api/v1/products/scan/{TEST_PRODUCT_DATA['barcode']}",
            headers={"Authorization": f"Bearer {token}"}
        )
        
        assert response.status_code == 200
        assert response.json()["barcode"] == TEST_PRODUCT_DATA["barcode"]


# Run tests
if __name__ == "__main__":
    pytest.main([__file__, "-v"])
