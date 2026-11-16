"""
Reports API Endpoints for Pharmacie 360 Backend
FastAPI endpoints for report generation and management (BKND-015)
"""

from datetime import date, timedelta
from typing import Annotated, Optional

from fastapi import APIRouter, Depends, HTTPException, Query, Response, status
from sqlalchemy.ext.asyncio import AsyncSession

from ...core.database import get_db
from ...core.logging import get_logger
from ...core.security import RBACUtils, get_current_user, get_current_user_with_role
from ...models.user import User
from .schemas import (
    CashReportRequest,
    ReportGenerationRequest,
    ReportListResponse,
    ReportResponse,
    ReportStatsResponse,
    SalesReportRequest,
    StockReportRequest,
)
from .service import ReportService

# Create router
router = APIRouter(prefix="/reports", tags=["reports"])

logger = get_logger(__name__)


def _resolve_date_range(
    range_value: Optional[str],
    start_date: Optional[date],
    end_date: Optional[date],
):
    """Convertit une plage nommée (today, this_month, ...) en dates réelles."""
    today = date.today()
    value = (range_value or "this_month").lower()

    if value == "custom":
        return start_date or end_date or today, end_date or start_date or today
    if value == "today":
        return today, today
    if value == "yesterday":
        target = today - timedelta(days=1)
        return target, target
    if value == "this_week":
        return today - timedelta(days=today.weekday()), today
    if value == "last_week":
        start = today - timedelta(days=today.weekday() + 7)
        return start, start + timedelta(days=6)
    if value == "last_month":
        end = today.replace(day=1) - timedelta(days=1)
        return end.replace(day=1), end
    if value == "this_year":
        return today.replace(month=1, day=1), today
    if value == "last_year":
        return date(today.year - 1, 1, 1), date(today.year - 1, 12, 31)
    # this_month par défaut
    return today.replace(day=1), today


def _build_print_html(
    title: str,
    start: date,
    end: date,
    headers,
    rows,
    total_label: str,
    total_value: float,
) -> str:
    """Document HTML autonome, prêt à imprimer, pour l'export « Imprimer »."""
    from html import escape

    head_cells = "".join(f"<th>{escape(str(h))}</th>" for h in headers)
    body_rows = "".join(
        "<tr>"
        + "".join(
            f"<td>{escape('' if cell is None else str(cell))}</td>" for cell in row
        )
        + "</tr>"
        for row in rows
    )
    if not rows:
        body_rows = (
            f'<tr><td colspan="{len(headers)}" class="empty">'
            "Aucune donnée pour cette période</td></tr>"
        )

    return f"""<!doctype html>
<html lang="fr">
<head>
<meta charset="utf-8" />
<title>{escape(title)}</title>
<style>
  * {{ box-sizing: border-box; }}
  body {{ font-family: -apple-system, "Segoe UI", Roboto, sans-serif; margin: 24px; color: #111; }}
  h1 {{ font-size: 18px; margin: 0 0 4px; }}
  p.sub {{ margin: 0 0 16px; color: #555; font-size: 12px; }}
  table {{ width: 100%; border-collapse: collapse; font-size: 11px; }}
  th, td {{ border: 1px solid #999; padding: 6px 8px; text-align: left; }}
  th {{ background: #f2f2f2; }}
  td.empty {{ text-align: center; color: #777; }}
  .total {{ margin-top: 14px; font-weight: 700; font-size: 12px; }}
  @media print {{ body {{ margin: 0; }} }}
</style>
</head>
<body onload="window.print()">
  <h1>{escape(title)}</h1>
  <p class="sub">Du {start.strftime('%d/%m/%Y')} au {end.strftime('%d/%m/%Y')}</p>
  <table>
    <thead><tr>{head_cells}</tr></thead>
    <tbody>{body_rows}</tbody>
  </table>
  <p class="total">{escape(total_label)} : {total_value:,.2f} F CFA</p>
</body>
</html>"""



@router.post(
    "/sales",
    response_model=ReportResponse,
    summary="Generate sales report",
    description="Generate a sales report with various filters",
)
async def generate_sales_report(
    request: SalesReportRequest,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user_with_role(["admin", "manager"])),
) -> ReportResponse:
    """Generate sales report endpoint"""
    # Generate report
    report = await ReportService.generate_sales_report(
        request=request, db=db, user_id=current_user.id
    )

    return ReportResponse.model_validate(report)


@router.post(
    "/stock",
    response_model=ReportResponse,
    summary="Generate stock report",
    description="Generate a stock report with various filters",
)
async def generate_stock_report(
    request: StockReportRequest,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user_with_role(["admin", "manager"])),
) -> ReportResponse:
    """Generate stock report endpoint"""
    # Generate report
    report = await ReportService.generate_stock_report(
        request=request, db=db, user_id=current_user.id
    )

    return ReportResponse.model_validate(report)


@router.post(
    "/cash",
    response_model=ReportResponse,
    summary="Generate cash report",
    description="Generate a cash register report with various filters",
)
async def generate_cash_report(
    request: CashReportRequest,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user_with_role(["admin", "manager"])),
) -> ReportResponse:
    """Generate cash report endpoint"""
    # Generate report
    report = await ReportService.generate_cash_report(
        request=request, db=db, user_id=current_user.id
    )

    return ReportResponse.model_validate(report)


@router.get(
    "/",
    response_model=ReportListResponse,
    summary="List all reports",
    description="Get a paginated list of all generated reports",
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
    current_user: User = Depends(get_current_user),
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
        db=db,
    )


@router.get(
    "/export",
    summary="Export a report",
    description="Generate and download a report as PDF, CSV or printable HTML.",
)
async def export_report(
    type: str = Query("sales", description="sales, stock, cash, financial, returns"),
    range: str = Query("this_month"),
    start_date: Optional[date] = Query(None),
    end_date: Optional[date] = Query(None),
    format: str = Query("pdf", description="pdf, csv, xlsx or print"),
    group_by: Optional[str] = Query(None),
    periodicity: Optional[str] = Query(None),
    category_id: Optional[int] = Query(None),
    product_id: Optional[int] = Query(None),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user_with_role(["admin", "manager"])),
):
    """Generate a report on demand and stream it back as a download."""
    base_type = ReportService.base_report_type(type)
    resolved_start, resolved_end = _resolve_date_range(range, start_date, end_date)

    filters = {}
    if group_by:
        filters["group_by"] = group_by
    if periodicity:
        filters["periodicity"] = periodicity
    if category_id:
        filters["category_id"] = category_id
    if product_id:
        filters["product_id"] = product_id

    headers, rows, total_amount, _total_records = await ReportService._collect_report_data(
        db, base_type, type, resolved_start, resolved_end, filters
    )

    labels = {
        "sales": "Rapport de ventes",
        "stock": "Rapport de stock",
        "cash": "Rapport de caisse",
    }
    title = f"{labels.get(base_type, 'Rapport')} - {date.today().isoformat()}"
    fmt = (format or "pdf").lower()

    if fmt in ("print", "html"):
        total_label = "Montant total" if base_type in ("sales", "cash") else "Valeur du stock"
        html = _build_print_html(
            title, resolved_start, resolved_end, headers, rows, total_label, total_amount
        )
        return Response(content=html, media_type="text/html; charset=utf-8")

    content, ext, media_type = ReportService.render_report_content(
        title, type, headers, rows, total_amount, fmt, resolved_start, resolved_end
    )
    filename = f"rapport_{type}_{date.today().isoformat()}.{ext}"
    return Response(
        content=content,
        media_type=media_type,
        headers={"Content-Disposition": f'attachment; filename="{filename}"'},
    )


@router.get(
    "/stats",
    response_model=ReportStatsResponse,
    summary="Get report statistics",
    description="Get overall statistics for reports and sales",
)
async def get_report_stats(
    db: AsyncSession = Depends(get_db), current_user: User = Depends(get_current_user)
) -> ReportStatsResponse:
    """Get report statistics endpoint"""
    return await ReportService.get_report_stats(db)


@router.get(
    "/{report_id}",
    response_model=ReportResponse,
    summary="Get a specific report",
    description="Get detailed information about a specific report",
)
async def get_report(
    report_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> ReportResponse:
    """Get report endpoint"""
    report = await ReportService.get_report_by_id(report_id, db)

    if not report:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="Report not found"
        )

    return ReportResponse.model_validate(report)


@router.delete(
    "/{report_id}", summary="Delete a report", description="Delete a generated report"
)
async def delete_report(
    report_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user_with_role(["admin"])),
):
    """Delete report endpoint"""
    success = await ReportService.delete_report(report_id, db)

    if not success:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="Report not found"
        )

    return {"message": "Report deleted successfully"}
