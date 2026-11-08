"""
Customer Schemas for Pharmacie 360 Backend
Pydantic models for customer data validation
"""

from datetime import datetime
from typing import Optional

from pydantic import BaseModel, ConfigDict, EmailStr, Field


class CustomerBase(BaseModel):
    """Base customer schema"""

    name: str = Field(..., min_length=1, max_length=100, description="Customer name")
    contact: Optional[str] = Field(None, max_length=100, description="Contact person")
    email: Optional[EmailStr] = Field(None, max_length=100, description="Email address")
    phone: Optional[str] = Field(None, max_length=20, description="Phone number")
    address: Optional[str] = Field(None, description="Physical address")
    city: Optional[str] = Field(None, max_length=50, description="City")
    country: Optional[str] = Field(default="Bénin", description="Country")
    tax_id: Optional[str] = Field(
        None, max_length=50, description="Tax identification number"
    )


class CustomerCreate(CustomerBase):
    """Schema for creating a new customer"""

    model_config = ConfigDict(
        json_schema_extra={
            "example": {
                "name": "Pharmacie du Centre",
                "contact": "Marie Martin",
                "email": "contact@pharmacentre.com",
                "phone": "+229 12 34 56 78",
                "address": "123 Rue de la Santé, Cotonou",
                "city": "Cotonou",
                "country": "Bénin",
                "tax_id": "BJ-TVA-12345",
            }
        }
    )


class CustomerUpdate(BaseModel):
    """Schema for updating a customer"""

    name: Optional[str] = Field(None, min_length=1, max_length=100)
    contact: Optional[str] = Field(None, max_length=100)
    email: Optional[EmailStr] = Field(None, max_length=100)
    phone: Optional[str] = Field(None, max_length=20)
    address: Optional[str] = Field(None)
    city: Optional[str] = Field(None, max_length=50)
    country: Optional[str] = Field(None)
    tax_id: Optional[str] = Field(None, max_length=50)


class CustomerResponse(CustomerBase):
    """Schema for customer response"""

    id: int = Field(..., description="Customer ID")
    created_at: datetime = Field(..., description="Creation timestamp")
    updated_at: datetime = Field(..., description="Last update timestamp")
    total_purchases: float = Field(default=0.0, description="Total purchase amount")
    purchase_count: int = Field(default=0, description="Number of purchases")
    last_purchase_date: Optional[datetime] = Field(
        None, description="Date of last purchase"
    )

    model_config = ConfigDict(from_attributes=True)


class CustomerDetailResponse(CustomerResponse):
    """Schema for detailed customer response"""

    orders: list[dict] = Field(
        default_factory=list, description="List of customer orders"
    )
    invoices: list[dict] = Field(
        default_factory=list, description="List of customer invoices"
    )


class CustomerStatsResponse(BaseModel):
    """Schema for customer statistics"""

    customer_id: int = Field(..., description="Customer ID")
    total_purchases: float = Field(..., description="Total purchase amount")
    purchase_count: int = Field(..., description="Number of purchases")
    avg_purchase_value: float = Field(..., description="Average purchase value")
    first_purchase_date: Optional[datetime] = Field(
        None, description="Date of first purchase"
    )
    last_purchase_date: Optional[datetime] = Field(
        None, description="Date of last purchase"
    )
    most_purchased_category: Optional[str] = Field(
        None, description="Most purchased category"
    )
