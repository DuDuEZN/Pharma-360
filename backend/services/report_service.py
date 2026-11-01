"""
Report Service for Pharmacie 360 Backend
Service for generating various reports (sales, stock, cash)
"""

import json
import os
from datetime import date, datetime, timedelta
from typing import Any, Dict
from typing import List as ListType
from typing import Optional

from sqlalchemy import and_, asc, desc, func, or_, select
from sqlalchemy.ext.asyncio import AsyncSession

from ..models.batch import Batch
from ..models.category import Category
from ..models.product import Product
from ..models.report import Report
from ..models.sale import Sale
from ..models.sale_item import SaleItem
from ..models.user import User
from ..schemas.report import (CashReportRequest, ReportCreate,
                              ReportListResponse, ReportResponse,
                              ReportStatsResponse, SalesReportRequest,
                              StockReportRequest)


class ReportService:
    """Service for generating and managing reports"""

    # Report directory for storing generated files
    REPORT_DIR = "./reports"

    @classmethod
    def get_report_dir(cls) -> str:
        """Get or create report directory"""
        if not os.path.exists(cls.REPORT_DIR):
            os.makedirs(cls.REPORT_DIR, exist_ok=True)
        return cls.REPORT_DIR

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
        amount_query = select(func.coalesce(func.sum(Sale.total_amount), 0))

        # Apply filters
        if request.data_range_start:
            query = query.where(Sale.sale_date >= request.data_range_start)
            count_query = count_query.where(Sale.sale_date >= request.data_range_start)
            amount_query = amount_query.where(
                Sale.sale_date >= request.data_range_start
            )

        if request.data_range_end:
            query = query.where(Sale.sale_date <= request.data_range_end)
            count_query = count_query.where(Sale.sale_date <= request.data_range_end)
            amount_query = amount_query.where(Sale.sale_date <= request.data_range_end)

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
        total_value = sum(p.current_stock * p.selling_price for p in products)

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
        amount_query = select(func.coalesce(func.sum(Sale.total_amount), 0))

        # Apply filters
        if request.data_range_start:
            query = query.where(Sale.sale_date >= request.data_range_start)
            count_query = count_query.where(Sale.sale_date >= request.data_range_start)
            amount_query = amount_query.where(
                Sale.sale_date >= request.data_range_start
            )

        if request.data_range_end:
            query = query.where(Sale.sale_date <= request.data_range_end)
            count_query = count_query.where(Sale.sale_date <= request.data_range_end)
            amount_query = amount_query.where(Sale.sale_date <= request.data_range_end)

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
        query = select(Report)
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
            func.coalesce(func.sum(Sale.total_amount), 0),
            func.coalesce(func.avg(Sale.total_amount), 0),
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
                func.date(Sale.sale_date).label("sale_date"),
                func.coalesce(func.sum(Sale.total_amount), 0).label("total_amount"),
            )
            .where(Sale.sale_date >= date.today() - timedelta(days=7))
            .group_by(func.date(Sale.sale_date))
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
