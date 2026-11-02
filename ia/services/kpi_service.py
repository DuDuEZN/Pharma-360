"""
KPI Service for Pharmacie 360
Automatic KPI generation and analytics
"""

import asyncio
from datetime import datetime, timedelta
from typing import Any, Dict, List, Optional

from ia.core.config import settings


class KPIService:
    """
    Service for automatic KPI generation
    Calculates and tracks key performance indicators
    """

    def __init__(self):
        self.cache_ttl = 3600  # Default cache TTL in seconds

    async def get_current_kpis(self) -> Dict[str, Any]:
        """KPIs du jour (utilisé par le dashboard IA)"""
        return await self.generate_daily_kpis()

    async def health_check(self) -> Dict[str, Any]:
        """Etat du service KPI (utilisé par /api/v1/dashboard/health)"""
        return {"status": "healthy", "service": "KPI Generation", "version": "1.0.0"}

    async def generate_daily_kpis(self, date: Optional[str] = None) -> Dict[str, Any]:
        """
        Generate daily KPIs

        Args:
            date: Optional date string (YYYY-MM-DD)

        Returns:
            Dictionary with daily KPIs
        """
        target_date = date or datetime.now().strftime("%Y-%m-%d")

        try:
            # Get sales data
            sales_stats = await self._get_sales_stats(target_date)

            # Get stock data
            stock_stats = await self._get_stock_stats()

            # Get supplier data
            supplier_stats = await self._get_supplier_stats(target_date)

            return {
                "date": target_date,
                "generated_at": datetime.now().isoformat(),
                "sales": sales_stats,
                "stock": stock_stats,
                "suppliers": supplier_stats,
                "overall": await self._calculate_overall_score(
                    sales_stats, stock_stats, supplier_stats
                ),
            }

        except Exception as e:
            return {"status": "error", "error": str(e), "date": target_date}

    async def generate_weekly_kpis(
        self, start_date: Optional[str] = None
    ) -> Dict[str, Any]:
        """
        Generate weekly KPIs

        Args:
            start_date: Optional start date (YYYY-MM-DD)

        Returns:
            Dictionary with weekly KPIs
        """
        if not start_date:
            # Start from Monday of current week
            today = datetime.now()
            start_date = (today - timedelta(days=today.weekday())).strftime("%Y-%m-%d")

        end_date = (
            datetime.strptime(start_date, "%Y-%m-%d") + timedelta(days=6)
        ).strftime("%Y-%m-%d")

        try:
            # Aggregate daily KPIs for the week
            daily_kpis = []
            current_date = datetime.strptime(start_date, "%Y-%m-%d")

            for _ in range(7):
                date_str = current_date.strftime("%Y-%m-%d")
                daily_kpi = await self.generate_daily_kpis(date_str)
                daily_kpis.append(daily_kpi)
                current_date += timedelta(days=1)

            # Calculate weekly aggregates
            weekly_data = self._aggregate_weekly_data(daily_kpis)

            return {
                "start_date": start_date,
                "end_date": end_date,
                "generated_at": datetime.now().isoformat(),
                "daily_breakdown": daily_kpis,
                **weekly_data,
            }

        except Exception as e:
            return {
                "status": "error",
                "error": str(e),
                "start_date": start_date,
                "end_date": end_date,
            }

    async def generate_monthly_kpis(self, year: int, month: int) -> Dict[str, Any]:
        """
        Generate monthly KPIs

        Args:
            year: Year
            month: Month (1-12)

        Returns:
            Dictionary with monthly KPIs
        """
        try:
            # Mock monthly data for standalone IA service
            start_date = f"{year}-{month:02d}-01"
            end_date = (datetime(year, month, 1) + timedelta(days=32)).replace(
                day=1
            ) - timedelta(days=1)
            end_date_str = end_date.strftime("%Y-%m-%d")

            # Mock data
            total_sales = 0
            total_revenue = 0.0
            avg_sale_value = 0.0

            # Get stock metrics
            stock_stats = await self._get_stock_stats()

            # Mock top products
            top_products = []

            return {
                "year": year,
                "month": month,
                "start_date": start_date,
                "end_date": end_date_str,
                "generated_at": datetime.now().isoformat(),
                "sales": {
                    "total": total_sales,
                    "total_revenue": total_revenue,
                    "average_sale_value": avg_sale_value,
                    "daily_average": total_sales / end_date.day,
                },
                "stock": stock_stats,
                "top_products": top_products,
                "overall": await self._calculate_overall_score(
                    {"total": total_sales, "total_revenue": total_revenue},
                    stock_stats,
                    {},
                ),
            }

        except Exception as e:
            return {"status": "error", "error": str(e), "year": year, "month": month}

    async def _get_sales_stats(self, date: str) -> Dict[str, Any]:
        """Get sales statistics for a specific date"""
        try:
            # Mock sales data for standalone IA service
            # In production, this would fetch from backend
            total_sales = 0
            total_revenue = 0.0
            avg_sale_value = 0.0

            # Mock hourly distribution
            hourly_sales = {}

            return {
                "date": date,
                "total_sales": total_sales,
                "total_revenue": total_revenue,
                "average_sale_value": avg_sale_value,
                "hourly_distribution": hourly_sales,
                "peak_hour": None,
            }

        except Exception as e:
            return {"date": date, "error": str(e)}

    async def _get_stock_stats(self) -> Dict[str, Any]:
        """Get stock statistics - Mock data for standalone IA service"""
        try:
            # Mock data - In production, this would fetch from backend
            return {
                "total_batches": 0,
                "total_quantity": 0,
                "expiring_soon": 0,
                "low_stock": 0,
                "category_distribution": {},
            }

        except Exception as e:
            return {"error": str(e)}

    async def _get_supplier_stats(self, date: str) -> Dict[str, Any]:
        """Get supplier statistics - Mock data for standalone IA service"""
        try:
            # Mock data - In production, this would fetch from backend
            return {
                "total_suppliers": 0,
                "active_suppliers": 0,
                "invoices_received": 0,
                "total_invoice_value": 0.0,
            }

        except Exception as e:
            return {"error": str(e)}

    async def _get_top_products(
        self, start_date: str, end_date: str, limit: int = 5
    ) -> List[Dict[str, Any]]:
        """Get top selling products - Mock data for standalone IA service"""
        try:
            # Mock data - In production, this would fetch from backend
            return []

        except Exception as e:
            return []

    async def _calculate_overall_score(
        self,
        sales_data: Dict[str, Any],
        stock_data: Dict[str, Any],
        supplier_data: Dict[str, Any],
    ) -> Dict[str, Any]:
        """Calculate overall performance score"""
        score = 0
        max_score = 0
        metrics = {}

        # Sales metrics (weight: 40%)
        if "total_sales" in sales_data:
            sales_score = min(sales_data["total_sales"] / 100, 100)  # Cap at 100
            score += sales_score * 0.4
            max_score += 40
            metrics["sales"] = sales_score

        # Stock metrics (weight: 30%)
        if "low_stock" in stock_data and "expiring_soon" in stock_data:
            stock_health = 100 - (
                (stock_data["low_stock"] + stock_data["expiring_soon"]) * 10
            )
            stock_score = max(min(stock_health, 100), 0)
            score += stock_score * 0.3
            max_score += 30
            metrics["stock"] = stock_score

        # Supplier metrics (weight: 30%)
        if "active_suppliers" in supplier_data and "total_suppliers" in supplier_data:
            if supplier_data["total_suppliers"] > 0:
                supplier_score = (
                    supplier_data["active_suppliers"] / supplier_data["total_suppliers"]
                ) * 100
            else:
                supplier_score = 0
            score += supplier_score * 0.3
            max_score += 30
            metrics["suppliers"] = supplier_score

        overall_score = (score / max_score * 100) if max_score > 0 else 0

        return {
            "score": overall_score,
            "grade": self._get_grade(overall_score),
            "metrics": metrics,
        }

    def _get_grade(self, score: float) -> str:
        """Get letter grade based on score"""
        if score >= 90:
            return "A"
        elif score >= 80:
            return "B"
        elif score >= 70:
            return "C"
        elif score >= 60:
            return "D"
        else:
            return "F"

    def _aggregate_weekly_data(
        self, daily_kpis: List[Dict[str, Any]]
    ) -> Dict[str, Any]:
        """Aggregate daily KPIs into weekly data"""
        total_sales = sum(
            kpi.get("sales", {}).get("total_sales", 0) for kpi in daily_kpis
        )
        total_revenue = sum(
            kpi.get("sales", {}).get("total_revenue", 0) for kpi in daily_kpis
        )

        avg_daily_sales = total_sales / len(daily_kpis) if daily_kpis else 0
        avg_daily_revenue = total_revenue / len(daily_kpis) if daily_kpis else 0

        return {
            "total_sales": total_sales,
            "total_revenue": total_revenue,
            "average_daily_sales": avg_daily_sales,
            "average_daily_revenue": avg_daily_revenue,
        }


# Global KPI service instance
kpi_service = KPIService()
