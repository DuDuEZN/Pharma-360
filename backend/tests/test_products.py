"""
Unit Tests for Products Module - Pharma 360
Tests for product CRUD operations, barcode management, and stock tracking

QA-005: Tests Unitaires Backend
"""

import pytest
from fastapi.testclient import TestClient
from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession
from sqlalchemy.orm import sessionmaker

from backend.core.database import get_db, Base
from backend.models.product import Product
from backend.models.category import Category
from backend.models.batch import Batch
from backend.models.supplier import Supplier
# from backend.main import app
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
    
    # Create test data
    async with TestingSessionLocal() as session:
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
    
    app.dependency_overrides.clear()


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


class TestProductCRUD:
    """Tests for Product CRUD operations"""
    
    @pytest.mark.asyncio
    async def test_create_product(self, client):
        """Test creating a new product"""
        # Login as admin
        client.post("/api/v1/auth/register", json=TEST_ADMIN_USER)
        login_response = client.post(
            "/api/v1/auth/login",
            data={
                "username": TEST_ADMIN_USER["username"],
                "password": TEST_ADMIN_USER["password"]
            }
        )
        token = login_response.json()["access_token"]
        
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
    
    @pytest.mark.asyncio
    async def test_create_product_duplicate_code(self, client):
        """Test creating product with duplicate code"""
        # Login as admin
        client.post("/api/v1/auth/register", json=TEST_ADMIN_USER)
        login_response = client.post(
            "/api/v1/auth/login",
            data={
                "username": TEST_ADMIN_USER["username"],
                "password": TEST_ADMIN_USER["password"]
            }
        )
        token = login_response.json()["access_token"]
        
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
    
    @pytest.mark.asyncio
    async def test_get_products(self, client):
        """Test getting list of products"""
        # Login as admin
        client.post("/api/v1/auth/register", json=TEST_ADMIN_USER)
        login_response = client.post(
            "/api/v1/auth/login",
            data={
                "username": TEST_ADMIN_USER["username"],
                "password": TEST_ADMIN_USER["password"]
            }
        )
        token = login_response.json()["access_token"]
        
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
        assert isinstance(response.json(), list)
        assert len(response.json()) >= 1
    
    @pytest.mark.asyncio
    async def test_get_product_by_id(self, client):
        """Test getting a specific product by ID"""
        # Login as admin
        client.post("/api/v1/auth/register", json=TEST_ADMIN_USER)
        login_response = client.post(
            "/api/v1/auth/login",
            data={
                "username": TEST_ADMIN_USER["username"],
                "password": TEST_ADMIN_USER["password"]
            }
        )
        token = login_response.json()["access_token"]
        
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
    
    @pytest.mark.asyncio
    async def test_get_product_by_barcode(self, client):
        """Test getting a product by barcode"""
        # Login as admin
        client.post("/api/v1/auth/register", json=TEST_ADMIN_USER)
        login_response = client.post(
            "/api/v1/auth/login",
            data={
                "username": TEST_ADMIN_USER["username"],
                "password": TEST_ADMIN_USER["password"]
            }
        )
        token = login_response.json()["access_token"]
        
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
    
    @pytest.mark.asyncio
    async def test_update_product(self, client):
        """Test updating a product"""
        # Login as admin
        client.post("/api/v1/auth/register", json=TEST_ADMIN_USER)
        login_response = client.post(
            "/api/v1/auth/login",
            data={
                "username": TEST_ADMIN_USER["username"],
                "password": TEST_ADMIN_USER["password"]
            }
        )
        token = login_response.json()["access_token"]
        
        # Create a product
        create_response = client.post(
            "/api/v1/products/",
            json=TEST_PRODUCT_DATA,
            headers={"Authorization": f"Bearer {token}"}
        )
        product_id = create_response.json()["id"]
        
        # Update product
        update_data = {
            "name": "Paracétamol 500mg - Mise à jour",
            "unit_price": 550.0
        }
        
        response = client.put(
            f"/api/v1/products/{product_id}",
            json=update_data,
            headers={"Authorization": f"Bearer {token}"}
        )
        
        assert response.status_code == 200
        assert response.json()["name"] == "Paracétamol 500mg - Mise à jour"
        assert response.json()["unit_price"] == 550.0
    
    @pytest.mark.asyncio
    async def test_delete_product(self, client):
        """Test deleting a product"""
        # Login as admin
        client.post("/api/v1/auth/register", json=TEST_ADMIN_USER)
        login_response = client.post(
            "/api/v1/auth/login",
            data={
                "username": TEST_ADMIN_USER["username"],
                "password": TEST_ADMIN_USER["password"]
            }
        )
        token = login_response.json()["access_token"]
        
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
        
        assert response.status_code == 200
        assert response.json()["message"] == "Product deleted successfully"


class TestProductSearch:
    """Tests for product search functionality"""
    
    @pytest.mark.asyncio
    async def test_search_products_by_name(self, client):
        """Test searching products by name"""
        # Login as admin
        client.post("/api/v1/auth/register", json=TEST_ADMIN_USER)
        login_response = client.post(
            "/api/v1/auth/login",
            data={
                "username": TEST_ADMIN_USER["username"],
                "password": TEST_ADMIN_USER["password"]
            }
        )
        token = login_response.json()["access_token"]
        
        # Create a product
        client.post(
            "/api/v1/products/",
            json=TEST_PRODUCT_DATA,
            headers={"Authorization": f"Bearer {token}"}
        )
        
        response = client.get(
            "/api/v1/products/search",
            params={"q": "Paracétamol"},
            headers={"Authorization": f"Bearer {token}"}
        )
        
        assert response.status_code == 200
        assert len(response.json()) >= 1
        assert response.json()[0]["name"].lower() in "paracétamol 500mg"
    
    @pytest.mark.asyncio
    async def test_search_products_by_category(self, client):
        """Test searching products by category"""
        # Login as admin
        client.post("/api/v1/auth/register", json=TEST_ADMIN_USER)
        login_response = client.post(
            "/api/v1/auth/login",
            data={
                "username": TEST_ADMIN_USER["username"],
                "password": TEST_ADMIN_USER["password"]
            }
        )
        token = login_response.json()["access_token"]
        
        # Create a product
        client.post(
            "/api/v1/products/",
            json=TEST_PRODUCT_DATA,
            headers={"Authorization": f"Bearer {token}"}
        )
        
        response = client.get(
            "/api/v1/products/search",
            params={"category_id": 1},
            headers={"Authorization": f"Bearer {token}"}
        )
        
        assert response.status_code == 200
        assert len(response.json()) >= 1
    
    @pytest.mark.asyncio
    async def test_search_products_by_barcode(self, client):
        """Test searching products by barcode"""
        # Login as admin
        client.post("/api/v1/auth/register", json=TEST_ADMIN_USER)
        login_response = client.post(
            "/api/v1/auth/login",
            data={
                "username": TEST_ADMIN_USER["username"],
                "password": TEST_ADMIN_USER["password"]
            }
        )
        token = login_response.json()["access_token"]
        
        # Create a product
        client.post(
            "/api/v1/products/",
            json=TEST_PRODUCT_DATA,
            headers={"Authorization": f"Bearer {token}"}
        )
        
        response = client.get(
            "/api/v1/products/search",
            params={"barcode": TEST_PRODUCT_DATA["barcode"]},
            headers={"Authorization": f"Bearer {token}"}
        )
        
        assert response.status_code == 200
        assert len(response.json()) >= 1
        assert response.json()[0]["barcode"] == TEST_PRODUCT_DATA["barcode"]


class TestProductCategories:
    """Tests for product category management"""
    
    @pytest.mark.asyncio
    async def test_get_categories(self, client):
        """Test getting list of categories"""
        response = client.get("/api/v1/categories/")
        
        assert response.status_code == 200
        assert isinstance(response.json(), list)
        assert len(response.json()) >= 2  # We created 2 in setup
    
    @pytest.mark.asyncio
    async def test_create_category(self, client):
        """Test creating a new category"""
        # Login as admin
        client.post("/api/v1/auth/register", json=TEST_ADMIN_USER)
        login_response = client.post(
            "/api/v1/auth/login",
            data={
                "username": TEST_ADMIN_USER["username"],
                "password": TEST_ADMIN_USER["password"]
            }
        )
        token = login_response.json()["access_token"]
        
        new_category = {
            "name": "Vitamines",
            "description": "Compléments vitaminiques"
        }
        
        response = client.post(
            "/api/v1/categories/",
            json=new_category,
            headers={"Authorization": f"Bearer {token}"}
        )
        
        assert response.status_code == 201
        assert response.json()["name"] == "Vitamines"


class TestProductBatches:
    """Tests for product batch management"""
    
    @pytest.mark.asyncio
    async def test_create_batch(self, client):
        """Test creating a new batch"""
        # Login as admin
        client.post("/api/v1/auth/register", json=TEST_ADMIN_USER)
        login_response = client.post(
            "/api/v1/auth/login",
            data={
                "username": TEST_ADMIN_USER["username"],
                "password": TEST_ADMIN_USER["password"]
            }
        )
        token = login_response.json()["access_token"]
        
        # Create a product first
        create_response = client.post(
            "/api/v1/products/",
            json=TEST_PRODUCT_DATA,
            headers={"Authorization": f"Bearer {token}"}
        )
        product_id = create_response.json()["id"]
        
        # Create a batch
        batch_data = {
            "product_id": product_id,
            "batch_number": "BATCH001",
            "quantity": 100,
            "purchase_price": 300.0,
            "expiry_date": "2025-12-31",
            "manufacturing_date": "2025-01-01",
            "supplier_id": 1,
            "location": "A1-B2"
        }
        
        response = client.post(
            "/api/v1/batches/",
            json=batch_data,
            headers={"Authorization": f"Bearer {token}"}
        )
        
        assert response.status_code == 201
        assert response.json()["batch_number"] == "BATCH001"
        assert response.json()["product_id"] == product_id
    
    @pytest.mark.asyncio
    async def test_get_batches_by_product(self, client):
        """Test getting batches for a product"""
        # Login as admin
        client.post("/api/v1/auth/register", json=TEST_ADMIN_USER)
        login_response = client.post(
            "/api/v1/auth/login",
            data={
                "username": TEST_ADMIN_USER["username"],
                "password": TEST_ADMIN_USER["password"]
            }
        )
        token = login_response.json()["access_token"]
        
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
            "batch_number": "BATCH001",
            "quantity": 100,
            "purchase_price": 300.0,
            "expiry_date": "2025-12-31",
            "manufacturing_date": "2025-01-01",
            "supplier_id": 1,
            "location": "A1-B2"
        }
        client.post(
            "/api/v1/batches/",
            json=batch_data,
            headers={"Authorization": f"Bearer {token}"}
        )
        
        response = client.get(
            f"/api/v1/batches/product/{product_id}",
            headers={"Authorization": f"Bearer {token}"}
        )
        
        assert response.status_code == 200
        assert isinstance(response.json(), list)
        assert len(response.json()) >= 1


class TestBarcodeOperations:
    """Tests for barcode-related operations"""
    
    @pytest.mark.asyncio
    async def test_barcode_unique(self, client):
        """Test that barcodes are unique"""
        # Login as admin
        client.post("/api/v1/auth/register", json=TEST_ADMIN_USER)
        login_response = client.post(
            "/api/v1/auth/login",
            data={
                "username": TEST_ADMIN_USER["username"],
                "password": TEST_ADMIN_USER["password"]
            }
        )
        token = login_response.json()["access_token"]
        
        # Create first product
        client.post(
            "/api/v1/products/",
            json=TEST_PRODUCT_DATA,
            headers={"Authorization": f"Bearer {token}"}
        )
        
        # Try to create second product with same barcode
        duplicate_data = {**TEST_PRODUCT_DATA, "code": "DIFFCODE"}
        response = client.post(
            "/api/v1/products/",
            json=duplicate_data,
            headers={"Authorization": f"Bearer {token}"}
        )
        
        assert response.status_code == 400
    
    @pytest.mark.asyncio
    async def test_scan_barcode(self, client):
        """Test scanning a barcode"""
        # Login as admin
        client.post("/api/v1/auth/register", json=TEST_ADMIN_USER)
        login_response = client.post(
            "/api/v1/auth/login",
            data={
                "username": TEST_ADMIN_USER["username"],
                "password": TEST_ADMIN_USER["password"]
            }
        )
        token = login_response.json()["access_token"]
        
        # Create a product
        client.post(
            "/api/v1/products/",
            json=TEST_PRODUCT_DATA,
            headers={"Authorization": f"Bearer {token}"}
        )
        
        response = client.post(
            "/api/v1/barcode/scan",
            json={"barcode": TEST_PRODUCT_DATA["barcode"]},
            headers={"Authorization": f"Bearer {token}"}
        )
        
        assert response.status_code == 200
        assert "product" in response.json()


# Run tests
if __name__ == "__main__":
    pytest.main([__file__, "-v"])
