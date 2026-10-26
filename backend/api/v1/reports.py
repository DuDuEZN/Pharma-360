"""
Reports API Endpoints for Pharmacie 360 Backend
FastAPI endpoints for report generation and management (BKND-015)
"""

from datetime import date
from typing import Annotated, Optional

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.ext.asyncio import AsyncSession

from ...core.database import get_db
from ...core.security import get_current_user, get_current_user_with_role, RBACUtils
from ...models.user import User
from ...schemas.report import (
from ...core.logging import get_logger, log_business_event
    ReportResponse,
    ReportListResponse,
    ReportGenerationRequest,
    SalesReportRequest,
    StockReportRequest,
    CashReportRequest,
    ReportStatsResponse,
)
from ...services.report_service import ReportService


# Create router
router = APIRouter(prefix="/reports", tags=["reports"])

logger = get_logger(__name__)


@router.post(
    "/sales",
    response_model=ReportResponse,
    summary="Generate sales report",
    description="Generate a sales report with various filters"
)
async def generate_sales_report(
    request: SalesReportRequest,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user_with_role(["admin", "manager"]))
) -> ReportResponse:
    """Generate sales report endpoint"""
    # Generate report
    report = await ReportService.generate_sales_report(
        request=request,
        db=db,
        user_id=current_user.id
    )
    
    return ReportResponse.model_validate(report)


@router.post(
    "/stock",
    response_model=ReportResponse,
    summary="Generate stock report",
    description="Generate a stock report with various filters"
)
async def generate_stock_report(
    request: StockReportRequest,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user_with_role(["admin", "manager"]))
) -> ReportResponse:
    """Generate stock report endpoint"""
    # Generate report
    report = await ReportService.generate_stock_report(
        request=request,
        db=db,
        user_id=current_user.id
    )
    
    return ReportResponse.model_validate(report)


@router.post(
    "/cash",
    response_model=ReportResponse,
    summary="Generate cash report",
    description="Generate a cash register report with various filters"
)
async def generate_cash_report(
    request: CashReportRequest,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user_with_role(["admin", "manager"]))
) -> ReportResponse:
    """Generate cash report endpoint"""
    # Generate report
    report = await ReportService.generate_cash_report(
        request=request,
        db=db,
        user_id=current_user.id
    )
    
    return ReportResponse.model_validate(report)


@router.get(
    "/",
    response_model=ReportListResponse,
    summary="List all reports",
    description="Get a paginated list of all generated reports"
)
async def list_reports(
    page: Annotated[int, Query(ge=1)] = 1,
    page_size: Annotated[int, Query(ge=1, le=100)] = 20,
    report_type: Annotated[Optional[str], Query()] = None,
    user_id: Annotated[Optional[int], Query()] = None,
    status: Annotated[Optional[str], Query()] = None,
    date_from: Annotated[Optional[date], Query()] = None,
    date_to: Annotated[Optional[date], Query()] = None,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
) -> ReportListResponse:
    """List reports endpoint"""
    return await ReportService.list_reports(
        page=page,
        page_size=page_size,
        report_type=report_type,
        user_id=user_id,
        status=status,
        date_from=date_from,
        date_to=date_to,
        db=db
    )


@router.get(
    "/{report_id}",
    response_model=ReportResponse,
    summary="Get a specific report",
    description="Get detailed information about a specific report"
)
async def get_report(
    report_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
) -> ReportResponse:
    """Get report endpoint"""
    report = await ReportService.get_report_by_id(report_id, db)
    
    if not report:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Report not found"
        )
    
    return ReportResponse.model_validate(report)


@router.get(
    "/stats",
    response_model=ReportStatsResponse,
    summary="Get report statistics",
    description="Get overall statistics for reports and sales"
)
async def get_report_stats(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
) -> ReportStatsResponse:
    """Get report statistics endpoint"""
    return await ReportService.get_report_stats(db)


@router.delete(
    "/{report_id}",
    summary="Delete a report",
    description="Delete a generated report"
)
async def delete_report(
    report_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user_with_role(["admin"]))
):
    """Delete report endpoint"""
    success = await ReportService.delete_report(report_id, db)
    
    if not success:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Report not found"
        )
    
    return {"message": "Report deleted successfully"}
