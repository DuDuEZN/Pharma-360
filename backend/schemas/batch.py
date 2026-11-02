"""
Batch Schemas for Pharmacie 360 Backend
Pydantic models for batch-related API validation
"""

from datetime import date, datetime
from decimal import Decimal
from typing import Optional

from pydantic import BaseModel, ConfigDict, Field


# Base Batch Schema
class BatchBase(BaseModel):
    """Base batch schema with common fields"""

    product_id: int = Field(..., description="Product ID")
    batch_number: str = Field(
        ..., min_length=1, max_length=50, description="Batch number"
    )
    expiry_date: date = Field(..., description="Expiration date (YYYY-MM-DD)")
    quantity: int = Field(default=0, ge=0, description="Current quantity")
    initial_quantity: int = Field(default=0, ge=0, description="Initial quantity")
    location: Optional[str] = Field(None, max_length=50, description="Storage location")
    received_date: date = Field(default_factory=date.today, description="Date received")
    supplier_id: Optional[int] = Field(None, description="Supplier ID")
    cost_price: Decimal = Field(default=0.00, ge=0, description="Cost price per unit")
    selling_price: Decimal = Field(
        default=0.00, ge=0, description="Selling price per unit"
    )
    purchase_invoice_id: Optional[int] = Field(None, description="Purchase invoice ID")
    status: str = Field(
        default="active",
        description="Batch status (active, expired, returned, damaged)",
    )
    notes: Optional[str] = Field(None, description="Additional notes")


# Batch Create Schema
class BatchCreate(BatchBase):
    """Schema for creating a new batch"""

    pass


# Batch Update Schema
class BatchUpdate(BaseModel):
    """Schema for updating a batch"""

    product_id: Optional[int] = Field(None)
    batch_number: Optional[str] = Field(None, min_length=1, max_length=50)
    expiry_date: Optional[date] = Field(None)
    quantity: Optional[int] = Field(None, ge=0)
    initial_quantity: Optional[int] = Field(None, ge=0)
    location: Optional[str] = Field(None, max_length=50)
    received_date: Optional[date] = Field(None)
    supplier_id: Optional[int] = Field(None)
    cost_price: Optional[Decimal] = Field(None, ge=0)
    selling_price: Optional[Decimal] = Field(None, ge=0)
    purchase_invoice_id: Optional[int] = Field(None)
    status: Optional[str] = Field(None)
    notes: Optional[str] = Field(None)


# Batch Response Schema
class BatchResponse(BaseModel):
    """Schema for batch response (includes computed fields)"""

    id: int = Field(..., description="Batch ID")
    product_id: int = Field(..., description="Product ID")
    product_name: Optional[str] = Field(None, description="Product name")
    batch_number: str = Field(..., description="Batch number")
    expiry_date: date = Field(..., description="Expiration date")
    quantity: int = Field(..., description="Current quantity")
    initial_quantity: int = Field(..., description="Initial quantity")
    location: Optional[str] = Field(None, description="Storage location")
    received_date: date = Field(..., description="Date received")
    supplier_id: Optional[int] = Field(None, description="Supplier ID")
    supplier_name: Optional[str] = Field(None, description="Supplier name")
    cost_price: Decimal = Field(..., description="Cost price")
    selling_price: Decimal = Field(..., description="Selling price")
    purchase_invoice_id: Optional[int] = Field(None, description="Purchase invoice ID")
    status: str = Field(..., description="Batch status")
    notes: Optional[str] = Field(None, description="Notes")
    is_active: bool = Field(..., description="Whether batch is active")
    is_expired: bool = Field(..., description="Whether batch is expired")
    is_available: bool = Field(..., description="Whether batch has available stock")
    percentage_used: float = Field(..., description="Percentage of batch used")
    days_until_expiry: int = Field(..., description="Days until expiry")
    is_expiring_soon: bool = Field(
        ..., description="Whether batch is expiring within 30 days"
    )
    fefo_priority: int = Field(
        ..., description="FEFO priority (lower = higher priority)"
    )
    created_at: datetime = Field(..., description="Creation timestamp")
    updated_at: datetime = Field(..., description="Last update timestamp")

    model_config = ConfigDict(from_attributes=True, json_encoders={Decimal: float})


# Batch List Response Schema
class BatchListResponse(BaseModel):
    """Schema for listing batches with pagination"""

    batches: list[BatchResponse] = Field(..., description="List of batches")
    total: int = Field(..., description="Total number of batches")
    page: int = Field(..., description="Current page")
    page_size: int = Field(..., description="Number of items per page")
    total_pages: int = Field(..., description="Total number of pages")


# FEFO Selection Request Schema
class FEFOSelectionRequest(BaseModel):
    """Schema for FEFO batch selection request"""

    product_id: int = Field(..., description="Product ID")
    quantity: int = Field(..., ge=1, description="Requested quantity")


# FEFO Selection Response Schema
class FEFOSelectionResponse(BaseModel):
    """Schema for FEFO batch selection response"""

    product_id: int = Field(..., description="Product ID")
    requested_quantity: int = Field(..., description="Requested quantity")
    selected_batch: Optional[BatchResponse] = Field(
        None, description="Selected batch (FEFO)"
    )
    available_batches: list[BatchResponse] = Field(
        default_factory=list, description="List of available batches"
    )
    error: Optional[str] = Field(None, description="Error message if selection failed")


# Batch Stock Adjustment Schema
class BatchStockAdjustment(BaseModel):
    """Schema for batch stock adjustment"""

    adjustment_type: str = Field(..., description="Type of adjustment (add, subtract)")
    quantity: int = Field(..., ge=1, description="Quantity to adjust")
    reason: Optional[str] = Field(None, description="Reason for adjustment")


# Batch Stock Response Schema
class BatchStockResponse(BaseModel):
    """Schema for batch stock adjustment response"""

    success: bool = Field(..., description="Whether adjustment was successful")
    new_quantity: int = Field(..., description="New quantity after adjustment")
    movement_id: Optional[int] = Field(None, description="Movement record ID")
    error: Optional[str] = Field(None, description="Error message if failed")
