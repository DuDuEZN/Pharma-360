"""
Order Schemas for Pharmacie 360 Backend
Pydantic models for order data validation
"""

from datetime import datetime
from typing import Optional

from pydantic import BaseModel, Field, ConfigDict


class OrderBase(BaseModel):
    """Base order schema"""
    product_id: int = Field(..., ge=1, description="Product ID to order")
    quantity: int = Field(..., ge=1, description="Quantity to order")
    supplier_id: Optional[int] = Field(None, ge=1, description="Supplier ID")
    notes: Optional[str] = Field(None, max_length=500, description="Additional notes")


class OrderCreate(OrderBase):
    """Schema for creating a new order"""
    model_config = ConfigDict(json_schema_extra={
        "example": {
            "product_id": 123,
            "quantity": 50,
            "supplier_id": 456,
            "notes": "Commande urgente pour réapprovisionnement"
        }
    })


class OrderUpdate(BaseModel):
    """Schema for updating an order"""
    status: Optional[str] = Field(None, description="New status")
    notes: Optional[str] = Field(None, max_length=500, description="Updated notes")
    unit_price: Optional[float] = Field(None, ge=0, description="Updated unit price")
    total_price: Optional[float] = Field(None, ge=0, description="Updated total price")


class OrderResponse(OrderBase):
    """Schema for order response"""
    id: int = Field(..., description="Order ID")
    order_number: str = Field(..., description="Order reference number")
    status: str = Field(..., description="Order status")
    unit_price: Optional[float] = Field(None, description="Unit price")
    total_price: Optional[float] = Field(None, description="Total price")
    created_by: Optional[int] = Field(None, description="User ID who created the order")
    approved_by: Optional[int] = Field(None, description="User ID who approved the order")
    approved_at: Optional[datetime] = Field(None, description="Approval timestamp")
    delivered_at: Optional[datetime] = Field(None, description="Delivery timestamp")
    is_active: bool = Field(..., description="Whether order is active")
    created_at: datetime = Field(..., description="Creation timestamp")
    updated_at: datetime = Field(..., description="Last update timestamp")
    
    model_config = ConfigDict(from_attributes=True)


class OrderDetailResponse(OrderResponse):
    """Schema for detailed order response with related data"""
    product: Optional[dict] = Field(None, description="Product details")
    supplier: Optional[dict] = Field(None, description="Supplier details")
    created_by_user: Optional[dict] = Field(None, description="User who created the order")
    approved_by_user: Optional[dict] = Field(None, description="User who approved the order")


class OrderListResponse(BaseModel):
    """Schema for paginated order list"""
    orders: list[OrderResponse] = Field(default_factory=list, description="List of orders")
    total: int = Field(..., description="Total number of orders")
    page: int = Field(..., description="Current page")
    page_size: int = Field(..., description="Items per page")
    total_pages: int = Field(..., description="Total number of pages")
