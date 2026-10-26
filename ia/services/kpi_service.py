"""
KPI Service for Pharmacie 360
Automatic KPI generation and analytics
"""

import asyncio
from datetime import datetime, timedelta
from typing import Optional, Dict, Any, List
from backend.core.config import settings
from backend.services.sale_service import sale_service
from backend.services.product_service import product_service
from backend.services.batch_service import batch_service
from backend.services.supplier_service import supplier_service


class KPIService:
    """
    Service for automatic KPI generation
    Calculates and tracks key performance indicators
    """
    
    def __init__(self):
        self.cache_ttl = settings.redis_cache_ttl if hasattr(settings, 'redis_cache_ttl') else 3600
    
    async def generate_daily_kpis(self, date: Optional[str] = None) -> Dict[str, Any]:
        """
        Generate daily KPIs
        
        Args:
            date: Optional date string (YYYY-MM-DD)
            
        Returns:
            Dictionary with daily KPIs
        """
        target_date = date or datetime.now().strftime('%Y-%m-%d')
        
        try:
            # Get sales data
            sales_stats = await self._get_sales_stats(target_date)
            
            # Get stock data
            stock_stats = await self._get_stock_stats()
            
            # Get supplier data
            supplier_stats = await self._get_supplier_stats(target_date)
            
            return {
                'date': target_date,
                'generated_at': datetime.now().isoformat(),
                'sales': sales_stats,
                'stock': stock_stats,
                'suppliers': supplier_stats,
                'overall': await self._calculate_overall_score(
                    sales_stats, stock_stats, supplier_stats
                )
            }
            
        except Exception as e:
            return {
                'status': 'error',
                'error': str(e),
                'date': target_date
            }
    
    async def generate_weekly_kpis(self, start_date: Optional[str] = None) -> Dict[str, Any]:
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
            start_date = (today - timedelta(days=today.weekday())).strftime('%Y-%m-%d')
        
        end_date = (datetime.strptime(start_date, '%Y-%m-%d') + timedelta(days=6)).strftime('%Y-%m-%d')
        
        try:
            # Aggregate daily KPIs for the week
            daily_kpis = []
            current_date = datetime.strptime(start_date, '%Y-%m-%d')
            
            for _ in range(7):
                date_str = current_date.strftime('%Y-%m-%d')
                daily_kpi = await self.generate_daily_kpis(date_str)
                daily_kpis.append(daily_kpi)
                current_date += timedelta(days=1)
            
            # Calculate weekly aggregates
            weekly_data = self._aggregate_weekly_data(daily_kpis)
            
            return {
                'start_date': start_date,
                'end_date': end_date,
                'generated_at': datetime.now().isoformat(),
                'daily_breakdown': daily_kpis,
                **weekly_data
            }
            
        except Exception as e:
            return {
                'status': 'error',
                'error': str(e),
                'start_date': start_date,
                'end_date': end_date
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
            # Get all sales for the month
            start_date = f"{year}-{month:02d}-01"
            end_date = (datetime(year, month, 1) + timedelta(days=32)).replace(day=1) - timedelta(days=1)
            end_date_str = end_date.strftime('%Y-%m-%d')
            
            sales_data = await sale_service.get_sales_by_date_range(
                start_date, end_date_str
            )
            
            # Calculate monthly metrics
            total_sales = len(sales_data)
            total_revenue = sum(sale.total_amount for sale in sales_data)
            avg_sale_value = total_revenue / total_sales if total_sales > 0 else 0
            
            # Get stock metrics
            stock_stats = await self._get_stock_stats()
            
            # Get top products
            top_products = await self._get_top_products(start_date, end_date_str)
            
            return {
                'year': year,
                'month': month,
                'start_date': start_date,
                'end_date': end_date_str,
                'generated_at': datetime.now().isoformat(),
                'sales': {
                    'total': total_sales,
                    'total_revenue': total_revenue,
                    'average_sale_value': avg_sale_value,
                    'daily_average': total_sales / end_date.day
                },
                'stock': stock_stats,
                'top_products': top_products,
                'overall': await self._calculate_overall_score(
                    {'total': total_sales, 'total_revenue': total_revenue},
                    stock_stats,
                    {}
                )
            }
            
        except Exception as e:
            return {
                'status': 'error',
                'error': str(e),
                'year': year,
                'month': month
            }
    
    async def _get_sales_stats(self, date: str) -> Dict[str, Any]:
        """Get sales statistics for a specific date"""
        try:
            # Get sales for the day
            start_date = date
            end_date = (datetime.strptime(date, '%Y-%m-%d') + timedelta(days=1)).strftime('%Y-%m-%d')
            
            sales = await sale_service.get_sales_by_date_range(start_date, end_date)
            
            total_sales = len(sales)
            total_revenue = sum(sale.total_amount for sale in sales)
            avg_sale_value = total_sales / total_sales if total_sales > 0 else 0
            
            # Get sales by hour
            hourly_sales = {}
            for sale in sales:
                hour = datetime.strptime(sale.created_at, '%Y-%m-%d %H:%M:%S').hour
                hourly_sales[hour] = hourly_sales.get(hour, 0) + 1
            
            return {
                'date': date,
                'total_sales': total_sales,
                'total_revenue': total_revenue,
                'average_sale_value': avg_sale_value,
                'hourly_distribution': hourly_sales,
                'peak_hour': max(hourly_sales.items(), key=lambda x: x[1])[0] if hourly_sales else None
            }
            
        except Exception as e:
            return {
                'date': date,
                'error': str(e)
            }
    
    async def _get_stock_stats(self) -> Dict[str, Any]:
        """Get stock statistics"""
        try:
            # Get all batches
            batches = await batch_service.get_all_batches()
            
            total_batches = len(batches)
            total_quantity = sum(batch.quantity for batch in batches)
            
            # Count expiring soon (within 30 days)
            expiring_soon = 0
            low_stock = 0
            today = datetime.now().date()
            
            for batch in batches:
                if batch.expiry_date:
                    expiry_date = datetime.strptime(batch.expiry_date, '%Y-%m-%d').date()
                    days_until_expiry = (expiry_date - today).days
                    if 0 <= days_until_expiry <= 30:
                        expiring_soon += 1
                
                if batch.quantity <= batch.min_stock_threshold:
                    low_stock += 1
            
            # Get products by category
            products = await product_service.get_all_products()
            category_distribution = {}
            for product in products:
                category = product.category or 'Autre'
                category_distribution[category] = category_distribution.get(category, 0) + 1
            
            return {
                'total_batches': total_batches,
                'total_quantity': total_quantity,
                'expiring_soon': expiring_soon,
                'low_stock': low_stock,
                'category_distribution': category_distribution
            }
            
        except Exception as e:
            return {
                'error': str(e)
            }
    
    async def _get_supplier_stats(self, date: str) -> Dict[str, Any]:
        """Get supplier statistics"""
        try:
            suppliers = await supplier_service.get_all_suppliers()
            
            total_suppliers = len(suppliers)
            active_suppliers = sum(1 for s in suppliers if s.is_active)
            
            # Get invoices for the day
            start_date = date
            end_date = (datetime.strptime(date, '%Y-%m-%d') + timedelta(days=1)).strftime('%Y-%m-%d')
            invoices = await supplier_service.get_invoices_by_date_range(start_date, end_date)
            
            return {
                'total_suppliers': total_suppliers,
                'active_suppliers': active_suppliers,
                'invoices_received': len(invoices),
                'total_invoice_value': sum(inv.total_amount for inv in invoices)
            }
            
        except Exception as e:
            return {
                'error': str(e)
            }
    
    async def _get_top_products(self, start_date: str, end_date: str, limit: int = 5) -> List[Dict[str, Any]]:
        """Get top selling products"""
        try:
            sales = await sale_service.get_sales_by_date_range(start_date, end_date)
            
            # Aggregate by product
            product_sales = {}
            for sale in sales:
                for item in sale.items:
                    product_id = item.product_id
                    product_sales[product_id] = product_sales.get(product_id, 0) + item.quantity
            
            # Sort by quantity
            sorted_products = sorted(
                product_sales.items(),
                key=lambda x: x[1],
                reverse=True
            )[:limit]
            
            # Get product details
            top_products = []
            for product_id, quantity in sorted_products:
                product = await product_service.get_product_by_id(product_id)
                if product:
                    top_products.append({
                        'product_id': product_id,
                        'name': product.name,
                        'quantity_sold': quantity
                    })
            
            return top_products
            
        except Exception as e:
            return []
    
    async def _calculate_overall_score(
        self,
        sales_data: Dict[str, Any],
        stock_data: Dict[str, Any],
        supplier_data: Dict[str, Any]
    ) -> Dict[str, Any]:
        """Calculate overall performance score"""
        score = 0
        max_score = 0
        metrics = {}
        
        # Sales metrics (weight: 40%)
        if 'total_sales' in sales_data:
            sales_score = min(sales_data['total_sales'] / 100, 100)  # Cap at 100
            score += sales_score * 0.4
            max_score += 40
            metrics['sales'] = sales_score
        
        # Stock metrics (weight: 30%)
        if 'low_stock' in stock_data and 'expiring_soon' in stock_data:
            stock_health = 100 - ((stock_data['low_stock'] + stock_data['expiring_soon']) * 10)
            stock_score = max(min(stock_health, 100), 0)
            score += stock_score * 0.3
            max_score += 30
            metrics['stock'] = stock_score
        
        # Supplier metrics (weight: 30%)
        if 'active_suppliers' in supplier_data and 'total_suppliers' in supplier_data:
            if supplier_data['total_suppliers'] > 0:
                supplier_score = (supplier_data['active_suppliers'] / supplier_data['total_suppliers']) * 100
            else:
                supplier_score = 0
            score += supplier_score * 0.3
            max_score += 30
            metrics['suppliers'] = supplier_score
        
        overall_score = (score / max_score * 100) if max_score > 0 else 0
        
        return {
            'score': overall_score,
            'grade': self._get_grade(overall_score),
            'metrics': metrics
        }
    
    def _get_grade(self, score: float) -> str:
        """Get letter grade based on score"""
        if score >= 90:
            return 'A'
        elif score >= 80:
            return 'B'
        elif score >= 70:
            return 'C'
        elif score >= 60:
            return 'D'
        else:
            return 'F'
    
    def _aggregate_weekly_data(self, daily_kpis: List[Dict[str, Any]]) -> Dict[str, Any]:
        """Aggregate daily KPIs into weekly data"""
        total_sales = sum(kpi.get('sales', {}).get('total_sales', 0) for kpi in daily_kpis)
        total_revenue = sum(kpi.get('sales', {}).get('total_revenue', 0) for kpi in daily_kpis)
        
        avg_daily_sales = total_sales / len(daily_kpis) if daily_kpis else 0
        avg_daily_revenue = total_revenue / len(daily_kpis) if daily_kpis else 0
        
        return {
            'total_sales': total_sales,
            'total_revenue': total_revenue,
            'average_daily_sales': avg_daily_sales,
            'average_daily_revenue': avg_daily_revenue
        }


# Global KPI service instance
kpi_service = KPIService()
