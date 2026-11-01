"""
Alert Schemas for Pharmacie 360 Backend
Pydantic models for alert responses
"""

from datetime import date
from typing import Any, Optional

from pydantic import BaseModel, Field


class AlertBase(BaseModel):
    """Base alert model"""

    type: str = Field(..., description="Type of alert: 'stock' or 'expiry'")
    severity: str = Field(..., description="Severity: 'danger', 'warning', 'info'")
    product_id: int = Field(..., description="ID of the product")
    product_name: str = Field(..., description="Name of the product")
    barcode: Optional[str] = Field(None, description="Barcode of the product")
    message: str = Field(..., description="Human-readable alert message")
    details: dict[str, Any] = Field(
        default_factory=dict, description="Additional alert details"
    )


class AlertResponse(AlertBase):
    """Complete alert response model"""

    pass


class StockAlertResponse(BaseModel):
    """Stock alert response model"""

    product_id: int
    product_name: str
    barcode: Optional[str]
    current_stock: int
    min_stock: int
    max_stock: int
    alert_type: str  # 'low', 'over', 'both'
    severity: str  # 'danger', 'warning'
    category_name: Optional[str]


class ExpiryAlertResponse(BaseModel):
    """Expiry alert response model"""

    batch_id: int
    product_id: int
    product_name: str
    batch_number: str
    expiry_date: date
    days_until_expiry: int
    quantity: int
    alert_type: str  # 'expired', 'critical', 'expiring_soon'
    severity: str  # 'danger', 'warning'
    barcode: Optional[str]


class AlertListResponse(BaseModel):
    """List of all alerts"""

    alerts: list[AlertResponse]
    stock_alerts: list[StockAlertResponse]
    expiry_alerts: list[ExpiryAlertResponse]
    total_alerts: int
    critical_count: int
    warning_count: int


class StockStats(BaseModel):
    """Stock alert statistics"""

    total: int = 0
    low_stock: int = 0
    over_stock: int = 0


class ExpiryStats(BaseModel):
    """Expiry alert statistics"""

    total: int = 0
    expired: int = 0
    critical: int = 0
    expiring_soon: int = 0


class AlertStatsResponse(BaseModel):
    """Alert statistics response"""

    total_alerts: int
    stock_alerts: StockStats = Field(default_factory=StockStats)
    expiry_alerts: ExpiryStats = Field(default_factory=ExpiryStats)


class AlertNotification(BaseModel):
    """WebSocket notification for alerts"""

    type: str = "alert_update"
    alert: AlertResponse
    count: int
