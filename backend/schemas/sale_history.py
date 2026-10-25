"""
Sale History Schemas for Pharmacie 360 Backend
Pydantic models for sale history and analytics
"""

from datetime import date, datetime
from typing import Optional
from decimal import Decimal

from pydantic import BaseModel, Field, ConfigDict


class SaleHistoryBase(BaseModel):
    """Base schema for sale history"""
    sale_id: int = Field(..., description="Reference to the sale ID")
    sale_number: str = Field(..., description="Sale number/identifier")
    product_id: int = Field(..., description="Product ID sold")
    product_name: str = Field(..., description="Product name")
    batch_id: Optional[int] = Field(None, description="Batch ID used")
    batch_number: Optional[str] = Field(None, description="Batch number")
    quantity: int = Field(..., ge=1, description="Quantity sold")
    unit_price: Decimal = Field(..., ge=0, description="Unit price at time of sale")
    total_price: Decimal = Field(..., ge=0, description="Total price for this line")
    sale_date: datetime = Field(..., description="Date and time of sale")
    sale_day: date = Field(..., description="Date of sale (day only)")
    cashier_id: Optional[int] = Field(None, description="Cashier user ID")
    cashier_name: Optional[str] = Field(None, description="Cashier name")
    customer_id: Optional[int] = Field(None, description="Customer ID")
    customer_name: Optional[str] = Field(None, description="Customer name")


class SaleHistoryCreate(SaleHistoryBase):
    """Schema for creating a sale history record"""
    pass


class SaleHistoryResponse(SaleHistoryBase):
    """Schema for sale history response"""
    id: int = Field(..., description="History record ID")
    created_at: datetime = Field(..., description="Creation timestamp")
    
    model_config = ConfigDict(from_attributes=True, json_encoders={Decimal: float})


class SaleHistoryListResponse(BaseModel):
    """Schema for paginated sale history list"""
    history: list[SaleHistoryResponse] = Field(default_factory=list)
    total: int = Field(..., description="Total number of records")
    page: int = Field(..., description="Current page")
    page_size: int = Field(..., description="Items per page")
    total_pages: int = Field(..., description="Total number of pages")


class SaleAnalyticsResponse(BaseModel):
    """Schema for sale analytics"""
    period: str = Field(..., description="Analytics period (day, week, month, year)")
    start_date: date = Field(..., description="Start date of period")
    end_date: date = Field(..., description="End date of period")
    total_sales: int = Field(..., description="Total number of sales")
    total_quantity: int = Field(..., description="Total quantity sold")
    total_revenue: float = Field(..., description="Total revenue")
    average_sale: float = Field(..., description="Average sale value")
    top_products: list[dict] = Field(default_factory=list, description="Top selling products")
    sales_by_day: list[dict] = Field(default_factory=list, description="Sales distribution by day")
    sales_by_category: list[dict] = Field(default_factory=list, description="Sales by category")


class ProductSalesAnalytics(BaseModel):
    """Schema for product-specific sales analytics"""
    product_id: int = Field(..., description="Product ID")
    product_name: str = Field(..., description="Product name")
    total_quantity: int = Field(..., description="Total quantity sold")
    total_revenue: float = Field(..., description="Total revenue from this product")
    average_price: float = Field(..., description="Average selling price")
    sales_count: int = Field(..., description="Number of sales")
    first_sale: Optional[datetime] = Field(None, description="First sale date")
    last_sale: Optional[datetime] = Field(None, description="Last sale date")
    sales_trend: str = Field(..., description="Sales trend (increasing, decreasing, stable)")


class DailySalesResponse(BaseModel):
    """Schema for daily sales summary"""
    sale_date: date = Field(..., description="Sale date")
    total_sales: int = Field(..., description="Number of sales")
    total_quantity: int = Field(..., description="Total quantity sold")
    total_revenue: float = Field(..., description="Total revenue")
    average_sale: float = Field(..., description="Average sale value")
    top_product: Optional[dict] = Field(None, description="Top selling product of the day")


class MonthlySalesResponse(BaseModel):
    """Schema for monthly sales summary"""
    year: int = Field(..., description="Year")
    month: int = Field(..., description="Month")
    total_sales: int = Field(..., description="Number of sales")
    total_quantity: int = Field(..., description="Total quantity sold")
    total_revenue: float = Field(..., description="Total revenue")
    growth_rate: float = Field(..., description="Growth rate compared to previous month")


class SalesReportRequest(BaseModel):
    """Schema for sales report request"""
    start_date: date = Field(..., description="Report start date")
    end_date: date = Field(..., description="Report end date")
    product_id: Optional[int] = Field(None, description="Filter by product ID")
    category_id: Optional[int] = Field(None, description="Filter by category ID")
    format: str = Field(default="json", description="Report format (json, csv, pdf)")
