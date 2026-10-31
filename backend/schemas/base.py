"""
Base Schema for Pharmacie 360 Backend
Common base schema for all Pydantic models
"""

from pydantic import BaseModel, ConfigDict
from datetime import datetime, date
from typing import Optional


class BaseSchema(BaseModel):
    """Base schema with common configuration"""
    model_config = ConfigDict(
        from_attributes=True,
        populate_by_name=True,
    )


class BaseResponse(BaseSchema):
    """Base response schema with common fields"""
    id: int
    created_at: datetime
    updated_at: datetime
    is_active: bool = True
