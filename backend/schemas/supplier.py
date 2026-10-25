"""
Supplier Schemas for Pharmacie 360 Backend
Pydantic models for supplier data validation
"""

from datetime import datetime
from typing import Optional

from pydantic import BaseModel, Field, ConfigDict


class SupplierBase(BaseModel):
    """Base supplier schema"""
    name: str = Field(..., min_length=1, max_length=100, description="Supplier name")
    contact: Optional[str] = Field(None, max_length=100, description="Contact person")
    email: Optional[str] = Field(None, max_length=100, description="Email address")
    phone: Optional[str] = Field(None, max_length=20, description="Phone number")
    address: Optional[str] = Field(None, description="Physical address")
    city: Optional[str] = Field(None, max_length=50, description="City")
    country: str = Field(default="Bénin", description="Country")
    tax_id: Optional[str] = Field(None, max_length=50, description="Tax identification number")
    payment_terms: Optional[str] = Field(None, description="Payment terms")
    is_active: bool = Field(default=True, description="Whether supplier is active")


class SupplierCreate(SupplierBase):
    """Schema for creating a new supplier"""
    model_config = ConfigDict(json_schema_extra={"example": {
        "name": "Pharma Distributeur SA",
        "contact": "Jean Dupont",
        "email": "contact@pharmadist.com",
        "phone": "+229 12 34 56 78",
        "address": "123 Rue de la Santé, Cotonou",
        "city": "Cotonou",
        "country": "Bénin",
        "tax_id": "BJ-TVA-12345",
        "payment_terms": "30 jours net"
    }})


class SupplierUpdate(BaseModel):
    """Schema for updating a supplier"""
    name: Optional[str] = Field(None, min_length=1, max_length=100)
    contact: Optional[str] = Field(None, max_length=100)
    email: Optional[str] = Field(None, max_length=100)
    phone: Optional[str] = Field(None, max_length=20)
    address: Optional[str] = Field(None)
    city: Optional[str] = Field(None, max_length=50)
    country: Optional[str] = Field(None)
    tax_id: Optional[str] = Field(None, max_length=50)
    payment_terms: Optional[str] = Field(None)
    is_active: Optional[bool] = Field(None)


class SupplierResponse(SupplierBase):
    """Schema for supplier response"""
    id: int = Field(..., description="Supplier ID")
    created_at: datetime = Field(..., description="Creation timestamp")
    updated_at: datetime = Field(..., description="Last update timestamp")
    product_count: int = Field(default=0, description="Number of products from this supplier")
    invoice_count: int = Field(default=0, description="Number of invoices from this supplier")
    total_purchases: float = Field(default=0.0, description="Total purchase amount")
    
    model_config = ConfigDict(from_attributes=True)


class SupplierDetailResponse(SupplierResponse):
    """Schema for detailed supplier response with products"""
    products: list[dict] = Field(default_factory=list, description="List of products from this supplier")
    recent_invoices: list[dict] = Field(default_factory=list, description="Recent invoices from this supplier")


class SupplierListResponse(BaseModel):
    """Schema for paginated supplier list"""
    suppliers: list[SupplierResponse] = Field(default_factory=list)
    total: int = Field(..., description="Total number of suppliers")
    page: int = Field(..., description="Current page")
    page_size: int = Field(..., description="Items per page")
    total_pages: int = Field(..., description="Total number of pages")
