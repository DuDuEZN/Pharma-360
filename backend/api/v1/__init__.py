"""
API v1 Package
Contains all v1 endpoints
"""

from .alerts import router as alerts_router
from .auth import router as auth_router
from .barcode import router as barcode_router
from .batches import router as batches_router
from .customers import router as customers_router
from .docs import router as docs_router
from .health import router as health_router
from .inventory import router as inventory_router
from .invoices import router as invoices_router
from .movements import router as movements_router
from .ocr_integration import router as ocr_router
from .products import router as products_router
from .reports import router as reports_router
from .returns import router as returns_router
from .sale_history import router as sale_history_router
from .sales import router as sales_router
from .suppliers import router as suppliers_router
from .users import router as users_router

# List of all routers to be included in main.py
routers = [
    health_router,
    auth_router,
    users_router,
    products_router,
    batches_router,
    sales_router,
    customers_router,
    inventory_router,
    movements_router,
    barcode_router,
    alerts_router,
    returns_router,
    invoices_router,
    suppliers_router,
    sale_history_router,
    reports_router,
    docs_router,
    ocr_router,
]

# Initialize centralized logging for all API endpoints
from backend.core.logging import setup_logging

logger = setup_logging()
