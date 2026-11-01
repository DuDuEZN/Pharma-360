"""
Report Schemas for Pharmacie 360 Backend
Pydantic schemas for report generation and management
"""

from datetime import date, datetime
from typing import Literal, Optional

from pydantic import Field, field_validator

from .base import BaseSchema


class ReportBase(BaseSchema):
    """Base schema for reports"""

    report_type: str = Field(..., description="Type of report")
    title: str = Field(..., description="Report title")
    description: Optional[str] = Field(None, description="Report description")
    file_format: Optional[str] = Field(None, description="File format (pdf, csv, xlsx)")
    data_range_start: Optional[date] = Field(
        None, description="Start date of data range"
    )
    data_range_end: Optional[date] = Field(None, description="End date of data range")


class ReportCreate(ReportBase):
    """Schema for creating a new report"""

    parameters: Optional[dict] = Field(
        default_factory=dict, description="Report parameters"
    )

    @field_validator("report_type")
    @classmethod
    def validate_report_type(cls, v):
        valid_types = [
            "sales",
            "stock",
            "cash",
            "daily",
            "monthly",
            "custom",
            "inventory",
            "expiry",
        ]
        if v not in valid_types:
            raise ValueError(f"report_type must be one of {valid_types}")
        return v


class ReportResponse(ReportBase):
    """Schema for report response"""

    id: int
    generated_by: Optional[int] = None
    file_path: Optional[str] = None
    total_records: int = 0
    total_amount: float = 0.00
    status: str = "generated"
    generated_at: datetime
    generated_by_name: Optional[str] = None

    class Config:
        from_attributes = True


class ReportListResponse(BaseSchema):
    """Schema for paginated report list"""

    reports: list[ReportResponse]
    total: int
    page: int
    page_size: int
    total_pages: int


class ReportGenerationRequest(BaseSchema):
    """Schema for report generation request"""

    report_type: str = Field(..., description="Type of report to generate")
    file_format: str = Field(default="pdf", description="Output format")
    data_range_start: Optional[date] = Field(None, description="Start date")
    data_range_end: Optional[date] = Field(None, description="End date")
    filters: Optional[dict] = Field(
        default_factory=dict, description="Additional filters"
    )


class SalesReportRequest(ReportGenerationRequest):
    """Schema for sales report generation"""

    report_type: Literal["sales", "daily", "monthly"] = "sales"
    product_id: Optional[int] = Field(None, description="Filter by product")
    category_id: Optional[int] = Field(None, description="Filter by category")
    user_id: Optional[int] = Field(None, description="Filter by user")
    customer_id: Optional[int] = Field(None, description="Filter by customer")


class StockReportRequest(ReportGenerationRequest):
    """Schema for stock report generation"""

    report_type: Literal["stock", "inventory", "expiry"] = "stock"
    product_id: Optional[int] = Field(None, description="Filter by product")
    category_id: Optional[int] = Field(None, description="Filter by category")
    min_quantity: Optional[int] = Field(None, description="Minimum quantity threshold")
    show_expiring_soon: Optional[bool] = Field(
        None, description="Show expiring soon batches"
    )


class CashReportRequest(ReportGenerationRequest):
    """Schema for cash report generation"""

    report_type: Literal["cash"] = "cash"
    user_id: Optional[int] = Field(None, description="Filter by cashier")
    payment_method: Optional[str] = Field(None, description="Filter by payment method")


class ReportDownloadResponse(BaseSchema):
    """Schema for report download"""

    file_path: str
    file_name: str
    file_size: int
    content_type: str


class ReportStatsResponse(BaseSchema):
    """Schema for report statistics"""

    total_sales: float = 0.00
    total_items: int = 0
    total_revenue: float = 0.00
    average_sale: float = 0.00
    top_products: list[dict] = Field(default_factory=list)
    sales_by_category: dict = Field(default_factory=dict)
    sales_by_day: dict = Field(default_factory=dict)


__all__ = [
    "ReportBase",
    "ReportCreate",
    "ReportResponse",
    "ReportListResponse",
    "ReportGenerationRequest",
    "SalesReportRequest",
    "StockReportRequest",
    "CashReportRequest",
    "ReportDownloadResponse",
    "ReportStatsResponse",
]
