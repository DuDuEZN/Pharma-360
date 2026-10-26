"""
API v1 Package
Contains all v1 endpoints
"""

from .auth import router as auth_router
from .users import router as users_router
from .products import router as products_router
from .batches import router as batches_router
from .sales import router as sales_router
from .barcode import router as barcode_router
from .alerts import router as alerts_router
from .returns import router as returns_router
from .invoices import router as invoices_router
from .suppliers import router as suppliers_router
from .sale_history import router as sale_history_router
from .reports import router as reports_router
from .docs import router as docs_router

# List of all routers to be included in main.py
routers = [
    auth_router,
    users_router,
    products_router,
    batches_router,
    sales_router,
    barcode_router,
    alerts_router,
    returns_router,
    invoices_router,
    suppliers_router,
    sale_history_router,
    reports_router,
    docs_router,
]
