"""
Movements API Endpoints for Pharmacie 360 Backend
FastAPI endpoints for stock movement tracking (AUDIT TRAIL)
"""

from datetime import date as date_type, datetime
from typing import Annotated, Optional

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.ext.asyncio import AsyncSession

from ...core.database import get_db
from ...core.logging import get_logger
from ...models.movement import Movement
from ...schemas.inventory import MovementCreate, MovementResponse
from ...services.movement_service import MovementService

# Create router
router = APIRouter(prefix="/inventory/movements", tags=["movements", "inventory"])

logger = get_logger(__name__)


@router.get(
    "/",
    summary="Get all stock movements",
    description="Get a list of all stock movements (audit trail)",
)
async def list_movements(
    product_id: Annotated[Optional[int], Query()] = None,
    movement_type: Annotated[Optional[str], Query()] = None,
    start_date: Annotated[Optional[date_type], Query()] = None,
    end_date: Annotated[Optional[date_type], Query()] = None,
    page: Annotated[int, Query(ge=1)] = 1,
    page_size: Annotated[int, Query(ge=1, le=100)] = 20,
    db: AsyncSession = Depends(get_db),
):
    """List movements endpoint"""
    movements = await MovementService.list_movements(
        db=db,
        product_id=product_id,
        movement_type=movement_type,
        start_date=start_date,
        end_date=end_date,
        page=page,
        page_size=page_size,
    )
    return movements


@router.get(
    "/product/{product_id}",
    summary="Get movements for a specific product",
    description="Get all stock movements for a specific product",
)
async def get_movements_by_product(
    product_id: int,
    db: AsyncSession = Depends(get_db),
):
    """Get movements by product endpoint"""
    movements = await MovementService.get_movements_by_product(product_id, db)
    return movements


@router.post(
    "/",
    summary="Record a stock movement",
    description="Record a new stock movement (in, out, adjustment, return, expiry)",
    status_code=status.HTTP_201_CREATED,
)
async def create_movement(
    movement_data: MovementCreate,
    db: AsyncSession = Depends(get_db),
):
    """Create movement endpoint"""
    movement = await MovementService.create_movement(movement_data, db)
    return movement


@router.get(
    "/{movement_id}",
    summary="Get a specific movement",
    description="Get detailed information about a specific stock movement",
)
async def get_movement(
    movement_id: int,
    db: AsyncSession = Depends(get_db),
):
    """Get movement endpoint"""
    movement = await MovementService.get_movement_by_id(movement_id, db)
    if not movement:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="Movement not found"
        )
    return movement
