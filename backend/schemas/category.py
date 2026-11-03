"""
Category Schemas for Pharmacie 360 Backend
"""

from typing import Optional

from pydantic import BaseModel, ConfigDict, Field


class CategoryCreate(BaseModel):
    """Schema for creating a category"""

    name: str = Field(..., min_length=1, max_length=50, description="Category name")
    description: Optional[str] = Field(None, description="Category description")


class CategoryResponse(BaseModel):
    """Schema for category response"""

    id: int
    name: str
    description: Optional[str] = None
    is_active: bool = True
    product_count: int = 0

    model_config = ConfigDict(from_attributes=True)
