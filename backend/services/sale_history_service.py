"""
Sale History Service for Pharmacie 360 Backend
Business logic for sale history and analytics
"""

from datetime import date, datetime, timedelta
from typing import Optional, List
from decimal import Decimal

from sqlalchemy import select, func, and_, or_, desc, asc, extract, between
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import joinedload

from ..models.sale_history import SaleHistory
from ..models.sale import Sale
from ..models.product import Product
from ..models.batch import Batch
from ..models.category import Category
from ..schemas.sale_history import (
    SaleHistoryCreate,
    SaleHistoryResponse,
    SaleHistoryListResponse,
    SaleAnalyticsResponse,
    ProductSalesAnalytics,
    DailySalesResponse,
    MonthlySalesResponse,
)


class SaleHistoryService:
    """Service class for sale history operations"""

    @staticmethod
    async def create_history_record(
        history_data: SaleHistoryCreate,
        db: AsyncSession
    ) -> SaleHistoryResponse:
        """Create a new sale history record"""
        new_record = SaleHistory(
            sale_id=history_data.sale_id,
            sale_number=history_data.sale_number,
            product_id=history_data.product_id,
            product_name=history_data.product_name,
            batch_id=history_data.batch_id,
            batch_number=history_data.batch_number,
            quantity=history_data.quantity,
            unit_price=history_data.unit_price,
            total_price=history_data.total_price,
            sale_date=history_data.sale_date,
            sale_day=history_data.sale_day,
            cashier_id=history_data.cashier_id,
            cashier_name=history_data.cashier_name,
            customer_id=history_data.customer_id,
            customer_name=history_data.customer_name,
        )
        
        db.add(new_record)
        await db.flush()
        await db.refresh(new_record)
        
        return SaleHistoryResponse.model_validate(new_record)

    @staticmethod
    async def create_history_from_sale(
        sale: Sale,
        db: AsyncSession
    ) -> list[SaleHistoryResponse]:
        """Create history records from a sale"""
        history_records = []
        
        for item in sale.items:
            history_data = SaleHistoryCreate(
                sale_id=sale.id,
                sale_number=sale.sale_number,
                product_id=item.product_id,
                product_name=item.product_name,
                batch_id=item.batch_id,
                batch_number=item.batch_number,
                quantity=item.quantity,
                unit_price=item.unit_price,
                total_price=item.total_price,
                sale_date=sale.created_at,
                sale_day=sale.created_at.date(),
                cashier_id=sale.cashier_id,
                cashier_name=sale.cashier.name if sale.cashier else None,
                customer_id=sale.customer_id,
                customer_name=sale.customer.name if sale.customer else None,
            )
            
            record = await SaleHistoryService.create_history_record(history_data, db)
            history_records.append(record)
        
        return history_records

    @staticmethod
    async def list_history(
        page: int = 1,
        page_size: int = 20,
        start_date: Optional[date] = None,
        end_date: Optional[date] = None,
        product_id: Optional[int] = None,
        category_id: Optional[int] = None,
        db: AsyncSession = None
    ) -> SaleHistoryListResponse:
        """List sale history with filters"""
        query = select(SaleHistory)
        
        # Apply filters
        if start_date:
            query = query.where(SaleHistory.sale_day >= start_date)
        
        if end_date:
            query = query.where(SaleHistory.sale_day <= end_date)
        
        if product_id:
            query = query.where(SaleHistory.product_id == product_id)
        
        if category_id:
            # Join with product to filter by category
            query = query.join(
                Product, 
                SaleHistory.product_id == Product.id
            ).where(Product.category_id == category_id)
        
        # Count total
        count_result = await db.execute(select(func.count()).select_from(query.subquery()))
        total = count_result.scalar_one()
        
        # Apply pagination and ordering
        query = query.order_by(desc(SaleHistory.sale_date))
        query = query.offset((page - 1) * page_size).limit(page_size)
        
        result = await db.execute(query)
        history = result.scalars().all()
        
        # Convert to response
        history_responses = [
            SaleHistoryResponse.model_validate(record)
            for record in history
        ]
        
        total_pages = (total + page_size - 1) // page_size
        
        return SaleHistoryListResponse(
            history=history_responses,
            total=total,
            page=page,
            page_size=page_size,
            total_pages=total_pages
        )

    @staticmethod
    async def get_daily_sales(
        target_date: Optional[date] = None,
        db: AsyncSession = None
    ) -> list[DailySalesResponse]:
        """Get daily sales summary"""
        if target_date is None:
            target_date = date.today()
        
        # Query for the specific day
        query = select(
            SaleHistory.sale_day,
            func.count(SaleHistory.id).label("total_sales"),
            func.sum(SaleHistory.quantity).label("total_quantity"),
            func.sum(SaleHistory.total_price).label("total_revenue"),
            func.avg(SaleHistory.total_price).label("avg_sale")
        ).select_from(SaleHistory)
        
        query = query.where(SaleHistory.sale_day == target_date)
        query = query.group_by(SaleHistory.sale_day)
        
        result = await db.execute(query)
        row = result.one_or_none()
        
        if not row:
            return []
        
        # Get top product for the day
        top_product_result = await db.execute(
            select(
                SaleHistory.product_id,
                SaleHistory.product_name,
                func.sum(SaleHistory.quantity).label("total_quantity"),
                func.sum(SaleHistory.total_price).label("total_revenue")
            )
            .select_from(SaleHistory)
            .where(SaleHistory.sale_day == target_date)
            .group_by(SaleHistory.product_id, SaleHistory.product_name)
            .order_by(desc("total_quantity"))
            .limit(1)
        )
        top_product_row = top_product_result.one_or_none()
        
        top_product = None
        if top_product_row:
            top_product = {
                "product_id": top_product_row.product_id,
                "product_name": top_product_row.product_name,
                "quantity": top_product_row.total_quantity,
                "revenue": float(top_product_row.total_revenue)
            }
        
        return [
            DailySalesResponse(
                date=target_date,
                total_sales=row.total_sales,
                total_quantity=row.total_quantity,
                total_revenue=float(row.total_revenue),
                average_sale=float(row.avg_sale) if row.avg_sale else 0.0,
                top_product=top_product
            )
        ]

    @staticmethod
    async def get_monthly_sales(
        year: Optional[int] = None,
        db: AsyncSession = None
    ) -> list[MonthlySalesResponse]:
        """Get monthly sales summary"""
        if year is None:
            year = datetime.now().year
        
        # Query for each month
        query = select(
            extract('year', SaleHistory.sale_date).label("year"),
            extract('month', SaleHistory.sale_date).label("month"),
            func.count(SaleHistory.id).label("total_sales"),
            func.sum(SaleHistory.quantity).label("total_quantity"),
            func.sum(SaleHistory.total_price).label("total_revenue")
        ).select_from(SaleHistory)
        
        query = query.where(extract('year', SaleHistory.sale_date) == year)
        query = query.group_by("year", "month")
        query = query.order_by("year", "month")
        
        result = await db.execute(query)
        rows = result.all()
        
        monthly_sales = []
        for i, row in enumerate(rows):
            # Calculate growth rate (skip for first month)
            growth_rate = 0.0
            if i > 0:
                prev_revenue = float(rows[i-1].total_revenue) if rows[i-1].total_revenue else 0
                curr_revenue = float(row.total_revenue) if row.total_revenue else 0
                if prev_revenue > 0:
                    growth_rate = ((curr_revenue - prev_revenue) / prev_revenue) * 100
            
            monthly_sales.append(
                MonthlySalesResponse(
                    year=int(row.year),
                    month=int(row.month),
                    total_sales=row.total_sales,
                    total_quantity=row.total_quantity,
                    total_revenue=float(row.total_revenue),
                    growth_rate=growth_rate
                )
            )
        
        return monthly_sales

    @staticmethod
    async def get_product_sales_analytics(
        product_id: int,
        db: AsyncSession = None
    ) -> ProductSalesAnalytics:
        """Get sales analytics for a specific product"""
        # Get product info
        product_result = await db.execute(
            select(Product).where(Product.id == product_id)
        )
        product = product_result.scalar_one_or_none()
        
        if not product:
            raise ValueError("Product not found")
        
        # Get sales data for this product
        query = select(
            func.count(SaleHistory.id).label("sales_count"),
            func.sum(SaleHistory.quantity).label("total_quantity"),
            func.sum(SaleHistory.total_price).label("total_revenue"),
            func.avg(SaleHistory.unit_price).label("avg_price"),
            func.min(SaleHistory.sale_date).label("first_sale"),
            func.max(SaleHistory.sale_date).label("last_sale")
        ).select_from(SaleHistory)
        
        query = query.where(SaleHistory.product_id == product_id)
        
        result = await db.execute(query)
        row = result.one_or_none()
        
        if not row:
            return ProductSalesAnalytics(
                product_id=product_id,
                product_name=product.name,
                total_quantity=0,
                total_revenue=0.0,
                average_price=0.0,
                sales_count=0,
                first_sale=None,
                last_sale=None,
                sales_trend="stable"
            )
        
        # Determine trend (simple calculation based on recent vs older sales)
        # Get sales from last 30 days
        thirty_days_ago = datetime.now() - timedelta(days=30)
        recent_result = await db.execute(
            select(func.sum(SaleHistory.quantity))
            .select_from(SaleHistory)
            .where(
                and_(
                    SaleHistory.product_id == product_id,
                    SaleHistory.sale_date >= thirty_days_ago
                )
            )
        )
        recent_quantity = recent_result.scalar_one_or_none() or 0
        
        # Get sales from 30-60 days ago
        sixty_days_ago = datetime.now() - timedelta(days=60)
        older_result = await db.execute(
            select(func.sum(SaleHistory.quantity))
            .select_from(SaleHistory)
            .where(
                and_(
                    SaleHistory.product_id == product_id,
                    SaleHistory.sale_date >= sixty_days_ago,
                    SaleHistory.sale_date < thirty_days_ago
                )
            )
        )
        older_quantity = older_result.scalar_one_or_none() or 0
        
        # Determine trend
        if older_quantity == 0 and recent_quantity > 0:
            sales_trend = "increasing"
        elif recent_quantity == 0 and older_quantity > 0:
            sales_trend = "decreasing"
        elif recent_quantity > older_quantity * 1.1:
            sales_trend = "increasing"
        elif recent_quantity < older_quantity * 0.9:
            sales_trend = "decreasing"
        else:
            sales_trend = "stable"
        
        return ProductSalesAnalytics(
            product_id=product_id,
            product_name=product.name,
            total_quantity=row.total_quantity,
            total_revenue=float(row.total_revenue),
            average_price=float(row.avg_price) if row.avg_price else 0.0,
            sales_count=row.sales_count,
            first_sale=row.first_sale,
            last_sale=row.last_sale,
            sales_trend=sales_trend
        )

    @staticmethod
    async def get_sale_analytics(
        period: str = "month",
        start_date: Optional[date] = None,
        end_date: Optional[date] = None,
        db: AsyncSession = None
    ) -> SaleAnalyticsResponse:
        """Get comprehensive sale analytics"""
        if end_date is None:
            end_date = date.today()
        
        if start_date is None:
            if period == "day":
                start_date = end_date
            elif period == "week":
                start_date = end_date - timedelta(days=6)
            elif period == "month":
                start_date = end_date - timedelta(days=29)
            elif period == "year":
                start_date = end_date - timedelta(days=364)
        
        # Get basic stats
        total_sales_result = await db.execute(
            select(func.count(SaleHistory.id))
            .select_from(SaleHistory)
            .where(between(SaleHistory.sale_day, start_date, end_date))
        )
        total_sales = total_sales_result.scalar_one()
        
        total_quantity_result = await db.execute(
            select(func.sum(SaleHistory.quantity))
            .select_from(SaleHistory)
            .where(between(SaleHistory.sale_day, start_date, end_date))
        )
        total_quantity = total_quantity_result.scalar_one() or 0
        
        total_revenue_result = await db.execute(
            select(func.sum(SaleHistory.total_price))
            .select_from(SaleHistory)
            .where(between(SaleHistory.sale_day, start_date, end_date))
        )
        total_revenue = total_revenue_result.scalar_one() or 0.0
        
        average_sale = total_revenue / total_sales if total_sales > 0 else 0.0
        
        # Get top products
        top_products_result = await db.execute(
            select(
                SaleHistory.product_id,
                SaleHistory.product_name,
                func.sum(SaleHistory.quantity).label("total_quantity"),
                func.sum(SaleHistory.total_price).label("total_revenue")
            )
            .select_from(SaleHistory)
            .where(between(SaleHistory.sale_day, start_date, end_date))
            .group_by(SaleHistory.product_id, SaleHistory.product_name)
            .order_by(desc("total_quantity"))
            .limit(10)
        )
        top_products = [
            {
                "product_id": row.product_id,
                "product_name": row.product_name,
                "quantity": row.total_quantity,
                "revenue": float(row.total_revenue)
            }
            for row in top_products_result.all()
        ]
        
        # Get sales by day
        sales_by_day_result = await db.execute(
            select(
                SaleHistory.sale_day,
                func.count(SaleHistory.id).label("count"),
                func.sum(SaleHistory.total_price).label("revenue")
            )
            .select_from(SaleHistory)
            .where(between(SaleHistory.sale_day, start_date, end_date))
            .group_by(SaleHistory.sale_day)
            .order_by(SaleHistory.sale_day)
        )
        sales_by_day = [
            {
                "date": row.sale_day.isoformat(),
                "count": row.count,
                "revenue": float(row.revenue)
            }
            for row in sales_by_day_result.all()
        ]
        
        # Get sales by category
        sales_by_category_result = await db.execute(
            select(
                Category.id.label("category_id"),
                Category.name.label("category_name"),
                func.count(SaleHistory.id).label("count"),
                func.sum(SaleHistory.total_price).label("revenue")
            )
            .select_from(SaleHistory)
            .join(Product, SaleHistory.product_id == Product.id)
            .join(Category, Product.category_id == Category.id)
            .where(between(SaleHistory.sale_day, start_date, end_date))
            .group_by("category_id", "category_name")
        )
        sales_by_category = [
            {
                "category_id": row.category_id,
                "category_name": row.category_name,
                "count": row.count,
                "revenue": float(row.revenue)
            }
            for row in sales_by_category_result.all()
        ]
        
        return SaleAnalyticsResponse(
            period=period,
            start_date=start_date,
            end_date=end_date,
            total_sales=total_sales,
            total_quantity=total_quantity,
            total_revenue=float(total_revenue),
            average_sale=float(average_sale),
            top_products=top_products,
            sales_by_day=sales_by_day,
            sales_by_category=sales_by_category
        )


# Create service instance
sale_history_service = SaleHistoryService()
