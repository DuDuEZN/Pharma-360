"""Tests du registre de modules et du module Ventes (monolithe modulaire)."""

from backend.modules import MODULES, enabled_modules, get_module
from backend.modules import sales as sales_module
from backend.modules.sales import router as sales_router


def test_sales_module_is_registered():
    spec = get_module("sales")
    assert spec is not None
    assert spec.license_feature == "sales"
    assert spec.router is sales_router


def test_enabled_modules_expose_sales():
    assert "sales" in [module.name for module in enabled_modules()]


def test_sales_module_is_registered_once():
    assert [module.name for module in MODULES].count("sales") == 1


def test_sales_router_exposes_domain_endpoints():
    paths = {route.path for route in sales_router.routes}
    assert "/sales/" in paths
    assert "/sales/today" in paths
    assert "/sales/pending" in paths
    assert "/sales/queue" in paths
    assert "/sales/{sale_id}" in paths
    assert "/sales/{sale_id}/pay" in paths
    assert "/sales/{sale_id}/cancel" in paths


def test_legacy_shims_resolve_to_module():
    import importlib

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


def test_module_can_be_disabled_by_flag(monkeypatch):
    import importlib

    import backend.modules.registry as registry

    monkeypatch.setenv("MODULE_SALES_ENABLED", "false")
    importlib.reload(registry)
    assert "sales" not in [module.name for module in registry.enabled_modules()]

    monkeypatch.delenv("MODULE_SALES_ENABLED", raising=False)
    importlib.reload(registry)
    assert "sales" in [module.name for module in registry.enabled_modules()]
