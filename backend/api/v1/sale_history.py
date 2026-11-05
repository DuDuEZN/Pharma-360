"""
Sale History API Endpoints for Pharmacie 360 Backend
FastAPI endpoints for sale history and analytics (BKND-014)
"""

from datetime import date
from typing import Annotated, Optional

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.ext.asyncio import AsyncSession

from ...core.database import get_db
from ...core.logging import get_logger
from ...core.security import RBACUtils, get_current_user, get_current_user_with_role
from ...models.user import User
from ...schemas.sale_history import (
    DailySalesResponse,
    MonthlySalesResponse,
    ProductSalesAnalytics,
    SaleAnalyticsResponse,
    SaleHistoryCreate,
    SaleHistoryListResponse,
    SaleHistoryResponse,
    SalesReportRequest,
)
from ...services.sale_history_service import SaleHistoryService

# Create router
router = APIRouter(prefix="/sale-history", tags=["sale_history"])

logger = get_logger(__name__)


@router.get(
    "/",
    summary="List sale history",
    description="Get paginated sale history with filters",
)
async def list_sale_history(
    page: Annotated[int, Query(ge=1)] = 1,
    page_size: Annotated[int, Query(ge=1, le=100)] = 20,
    start_date: Annotated[Optional[date], Query()] = None,
    end_date: Annotated[Optional[date], Query()] = None,
    product_id: Annotated[Optional[int], Query()] = None,
    category_id: Annotated[Optional[int], Query()] = None,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """List sale history endpoint"""
    return await SaleHistoryService.list_history(
        page=page,
        page_size=page_size,
        start_date=start_date,
        end_date=end_date,
        product_id=product_id,
        category_id=category_id,
        db=db,
    )


@router.post(
    "/",
    summary="Create sale history record",
    description="Create a new sale history record (internal use)",
)
async def create_sale_history(
    history_data: SaleHistoryCreate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Create sale history endpoint"""
    # Check permissions - only internal/system use
    if not RBACUtils.has_permission(current_user.role, "admin"):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only admin users can create history records",
        )

    return await SaleHistoryService.create_history_record(history_data, db)


@router.get("/daily", summary="Get daily sales", description="Get daily sales summary")
async def get_daily_sales(
    target_date: Annotated[Optional[date], Query()] = None,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Get daily sales endpoint"""
    return await SaleHistoryService.get_daily_sales(target_date, db)


@router.get(
    "/monthly", summary="Get monthly sales", description="Get monthly sales summary"
)
async def get_monthly_sales(
    year: Annotated[Optional[int], Query()] = None,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Get monthly sales endpoint"""
    return await SaleHistoryService.get_monthly_sales(year, db)


@router.get(
    "/analytics",
    summary="Get sale analytics",
    description="Get comprehensive sale analytics for a period",
)
async def get_sale_analytics(
    period: Annotated[str, Query()] = "month",
    start_date: Annotated[Optional[date], Query()] = None,
    end_date: Annotated[Optional[date], Query()] = None,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Get sale analytics endpoint"""
    return await SaleHistoryService.get_sale_analytics(
        period=period, start_date=start_date, end_date=end_date, db=db
    )


@router.get(
    "/products/{product_id}",
    summary="Get product sales analytics",
    description="Get sales analytics for a specific product",
)
async def get_product_sales(
    product_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Get product sales analytics endpoint"""
    return await SaleHistoryService.get_product_sales_analytics(product_id, db)


@router.get(
    "/products/top",
    summary="Get top selling products",
    description="Get list of top selling products",
)
async def get_top_products(
    limit: Annotated[int, Query(ge=1, le=50)] = 10,
    start_date: Annotated[Optional[date], Query()] = None,
    end_date: Annotated[Optional[date], Query()] = None,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Get top products endpoint"""
    # Get analytics for the period
    analytics = await SaleHistoryService.get_sale_analytics(
        period="custom", start_date=start_date, end_date=end_date, db=db
    )

    return {
        "period": "custom",
        "start_date": start_date.isoformat() if start_date else None,
        "end_date": end_date.isoformat() if end_date else None,
        "top_products": analytics.top_products[:limit],
    }


@router.get(
    "/today", summary="Get today's sales", description="Get sales summary for today"
)
async def get_today_sales(
    db: AsyncSession = Depends(get_db), current_user: User = Depends(get_current_user)
):
    """Get today's sales endpoint"""
    return await SaleHistoryService.get_daily_sales(date.today(), db)


@router.get(
    "/this-month",
    summary="Get this month's sales",
    description="Get sales summary for current month",
)
async def get_this_month_sales(
    db: AsyncSession = Depends(get_db), current_user: User = Depends(get_current_user)
):
    """Get this month's sales endpoint"""
    return await SaleHistoryService.get_monthly_sales(year=datetime.now().year, db=db)


@router.get(
    "/stats",
    summary="Get sale history statistics",
    description="Get overall statistics from sale history",
)
async def get_sale_history_stats(
    db: AsyncSession = Depends(get_db), current_user: User = Depends(get_current_user)
):
    """Get sale history statistics endpoint"""
    # Get basic counts
    from sqlalchemy import func, select

    from ...models.sale_history import SaleHistory

    total_result = await db.execute(select(func.count()).select_from(SaleHistory))
    total_records = total_result.scalar_one()

    total_quantity_result = await db.execute(
        select(func.sum(SaleHistory.quantity)).select_from(SaleHistory)
    )
    total_quantity = total_quantity_result.scalar_one() or 0

    total_revenue_result = await db.execute(
        select(func.sum(SaleHistory.total_price)).select_from(SaleHistory)
    )
    total_revenue = total_revenue_result.scalar_one() or 0.0

    # Get date range
    min_date_result = await db.execute(
        select(func.min(SaleHistory.sale_date)).select_from(SaleHistory)
    )
    min_date = min_date_result.scalar_one()

    max_date_result = await db.execute(
        select(func.max(SaleHistory.sale_date)).select_from(SaleHistory)
    )
    max_date = max_date_result.scalar_one()

    # Get unique products count
    unique_products_result = await db.execute(
        select(func.count(SaleHistory.product_id.distinct())).select_from(SaleHistory)
    )
    unique_products = unique_products_result.scalar_one()

    return {
        "total_records": total_records,
        "total_quantity": total_quantity,
        "total_revenue": float(total_revenue),
        "unique_products": unique_products,
        "date_range": {
            "first_sale": min_date.isoformat() if min_date else None,
            "last_sale": max_date.isoformat() if max_date else None,
        },
    }
