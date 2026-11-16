"""
API v1 Package
Contains all v1 endpoints
"""

from .admin_analytics import router as admin_analytics_router
from .analytics import router as analytics_router
from .alerts import router as alerts_router
from .audit_logs import router as audit_logs_router
from .auth import router as auth_router
from .barcode import router as barcode_router
from .batches import router as batches_router
from .cash import router as cash_router
from .dashboard import router as dashboard_router
from .deliveries import router as deliveries_router
from .docs import router as docs_router
from .health import router as health_router
from .inventory import router as inventory_router
from .invoices import router as invoices_router
from .movements import router as movements_router
from .ocr_integration import router as ocr_router
from .orders import router as orders_router
from .reports import router as reports_router
from .roles import router as roles_router
from .returns import router as returns_router
from .settings import router as settings_router
from .manager_reports import router as manager_reports_router
from .sale_history import router as sale_history_router
from .suppliers import router as suppliers_router
from .users import router as users_router

# List of all routers to be included in main.py
routers = [
    admin_analytics_router,
    analytics_router,
    health_router,
    auth_router,
    users_router,
    batches_router,
    cash_router,
    dashboard_router,
    inventory_router,
    movements_router,
    barcode_router,
    alerts_router,
    audit_logs_router,
    returns_router,
    invoices_router,
    settings_router,
    manager_reports_router,
    suppliers_router,
    sale_history_router,
    reports_router,
    roles_router,
    docs_router,
    ocr_router,
    orders_router,
    deliveries_router,
]

# Initialize centralized logging for all API endpoints
from backend.core.logging import setup_logging

logger = setup_logging()
