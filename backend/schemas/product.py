"""
Product Schemas for Pharmacie 360 Backend
Pydantic models for product-related API validation
"""

from datetime import datetime
from typing import Optional

from pydantic import BaseModel, ConfigDict, Field
from decimal import Decimal


# Base Product Schema
class ProductBase(BaseModel):
    """Base product schema with common fields"""
    name: str = Field(..., min_length=1, max_length=200, description="Product name")
    dci: Optional[str] = Field(None, max_length=100, description="DCI - Denomination Commune Internationale")
    barcode: Optional[str] = Field(None, max_length=50, description="Product barcode")
    category_id: Optional[int] = Field(None, description="Category ID")
    description: Optional[str] = Field(None, description="Product description")
    price: Decimal = Field(default=0.00, description="Selling price")
    cost_price: Decimal = Field(default=0.00, description="Cost price")
    stock_min: int = Field(default=0, ge=0, description="Minimum stock level")
    stock_max: int = Field(default=100, ge=0, description="Maximum stock level")
    unit: str = Field(default="unité", description="Unit of measure")
    manufacturer: Optional[str] = Field(None, max_length=100, description="Manufacturer")
    is_active: bool = Field(default=True, description="Whether product is active")
    requires_prescription: bool = Field(default=False, description="Whether prescription is required")


# Product Create Schema
class ProductCreate(ProductBase):
    """Schema for creating a new product"""
    pass


# Product Update Schema
class ProductUpdate(BaseModel):
    """Schema for updating a product"""
    name: Optional[str] = Field(None, min_length=1, max_length=200)
    dci: Optional[str] = Field(None, max_length=100)
    barcode: Optional[str] = Field(None, max_length=50)
    category_id: Optional[int] = Field(None)
    description: Optional[str] = Field(None)
    price: Optional[Decimal] = Field(None, ge=0)
    cost_price: Optional[Decimal] = Field(None, ge=0)
    stock_min: Optional[int] = Field(None, ge=0)
    stock_max: Optional[int] = Field(None, ge=0)
    unit: Optional[str] = Field(None)
    manufacturer: Optional[str] = Field(None, max_length=100)
    is_active: Optional[bool] = Field(None)
    requires_prescription: Optional[bool] = Field(None)


# Product Response Schema
class ProductResponse(ProductBase):
    """Schema for product response (includes computed fields)"""
    id: int = Field(..., description="Product ID")
    category_name: Optional[str] = Field(None, description="Category name")
    current_stock: int = Field(default=0, description="Current total stock")
    is_low_stock: bool = Field(default=False, description="Whether stock is below minimum")
    is_overstocked: bool = Field(default=False, description="Whether stock is above maximum")
    next_expiring_batch: Optional[str] = Field(None, description="Next expiring batch number")
    has_expiring_soon: bool = Field(default=False, description="Whether any batch is expiring soon")
    created_at: datetime = Field(..., description="Creation timestamp")
    updated_at: datetime = Field(..., description="Last update timestamp")
    
    model_config = ConfigDict(from_attributes=True, json_encoders={Decimal: float})


# Product Detail Response Schema
class ProductDetailResponse(ProductResponse):
    """Schema for detailed product response"""
    batches: list["BatchResponse"] = Field(default_factory=list, description="List of batches")
    
    model_config = ConfigDict(from_attributes=True, json_encoders={Decimal: float})


# Product List Response Schema
class ProductListResponse(BaseModel):
    """Schema for listing products with pagination"""
    products: list[ProductResponse] = Field(..., description="List of products")
    total: int = Field(..., description="Total number of products")
    page: int = Field(..., description="Current page")
    page_size: int = Field(..., description="Number of items per page")
    total_pages: int = Field(..., description="Total number of pages")


# Product Search Request Schema
class ProductSearchRequest(BaseModel):
    """Schema for product search request"""
    query: str = Field(..., min_length=1, description="Search query (name, barcode, DCI)")
    category_id: Optional[int] = Field(None, description="Filter by category")
    is_active: Optional[bool] = Field(None, description="Filter by active status")
    low_stock_only: Optional[bool] = Field(None, description="Show only low stock products")
    limit: int = Field(default=20, ge=1, le=100, description="Maximum number of results")


# Product Search Response Schema
class ProductSearchResponse(BaseModel):
    """Schema for product search response"""
    products: list[ProductResponse] = Field(..., description="List of matching products")
    total: int = Field(..., description="Total number of matching products")


# Barcode Scan Request Schema
class BarcodeScanRequest(BaseModel):
    """Schema for barcode scan request"""
    barcode: str = Field(..., description="Barcode to scan")


# Barcode Scan Response Schema
class BarcodeScanResponse(BaseModel):
    """Schema for barcode scan response"""
    product: Optional[ProductResponse] = Field(None, description="Found product")
    batch: Optional["BatchResponse"] = Field(None, description="Selected batch (FEFO)")
    error: Optional[str] = Field(None, description="Error message if not found")
    
    model_config = ConfigDict(from_attributes=True, json_encoders={Decimal: float})
