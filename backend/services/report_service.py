"""
Report Service for Pharmacie 360 Backend
Service for generating various reports (sales, stock, cash)
"""

import csv
import io
import json
import os
from datetime import date, datetime, time, timedelta
from typing import Any, Dict
from typing import List as ListType
from typing import Optional

from sqlalchemy import and_, asc, desc, func, or_, select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from ..models.batch import Batch
from ..models.category import Category
from ..models.product import Product
from ..models.report import Report
from ..models.sale import Sale
from ..models.sale_item import SaleItem
from ..models.user import User

# from ..models.cash_register import CashRegister
from ..schemas.report import (
    CashReportRequest,
    ReportCreate,
    ReportListResponse,
    ReportResponse,
    ReportStatsResponse,
    SalesReportRequest,
    StockReportRequest,
)


class ReportService:
    """Service for generating and managing reports"""

    # Report directory for storing generated files (volume uploads en prod)
    REPORT_DIR = os.environ.get("REPORT_DIR", "/app/uploads/reports")

    # Types exposés par l'interface : tous sont ramenés à un des trois
    # générateurs de base.
    REPORT_TYPE_ALIASES = {
        "sales": "sales",
        "daily": "sales",
        "monthly": "sales",
        "daily_sales": "sales",
        "weekly_sales": "sales",
        "monthly_sales": "sales",
        "financial": "sales",
        "custom": "sales",
        "stock": "stock",
        "inventory": "stock",
        "expiry": "stock",
        "supplier": "stock",
        "returns": "stock",
        "cash": "cash",
    }

    @classmethod
    def get_report_dir(cls) -> str:
        """Get or create report directory (fallback si /app/uploads absent)."""
        try:
            os.makedirs(cls.REPORT_DIR, exist_ok=True)
            return cls.REPORT_DIR
        except OSError:
            fallback = os.path.join(os.getcwd(), "uploads", "reports")
            os.makedirs(fallback, exist_ok=True)
            return fallback

    @classmethod
    def base_report_type(cls, report_type: Optional[str]) -> str:
        return cls.REPORT_TYPE_ALIASES.get((report_type or "sales").lower(), "sales")

    @staticmethod
    async def _collect_report_data(
        db: AsyncSession,
        base_type: str,
        report_type: str,
        data_range_start: Optional[date] = None,
        data_range_end: Optional[date] = None,
        filters: Optional[dict] = None,
    ):
        """Retourne (entêtes, lignes, montant_total) pour un rapport."""
        filters = filters or {}

        def _int_filter(name):
            value = filters.get(name)
            try:
                return int(value) if value not in (None, "", "all", "0") else None
            except (TypeError, ValueError):
                return None

        if base_type == "sales":
            query = select(Sale).options(selectinload(Sale.user))
            if data_range_start:
                query = query.where(Sale.created_at >= datetime.combine(data_range_start, time.min))
            if data_range_end:
                query = query.where(Sale.created_at <= datetime.combine(data_range_end, time.max))
            product_id = _int_filter("product_id")
            category_id = _int_filter("category_id")
            user_id = _int_filter("user_id")
            customer_id = _int_filter("customer_id")
            if product_id:
                query = query.where(
                    Sale.id.in_(select(SaleItem.sale_id).where(SaleItem.product_id == product_id))
                )
            if category_id:
                query = query.where(
                    Sale.id.in_(
                        select(SaleItem.sale_id).where(
                            SaleItem.product_id.in_(
                                select(Product.id).where(Product.category_id == category_id)
                            )
                        )
                    )
                )
            if user_id:
                query = query.where(Sale.user_id == user_id)
            if customer_id:
                query = query.where(Sale.customer_id == customer_id)
            query = query.order_by(Sale.created_at.desc())
            sales = (await db.execute(query)).scalars().all()
            headers = [
                "N° vente", "Date", "Caissier", "Statut", "Paiement",
                "Sous-total", "TVA", "Remise", "Total",
            ]
            rows = []
            total = 0.0
            for s in sales:
                cashier = getattr(s.user, "full_name", None) or getattr(s.user, "username", "") if s.user else ""
                total += float(s.total or 0)
                rows.append([
                    s.sale_number,
                    (s.created_at.strftime("%d/%m/%Y %H:%M") if s.created_at else ""),
                    cashier,
                    s.status,
                    s.payment_method or "",
                    f"{float(s.subtotal or 0):.2f}",
                    f"{float(s.tax_amount or 0):.2f}",
                    f"{float(s.discount or 0):.2f}",
                    f"{float(s.total or 0):.2f}",
                ])
            return headers, rows, total, len(sales)

        if base_type == "cash":
            query = select(Sale).options(selectinload(Sale.user)).where(Sale.status == "paid")
            if data_range_start:
                query = query.where(Sale.payment_date >= datetime.combine(data_range_start, time.min))
            if data_range_end:
                query = query.where(Sale.payment_date <= datetime.combine(data_range_end, time.max))
            payment_method = filters.get("payment_method")
            if payment_method and payment_method not in ("all", ""):
                query = query.where(Sale.payment_method == payment_method)
            user_id = _int_filter("user_id")
            if user_id:
                query = query.where(Sale.user_id == user_id)
            query = query.order_by(Sale.payment_date.desc().nullslast(), Sale.created_at.desc())
            sales = (await db.execute(query)).scalars().all()
            headers = ["N° vente", "Date paiement", "Caissier", "Mode de paiement", "Référence", "Total"]
            rows = []
            total = 0.0
            for s in sales:
                cashier = getattr(s.user, "full_name", None) or getattr(s.user, "username", "") if s.user else ""
                total += float(s.total or 0)
                paid_at = s.payment_date or s.created_at
                rows.append([
                    s.sale_number,
                    (paid_at.strftime("%d/%m/%Y %H:%M") if paid_at else ""),
                    cashier,
                    s.payment_method or "",
                    s.payment_reference or "",
                    f"{float(s.total or 0):.2f}",
                ])
            return headers, rows, total, len(sales)

        # Stock / inventaire / péremption / fournisseurs / retours
        if (report_type or "").lower() == "expiry":
            query = select(Batch).options(selectinload(Batch.product))
            limit_date = data_range_end or (date.today() + timedelta(days=90))
            query = query.where(Batch.expiry_date.is_not(None), Batch.expiry_date <= limit_date)
            query = query.order_by(Batch.expiry_date.asc())
            batches = (await db.execute(query)).scalars().all()
            headers = ["Produit", "Code-barres", "Lot", "Péremption", "Boîtes", "Vrac", "Emplacement"]
            rows = []
            total_value = 0.0
            for b in batches:
                product = b.product
                price = float(product.price or 0) if product else 0.0
                total_value += int(b.quantity or 0) * price
                rows.append([
                    product.name if product else "",
                    product.barcode if product else "",
                    b.batch_number,
                    b.expiry_date.strftime("%d/%m/%Y") if b.expiry_date else "",
                    int(b.quantity or 0),
                    int(getattr(b, "bulk_quantity", 0) or 0),
                    b.location or "",
                ])
            return headers, rows, total_value, len(batches)

        query = select(Product).options(selectinload(Product.category), selectinload(Product.batches))
        product_id = _int_filter("product_id")
        category_id = _int_filter("category_id")
        if product_id:
            query = query.where(Product.id == product_id)
        if category_id:
            query = query.where(Product.category_id == category_id)
        min_quantity = _int_filter("min_quantity")
        if min_quantity:
            query = query.where(Product.stock_min >= min_quantity)
        query = query.order_by(Product.name.asc())
        products = (await db.execute(query)).scalars().all()
        headers = [
            "ID", "Produit", "Code-barres", "Catégorie", "Boîtes", "Vrac",
            "Stock minimum", "Prix", "Valeur stock",
        ]
        rows = []
        total_value = 0.0
        for p in products:
            boxes = int(p.current_stock or 0)
            bulk = int(p.current_bulk_stock or 0)
            price = float(p.price or 0)
            bulk_price = float(p.bulk_unit_price or 0)
            value = boxes * price + bulk * bulk_price
            total_value += value
            rows.append([
                p.id,
                p.name,
                p.barcode or "",
                p.category.name if p.category else "",
                boxes,
                bulk,
                int(p.stock_min or 0),
                f"{price:.2f}",
                f"{value:.2f}",
            ])
        return headers, rows, total_value, len(products)

    @staticmethod
    def _build_csv(headers, rows) -> bytes:
        output = io.StringIO()
        writer = csv.writer(output, delimiter=";")
        writer.writerow(headers)
        for row in rows:
            writer.writerow(row)
        # BOM UTF-8 : Excel reconnaît les accents.
        return ("\ufeff" + output.getvalue()).encode("utf-8")

    @staticmethod
    def _build_pdf(title: str, subtitle: str, headers, rows, total_label: str, total_value: float) -> bytes:
        from reportlab.lib import colors
        from reportlab.lib.pagesizes import A4, landscape
        from reportlab.lib.styles import getSampleStyleSheet
        from reportlab.lib.units import mm
        from reportlab.platypus import LongTable, Paragraph, SimpleDocTemplate, Spacer, TableStyle

        buffer = io.BytesIO()
        doc = SimpleDocTemplate(
            buffer,
            pagesize=landscape(A4),
            leftMargin=12 * mm,
            rightMargin=12 * mm,
            topMargin=12 * mm,
            bottomMargin=12 * mm,
            title=title,
            author="Pharma 360",
        )
        styles = getSampleStyleSheet()
        elements = [
            Paragraph(title, styles["Title"]),
            Paragraph(subtitle, styles["Normal"]),
            Spacer(1, 6 * mm),
        ]
        data = [list(map(str, headers))] + [list(map(lambda v: "" if v is None else str(v), row)) for row in rows]
        if len(data) == 1:
            data.append(["Aucune donnée pour cette période"] + [""] * (len(headers) - 1))
        table = LongTable(data, repeatRows=1, hAlign="LEFT")
        table.setStyle(
            TableStyle([
                ("BACKGROUND", (0, 0), (-1, 0), colors.HexColor("#1d4ed8")),
                ("TEXTCOLOR", (0, 0), (-1, 0), colors.white),
                ("FONTNAME", (0, 0), (-1, 0), "Helvetica-Bold"),
                ("FONTSIZE", (0, 0), (-1, -1), 8),
                ("GRID", (0, 0), (-1, -1), 0.25, colors.HexColor("#cbd5e1")),
                ("ROWBACKGROUNDS", (0, 1), (-1, -1), [colors.white, colors.HexColor("#f8fafc")]),
                ("ALIGN", (0, 0), (-1, -1), "LEFT"),
                ("VALIGN", (0, 0), (-1, -1), "MIDDLE"),
                ("TOPPADDING", (0, 0), (-1, -1), 3),
                ("BOTTOMPADDING", (0, 0), (-1, -1), 3),
            ])
        )
        elements.append(table)
        elements.append(Spacer(1, 6 * mm))
        elements.append(
            Paragraph(f"<b>{total_label} : {total_value:,.2f} FCFA</b>", styles["Normal"])
        )
        elements.append(
            Paragraph(
                f"<i>Généré le {datetime.now().strftime('%d/%m/%Y à %H:%M')} par Pharma 360</i>",
                styles["Normal"],
            )
        )
        doc.build(elements)
        return buffer.getvalue()

    @classmethod
    def render_report_content(
        cls,
        title: str,
        report_type: str,
        headers,
        rows,
        total_value: float,
        file_format: str,
        data_range_start: Optional[date] = None,
        data_range_end: Optional[date] = None,
    ):
        """Retourne (contenu, extension, media_type)."""
        fmt = (file_format or "csv").lower()
        period = "Période non précisée"
        if data_range_start or data_range_end:
            period = "Du %s au %s" % (
                data_range_start.strftime("%d/%m/%Y") if data_range_start else "début",
                data_range_end.strftime("%d/%m/%Y") if data_range_end else "aujourd'hui",
            )
        base = cls.base_report_type(report_type)
        total_label = "Montant total" if base in ("sales", "cash") else "Valeur du stock"
        if fmt == "pdf":
            try:
                content = cls._build_pdf(title, period, headers, rows, total_label, total_value)
                return content, "pdf", "application/pdf"
            except Exception:
                # reportlab indisponible : on retombe proprement sur le CSV.
                fmt = "csv"
        content = cls._build_csv(headers, rows)
        return content, "csv", "text/csv; charset=utf-8"

    @classmethod
    async def generate_report_record(
        cls,
        db: AsyncSession,
        report_type: str,
        title: Optional[str] = None,
        description: Optional[str] = None,
        data_range_start: Optional[date] = None,
        data_range_end: Optional[date] = None,
        file_format: str = "pdf",
        filters: Optional[dict] = None,
        user_id: Optional[int] = None,
    ) -> Report:
        """Génère un rapport, l'enregistre et écrit son fichier téléchargeable."""
        base_type = cls.base_report_type(report_type)
        labels = {
            "sales": "Rapport de ventes",
            "stock": "Rapport de stock",
            "cash": "Rapport de caisse",
        }
        title = title or f"{labels.get(base_type, 'Rapport')} - {date.today().isoformat()}"
        description = description or (
            f"{labels.get(base_type, 'Rapport')} du "
            f"{data_range_start.isoformat() if data_range_start else 'début'} au "
            f"{data_range_end.isoformat() if data_range_end else date.today().isoformat()}"
        )
        filters = filters or {}

        headers, rows, total_amount, total_records = await cls._collect_report_data(
            db, base_type, report_type, data_range_start, data_range_end, filters
        )

        report = Report(
            report_type=(report_type or base_type).lower(),
            title=title,
            description=description,
            generated_by=user_id,
            parameters=json.dumps(
                {
                    "report_type": report_type,
                    "filters": filters,
                    "data_range_start": data_range_start.isoformat() if data_range_start else None,
                    "data_range_end": data_range_end.isoformat() if data_range_end else None,
                }
            ),
            file_format=file_format,
            data_range_start=data_range_start,
            data_range_end=data_range_end,
            total_records=total_records,
            total_amount=total_amount,
            status="generated",
        )
        db.add(report)
        await db.commit()
        await db.refresh(report)

        content, ext, _media = cls.render_report_content(
            title, report_type, headers, rows, total_amount, file_format,
            data_range_start, data_range_end,
        )
        report_dir = cls.get_report_dir()
        filename = f"report_{report.id}_{date.today().isoformat()}.{ext}"
        filepath = os.path.join(report_dir, filename)
        with open(filepath, "wb") as fh:
            fh.write(content)
        report.file_path = filepath
        report.file_format = ext
        await db.commit()
        await db.refresh(report)
        return report

    @classmethod
    async def build_report_file(cls, report: Report, db: AsyncSession):
        """Reconstruit le fichier d'un rapport (utilisé au téléchargement)."""
        try:
            params = json.loads(report.parameters or "{}")
        except (TypeError, ValueError):
            params = {}
        filters = params.get("filters") or {}
        base_type = cls.base_report_type(report.report_type)
        headers, rows, total_amount, _total_records = await cls._collect_report_data(
            db, base_type, report.report_type,
            report.data_range_start, report.data_range_end, filters,
        )
        content, ext, media_type = cls.render_report_content(
            report.title, report.report_type, headers, rows, total_amount,
            report.file_format or "csv", report.data_range_start, report.data_range_end,
        )
        filename = f"rapport_{report.id}_{date.today().isoformat()}.{ext}"
        return content, filename, media_type

    @staticmethod
    async def generate_sales_report(
        request: SalesReportRequest, db: AsyncSession, user_id: Optional[int] = None
    ) -> Report:
        """
        Generate a sales report based on the request parameters

        Args:
            request: SalesReportRequest with report parameters
            db: Database session
            user_id: ID of the user generating the report

        Returns:
            Generated Report object
        """
        # Build query for sales
        query = select(Sale)
        count_query = select(func.count()).select_from(Sale)
        amount_query = select(func.coalesce(func.sum(Sale.total), 0))

        # Apply filters
        if request.data_range_start:
            query = query.where(Sale.created_at >= request.data_range_start)
            count_query = count_query.where(Sale.created_at >= request.data_range_start)
            amount_query = amount_query.where(
                Sale.created_at >= request.data_range_start
            )

        if request.data_range_end:
            query = query.where(Sale.created_at <= request.data_range_end)
            count_query = count_query.where(Sale.created_at <= request.data_range_end)
            amount_query = amount_query.where(Sale.created_at <= request.data_range_end)

        if request.product_id:
            query = query.where(
                Sale.id.in_(
                    select(SaleItem.sale_id).where(
                        SaleItem.product_id == request.product_id
                    )
                )
            )

        if request.category_id:
            query = query.where(
                Sale.id.in_(
                    select(SaleItem.sale_id).where(
                        SaleItem.product_id.in_(
                            select(Product.id).where(
                                Product.category_id == request.category_id
                            )
                        )
                    )
                )
            )

        if request.user_id:
            query = query.where(Sale.user_id == request.user_id)

        if request.customer_id:
            query = query.where(Sale.customer_id == request.customer_id)

        # Execute queries
        total_result = await db.execute(count_query)
        total_records = total_result.scalar() or 0

        amount_result = await db.execute(amount_query)
        total_amount = float(amount_result.scalar() or 0)

        # Create report record
        report = Report(
            report_type=request.report_type,
            title=f"Rapport de Ventes - {date.today().isoformat()}",
            description=f"Rapport de ventes du {request.data_range_start or 'début'} au {request.data_range_end or 'fin'}",
            generated_by=user_id,
            parameters=json.dumps(
                {
                    "report_type": request.report_type,
                    "data_range_start": (
                        request.data_range_start.isoformat()
                        if request.data_range_start
                        else None
                    ),
                    "data_range_end": (
                        request.data_range_end.isoformat()
                        if request.data_range_end
                        else None
                    ),
                    "filters": request.filters,
                }
            ),
            file_format=request.file_format,
            data_range_start=request.data_range_start,
            data_range_end=request.data_range_end,
            total_records=total_records,
            total_amount=total_amount,
            status="generated",
        )

        db.add(report)
        await db.commit()
        await db.refresh(report)

        return report

    @staticmethod
    async def generate_stock_report(
        request: StockReportRequest, db: AsyncSession, user_id: Optional[int] = None
    ) -> Report:
        """
        Generate a stock report based on the request parameters

        Args:
            request: StockReportRequest with report parameters
            db: Database session
            user_id: ID of the user generating the report

        Returns:
            Generated Report object
        """
        # Build query for products/stocks
        query = select(Product)

        # Apply filters
        if request.product_id:
            query = query.where(Product.id == request.product_id)

        if request.category_id:
            query = query.where(Product.category_id == request.category_id)

        if request.min_quantity:
            query = query.where(Product.current_stock >= request.min_quantity)

        # Execute query
        result = await db.execute(query)
        products = result.scalars().all()

        total_records = len(products)
        total_value = sum(
            int(p.current_stock or 0) * float(p.price or 0)
            + int(p.current_bulk_stock or 0) * float(p.bulk_unit_price or 0)
            for p in products
        )

        # Create report record
        report = Report(
            report_type=request.report_type,
            title=f"Rapport de Stock - {date.today().isoformat()}",
            description=f"Rapport de stock - {request.report_type}",
            generated_by=user_id,
            parameters=json.dumps(
                {
                    "report_type": request.report_type,
                    "min_quantity": request.min_quantity,
                    "show_expiring_soon": request.show_expiring_soon,
                }
            ),
            file_format=request.file_format,
            data_range_start=date.today(),
            data_range_end=date.today(),
            total_records=total_records,
            total_amount=total_value,
            status="generated",
        )

        db.add(report)
        await db.commit()
        await db.refresh(report)

        return report

    @staticmethod
    async def generate_cash_report(
        request: CashReportRequest, db: AsyncSession, user_id: Optional[int] = None
    ) -> Report:
        """
        Generate a cash register report

        Args:
            request: CashReportRequest with report parameters
            db: Database session
            user_id: ID of the user generating the report

        Returns:
            Generated Report object
        """
        # Build query
        query = select(Sale)
        count_query = select(func.count()).select_from(Sale)
        amount_query = select(func.coalesce(func.sum(Sale.total), 0))

        # Apply filters
        if request.data_range_start:
            query = query.where(Sale.created_at >= request.data_range_start)
            count_query = count_query.where(Sale.created_at >= request.data_range_start)
            amount_query = amount_query.where(
                Sale.created_at >= request.data_range_start
            )

        if request.data_range_end:
            query = query.where(Sale.created_at <= request.data_range_end)
            count_query = count_query.where(Sale.created_at <= request.data_range_end)
            amount_query = amount_query.where(Sale.created_at <= request.data_range_end)

        if request.user_id:
            query = query.where(Sale.user_id == request.user_id)
            count_query = count_query.where(Sale.user_id == request.user_id)
            amount_query = amount_query.where(Sale.user_id == request.user_id)

        # Execute queries
        total_result = await db.execute(count_query)
        total_records = total_result.scalar() or 0

        amount_result = await db.execute(amount_query)
        total_amount = float(amount_result.scalar() or 0)

        # Create report record
        report = Report(
            report_type=request.report_type,
            title=f"Rapport de Caisse - {date.today().isoformat()}",
            description=f"Rapport de caisse du {request.data_range_start or 'début'} au {request.data_range_end or 'fin'}",
            generated_by=user_id,
            parameters=json.dumps(
                {
                    "report_type": request.report_type,
                    "user_id": request.user_id,
                    "payment_method": request.payment_method,
                }
            ),
            file_format=request.file_format,
            data_range_start=request.data_range_start,
            data_range_end=request.data_range_end,
            total_records=total_records,
            total_amount=total_amount,
            status="generated",
        )

        db.add(report)
        await db.commit()
        await db.refresh(report)

        return report

    @staticmethod
    async def get_report_by_id(report_id: int, db: AsyncSession) -> Optional[Report]:
        """Get a report by ID"""
        result = await db.execute(select(Report).where(Report.id == report_id))
        return result.scalar_one_or_none()

    @staticmethod
    async def list_reports(
        page: int = 1,
        page_size: int = 20,
        report_type: Optional[str] = None,
        user_id: Optional[int] = None,
        status: Optional[str] = None,
        date_from: Optional[date] = None,
        date_to: Optional[date] = None,
        db: AsyncSession = None,
    ) -> ReportListResponse:
        """List reports with pagination and filters"""
        from ..schemas.report import ReportResponse

        offset = (page - 1) * page_size

        # Build query
        query = select(Report).options(selectinload(Report.generated_by_user))
        count_query = select(func.count()).select_from(Report)

        # Apply filters
        if report_type:
            query = query.where(Report.report_type == report_type)
            count_query = count_query.where(Report.report_type == report_type)

        if user_id:
            query = query.where(Report.generated_by == user_id)
            count_query = count_query.where(Report.generated_by == user_id)

        if status:
            query = query.where(Report.status == status)
            count_query = count_query.where(Report.status == status)

        if date_from:
            query = query.where(
                Report.generated_at
                >= datetime(date_from.year, date_from.month, date_from.day)
            )
            count_query = count_query.where(
                Report.generated_at
                >= datetime(date_from.year, date_from.month, date_from.day)
            )

        if date_to:
            query = query.where(
                Report.generated_at
                <= datetime(date_to.year, date_to.month, date_to.day, 23, 59, 59)
            )
            count_query = count_query.where(
                Report.generated_at
                <= datetime(date_to.year, date_to.month, date_to.day, 23, 59, 59)
            )

        # Execute count query
        total_result = await db.execute(count_query)
        total = total_result.scalar()

        # Execute main query
        query = (
            query.offset(offset).limit(page_size).order_by(Report.generated_at.desc())
        )
        result = await db.execute(query)
        reports = result.scalars().all()

        # Convert to response objects
        report_responses = []
        for report in reports:
            response = ReportResponse.model_validate(report)
            if report.generated_by_user:
                response.generated_by_name = report.generated_by_user.full_name
            report_responses.append(response)

        # Calculate pagination
        total_pages = (total + page_size - 1) // page_size

        return ReportListResponse(
            reports=report_responses,
            total=total,
            page=page,
            page_size=page_size,
            total_pages=total_pages,
        )

    @staticmethod
    async def get_report_stats(db: AsyncSession) -> ReportStatsResponse:
        """Get overall report statistics"""
        # Get sales statistics
        sales_query = select(
            func.count(Sale.id),
            func.coalesce(func.sum(Sale.total), 0),
            func.coalesce(func.avg(Sale.total), 0),
        )
        result = await db.execute(sales_query)
        total_sales, total_revenue, avg_sale = result.one()

        # Get top products
        top_products_query = (
            select(
                Product.id,
                Product.name,
                func.coalesce(func.sum(SaleItem.quantity), 0).label("total_quantity"),
                func.coalesce(func.sum(SaleItem.total_price), 0).label("total_revenue"),
            )
            .join(SaleItem, SaleItem.product_id == Product.id)
            .group_by(Product.id, Product.name)
            .order_by(desc("total_revenue"))
            .limit(10)
        )

        result = await db.execute(top_products_query)
        top_products = []
        for row in result:
            top_products.append(
                {
                    "product_id": row.id,
                    "product_name": row.name,
                    "total_quantity": int(row.total_quantity or 0),
                    "total_revenue": float(row.total_revenue or 0),
                }
            )

        # Get sales by category
        category_query = (
            select(
                Category.id,
                Category.name,
                func.coalesce(func.sum(SaleItem.total_price), 0).label("total_revenue"),
            )
            .join(Product, Product.category_id == Category.id)
            .join(SaleItem, SaleItem.product_id == Product.id)
            .group_by(Category.id, Category.name)
        )

        result = await db.execute(category_query)
        sales_by_category = {}
        for row in result:
            sales_by_category[row.name] = float(row.total_revenue or 0)

        # Get sales by day (last 7 days)
        sales_by_day_query = (
            select(
                func.date(Sale.created_at).label("sale_date"),
                func.coalesce(func.sum(Sale.total), 0).label("total_amount"),
            )
            .where(Sale.created_at >= date.today() - timedelta(days=7))
            .group_by(func.date(Sale.created_at))
            .order_by("sale_date")
        )

        result = await db.execute(sales_by_day_query)
        sales_by_day = {}
        for row in result:
            sales_by_day[row.sale_date.isoformat()] = float(row.total_amount or 0)

        # Get total items
        items_query = select(func.count(SaleItem.id))
        result = await db.execute(items_query)
        total_items = result.scalar() or 0

        return ReportStatsResponse(
            total_sales=float(total_revenue or 0),
            total_items=total_items,
            total_revenue=float(total_revenue or 0),
            average_sale=float(avg_sale or 0),
            top_products=top_products,
            sales_by_category=sales_by_category,
            sales_by_day=sales_by_day,
        )

    @staticmethod
    async def delete_report(report_id: int, db: AsyncSession) -> bool:
        """Delete a report by ID"""
        report = await ReportService.get_report_by_id(report_id, db)

        if report:
            # Delete file if exists
            if report.file_path and os.path.exists(report.file_path):
                try:
                    os.remove(report.file_path)
                except:
                    pass

            await db.delete(report)
            await db.commit()
            return True

        return False


# Singleton instance
report_service = ReportService()
