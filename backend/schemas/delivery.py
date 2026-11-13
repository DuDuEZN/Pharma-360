from datetime import date, datetime
from decimal import Decimal
from typing import Optional, List

from pydantic import BaseModel, ConfigDict, Field


class DeliveryItemCreate(BaseModel):
    product_id: Optional[int] = None
    quantity: int = Field(default=1, ge=1)
    unit_price: float = Field(default=0, ge=0)
    received_quantity: int = Field(default=0, ge=0)
    non_conforming_quantity: int = Field(default=0, ge=0)
    expiry_date: Optional[date] = None
    location: Optional[str] = Field(None, max_length=50)
    notes: Optional[str] = None
    batch_number: Optional[str] = Field(None, max_length=50, description="Numéro de lot saisi à la livraison")
    barcode: Optional[str] = Field(None, max_length=50, description="Code-barres saisi/scanné à la livraison")


class DeliveryItemResponse(BaseModel):
    id: int
    delivery_id: int
    product_id: Optional[int] = None
    product_name: Optional[str] = None
    product_barcode: Optional[str] = None
    barcode: Optional[str] = None
    product_price: float = 0
    quantity: int
    unit_price: float
    total_price: float
    received_quantity: int = 0
    non_conforming_quantity: int = 0
    expiry_date: Optional[date] = None
    location: Optional[str] = None
    notes: Optional[str] = None
    batch_number: Optional[str] = None
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)


class DeliveryCreate(BaseModel):
    supplier_id: Optional[int] = None
    reference: Optional[str] = None
    delivery_date: Optional[date] = None
    expected_date: Optional[date] = None
    status: str = "pending"
    tracking_number: Optional[str] = None
    notes: Optional[str] = None
    order_id: int = Field(..., description="ID de la commande associée (obligatoire)")
    received_at: Optional[datetime] = None
    reception_notes: Optional[str] = None
    invoice_path: Optional[str] = None
    items: List[DeliveryItemCreate] = Field(default_factory=list)


class DeliveryUpdate(DeliveryCreate):
    pass


class DeliveryResponse(BaseModel):
    id: int
    supplier_id: Optional[int] = None
    supplier_name: Optional[str] = None
    reference: Optional[str] = None
    delivery_date: Optional[date] = None
    expected_date: Optional[date] = None
    status: str
    tracking_number: Optional[str] = None
    notes: Optional[str] = None
    order_id: Optional[int] = None
    order_reference: Optional[str] = None
    received_at: Optional[datetime] = None
    reception_notes: Optional[str] = None
    invoice_path: Optional[str] = None
    stock_applied: bool = False
    items_count: int = 0
    created_at: datetime
    updated_at: datetime
    items: Optional[List[DeliveryItemResponse]] = None

    model_config = ConfigDict(from_attributes=True)


class DeliveryListResponse(BaseModel):
    deliveries: List[DeliveryResponse]
    total: int
    page: int
    page_size: int
    total_pages: int
