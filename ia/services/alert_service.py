"""
Alert Service for Pharmacie 360 IA Module
Handles generation and management of intelligent alerts
"""

import asyncio
import json
import logging
from datetime import datetime, timedelta
from pathlib import Path
from typing import Any, Dict, List, Optional, Tuple

# Configure logging
logger = logging.getLogger(__name__)


class AlertService:
    """
    Service for generating and managing intelligent alerts
    """

    # Alert types and priorities
    ALERT_TYPES = {"CRITICAL": 1, "HIGH": 2, "MEDIUM": 3, "LOW": 4}

    # Alert categories
    ALERT_CATEGORIES = {
        "STOCK_RUPTURE": "Rupture de Stock",
        "EXPIRY_ALERT": "Péremption Proche",
        "OVERSTOCK": "Surstockage",
        "SALES_TREND": "Tendance de Ventes",
        "SUPPLIER_ISSUE": "Problème Fournisseur",
        "SYSTEM_ALERT": "Alerte Système",
    }

    def __init__(self):
        """Initialize alert service"""
        self.alerts = []
        self.alert_history = []
        self.max_alerts = 100
        self.max_history = 1000

    async def generate_stock_alerts(
        self, products: List[Dict[str, Any]], stock_data: List[Dict[str, Any]]
    ) -> List[Dict[str, Any]]:
        """
        Generate alerts for stock-related issues

        Args:
            products: List of product data
            stock_data: List of stock movement data

        Returns:
            List of generated alerts
        """
        alerts = []

        for product in products:
            product_id = product.get("id")
            current_stock = product.get("current_stock", 0)
            min_stock = product.get("min_stock", 0)
            max_stock = product.get("max_stock", 1000)
            expiry_date = product.get("expiry_date")

            # Check for stock rupture risk
            if current_stock <= min_stock:
                alerts.append(
                    {
                        "alert_id": f"stock-rupture-{product_id}",
                        "type": "STOCK_RUPTURE",
                        "priority": "HIGH",
                        "category": "STOCK_RUPTURE",
                        "title": f"Rupture de stock imminente pour {product.get('name', 'Produit')}",
                        "message": f"Le produit '{product.get('name', 'Produit')} (ID: {product_id}) a atteint le stock minimum ({min_stock}). Stock actuel: {current_stock}",
                        "product_id": product_id,
                        "current_stock": current_stock,
                        "min_stock": min_stock,
                        "status": "ACTIVE",
                        "created_at": datetime.now().isoformat(),
                        "expires_at": (datetime.now() + timedelta(days=7)).isoformat(),
                    }
                )

            # Check for overstock
            if current_stock > max_stock:
                alerts.append(
                    {
                        "alert_id": f"overstock-{product_id}",
                        "type": "OVERSTOCK",
                        "priority": "MEDIUM",
                        "category": "OVERSTOCK",
                        "title": f"Surstockage pour {product.get('name', 'Produit')}",
                        "message": f"Le produit '{product.get('name', 'Produit')} (ID: {product_id}) dépasse le stock maximum ({max_stock}). Stock actuel: {current_stock}",
                        "product_id": product_id,
                        "current_stock": current_stock,
                        "max_stock": max_stock,
                        "status": "ACTIVE",
                        "created_at": datetime.now().isoformat(),
                        "expires_at": (datetime.now() + timedelta(days=30)).isoformat(),
                    }
                )

            # Check for expiry alerts
            if expiry_date:
                try:
                    expiry = datetime.fromisoformat(expiry_date.replace("Z", "+00:00"))
                    days_until_expiry = (expiry - datetime.now()).days

                    if days_until_expiry <= 7:
                        alerts.append(
                            {
                                "alert_id": f"expiry-{product_id}",
                                "type": "EXPIRY_ALERT",
                                "priority": (
                                    "CRITICAL" if days_until_expiry <= 3 else "HIGH"
                                ),
                                "category": "EXPIRY_ALERT",
                                "title": f"Péremption proche pour {product.get('name', 'Produit')}",
                                "message": f"Le produit '{product.get('name', 'Produit')} (ID: {product_id}) expire dans {days_until_expiry} jour(s). Date de péremption: {expiry_date}",
                                "product_id": product_id,
                                "expiry_date": expiry_date,
                                "days_until_expiry": days_until_expiry,
                                "status": "ACTIVE",
                                "created_at": datetime.now().isoformat(),
                                "expires_at": expiry.isoformat(),
                            }
                        )
                    elif days_until_expiry <= 30:
                        alerts.append(
                            {
                                "alert_id": f"expiry-soon-{product_id}",
                                "type": "EXPIRY_ALERT",
                                "priority": "MEDIUM",
                                "category": "EXPIRY_ALERT",
                                "title": f"Péremption dans 30 jours pour {product.get('name', 'Produit')}",
                                "message": f"Le produit '{product.get('name', 'Produit')} (ID: {product_id}) expire dans {days_until_expiry} jour(s)",
                                "product_id": product_id,
                                "expiry_date": expiry_date,
                                "days_until_expiry": days_until_expiry,
                                "status": "ACTIVE",
                                "created_at": datetime.now().isoformat(),
                                "expires_at": expiry.isoformat(),
                            }
                        )
                except (ValueError, TypeError) as e:
                    logger.error(
                        f"Error parsing expiry date for product {product_id}: {e}"
                    )

        return alerts

    async def generate_sales_alerts(
        self, sales_data: List[Dict[str, Any]]
    ) -> List[Dict[str, Any]]:
        """
        Generate alerts based on sales trends

        Args:
            sales_data: List of sales data

        Returns:
            List of generated alerts
        """
        alerts = []

        # This would analyze sales trends and generate alerts
        # For now, return empty list
        return alerts

    async def get_active_alerts(self) -> List[Dict[str, Any]]:
        """
        Get list of currently active alerts

        Returns:
            List of active alerts sorted by priority
        """
        # Sort by priority (CRITICAL first)
        sorted_alerts = sorted(
            self.alerts, key=lambda x: self.ALERT_TYPES.get(x.get("priority", "LOW"), 5)
        )
        return sorted_alerts

    async def get_alert_by_id(self, alert_id: str) -> Optional[Dict[str, Any]]:
        """
        Get a specific alert by ID

        Args:
            alert_id: Alert ID

        Returns:
            Alert data or None if not found
        """
        for alert in self.alerts:
            if alert.get("alert_id") == alert_id:
                return alert
        return None

    async def add_alert(self, alert: Dict[str, Any]) -> Dict[str, Any]:
        """
        Add a new alert

        Args:
            alert: Alert data

        Returns:
            Created alert with ID
        """
        # Ensure required fields
        alert.setdefault("alert_id", f"alert-{datetime.now().timestamp()}")
        alert.setdefault("created_at", datetime.now().isoformat())
        alert.setdefault("status", "ACTIVE")
        alert.setdefault("priority", "MEDIUM")

        # Add to alerts list
        self.alerts.append(alert)

        # Trim if necessary
        if len(self.alerts) > self.max_alerts:
            self.alerts = self.alerts[-self.max_alerts :]

        # Add to history
        self.alert_history.append(alert)
        if len(self.alert_history) > self.max_history:
            self.alert_history = self.alert_history[-self.max_history :]

        return alert

    async def update_alert(
        self, alert_id: str, updates: Dict[str, Any]
    ) -> Optional[Dict[str, Any]]:
        """
        Update an existing alert

        Args:
            alert_id: Alert ID
            updates: Dictionary of fields to update

        Returns:
            Updated alert or None if not found
        """
        for i, alert in enumerate(self.alerts):
            if alert.get("alert_id") == alert_id:
                self.alerts[i] = {**alert, **updates}
                return self.alerts[i]
        return None

    async def dismiss_alert(self, alert_id: str) -> bool:
        """
        Dismiss an alert

        Args:
            alert_id: Alert ID

        Returns:
            True if alert was found and dismissed, False otherwise
        """
        for i, alert in enumerate(self.alerts):
            if alert.get("alert_id") == alert_id:
                self.alerts[i]["status"] = "DISMISSED"
                self.alerts[i]["dismissed_at"] = datetime.now().isoformat()
                return True
        return False

    async def clear_expired_alerts(self) -> int:
        """
        Clear all expired alerts

        Returns:
            Number of alerts cleared
        """
        now = datetime.now()
        initial_count = len(self.alerts)

        self.alerts = [
            alert
            for alert in self.alerts
            if not alert.get("expires_at")
            or datetime.fromisoformat(alert["expires_at"].replace("Z", "+00:00")) > now
        ]

        return initial_count - len(self.alerts)

    async def get_alert_stats(self) -> Dict[str, Any]:
        """
        Get statistics about alerts

        Returns:
            Dictionary with alert statistics
        """
        active_alerts = [a for a in self.alerts if a.get("status") == "ACTIVE"]
        dismissed_alerts = [a for a in self.alerts if a.get("status") == "DISMISSED"]

        by_type = {}
        for alert in active_alerts:
            alert_type = alert.get("type", "UNKNOWN")
            by_type[alert_type] = by_type.get(alert_type, 0) + 1

        by_priority = {}
        for alert in active_alerts:
            priority = alert.get("priority", "LOW")
            by_priority[priority] = by_priority.get(priority, 0) + 1

        return {
            "total_active": len(active_alerts),
            "total_dismissed": len(dismissed_alerts),
            "by_type": by_type,
            "by_priority": by_priority,
            "critical_count": by_priority.get("CRITICAL", 0),
            "high_count": by_priority.get("HIGH", 0),
            "medium_count": by_priority.get("MEDIUM", 0),
            "low_count": by_priority.get("LOW", 0),
        }

    async def health_check(self) -> Dict[str, Any]:
        """
        Perform health check on the alert service

        Returns:
            Health status dictionary
        """
        return {
            "status": "healthy",
            "alerts_count": len(self.alerts),
            "history_count": len(self.alert_history),
            "timestamp": datetime.now().isoformat(),
        }


# Singleton instance
alert_service = AlertService()
