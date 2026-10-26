"""
Sales API Endpoints for Pharmacie 360 Backend
FastAPI endpoints for sale management with FEFO batch selection
"""

from ...core.logging import get_logger
from typing import Annotated, Optional
from ...core.logging import get_logger
from datetime import date

from ...core.logging import get_logger
from fastapi import APIRouter, Depends, HTTPException, Query, status
from ...core.logging import get_logger
from sqlalchemy.ext.asyncio import AsyncSession

from ...core.logging import get_logger
from ...core.database import get_db
from ...core.logging import get_logger
from ...core.security import get_current_user, get_current_user_with_role, RBACUtils
from ...core.logging import get_logger
from ...models.user import User
from ...core.logging import get_logger
from ...models.sale import Sale
from ...core.logging import get_logger
from ...schemas.sale import (
    SaleCreate,
    SaleResponse,
    SaleDetailResponse,
    SaleListResponse,
    SaleValidationResponse,
    SalePayment,
    SalePaymentResponse,
    QueueItem,
)
from ...core.logging import get_logger
from ...services.sale_service import SaleService


# Create router
router = APIRouter(prefix="/sales", tags=["sales"])

logger = get_logger(__name__)


@router.get(
    "/",
    response_model=SaleListResponse,
    summary="List all sales",
    description="Get a paginated list of all sales"
)
async def list_sales(
    page: Annotated[int, Query(ge=1)] = 1,
    page_size: Annotated[int, Query(ge=1, le=100)] = 20,
    status: Annotated[Optional[str], Query()] = None,
    user_id: Annotated[Optional[int], Query()] = None,
    customer_id: Annotated[Optional[int], Query()] = None,
    date_from: Annotated[Optional[str], Query()] = None,
    date_to: Annotated[Optional[str], Query()] = None,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
) -> SaleListResponse:
    """List sales endpoint"""
    return await SaleService.list_sales(
        page=page,
        page_size=page_size,
        status=status,
        user_id=user_id,
        customer_id=customer_id,
        date_from=date_from,
        date_to=date_to,
        db=db
    )


@router.get(
    "/{sale_id}",
    response_model=SaleDetailResponse,
    summary="Get a specific sale",
    description="Get detailed sale information including all items"
)
async def get_sale(
    sale_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
) -> SaleDetailResponse:
    """Get sale endpoint"""
    sale = await SaleService.get_sale_by_id(sale_id, db)
    
    if not sale:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Sale not found"
        )
    
    # Check permissions (only admin, manager, or the sale owner can view)
    if not RBACUtils.has_permission(current_user.role, "manager") and sale.user_id != current_user.id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You can only view your own sales or have manager/admin privileges"
        )
    
    # Convert to detail response
    detail_response = SaleDetailResponse.model_validate(sale)
    
    # Add computed fields
    detail_response.customer_name = (
        sale.customer.name if sale.customer else None
    )
    detail_response.user_name = sale.user.username
    detail_response.is_pending = sale.is_pending
    detail_response.is_paid = sale.is_paid
    detail_response.is_cancelled = sale.is_cancelled
    detail_response.is_refunded = sale.is_refunded
    detail_response.item_count = sale.item_count
    detail_response.total_items = sale.total_items
    
    # Add items
    from ...schemas.sale import SaleItemResponse
    detail_response.items = []
    for item in sale.items:
        item_response = SaleItemResponse.model_validate(item)
        item_response.product_name = item.product.name if item.product else "Unknown"
        item_response.batch_number = item.batch.batch_number if item.batch else "Unknown"
        detail_response.items.append(item_response)
    
    return detail_response


@router.post(
    "/",
    response_model=SaleValidationResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Create a new sale",
    description="Create a new sale with FEFO batch selection (seller or admin only)"
)
async def create_sale(
    sale_data: SaleCreate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
) -> SaleValidationResponse:
    """Create sale endpoint"""
    # Check permissions
    if not RBACUtils.has_permission(current_user.role, "seller"):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only seller or admin users can create sales"
        )
    
    return await SaleService.create_sale(
        sale_data=sale_data,
        db=db,
        current_user=current_user
    )


@router.post(
    "/{sale_id}/pay",
    response_model=SalePaymentResponse,
    summary="Validate payment for a sale",
    description="Validate payment and finalize sale (cashier or admin only)"
)
async def validate_payment(
    sale_id: int,
    payment_data: SalePayment,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
) -> SalePaymentResponse:
    """Validate payment endpoint"""
    # Check permissions
    if not RBACUtils.has_permission(current_user.role, "cashier"):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only cashier or admin users can validate payments"
        )
    
    return await SaleService.validate_payment(
        sale_id=sale_id,
        payment_method=payment_data.payment_method,
        payment_reference=payment_data.payment_reference,
        db=db,
        current_user=current_user
    )


@router.post(
    "/{sale_id}/cancel",
    status_code=status.HTTP_204_NO_CONTENT,
    summary="Cancel a sale",
    description="Cancel a pending sale and restore stock (seller or admin only)"
)
async def cancel_sale(
    sale_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
) -> None:
    """Cancel sale endpoint"""
    # Check permissions
    if not RBACUtils.has_permission(current_user.role, "seller"):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only seller or admin users can cancel sales"
        )
    
    success = await SaleService.cancel_sale(
        sale_id=sale_id,
        db=db,
        current_user=current_user
    )
    
    if not success:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Failed to cancel sale (may already be processed)"
        )


@router.get(
    "/queue",
    response_model=list[QueueItem],
    summary="Get cashier queue",
    description="Get list of pending sales for cashier queue (cashier or admin only)"
)
async def get_queue(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
) -> list[QueueItem]:
    """Get queue endpoint"""
    # Check permissions
    if not RBACUtils.has_permission(current_user.role, "cashier"):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only cashier or admin users can view the queue"
        )
    
    return await SaleService.get_queue_items(db)


@router.get(
    "/pending",
    response_model=SaleListResponse,
    summary="Get pending sales",
    description="Get all pending sales (seller, cashier, manager, or admin only)"
)
async def get_pending_sales(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
) -> SaleListResponse:
    """Get pending sales endpoint"""
    return await SaleService.list_sales(
        page=1,
        page_size=100,
        status="pending",
        db=db
    )


@router.get(
    "/today",
    response_model=SaleListResponse,
    summary="Get today's sales",
    description="Get all sales created today"
)
async def get_today_sales(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
) -> SaleListResponse:
    """Get today's sales endpoint"""
    from datetime import datetime
    today = datetime.now().strftime("%Y-%m-%d")
    
    return await SaleService.list_sales(
        page=1,
        page_size=100,
        date_from=today,
        date_to=today,
        db=db
    )
