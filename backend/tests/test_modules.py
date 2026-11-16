"""Tests du registre de modules et des modules migrés (monolithe modulaire)."""

import importlib

from backend.modules import MODULES, enabled_modules, get_module
from backend.modules import catalog as catalog_module
from backend.modules import customers as customers_module
from backend.modules import inventory as inventory_module
from backend.modules import sales as sales_module
from backend.modules.catalog import router as catalog_router
from backend.modules.customers import router as customers_router
from backend.modules.inventory import router as inventory_router
from backend.modules.sales import router as sales_router


def test_catalog_module_is_registered():
    spec = get_module("catalog")
    assert spec is not None
    assert spec.license_feature == "catalog"
    assert spec.router is catalog_router


def test_sales_module_is_registered():
    spec = get_module("sales")
    assert spec is not None
    assert spec.license_feature == "sales"
    assert spec.router is sales_router


def test_sales_declares_catalog_dependency():
    assert "catalog" in get_module("sales").depends_on


def test_customers_module_is_registered():
    spec = get_module("customers")
    assert spec is not None
    assert spec.license_feature == "customers"
    assert spec.router is customers_router


def test_customers_declares_sales_dependency():
    assert "sales" in get_module("customers").depends_on


def test_enabled_modules_expose_catalog_sales_customers_and_inventory():
    names = [module.name for module in enabled_modules()]
    assert "catalog" in names
    assert "sales" in names
    assert "customers" in names
    assert "inventory" in names


def test_modules_are_registered_once():
    names = [module.name for module in MODULES]
    assert names.count("catalog") == 1
    assert names.count("sales") == 1
    assert names.count("customers") == 1
    assert names.count("inventory") == 1


def test_catalog_router_exposes_domain_endpoints():
    paths = {route.path for route in catalog_router.routes}
    assert "/products/" in paths
    assert "/products/search" in paths
    assert "/products/categories" in paths
    assert "/products/categories/stats" in paths
    assert "/products/low-stock" in paths
    assert "/products/expiring-soon" in paths
    assert "/products/{product_id}" in paths
    assert "/products/scan" in paths


def test_sales_router_exposes_domain_endpoints():
    paths = {route.path for route in sales_router.routes}
    assert "/sales/" in paths
    assert "/sales/today" in paths
    assert "/sales/pending" in paths
    assert "/sales/queue" in paths
    assert "/sales/{sale_id}" in paths
    assert "/sales/{sale_id}/pay" in paths
    assert "/sales/{sale_id}/cancel" in paths


def test_customers_router_exposes_domain_endpoints():
    paths = {route.path for route in customers_router.routes}
    assert "/customers/" in paths
    assert "/customers/{customer_id}" in paths
    assert "/customers/{customer_id}/orders" in paths
    assert "/customers/{customer_id}/invoices" in paths
    assert "/customers/{customer_id}/purchases" in paths
    assert "/customers/{customer_id}/stats" in paths
    assert "/customers/{customer_id}/credit" in paths


def test_inventory_module_is_registered():
    spec = get_module("inventory")
    assert spec is not None
    assert spec.license_feature == "inventory"
    assert spec.router is inventory_router


def test_inventory_declares_catalog_dependency():
    assert "catalog" in get_module("inventory").depends_on


def test_inventory_router_exposes_domain_endpoints():
    paths = {route.path for route in inventory_router.routes}
    assert "/inventory/" in paths
    assert "/inventory/product/{product_id}" in paths
    assert "/inventory/low-stock" in paths
    assert "/inventory/expiring-soon" in paths
    assert "/inventory/by-category/{category_id}" in paths
    assert "/inventory/summary" in paths
    assert "/inventory/location/{location}" in paths
    assert "/inventory/adjust" in paths
    assert "/inventory/remove-expired" in paths
    assert "/inventory/import" in paths


def test_legacy_sales_shims_resolve_to_module():
    from backend.api.v1 import sales as legacy_router

    legacy_schemas = importlib.import_module("backend.schemas.sale")
    legacy_service = importlib.import_module("backend.services.sale_service")
    legacy_service_pkg = importlib.import_module("backend.services")

    assert legacy_router.router is sales_router
    assert legacy_service.SaleService is sales_module.SaleService
    assert legacy_service.sale_service is sales_module.sale_service
    assert legacy_service_pkg.sale_service is sales_module.sale_service
    assert legacy_schemas.SaleCreate is sales_module.schemas.SaleCreate
    assert legacy_schemas.QueueItem is sales_module.schemas.QueueItem


def test_legacy_catalog_shims_resolve_to_module():
    from backend.api.v1 import products as legacy_router

    legacy_schemas = importlib.import_module("backend.schemas.product")
    legacy_service = importlib.import_module("backend.services.product_service")
    legacy_service_pkg = importlib.import_module("backend.services")

    assert legacy_router.router is catalog_router
    assert legacy_service.ProductService is catalog_module.ProductService
    assert legacy_service.product_service is catalog_module.product_service
    assert legacy_service_pkg.product_service is catalog_module.product_service
    assert legacy_schemas.ProductCreate is catalog_module.schemas.ProductCreate
    assert (
        legacy_schemas.BarcodeScanRequest is catalog_module.schemas.BarcodeScanRequest
    )


def test_legacy_customers_shims_resolve_to_module():
    from backend.api.v1 import customers as legacy_router

    legacy_schemas = importlib.import_module("backend.schemas.customer")
    legacy_service = importlib.import_module("backend.services.customer_service")
    legacy_service_pkg = importlib.import_module("backend.services")

    assert legacy_router.router is customers_router
    assert legacy_service.CustomerService is customers_module.CustomerService
    assert legacy_service.customer_service is customers_module.customer_service
    assert (
        legacy_service_pkg.customer_service is customers_module.customer_service
    )
    assert (
        legacy_schemas.CustomerCreate is customers_module.schemas.CustomerCreate
    )
    assert (
        legacy_schemas.CustomerStatsResponse
        is customers_module.schemas.CustomerStatsResponse
    )


def test_legacy_inventory_shims_resolve_to_module():
    from backend.api.v1 import inventory as legacy_router

    legacy_schemas = importlib.import_module("backend.schemas.inventory")
    legacy_service = importlib.import_module("backend.services.inventory_service")
    legacy_service_pkg = importlib.import_module("backend.services")

    assert legacy_router.router is inventory_router
    assert legacy_service.InventoryService is inventory_module.InventoryService
    assert legacy_service.inventory_service is inventory_module.inventory_service
    assert (
        legacy_service_pkg.inventory_service is inventory_module.inventory_service
    )
    assert (
        legacy_schemas.InventoryItemResponse
        is inventory_module.schemas.InventoryItemResponse
    )
    assert (
        legacy_schemas.MovementCreate
        is inventory_module.schemas.MovementCreate
    )


def test_catalog_module_can_be_disabled_by_flag(monkeypatch):
    import backend.modules.registry as registry

    monkeypatch.setenv("MODULE_CATALOG_ENABLED", "false")
    importlib.reload(registry)
    names = [module.name for module in registry.enabled_modules()]
    assert "catalog" not in names
    # Ventes et Clients dépendent (directement/indirectement) du Catalogue ;
    # Stock dépend aussi du Catalogue.
    assert "sales" not in names
    assert "customers" not in names
    assert "inventory" not in names

    monkeypatch.delenv("MODULE_CATALOG_ENABLED", raising=False)
    importlib.reload(registry)
    names = [module.name for module in registry.enabled_modules()]
    assert "catalog" in names
    assert "sales" in names
    assert "customers" in names
    assert "inventory" in names


def test_sales_module_can_be_disabled_by_flag(monkeypatch):
    import backend.modules.registry as registry

    monkeypatch.setenv("MODULE_SALES_ENABLED", "false")
    importlib.reload(registry)
    names = [module.name for module in registry.enabled_modules()]
    assert "sales" not in names
    # Clients dépend de Ventes.
    assert "customers" not in names

    monkeypatch.delenv("MODULE_SALES_ENABLED", raising=False)
    importlib.reload(registry)
    names = [module.name for module in registry.enabled_modules()]
    assert "sales" in names
    assert "customers" in names



def test_customers_module_can_be_disabled_by_flag(monkeypatch):
    import backend.modules.registry as registry

    monkeypatch.setenv("MODULE_CUSTOMERS_ENABLED", "false")
    importlib.reload(registry)
    assert "customers" not in [module.name for module in registry.enabled_modules()]

    monkeypatch.delenv("MODULE_CUSTOMERS_ENABLED", raising=False)
    importlib.reload(registry)
    assert "customers" in [module.name for module in registry.enabled_modules()]


def test_inventory_module_can_be_disabled_by_flag(monkeypatch):
    import backend.modules.registry as registry

    monkeypatch.setenv("MODULE_INVENTORY_ENABLED", "false")
    importlib.reload(registry)
    assert "inventory" not in [module.name for module in registry.enabled_modules()]

    monkeypatch.delenv("MODULE_INVENTORY_ENABLED", raising=False)
    importlib.reload(registry)
    assert "inventory" in [module.name for module in registry.enabled_modules()]
