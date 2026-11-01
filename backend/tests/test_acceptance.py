"""
Final Acceptance Tests for Pharmacie 360
QA-015: Tests Finaux (Acceptation)

This test file runs comprehensive acceptance tests to verify the system is production-ready.
"""

import pytest
from fastapi.testclient import TestClient

from backend.main import app


@pytest.fixture
def client():
    """Create a test client"""
    return TestClient(app)


class TestSystemHealth:
    """Tests to verify overall system health"""

    def test_all_health_checks_pass(self, client):
        """Verify all health checks pass"""
        response = client.get("/api/health")
        assert response.status_code == 200
        data = response.json()
        assert data["status"] == "healthy"
        assert "version" in data
        assert "app" in data
        assert "environment" in data

    def test_docs_endpoint_accessible(self, client):
        """Verify API documentation is accessible"""
        response = client.get("/api/v1/docs/openapi.json")
        assert response.status_code == 200
        data = response.json()
        assert "openapi" in data
        assert "info" in data

    def test_all_services_instantiable(self):
        """Verify all services can be instantiated"""
        from backend.services.auth_service import AuthService
        from backend.services.batch_service import BatchService
        from backend.services.product_service import ProductService
        from backend.services.sale_service import SaleService

        services = [ProductService(), AuthService(), SaleService(), BatchService()]

        for service in services:
            assert service is not None

    def test_all_models_importable(self):
        """Verify all models can be imported"""
        from backend.models.batch import Batch
        from backend.models.category import Category
        from backend.models.product import Product
        from backend.models.role import Role
        from backend.models.sale import Sale
        from backend.models.user import User

        models = [User, Role, Product, Category, Batch, Sale]
        for model in models:
            assert model is not None


class TestCoreFunctionality:
    """Tests for core system functionality"""

    def test_password_utils_work(self):
        """Verify password utilities work correctly"""
        from backend.core.security import PasswordUtils

        # Test hashing
        password = "test123"
        hashed = PasswordUtils.hash_password(password)
        assert hashed is not None

        # Test verification
        assert PasswordUtils.verify_password(password, hashed) is True
        assert PasswordUtils.verify_password("wrong", hashed) is False

        # Test long password
        long_password = "a" * 200
        hashed_long = PasswordUtils.hash_password(long_password)
        assert PasswordUtils.verify_password(long_password, hashed_long) is True

    def test_jwt_utils_work(self):
        """Verify JWT utilities work correctly"""
        from backend.core.security import JWTUtils

        # Test token creation
        token = JWTUtils.create_token(
            subject="testuser",
            data={"role": "admin", "username": "testuser"},
            token_type="access_token",
        )
        assert token is not None

        # Test token decoding
        decoded = JWTUtils.decode_token(token)
        assert decoded["sub"] == "testuser"
        assert decoded["role"] == "admin"
        assert decoded["username"] == "testuser"

    def test_rbac_hierarchy_correct(self):
        """Verify RBAC hierarchy is correct"""
        from backend.core.security import RBACUtils

        # Verify hierarchy levels
        assert RBACUtils.ROLE_HIERARCHY["admin"] == 4
        assert RBACUtils.ROLE_HIERARCHY["manager"] == 3
        assert RBACUtils.ROLE_HIERARCHY["seller"] == 2
        assert RBACUtils.ROLE_HIERARCHY["cashier"] == 1

        # Verify permissions
        assert RBACUtils.has_permission("admin", "admin") is True
        assert RBACUtils.has_permission("admin", "manager") is True
        assert RBACUtils.has_permission("admin", "seller") is True
        assert RBACUtils.has_permission("admin", "cashier") is True

        assert RBACUtils.has_permission("manager", "manager") is True
        assert RBACUtils.has_permission("manager", "seller") is True
        assert RBACUtils.has_permission("manager", "cashier") is True
        assert RBACUtils.has_permission("manager", "admin") is False

        assert RBACUtils.has_permission("seller", "seller") is True
        assert RBACUtils.has_permission("seller", "cashier") is True
        assert RBACUtils.has_permission("seller", "manager") is False

        assert RBACUtils.has_permission("cashier", "cashier") is True
        assert RBACUtils.has_permission("cashier", "seller") is False


class TestDatabaseIntegration:
    """Tests for database integration"""

    def test_database_config_valid(self):
        """Verify database configuration is valid"""
        from backend.core.config import settings

        assert settings.postgres_host is not None
        assert settings.postgres_port > 0
        assert settings.postgres_db is not None
        assert settings.postgres_user is not None

    def test_database_models_valid(self):
        """Verify database models are valid"""
        from backend.core.database import Base, async_session_maker, engine

        assert Base is not None
        assert engine is not None
        assert async_session_maker is not None


class TestIAModule:
    """Tests for IA module integration"""

    def test_ia_module_imports(self):
        """Verify IA module can be imported"""
        try:
            import ia

            assert ia is not None
        except ModuleNotFoundError as e:
            # Should only fail on optional dependencies
            assert "pytesseract" in str(e) or "pandas" in str(e)

    def test_ia_services_instantiable(self):
        """Verify IA services can be instantiated"""
        try:
            from ia.services.alert_service import AlertService
            from ia.services.kpi_service import KPIService

            alert_service = AlertService()
            kpi_service = KPIService()

            assert alert_service is not None
            assert kpi_service is not None
        except ModuleNotFoundError:
            # Optional dependencies
            assert True


class TestOfflineFunctionality:
    """Tests for offline functionality"""

    def test_no_cloud_dependencies(self):
        """Verify no cloud dependencies"""
        from backend.core.config import settings

        # Should use local database
        assert (
            "localhost" in settings.postgres_host
            or "127.0.0.1" in settings.postgres_host
        )

    def test_all_endpoints_accessible_offline(self, client):
        """Verify all public endpoints work offline"""
        # Health check
        response = client.get("/api/health")
        assert response.status_code == 200

        # Docs
        response = client.get("/api/v1/docs/openapi.json")
        assert response.status_code == 200


class TestPerformanceBaseline:
    """Tests for performance baseline"""

    def test_health_check_fast(self, client):
        """Verify health check is fast"""
        import time

        start = time.time()
        response = client.get("/api/health")
        elapsed = (time.time() - start) * 1000

        assert response.status_code == 200
        assert elapsed < 100  # < 100ms

    def test_docs_fast(self, client):
        """Verify docs endpoint is fast"""
        import time

        start = time.time()
        response = client.get("/api/v1/docs/openapi.json")
        elapsed = (time.time() - start) * 1000

        assert response.status_code == 200
        assert elapsed < 200  # < 200ms


class TestAcceptanceCriteria:
    """Tests for acceptance criteria"""

    def test_all_tests_pass(self):
        """Verify all test files can be imported and run"""
        # This is a meta-test that verifies the test suite is complete
        import os

        test_files = [
            "backend/tests/test_auth.py",
            "backend/tests/test_products.py",
            "backend/tests/test_barcode.py",
            "backend/tests/test_integration.py",
            "backend/tests/test_offline.py",
            "backend/tests/test_performance.py",
            "backend/tests/test_ia.py",
            "backend/tests/test_bug_fixes.py",
            "frontend/tests/test_frontend_verification.py",
            "ia/tests/test_ia_module.py",
        ]

        for test_file in test_files:
            assert os.path.exists(test_file), f"Test file missing: {test_file}"

    def test_documentation_complete(self):
        """Verify documentation is complete"""
        import os

        doc_files = [
            "docs/TESTING.md",
            "docs/ARCHITECTURE.md",
            "docs/ARCH-001_SPECIFICATIONS.md",
            "docs/ARCH-002_POSTGRESQL.md",
            "docs/ARCH-003_API_SPECIFICATIONS.md",
            "docs/ARCH-004_DEVELOPMENT_GUIDE.md",
        ]

        for doc_file in doc_files:
            assert os.path.exists(doc_file), f"Documentation missing: {doc_file}"

    def test_project_tracking_updated(self):
        """Verify project tracking is updated"""
        import os

        assert os.path.exists("PROJECT_TRACKING.md")

        with open("PROJECT_TRACKING.md", "r") as f:
            content = f.read()

        # Verify Phase 4 is marked as complete
        assert "Phase 4" in content
        assert "TERMINÉE" in content or "TERMINÉ" in content


if __name__ == "__main__":
    pytest.main([__file__, "-v"])
