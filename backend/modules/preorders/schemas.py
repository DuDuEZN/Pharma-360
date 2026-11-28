"""Schemas du module Précommandes."""

from datetime import datetime
from decimal import Decimal
from typing import Optional

from pydantic import BaseModel, ConfigDict, Field


class PreorderResponse(BaseModel):
    id: int
    reference: str
    pickup_code: str
    sale_id: Optional[int] = None
    sale_number: Optional[str] = None
    sale_item_id: Optional[int] = None
    product_id: int
    product_name: Optional[str] = None
    product_barcode: Optional[str] = None
    customer_id: Optional[int] = None
    customer_name: str
    customer_phone: str
    quantity: int
    unit_price: Decimal = 0
    status: str
    reserved_batch_id: Optional[int] = None
    batch_number: Optional[str] = None
    notes: Optional[str] = None
    available_at: Optional[datetime] = None
    delivered_at: Optional[datetime] = None
    cancelled_at: Optional[datetime] = None
    created_at: datetime
    updated_at: datetime

    model_config = ConfigDict(from_attributes=True, json_encoders={Decimal: float})


class PreorderListResponse(BaseModel):
    items: list[PreorderResponse] = Field(default_factory=list)
    total: int = 0
    page: int = 1
    page_size: int = 20


class PreparationLine(BaseModel):
    product_id: int
    product_name: str
    product_barcode: Optional[str] = None
    pending_quantity: int = 0
    pending_count: int = 0
    available_count: int = 0


class PreparationResponse(BaseModel):
    items: list[PreparationLine] = Field(default_factory=list)
    total_pending: int = 0


class CancelPreorderRequest(BaseModel):
    reason: Optional[str] = None
