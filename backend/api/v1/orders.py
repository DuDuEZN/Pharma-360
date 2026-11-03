"""
Orders API Endpoints for Pharmacie 360 Backend
FastAPI endpoints for order management
"""

from typing import Annotated, Optional
from fastapi import APIRouter, Depends, HTTPException, Query, Path, status
from sqlalchemy.ext.asyncio import AsyncSession

from ...core.database import get_db
from ...core.security import get_current_user, RBACUtils
from ...models.user import User
from ...schemas.order import (
    OrderCreate,
    OrderUpdate,
    OrderResponse,
    OrderDetailResponse,
    OrderListResponse,
)
from ...services.order_service import OrderService


# Create router
router = APIRouter(prefix="/orders", tags=["orders"])


@router.post(
    "/",
    response_model=OrderResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Create a new order",
    description="Create a new purchase order for a product. Requires seller or manager role.",
    responses={
        400: {"description": "Invalid input data"},
        401: {"description": "Unauthorized"},
        403: {"description": "Forbidden - insufficient permissions"},
        500: {"description": "Internal server error"}
    }
)
async def create_order(
    order_data: OrderCreate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Create order endpoint"""
    try:
        # Check permissions
        if not RBACUtils.has_permission(current_user, ["create_order", "admin", "manager"]):
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Insufficient permissions to create orders"
            )
        
        return await OrderService.create_order(
            order_data=order_data,
            db=db,
            current_user_id=current_user.id
        )
    except ValueError as e:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(e))
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to create order"
        )


@router.get(
    "/",
    response_model=OrderListResponse,
    summary="List all orders",
    description="Get a paginated list of all orders. Supports filtering by status, product, and supplier.",
    responses={
        401: {"description": "Unauthorized"},
        500: {"description": "Internal server error"}
    }
)
async def list_orders(
    page: Annotated[int, Query(ge=1)] = 1,
    page_size: Annotated[int, Query(ge=1, le=100)] = 20,
    status: Annotated[Optional[str], Query()] = None,
    product_id: Annotated[Optional[int], Query()] = None,
    supplier_id: Annotated[Optional[int], Query()] = None,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """List orders endpoint"""
    try:
        return await OrderService.list_orders(
            page=page,
            page_size=page_size,
            status=status,
            product_id=product_id,
            supplier_id=supplier_id,
            db=db
        )
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to fetch orders"
        )


@router.get(
    "/{order_id}",
    response_model=OrderDetailResponse,
    summary="Get order details",
    description="Get detailed information for a specific order.",
    responses={
        404: {"description": "Order not found"},
        401: {"description": "Unauthorized"},
        500: {"description": "Internal server error"}
    }
)
async def get_order(
    order_id: Annotated[int, Path(..., ge=1)],
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Get order endpoint"""
    try:
        return await OrderService.get_order(order_id=order_id, db=db)
    except ValueError as e:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(e))
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to fetch order"
        )


@router.patch(
    "/{order_id}",
    response_model=OrderResponse,
    summary="Update an order",
    description="Update an existing order. Only certain fields can be updated.",
    responses={
        400: {"description": "Invalid input data"},
        404: {"description": "Order not found"},
        401: {"description": "Unauthorized"},
        403: {"description": "Forbidden - insufficient permissions"},
        500: {"description": "Internal server error"}
    }
)
async def update_order(
    order_id: Annotated[int, Path(..., ge=1)],
    order_data: OrderUpdate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Update order endpoint"""
    try:
        # Check permissions
        if not RBACUtils.has_permission(current_user, ["update_order", "admin", "manager"]):
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Insufficient permissions to update orders"
            )
        
        return await OrderService.update_order(
            order_id=order_id,
            order_data=order_data,
            db=db,
            current_user_id=current_user.id
        )
    except ValueError as e:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(e))
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to update order"
        )


@router.delete(
    "/{order_id}",
    status_code=status.HTTP_204_NO_CONTENT,
    summary="Delete an order",
    description="Delete an existing order. Only pending orders can be deleted.",
    responses={
        404: {"description": "Order not found"},
        401: {"description": "Unauthorized"},
        403: {"description": "Forbidden - insufficient permissions"},
        500: {"description": "Internal server error"}
    }
)
async def delete_order(
    order_id: Annotated[int, Path(..., ge=1)],
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Delete order endpoint"""
    try:
        # Check permissions
        if not RBACUtils.has_permission(current_user, ["delete_order", "admin"]):
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Insufficient permissions to delete orders"
            )
        
        await OrderService.delete_order(order_id=order_id, db=db)
        return None
    except ValueError as e:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(e))
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to delete order"
        )
