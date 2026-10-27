"""
Sale Schemas for Pharmacie 360 Backend
Pydantic models for sale-related API validation
"""

from datetime import datetime
from typing import Optional

from pydantic import BaseModel, ConfigDict, Field
from decimal import Decimal


# Base Sale Schema
class SaleBase(BaseModel):
    """Base sale schema with common fields"""
    sale_number: Optional[str] = Field(None, max_length=50, description="Sale number")
    customer_id: Optional[int] = Field(None, description="Customer ID")
    user_id: int = Field(..., description="User ID (who created the sale)")
    status: str = Field(default="pending", description="Sale status (pending, paid, cancelled, refunded)")
    subtotal: Decimal = Field(default=0.00, ge=0, description="Subtotal amount")
    tax_amount: Decimal = Field(default=0.00, ge=0, description="Tax amount")
    discount: Decimal = Field(default=0.00, ge=0, description="Discount amount")
    total: Decimal = Field(default=0.00, ge=0, description="Total amount")
    payment_method: Optional[str] = Field(None, max_length=50, description="Payment method")
    payment_reference: Optional[str] = Field(None, max_length=100, description="Payment reference")
    notes: Optional[str] = Field(None, description="Additional notes")


# Sale Item Create Schema
class SaleItemCreate(BaseModel):
    """Schema for creating a sale item"""
    batch_id: int = Field(..., description="Batch ID (for FEFO tracking)")
    product_id: int = Field(..., description="Product ID")
    quantity: int = Field(..., ge=1, description="Quantity")
    unit_price: Decimal = Field(..., ge=0, description="Unit price")


# Sale Item Response Schema
class SaleItemResponse(BaseModel):
    """Schema for sale item response"""
    id: int = Field(..., description="Sale item ID")
    sale_id: int = Field(..., description="Sale ID")
    batch_id: int = Field(..., description="Batch ID")
    product_id: int = Field(..., description="Product ID")
    product_name: str = Field(..., description="Product name")
    batch_number: str = Field(..., description="Batch number")
    quantity: int = Field(..., description="Quantity")
    unit_price: Decimal = Field(..., description="Unit price")
    total_price: Decimal = Field(..., description="Total price")
    expiry_date: Optional[str] = Field(None, description="Expiry date at time of sale")
    created_at: datetime = Field(..., description="Creation timestamp")
    
    model_config = ConfigDict(from_attributes=True, json_encoders={Decimal: float})


# Sale Create Schema
class SaleCreate(SaleBase):
    """Schema for creating a new sale"""
    items: list[SaleItemCreate] = Field(..., description="List of sale items")


# Sale Update Schema
class SaleUpdate(BaseModel):
    """Schema for updating a sale"""
    customer_id: Optional[int] = Field(None)
    status: Optional[str] = Field(None)
    subtotal: Optional[Decimal] = Field(None, ge=0)
    tax_amount: Optional[Decimal] = Field(None, ge=0)
    discount: Optional[Decimal] = Field(None, ge=0)
    total: Optional[Decimal] = Field(None, ge=0)
    payment_method: Optional[str] = Field(None, max_length=50)
    payment_reference: Optional[str] = Field(None, max_length=100)
    notes: Optional[str] = Field(None)


# Sale Response Schema
class SaleResponse(SaleBase):
    """Schema for sale response (includes computed fields)"""
    id: int = Field(..., description="Sale ID")
    customer_name: Optional[str] = Field(None, description="Customer name")
    user_name: str = Field(..., description="User name")
    is_pending: bool = Field(..., description="Whether sale is pending")
    is_paid: bool = Field(..., description="Whether sale is paid")
    is_cancelled: bool = Field(..., description="Whether sale is cancelled")
    is_refunded: bool = Field(..., description="Whether sale is refunded")
    item_count: int = Field(..., description="Number of items")
    total_items: int = Field(..., description="Total quantity")
    payment_date: Optional[datetime] = Field(None, description="Payment date")
    created_at: datetime = Field(..., description="Creation timestamp")
    updated_at: datetime = Field(..., description="Last update timestamp")
    
    model_config = ConfigDict(from_attributes=True, json_encoders={Decimal: float})


# Sale Detail Response Schema
class SaleDetailResponse(SaleResponse):
    """Schema for detailed sale response"""
    items: list[SaleItemResponse] = Field(..., description="List of sale items")


# Sale List Response Schema
class SaleListResponse(BaseModel):
    """Schema for listing sales with pagination"""
    sales: list[SaleResponse] = Field(..., description="List of sales")
    total: int = Field(..., description="Total number of sales")
    page: int = Field(..., description="Current page")
    page_size: int = Field(..., description="Number of items per page")
    total_pages: int = Field(..., description="Total number of pages")


# Sale Validation Response Schema
class SaleValidationResponse(BaseModel):
    """Schema for sale validation response"""
    success: bool = Field(..., description="Whether validation was successful")
    sale_id: Optional[int] = Field(None, description="Sale ID if created")
    sale_number: Optional[str] = Field(None, description="Sale number if created")
    errors: list[str] = Field(default_factory=list, description="List of validation errors")


# Sale Payment Schema
class SalePayment(BaseModel):
    """Schema for sale payment"""
    payment_method: str = Field(..., description="Payment method")
    payment_reference: Optional[str] = Field(None, description="Payment reference")


# Sale Payment Response Schema
class SalePaymentResponse(BaseModel):
    """Schema for sale payment response"""
    success: bool = Field(..., description="Whether payment was successful")
    sale_id: int = Field(..., description="Sale ID")
    sale_number: str = Field(..., description="Sale number")
    payment_date: datetime = Field(..., description="Payment date")
    error: Optional[str] = Field(None, description="Error message if failed")


# Queue Item Schema (for WebSocket communication)
class QueueItem(BaseModel):
    """Schema for queue item (WebSocket communication)"""
    sale_id: int = Field(..., description="Sale ID")
    sale_number: str = Field(..., description="Sale number")
    customer_name: Optional[str] = Field(None, description="Customer name")
    total: Decimal = Field(..., description="Total amount")
    item_count: int = Field(..., description="Number of items")
    timestamp: datetime = Field(..., description="Timestamp")
    
    model_config = ConfigDict(json_encoders={Decimal: float})
