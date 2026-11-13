from datetime import date, datetime
from decimal import Decimal
from typing import Optional, List

from pydantic import BaseModel, ConfigDict, Field


class OrderItemCreate(BaseModel):
    product_id: Optional[int] = None
    quantity: int = Field(default=1, ge=1)
    unit_price: float = Field(default=0, ge=0)


class OrderItemResponse(BaseModel):
    id: int
    order_id: int
    product_id: Optional[int] = None
    product_name: Optional[str] = None
    product_barcode: Optional[str] = None
    quantity: int
    unit_price: float
    total_price: float
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)


class OrderCreate(BaseModel):
    supplier_id: Optional[int] = None
    reference: Optional[str] = None
    order_date: Optional[date] = None
    expected_delivery_date: Optional[date] = None
    status: str = "pending"
    priority: str = "normal"
    notes: Optional[str] = None
    items: List[OrderItemCreate] = Field(default_factory=list)


class OrderUpdate(OrderCreate):
    pass


class OrderResponse(BaseModel):
    id: int
    supplier_id: Optional[int] = None
    supplier_name: Optional[str] = None
    reference: Optional[str] = None
    order_date: Optional[date] = None
    expected_delivery_date: Optional[date] = None
    status: str
    priority: str
    notes: Optional[str] = None
    approved_by: Optional[int] = None
    approved_at: Optional[datetime] = None
    items_count: int = 0
    total_amount: float = 0.0
    created_at: datetime
    updated_at: datetime
    items: Optional[List[OrderItemResponse]] = None

    model_config = ConfigDict(from_attributes=True)


class OrderListResponse(BaseModel):
    orders: List[OrderResponse]
    total: int
    page: int
    page_size: int
    total_pages: int
