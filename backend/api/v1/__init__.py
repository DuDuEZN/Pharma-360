"""
API v1 Package
Contains all v1 endpoints
"""

from .auth import router as auth_router
from .users import router as users_router
from .products import router as products_router
from .batches import router as batches_router
from .sales import router as sales_router

# List of all routers to be included in main.py
routers = [
    auth_router,
    users_router,
    products_router,
    batches_router,
    sales_router,
]
