"""
Inventory Schemas for Pharmacie 360 Backend
Pydantic models for inventory data validation
"""

from datetime import datetime
from typing import Optional

from pydantic import BaseModel, ConfigDict, Field


class InventoryItemResponse(BaseModel):
    """Schema for inventory item response"""

    product_id: int = Field(..., description="Product ID")
    product_name: str = Field(..., description="Product name")
    product_code: str = Field(..., description="Product code/barcode")
    category_id: Optional[int] = Field(None, description="Category ID")
    category_name: Optional[str] = Field(None, description="Category name")
    total_quantity: int = Field(..., description="Total quantity in stock")
    available_quantity: int = Field(
        ..., description="Available quantity (not reserved)"
    )
    reserved_quantity: int = Field(default=0, description="Reserved quantity")
    bulk_quantity: int = Field(
        default=0, description="Unités de vrac disponibles (hors boîtes)"
    )
    unit_price: float = Field(..., description="Unit price")
    location: Optional[str] = Field(None, description="Storage location")
    supplier_id: Optional[int] = Field(None, description="Supplier ID")
    supplier_name: Optional[str] = Field(None, description="Supplier name")
    batches: list[dict] = Field(
        default_factory=list, description="List of batches for this product"
    )

    model_config = ConfigDict(from_attributes=True)


class LowStockItemResponse(BaseModel):
    """Schema for low stock item response"""

    product_id: int = Field(..., description="Product ID")
    product_name: str = Field(..., description="Product name")
    product_code: str = Field(..., description="Product code")
    current_quantity: int = Field(..., description="Current quantity")
    threshold: int = Field(..., description="Low stock threshold")
    category_name: Optional[str] = Field(None, description="Category name")
    supplier_name: Optional[str] = Field(None, description="Supplier name")


class MovementCreate(BaseModel):
    """Schema for creating a stock movement"""

    product_id: int = Field(..., description="Product ID")
    batch_id: Optional[int] = Field(None, description="Batch ID (optional)")
    quantity: int = Field(..., ge=1, description="Quantity to move")
    movement_type: str = Field(
        ...,
        description="Type of movement (in, out, adjustment, return, expiry)",
    )
    reason: str = Field(..., description="Reason for the movement")
    reference: Optional[str] = Field(None, description="Reference document number")
    notes: Optional[str] = Field(None, description="Additional notes")


class MovementResponse(BaseModel):
    """Schema for movement response"""

    id: int = Field(..., description="Movement ID")
    product_id: int = Field(..., description="Product ID")
    product_name: str = Field(..., description="Product name")
    batch_id: Optional[int] = Field(None, description="Batch ID")
    quantity: int = Field(..., description="Quantity moved")
    old_quantity: int = Field(..., description="Previous quantity")
    new_quantity: int = Field(..., description="New quantity")
    movement_type: str = Field(..., description="Type of movement")
    reason: str = Field(..., description="Reason for movement")
    reference: Optional[str] = Field(None, description="Reference document")
    user_id: Optional[int] = Field(None, description="User who performed the movement")
    created_at: datetime = Field(..., description="Creation timestamp")
    notes: Optional[str] = Field(None, description="Additional notes")

    model_config = ConfigDict(from_attributes=True)


class StockUpdate(BaseModel):
    """Schema for updating stock"""

    quantity: Optional[int] = Field(None, ge=0, description="New quantity")
    location: Optional[str] = Field(None, description="New storage location")
    notes: Optional[str] = Field(None, description="Update notes")


class InventorySummaryResponse(BaseModel):
    """Schema for inventory summary"""

    total_products: int = Field(..., description="Total number of products")
    total_quantity: int = Field(..., description="Total quantity in stock")
    total_bulk_quantity: int = Field(
        default=0, description="Total d'unités de vrac disponibles"
    )
    total_value: float = Field(..., description="Total value of inventory")
    total_bulk_value: float = Field(
        default=0.0, description="Valeur totale du stock en vrac"
    )
    low_stock_count: int = Field(..., description="Number of low stock items")
    expiring_soon_count: int = Field(..., description="Number of items expiring soon")
    categories: list[dict] = Field(
        default_factory=list, description="Breakdown by category"
    )
    locations: list[dict] = Field(
        default_factory=list, description="Breakdown by location"
    )
