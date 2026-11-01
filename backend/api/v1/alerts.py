"""
Alerts API Endpoints for Pharmacie 360 Backend
FastAPI endpoints for stock and expiry alerts
"""

from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession

from ...core.database import get_db
from ...core.logging import get_logger
from ...core.security import RBACUtils, get_current_user
from ...models.user import User
from ...schemas.alert import (AlertListResponse, AlertResponse,
                              AlertStatsResponse)
from ...services.alert_service import AlertService

# Create router
router = APIRouter(prefix="/alerts", tags=["alerts"])

logger = get_logger(__name__)


@router.get(
    "/",
    response_model=AlertListResponse,
    summary="Get all alerts",
    description="Get all stock and expiry alerts",
)
async def get_all_alerts(
    db: AsyncSession = Depends(get_db), current_user: User = Depends(get_current_user)
) -> AlertListResponse:
    """Get all alerts endpoint"""
    # Check permissions (only manager, admin, or seller can view alerts)
    if not RBACUtils.has_permission(current_user.role, "manager"):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only manager, admin, or seller users can view alerts",
        )

    return await AlertService.get_all_alerts(db)


@router.get(
    "/stats",
    response_model=AlertStatsResponse,
    summary="Get alert statistics",
    description="Get statistics about stock and expiry alerts",
)
async def get_alert_stats(
    db: AsyncSession = Depends(get_db), current_user: User = Depends(get_current_user)
) -> AlertStatsResponse:
    """Get alert statistics endpoint"""
    # Check permissions
    if not RBACUtils.has_permission(current_user.role, "manager"):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only manager, admin, or seller users can view alert stats",
        )

    return await AlertService.get_alert_stats(db)


@router.get(
    "/stock",
    response_model=list[AlertResponse],
    summary="Get stock alerts",
    description="Get alerts for low or over stock products",
)
async def get_stock_alerts(
    db: AsyncSession = Depends(get_db), current_user: User = Depends(get_current_user)
) -> list[AlertResponse]:
    """Get stock alerts endpoint"""
    # Check permissions
    if not RBACUtils.has_permission(current_user.role, "manager"):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only manager, admin, or seller users can view stock alerts",
        )

    stock_alerts = await AlertService.get_stock_alerts(db)

    # Convert to AlertResponse format
    return [
        AlertResponse(
            type="stock",
            severity=alert.severity,
            product_id=alert.product_id,
            product_name=alert.product_name,
            barcode=alert.barcode,
            message=f"Stock {alert.alert_type}: {alert.current_stock} unités",
            details={
                "current_stock": alert.current_stock,
                "min_stock": alert.min_stock,
                "max_stock": alert.max_stock,
                "alert_type": alert.alert_type,
            },
        )
        for alert in stock_alerts
    ]


@router.get(
    "/expiry",
    response_model=list[AlertResponse],
    summary="Get expiry alerts",
    description="Get alerts for expiring or expired batches",
)
async def get_expiry_alerts(
    db: AsyncSession = Depends(get_db), current_user: User = Depends(get_current_user)
) -> list[AlertResponse]:
    """Get expiry alerts endpoint"""
    # Check permissions
    if not RBACUtils.has_permission(current_user.role, "manager"):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only manager, admin, or seller users can view expiry alerts",
        )

    expiry_alerts = await AlertService.get_expiry_alerts(db)

    # Convert to AlertResponse format
    return [
        AlertResponse(
            type="expiry",
            severity=alert.severity,
            product_id=alert.product_id,
            product_name=alert.product_name,
            barcode=alert.barcode,
            message=f"Lot {alert.alert_type}: {alert.days_until_expiry} jours",
            details={
                "batch_number": alert.batch_number,
                "expiry_date": alert.expiry_date.isoformat(),
                "days_until_expiry": alert.days_until_expiry,
                "quantity": alert.quantity,
                "alert_type": alert.alert_type,
            },
        )
        for alert in expiry_alerts
    ]


@router.get(
    "/product/{product_id}",
    response_model=list[AlertResponse],
    summary="Get alerts for a product",
    description="Get all alerts for a specific product",
)
async def get_product_alerts(
    product_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> list[AlertResponse]:
    """Get product alerts endpoint"""
    # Check permissions
    if not RBACUtils.has_permission(current_user.role, "manager"):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only manager, admin, or seller users can view product alerts",
        )

    return await AlertService.get_product_alerts(product_id, db)
