"""
Alert Service for Pharmacie 360 Backend
Handles stock and expiry alert calculations
"""

from datetime import date, timedelta
from typing import Optional, List as ListType

from sqlalchemy import select, func, or_, and_
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import joinedload

from ..models.product import Product
from ..models.batch import Batch
from ..schemas.alert import (
    AlertResponse,
    AlertListResponse,
    AlertStatsResponse,
    StockAlertResponse,
    ExpiryAlertResponse,
)


class AlertService:
    """Service for handling alert operations"""
    
    # Thresholds for alerts
    LOW_STOCK_DAYS = 30  # Days until expiry to consider as "expiring soon"
    CRITICAL_STOCK_DAYS = 7  # Days until expiry to consider as "critical"
    
    @staticmethod
    async def get_stock_alerts(
        db: AsyncSession
    ) -> list[StockAlertResponse]:
        """Get all products with low or over stock"""
        result = await db.execute(
            select(Product)
            .options(joinedload(Product.batches))
            .where(or_(
                Product.current_stock < Product.stock_min,
                Product.current_stock > Product.stock_max
            ))
            .order_by(Product.name)
        )
        products = result.scalars().all()
        
        alerts = []
        for product in products:
            alert_type = None
            if product.is_low_stock and product.is_overstocked:
                alert_type = "both"
            elif product.is_low_stock:
                alert_type = "low"
            elif product.is_overstocked:
                alert_type = "over"
            
            if alert_type:
                alerts.append(StockAlertResponse(
                    product_id=product.id,
                    product_name=product.name,
                    barcode=product.barcode,
                    current_stock=product.current_stock,
                    min_stock=product.stock_min,
                    max_stock=product.stock_max,
                    alert_type=alert_type,
                    severity="danger" if alert_type == "low" else "warning",
                    category_name=product.category.name if product.category else None
                ))
        
        return alerts
    
    @staticmethod
    async def get_expiry_alerts(
        db: AsyncSession
    ) -> list[ExpiryAlertResponse]:
        """Get all batches that are expiring soon or expired"""
        today = date.today()
        expiring_soon_threshold = today + timedelta(days=AlertService.LOW_STOCK_DAYS)
        critical_threshold = today + timedelta(days=AlertService.CRITICAL_STOCK_DAYS)
        
        result = await db.execute(
            select(Batch)
            .options(joinedload(Batch.product))
            .where(
                and_(
                    Batch.status == "active",
                    Batch.quantity > 0,
                    Batch.expiry_date <= expiring_soon_threshold
                )
            )
            .order_by(Batch.expiry_date)
        )
        batches = result.scalars().all()
        
        alerts = []
        for batch in batches:
            days_until_expiry = (batch.expiry_date - today).days
            
            if batch.expiry_date < today:
                severity = "danger"
                alert_type = "expired"
            elif batch.expiry_date <= critical_threshold:
                severity = "danger"
                alert_type = "critical"
            else:
                severity = "warning"
                alert_type = "expiring_soon"
            
            alerts.append(ExpiryAlertResponse(
                batch_id=batch.id,
                product_id=batch.product_id,
                product_name=batch.product.name if batch.product else "Unknown",
                batch_number=batch.batch_number,
                expiry_date=batch.expiry_date,
                days_until_expiry=days_until_expiry,
                quantity=batch.quantity,
                alert_type=alert_type,
                severity=severity,
                barcode=batch.product.barcode if batch.product else None
            ))
        
        return alerts
    
    @staticmethod
    async def get_all_alerts(
        db: AsyncSession
    ) -> AlertListResponse:
        """Get all alerts (stock + expiry)"""
        stock_alerts = await AlertService.get_stock_alerts(db)
        expiry_alerts = await AlertService.get_expiry_alerts(db)
        
        # Combine and sort by severity
        all_alerts = []
        for alert in stock_alerts:
            all_alerts.append(AlertResponse(
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
                    "alert_type": alert.alert_type
                }
            ))
        
        for alert in expiry_alerts:
            all_alerts.append(AlertResponse(
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
                    "alert_type": alert.alert_type
                }
            ))
        
        # Sort by severity (danger > warning > info)
        severity_order = {"danger": 0, "warning": 1, "info": 2}
        all_alerts.sort(key=lambda x: (severity_order.get(x.severity, 3), x.product_name))
        
        return AlertListResponse(
            alerts=all_alerts,
            stock_alerts=stock_alerts,
            expiry_alerts=expiry_alerts,
            total_alerts=len(all_alerts),
            critical_count=len([a for a in all_alerts if a.severity == "danger"]),
            warning_count=len([a for a in all_alerts if a.severity == "warning"])
        )
    
    @staticmethod
    async def get_alert_stats(
        db: AsyncSession
    ) -> AlertStatsResponse:
        """Get alert statistics"""
        stock_alerts = await AlertService.get_stock_alerts(db)
        expiry_alerts = await AlertService.get_expiry_alerts(db)
        
        low_stock_count = len([a for a in stock_alerts if a.alert_type == "low"])
        over_stock_count = len([a for a in stock_alerts if a.alert_type == "over"])
        expired_count = len([a for a in expiry_alerts if a.alert_type == "expired"])
        critical_count = len([a for a in expiry_alerts if a.alert_type == "critical"])
        expiring_soon_count = len([a for a in expiry_alerts if a.alert_type == "expiring_soon"])
        
        return AlertStatsResponse(
            total_alerts=len(stock_alerts) + len(expiry_alerts),
            stock_alerts=AlertStatsResponse.StockStats(
                total=len(stock_alerts),
                low_stock=low_stock_count,
                over_stock=over_stock_count
            ),
            expiry_alerts=AlertStatsResponse.ExpiryStats(
                total=len(expiry_alerts),
                expired=expired_count,
                critical=critical_count,
                expiring_soon=expiring_soon_count
            )
        )
    
    @staticmethod
    async def get_product_alerts(
        product_id: int,
        db: AsyncSession
    ) -> list[AlertResponse]:
        """Get alerts for a specific product"""
        product = await db.get(Product, product_id)
        if not product:
            return []
        
        alerts = []
        
        # Check stock alerts
        if product.is_low_stock:
            alerts.append(AlertResponse(
                type="stock",
                severity="danger",
                product_id=product.id,
                product_name=product.name,
                barcode=product.barcode,
                message=f"Stock faible: {product.current_stock} unités",
                details={
                    "current_stock": product.current_stock,
                    "min_stock": product.stock_min
                }
            ))
        
        if product.is_overstocked:
            alerts.append(AlertResponse(
                type="stock",
                severity="warning",
                product_id=product.id,
                product_name=product.name,
                barcode=product.barcode,
                message=f"Stock excédentaire: {product.current_stock} unités",
                details={
                    "current_stock": product.current_stock,
                    "max_stock": product.stock_max
                }
            ))
        
        # Check expiry alerts for batches
        today = date.today()
        for batch in product.batches:
            if batch.status != "active" or batch.quantity <= 0:
                continue
            
            days_until_expiry = (batch.expiry_date - today).days
            
            if batch.expiry_date < today:
                alerts.append(AlertResponse(
                    type="expiry",
                    severity="danger",
                    product_id=product.id,
                    product_name=product.name,
                    barcode=product.barcode,
                    message=f"Lot périmé: {batch.batch_number}",
                    details={
                        "batch_number": batch.batch_number,
                        "expiry_date": batch.expiry_date.isoformat(),
                        "days_until_expiry": days_until_expiry
                    }
                ))
            elif days_until_expiry <= AlertService.CRITICAL_STOCK_DAYS:
                alerts.append(AlertResponse(
                    type="expiry",
                    severity="danger",
                    product_id=product.id,
                    product_name=product.name,
                    barcode=product.barcode,
                    message=f"Lot critique: {batch.batch_number} ({days_until_expiry} jours)",
                    details={
                        "batch_number": batch.batch_number,
                        "expiry_date": batch.expiry_date.isoformat(),
                        "days_until_expiry": days_until_expiry
                    }
                ))
            elif days_until_expiry <= AlertService.LOW_STOCK_DAYS:
                alerts.append(AlertResponse(
                    type="expiry",
                    severity="warning",
                    product_id=product.id,
                    product_name=product.name,
                    barcode=product.barcode,
                    message=f"Lot proche péremption: {batch.batch_number} ({days_until_expiry} jours)",
                    details={
                        "batch_number": batch.batch_number,
                        "expiry_date": batch.expiry_date.isoformat(),
                        "days_until_expiry": days_until_expiry
                    }
                ))
        
        return alerts
