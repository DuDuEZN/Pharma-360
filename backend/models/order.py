"""
Order Model for Pharmacie 360 Backend
"""
from datetime import datetime, date
from decimal import Decimal
from typing import TYPE_CHECKING, Optional, List

from sqlalchemy import Boolean, DateTime, ForeignKey, Integer, Numeric, String, Text, func, Date
from sqlalchemy.orm import Mapped, mapped_column, relationship

from .base import Base

if TYPE_CHECKING:
    from .supplier import Supplier
    from .product import Product


class Order(Base):
    __tablename__ = "orders"

    id: Mapped[int] = mapped_column(primary_key=True, autoincrement=True)
    supplier_id: Mapped[Optional[int]] = mapped_column(ForeignKey("suppliers.id", ondelete="SET NULL"), nullable=True)
    reference: Mapped[Optional[str]] = mapped_column(String(100), nullable=True)
    order_date: Mapped[date] = mapped_column(Date, nullable=False)
    expected_delivery_date: Mapped[Optional[date]] = mapped_column(Date, nullable=True)
    status: Mapped[str] = mapped_column(String(30), nullable=False, default="pending")
    priority: Mapped[str] = mapped_column(String(20), nullable=False, default="normal")
    notes: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    approved_by: Mapped[Optional[int]] = mapped_column(ForeignKey("users.id", ondelete="SET NULL"), nullable=True)
    approved_at: Mapped[Optional[datetime]] = mapped_column(DateTime, nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime, server_default=func.now(), nullable=False)
    updated_at: Mapped[datetime] = mapped_column(DateTime, server_default=func.now(), onupdate=func.now(), nullable=False)

    supplier: Mapped[Optional["Supplier"]] = relationship("Supplier", backref="orders")
    items: Mapped[List["OrderItem"]] = relationship("OrderItem", back_populates="order", cascade="all, delete-orphan")


class OrderItem(Base):
    __tablename__ = "order_items"

    id: Mapped[int] = mapped_column(primary_key=True, autoincrement=True)
    order_id: Mapped[int] = mapped_column(ForeignKey("orders.id", ondelete="CASCADE"), nullable=False)
    product_id: Mapped[Optional[int]] = mapped_column(ForeignKey("products.id", ondelete="SET NULL"), nullable=True)
    quantity: Mapped[int] = mapped_column(Integer, nullable=False, default=1)
    unit_price: Mapped[Decimal] = mapped_column(Numeric(10, 2), nullable=False, default=0)
    total_price: Mapped[Decimal] = mapped_column(Numeric(12, 2), nullable=False, default=0)
    created_at: Mapped[datetime] = mapped_column(DateTime, server_default=func.now(), nullable=False)

    order: Mapped["Order"] = relationship("Order", back_populates="items")
    product: Mapped[Optional["Product"]] = relationship("Product")


class Delivery(Base):
    __tablename__ = "deliveries"

    id: Mapped[int] = mapped_column(primary_key=True, autoincrement=True)
    supplier_id: Mapped[Optional[int]] = mapped_column(ForeignKey("suppliers.id", ondelete="SET NULL"), nullable=True)
    reference: Mapped[Optional[str]] = mapped_column(String(100), nullable=True)
    tracking_number: Mapped[Optional[str]] = mapped_column(String(100), nullable=True)
    delivery_date: Mapped[date] = mapped_column(Date, nullable=False)
    expected_date: Mapped[Optional[date]] = mapped_column(Date, nullable=True)
    status: Mapped[str] = mapped_column(String(30), nullable=False, default="pending")
    notes: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    order_id: Mapped[int] = mapped_column(ForeignKey("orders.id", ondelete="CASCADE"), nullable=False)
    received_at: Mapped[Optional[datetime]] = mapped_column(DateTime, nullable=True)
    reception_notes: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    invoice_path: Mapped[Optional[str]] = mapped_column(String(500), nullable=True)
    stock_applied: Mapped[bool] = mapped_column(Boolean, nullable=False, default=False)
    created_at: Mapped[datetime] = mapped_column(DateTime, server_default=func.now(), nullable=False)
    updated_at: Mapped[datetime] = mapped_column(DateTime, server_default=func.now(), onupdate=func.now(), nullable=False)

    supplier: Mapped[Optional["Supplier"]] = relationship("Supplier", backref="deliveries")
    order: Mapped[Optional["Order"]] = relationship("Order")
    items: Mapped[List["DeliveryItem"]] = relationship("DeliveryItem", back_populates="delivery", cascade="all, delete-orphan")


class DeliveryItem(Base):
    __tablename__ = "delivery_items"

    id: Mapped[int] = mapped_column(primary_key=True, autoincrement=True)
    delivery_id: Mapped[int] = mapped_column(ForeignKey("deliveries.id", ondelete="CASCADE"), nullable=False)
    product_id: Mapped[Optional[int]] = mapped_column(ForeignKey("products.id", ondelete="SET NULL"), nullable=True)
    quantity: Mapped[int] = mapped_column(Integer, nullable=False, default=1)
    unit_price: Mapped[Decimal] = mapped_column(Numeric(10, 2), nullable=False, default=0)
    total_price: Mapped[Decimal] = mapped_column(Numeric(12, 2), nullable=False, default=0)
    received_quantity: Mapped[int] = mapped_column(Integer, nullable=False, default=0)
    non_conforming_quantity: Mapped[int] = mapped_column(Integer, nullable=False, default=0)
    expiry_date: Mapped[Optional[date]] = mapped_column(Date, nullable=True)
    location: Mapped[Optional[str]] = mapped_column(String(50), nullable=True)
    notes: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    batch_number: Mapped[Optional[str]] = mapped_column(String(50), nullable=True)
    barcode: Mapped[Optional[str]] = mapped_column(String(50), nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime, server_default=func.now(), nullable=False)

    delivery: Mapped["Delivery"] = relationship("Delivery", back_populates="items")
    product: Mapped[Optional["Product"]] = relationship("Product")
