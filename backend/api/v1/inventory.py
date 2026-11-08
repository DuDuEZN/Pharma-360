"""
Inventory API Endpoints for Pharmacie 360 Backend
FastAPI endpoints for inventory and stock management
"""

from datetime import date, timedelta
from typing import Annotated, Optional

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.ext.asyncio import AsyncSession

from ...core.database import get_db
from ...core.logging import get_logger
from ...models.batch import Batch
from ...models.product import Product
from ...schemas.inventory import (
    InventoryItemResponse,
    InventorySummaryResponse,
    LowStockItemResponse,
    MovementCreate,
    MovementResponse,
    StockUpdate,
)
from ...services.inventory_service import InventoryService

# Create router
router = APIRouter(prefix="/inventory", tags=["inventory"])

logger = get_logger(__name__)


@router.get(
    "/",
    summary="Get all inventory items",
    description="Get a list of all inventory items with stock levels",
)
async def get_inventory(
    category: Annotated[Optional[str], Query()] = None,
    low_stock_only: Annotated[bool, Query()] = False,
    db: AsyncSession = Depends(get_db),
):
    """Get inventory endpoint"""
    inventory = await InventoryService.get_inventory(
        db=db, category=category, low_stock_only=low_stock_only
    )
    return inventory


@router.get(
    "/product/{product_id}",
    summary="Get inventory for a specific product",
    description="Get detailed inventory information for a specific product",
)
async def get_inventory_by_product(
    product_id: int,
    db: AsyncSession = Depends(get_db),
):
    """Get inventory by product endpoint"""
    inventory = await InventoryService.get_inventory_by_product(product_id, db)
    if not inventory:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="Product not found"
        )
    return inventory


@router.put(
    "/product/{product_id}",
    summary="Update inventory for a product",
    description="Update stock quantity and location for a product",
)
async def update_inventory(
    product_id: int,
    update_data: StockUpdate,
    db: AsyncSession = Depends(get_db),
):
    """Update inventory endpoint"""
    inventory = await InventoryService.update_inventory(product_id, update_data, db)
    if not inventory:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="Product not found"
        )
    return inventory


@router.get(
    "/low-stock",
    summary="Get low stock items",
    description="Get a list of products with low stock levels",
)
async def get_low_stock_items(
    threshold: Annotated[int, Query(ge=1)] = 10,
    db: AsyncSession = Depends(get_db),
):
    """Get low stock items endpoint"""
    items = await InventoryService.get_low_stock_items(threshold, db)
    return items


@router.get(
    "/expiring-soon",
    summary="Get items expiring soon",
    description="Get a list of batches that are expiring soon (FEFO priority)",
)
async def get_expiring_soon_items(
    days: Annotated[int, Query(ge=1, le=365)] = 30,
    db: AsyncSession = Depends(get_db),
):
    """Get expiring soon items endpoint"""
    expiry_date = date.today() + timedelta(days=days)
    batches = await InventoryService.get_expiring_soon_batches(expiry_date, db)
    return batches


@router.get(
    "/by-category/{category_id}",
    summary="Get inventory by category",
    description="Get inventory filtered by category",
)
async def get_inventory_by_category(
    category_id: int,
    db: AsyncSession = Depends(get_db),
):
    """Get inventory by category endpoint"""
    inventory = await InventoryService.get_inventory_by_category(category_id, db)
    return inventory


@router.get(
    "/summary",
    summary="Get inventory summary",
    description="Get overall inventory statistics",
)
async def get_inventory_summary(
    db: AsyncSession = Depends(get_db),
):
    """Get inventory summary endpoint"""
    summary = await InventoryService.get_inventory_summary(db)
    return summary


@router.get(
    "/location/{location}",
    summary="Get inventory by location",
    description="Get inventory items stored at a specific location",
)
async def get_inventory_by_location(
    location: str,
    db: AsyncSession = Depends(get_db),
):
    """Get inventory by location endpoint"""
    inventory = await InventoryService.get_inventory_by_location(location, db)
    return inventory
