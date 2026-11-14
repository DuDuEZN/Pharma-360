"""
Manager Reports API Endpoints for Pharmacie 360 Backend
Provides report listing and generation for the manager interface.
Endpoints are aliased under /manager/reports for frontend compatibility.
"""
from datetime import date, datetime
from typing import Annotated, Optional

from fastapi import APIRouter, Depends, HTTPException, Query, Response, status
from pydantic import BaseModel, Field
from sqlalchemy.ext.asyncio import AsyncSession

from ...core.database import get_db
from ...core.logging import get_logger
from ...core.security import RBACUtils, get_current_user
from ...models.user import User
from ...services.report_service import ReportService

router = APIRouter(prefix="/manager/reports", tags=["manager_reports"])
logger = get_logger(__name__)


class ReportGenerateRequest(BaseModel):
    """Corps JSON accepté par la génération de rapport."""

    report_type: str = "sales"
    title: Optional[str] = None
    description: Optional[str] = None
    data_range_start: Optional[date] = None
    data_range_end: Optional[date] = None
    file_format: str = "pdf"
    filters: dict = Field(default_factory=dict)


def _normalize_format(value: Optional[str]) -> str:
    fmt = (value or "pdf").lower()
    if fmt in ("excel", "xlsx", "xls"):
        return "csv"
    if fmt not in ("pdf", "csv"):
        return "pdf"
    return fmt


@router.get("")
async def list_manager_reports(
    page: Annotated[int, Query(ge=1)] = 1,
    page_size: Annotated[int, Query(ge=1, le=100)] = 100,
    report_type: Annotated[Optional[str], Query()] = None,
    user_id: Annotated[Optional[int], Query()] = None,
    status: Annotated[Optional[str], Query()] = None,
    date_from: Annotated[Optional[date], Query()] = None,
    date_to: Annotated[Optional[date], Query()] = None,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """List reports for manager interface"""
    if not RBACUtils.has_permission(current_user.role, "manager"):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Manager required",
        )
    result = await ReportService.list_reports(
        page=page,
        page_size=page_size,
        report_type=report_type,
        user_id=user_id,
        status=status,
        date_from=date_from,
        date_to=date_to,
        db=db,
    )
    # Return in the format the frontend expects: { reports: [...], total: ... }
    return {
        "reports": [
            report.model_dump(mode="json") if hasattr(report, "model_dump") else report
            for report in (result.reports if hasattr(result, "reports") else [])
        ],
        "total": result.total if hasattr(result, "total") else 0,
    }


@router.post("/generate")
async def generate_manager_report(
    body: Optional[ReportGenerateRequest] = None,
    report_type: Annotated[Optional[str], Query()] = None,
    data_range_start: Annotated[Optional[date], Query()] = None,
    data_range_end: Annotated[Optional[date], Query()] = None,
    file_format: Annotated[Optional[str], Query()] = None,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Generate a report and persist it so it can be listed and downloaded."""
    if not RBACUtils.has_permission(current_user.role, "manager"):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Manager required",
        )

    request = body or ReportGenerateRequest()
    # Les paramètres de requête restent acceptés pour les anciens appels.
    if report_type:
        request.report_type = report_type
    if data_range_start:
        request.data_range_start = data_range_start
    if data_range_end:
        request.data_range_end = data_range_end
    if file_format:
        request.file_format = file_format

    try:
        report = await ReportService.generate_report_record(
            db=db,
            report_type=request.report_type,
            title=request.title,
            description=request.description,
            data_range_start=request.data_range_start,
            data_range_end=request.data_range_end,
            file_format=_normalize_format(request.file_format),
            filters=request.filters or {},
            user_id=current_user.id,
        )
    except Exception as exc:
        logger.exception("Report generation failed")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Impossible de générer le rapport",
        ) from exc

    return {
        "id": report.id,
        "title": report.title,
        "report_type": report.report_type,
        "status": report.status,
        "file_format": report.file_format,
        "total_records": report.total_records,
        "total_amount": float(report.total_amount or 0),
        "data_range_start": report.data_range_start.isoformat() if report.data_range_start else None,
        "data_range_end": report.data_range_end.isoformat() if report.data_range_end else None,
        "generated_at": report.generated_at.isoformat() if report.generated_at else datetime.utcnow().isoformat(),
    }


@router.get("/{report_id}/download")
async def download_manager_report(
    report_id: int,
    format: Annotated[Optional[str], Query()] = None,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Download the real content of a generated report."""
    if not RBACUtils.has_permission(current_user.role, "manager"):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Manager required",
        )
    report = await ReportService.get_report_by_id(report_id, db)
    if not report:
        raise HTTPException(status_code=404, detail="Report not found")

    if format:
        report.file_format = _normalize_format(format)

    content, filename, media_type = await ReportService.build_report_file(report, db)
    return Response(
        content=content,
        media_type=media_type,
        headers={"Content-Disposition": f'attachment; filename="{filename}"'},
    )


@router.delete("/{report_id}")
async def delete_manager_report(
    report_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Delete a report"""
    if not RBACUtils.has_permission(current_user.role, "manager"):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Manager required",
        )
    deleted = await ReportService.delete_report(report_id, db)
    if not deleted:
        raise HTTPException(status_code=404, detail="Report not found")
    return {"message": "Report deleted successfully"}
