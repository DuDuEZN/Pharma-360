"""
Sales API Endpoints for Pharmacie 360 Backend
FastAPI endpoints for sale management with FEFO batch selection
"""

from datetime import date
from typing import Annotated, Optional

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.ext.asyncio import AsyncSession

from ...core.database import get_db
from ...core.logging import get_logger
from ...core.security import RBACUtils, get_current_user, get_current_user_with_role
from ...models.sale import Sale
from ...models.user import User
from ...schemas.sale import (
    QueueItem,
    SaleCreate,
    SaleDetailResponse,
    SaleItemResponse,
    SaleListResponse,
    SalePayment,
    SalePaymentResponse,
    SaleResponse,
    SaleValidationResponse,
)
from ...services.sale_service import SaleService

# Create router
router = APIRouter(prefix="/sales", tags=["sales"])

logger = get_logger(__name__)


@router.get(
    "/",
    response_model=SaleListResponse,
    summary="List all sales",
    description="Get a paginated list of all sales",
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
    current_user: User = Depends(get_current_user),
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
        db=db,
    )


@router.get(
    "/today",
    response_model=SaleListResponse,
    summary="Get today's sales",
    description="Get all sales created today",
)
async def get_today_sales(
    db: AsyncSession = Depends(get_db), current_user: User = Depends(get_current_user)
) -> SaleListResponse:
    """Get today's sales endpoint"""
    from datetime import datetime

    today = datetime.now().strftime("%Y-%m-%d")

    return await SaleService.list_sales(
        page=1, page_size=100, date_from=today, date_to=today, db=db
    )


@router.get(
    "/pending",
    response_model=SaleListResponse,
    summary="Get pending sales",
    description="Get all pending sales (seller, cashier, manager, or admin only)",
)
async def get_pending_sales(
    db: AsyncSession = Depends(get_db), current_user: User = Depends(get_current_user)
) -> SaleListResponse:
    """Get pending sales endpoint"""
    return await SaleService.list_sales(page=1, page_size=100, status="pending", db=db)


@router.get(
    "/queue",
    response_model=list[QueueItem],
    summary="Get cashier queue",
    description="Get list of pending sales for cashier queue (cashier or admin only)",
)
async def get_queue(
    db: AsyncSession = Depends(get_db), current_user: User = Depends(get_current_user)
) -> list[QueueItem]:
    """Get queue endpoint"""
    # Check permissions
    if not RBACUtils.has_permission(current_user.role, "cashier"):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only cashier or admin users can view the queue",
        )

    return await SaleService.get_queue_items(db)


@router.get(
    "/{sale_id}",
    response_model=SaleDetailResponse,
    summary="Get a specific sale",
    description="Get detailed sale information including all items",
)
async def get_sale(
    sale_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> SaleDetailResponse:
    """Get sale endpoint"""
    sale = await SaleService.get_sale_by_id(sale_id, db)

    if not sale:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="Sale not found"
        )

    # Check permissions (cashier, seller, manager, admin, or the sale owner).
    # Le caissier doit pouvoir consulter le détail pour contrôler les produits
    # (code-barres + rayon) avant validation du paiement.
    if (
        not RBACUtils.has_permission(current_user.role, "cashier")
        and sale.user_id != current_user.id
    ):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You can only view your own sales or have manager/admin privileges",
        )

    # Convert to detail response (construction explicite : les champs calculés
    # `user_name`, `item_count`, `total_items` ne sont pas des colonnes).
    detail_response = SaleDetailResponse(
        id=sale.id,
        sale_number=sale.sale_number,
        customer_id=sale.customer_id,
        user_id=sale.user_id,
        status=sale.status,
        subtotal=sale.subtotal,
        tax_amount=sale.tax_amount,
        discount=sale.discount,
        total=sale.total,
        payment_method=sale.payment_method,
        payment_reference=sale.payment_reference,
        notes=sale.notes,
        customer_name=sale.customer.name if sale.customer else None,
        user_name=sale.user.username if sale.user else "",
        is_pending=sale.is_pending,
        is_paid=sale.is_paid,
        is_cancelled=sale.is_cancelled,
        is_refunded=sale.is_refunded,
        item_count=sale.item_count,
        total_items=sale.total_items,
        payment_date=sale.payment_date,
        created_at=sale.created_at,
        updated_at=sale.updated_at,
        items=[
            SaleItemResponse(
                id=item.id,
                sale_id=item.sale_id,
                batch_id=item.batch_id,
                product_id=item.product_id,
                product_name=item.product.name if item.product else "Unknown",
                product_code=item.product.code if item.product else None,
                product_barcode=item.product.barcode if item.product else None,
                batch_number=item.batch.batch_number if item.batch else "Unknown",
                batch_location=item.batch.location if item.batch else None,
                quantity=item.quantity,
                sale_unit=item.sale_unit or "box",
                unit_price=item.unit_price,
                total_price=item.total_price,
                expiry_date=(
                    item.expiry_date.isoformat() if item.expiry_date else None
                ),
                created_at=item.created_at,
            )
            for item in sale.items
        ],
    )

    return detail_response


@router.post(
    "/",
    response_model=SaleValidationResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Create a new sale",
    description="Create a new sale with FEFO batch selection (seller or admin only)",
)
async def create_sale(
    sale_data: SaleCreate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> SaleValidationResponse:
    """Create sale endpoint"""
    # Check permissions
    if not RBACUtils.has_permission(current_user.role, "seller"):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only seller or admin users can create sales",
        )

    return await SaleService.create_sale(
        sale_data=sale_data, db=db, current_user=current_user
    )


@router.post(
    "/{sale_id}/pay",
    response_model=SalePaymentResponse,
    summary="Validate payment for a sale",
    description="Validate payment and finalize sale (cashier or admin only)",
)
async def validate_payment(
    sale_id: int,
    payment_data: SalePayment,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> SalePaymentResponse:
    """Validate payment endpoint"""
    # Check permissions
    if not RBACUtils.has_permission(current_user.role, "cashier"):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only cashier or admin users can validate payments",
        )

    return await SaleService.validate_payment(
        sale_id=sale_id,
        payment_method=payment_data.payment_method,
        payment_reference=payment_data.payment_reference,
        db=db,
        current_user=current_user,
    )


@router.post(
    "/{sale_id}/cancel",
    status_code=status.HTTP_204_NO_CONTENT,
    summary="Cancel a sale",
    description="Cancel a pending sale and restore stock (seller or admin only)",
)
async def cancel_sale(
    sale_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> None:
    """Cancel sale endpoint"""
    # Check permissions
    if not RBACUtils.has_permission(current_user.role, "seller"):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only seller or admin users can cancel sales",
        )

    success = await SaleService.cancel_sale(
        sale_id=sale_id, db=db, current_user=current_user
    )

    if not success:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Failed to cancel sale (may already be processed)",
        )
