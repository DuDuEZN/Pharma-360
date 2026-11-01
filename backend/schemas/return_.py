"""
Return Schemas for Pharmacie 360 Backend
Pydantic models for return data validation
"""

from datetime import datetime
from typing import List, Optional

from pydantic import BaseModel, ConfigDict, Field


class ReturnBase(BaseModel):
    """Base return schema"""

    return_number: str = Field(
        ..., min_length=1, max_length=50, description="Return number"
    )
    batch_id: int = Field(..., ge=1, description="Batch ID being returned")
    product_id: int = Field(..., ge=1, description="Product ID")
    quantity: int = Field(..., ge=1, description="Quantity returned")
    reason: str = Field(
        ..., min_length=1, max_length=50, description="Reason for return"
    )
    notes: Optional[str] = Field(None, description="Additional notes")


class ReturnCreate(ReturnBase):
    """Schema for creating a new return"""

    model_config = ConfigDict(
        json_schema_extra={
            "example": {
                "return_number": "RET-2025-001",
                "batch_id": 1,
                "product_id": 1,
                "quantity": 10,
                "reason": "expiry",
                "notes": "Produit périmé le 15/01/2025",
            }
        }
    )


class ReturnUpdate(BaseModel):
    """Schema for updating a return"""

    return_number: Optional[str] = Field(None, min_length=1, max_length=50)
    batch_id: Optional[int] = Field(None, ge=1)
    product_id: Optional[int] = Field(None, ge=1)
    quantity: Optional[int] = Field(None, ge=1)
    reason: Optional[str] = Field(None, min_length=1, max_length=50)
    notes: Optional[str] = Field(None)


class ReturnResponse(ReturnBase):
    """Schema for return response"""

    id: int = Field(..., description="Return ID")
    user_id: int = Field(..., description="User who processed the return")
    product_name: Optional[str] = Field(None, description="Product name")
    batch_number: Optional[str] = Field(None, description="Batch number")
    user_name: Optional[str] = Field(None, description="User name")
    reason_display: str = Field(..., description="Display-friendly reason")
    created_at: datetime = Field(..., description="Creation timestamp")

    model_config = ConfigDict(from_attributes=True)


class ReturnDetailResponse(ReturnResponse):
    """Schema for detailed return response"""

    pass


class ReturnListResponse(BaseModel):
    """Schema for paginated return list"""

    returns: List[ReturnResponse] = Field(default_factory=list)
    total: int = Field(..., description="Total number of returns")
    page: int = Field(..., description="Current page")
    page_size: int = Field(..., description="Items per page")
    total_pages: int = Field(..., description="Total number of pages")


class ReturnStatsResponse(BaseModel):
    """Schema for return statistics"""

    total_returns: int = Field(..., description="Total number of returns")
    returns_by_reason: dict = Field(
        default_factory=dict, description="Returns grouped by reason"
    )
    returns_by_product: dict = Field(
        default_factory=dict, description="Returns grouped by product"
    )
    returns_by_period: dict = Field(
        default_factory=dict, description="Returns grouped by time period"
    )
    most_returned_products: List[dict] = Field(
        default_factory=list, description="Top products by return count"
    )

    model_config = ConfigDict(
        json_schema_extra={
            "example": {
                "total_returns": 45,
                "returns_by_reason": {
                    "expiry": 25,
                    "damage": 10,
                    "supplier": 8,
                    "other": 2,
                },
                "most_returned_products": [
                    {"product_id": 1, "product_name": "Paracetamol 500mg", "count": 15},
                    {"product_id": 2, "product_name": "Amoxicillin 250mg", "count": 10},
                ],
            }
        }
    )
