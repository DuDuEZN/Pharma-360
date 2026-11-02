"""
Batch Model for Pharmacie 360 Backend
SQLAlchemy model for batches table (CORE for FEFO/FIFO system)
"""

from datetime import date, datetime
from typing import TYPE_CHECKING, Optional

from sqlalchemy import (
    Boolean,
    Date,
    DateTime,
    ForeignKey,
    Integer,
    Numeric,
    String,
    Text,
    func,
)
from sqlalchemy.orm import Mapped, mapped_column, relationship

from .base import Base

if TYPE_CHECKING:
    from .invoice import Invoice
    from .movement import Movement
    from .product import Product
    from .return_ import Return
    from .sale_item import SaleItem
    from .supplier import Supplier


class Batch(Base):
    """
    Batch model representing product batches with FEFO/FIFO support

    This is the CORE of the FEFO/FIFO system:
    - Each product can have multiple batches
    - Each batch has its own expiry date
    - FEFO: First Expired, First Out - prioritize batches with closest expiry
    - FIFO: First In, First Out - prioritize oldest batches

    The system uses FEFO by default (as per requirements)
    """

    __tablename__ = "batches"

    # Columns
    id: Mapped[int] = mapped_column(primary_key=True, autoincrement=True)
    product_id: Mapped[int] = mapped_column(
        Integer,
        ForeignKey("products.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    batch_number: Mapped[str] = mapped_column(
        String(50), unique=True, nullable=False, index=True
    )
    expiry_date: Mapped[date] = mapped_column(
        Date, nullable=False, index=True, comment="Date of expiration - CORE for FEFO"
    )
    quantity: Mapped[int] = mapped_column(
        Integer, default=0, nullable=False, comment="Current available quantity"
    )
    initial_quantity: Mapped[int] = mapped_column(
        Integer,
        default=0,
        nullable=False,
        comment="Initial quantity when batch was created",
    )
    location: Mapped[Optional[str]] = mapped_column(String(50), nullable=True)
    received_date: Mapped[date] = mapped_column(
        Date, default=func.current_date(), nullable=False
    )
    supplier_id: Mapped[Optional[int]] = mapped_column(
        Integer,
        ForeignKey("suppliers.id", ondelete="SET NULL"),
        nullable=True,
        index=True,
    )
    cost_price: Mapped[float] = mapped_column(
        Numeric(10, 2), default=0.00, nullable=False
    )
    selling_price: Mapped[float] = mapped_column(
        Numeric(10, 2), default=0.00, nullable=False
    )
    purchase_invoice_id: Mapped[Optional[int]] = mapped_column(
        Integer,
        ForeignKey("invoices.id", ondelete="SET NULL"),
        nullable=True,
        index=True,
    )
    status: Mapped[str] = mapped_column(
        String(20), default="active", nullable=False, index=True
    )
    notes: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), nullable=False
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        server_default=func.now(),
        onupdate=func.now(),
        nullable=False,
    )

    # Relationships
    product: Mapped["Product"] = relationship(
        "Product",
        back_populates="batches",
        lazy="selectin",  # chargement anticipé : les routes lisent batch.product.name
    )
    supplier: Mapped[Optional["Supplier"]] = relationship(
        "Supplier", back_populates="batches", lazy="selectin"
    )
    purchase_invoice: Mapped[Optional["Invoice"]] = relationship(
        "Invoice", back_populates="batches"
    )
    sale_items: Mapped[list["SaleItem"]] = relationship(
        "SaleItem", back_populates="batch", foreign_keys="SaleItem.batch_id"
    )
    returns: Mapped[list["Return"]] = relationship(
        "Return", back_populates="batch", foreign_keys="Return.batch_id"
    )
    movements: Mapped[list["Movement"]] = relationship(
        "Movement", back_populates="batch", foreign_keys="Movement.batch_id"
    )

    # Constraints
    __table_args__ = ({"comment": "Product batches - CORE for FEFO/FIFO system"},)

    def __repr__(self) -> str:
        return (
            f"<Batch(id={self.id}, product_id={self.product_id}, "
            f"batch_number='{self.batch_number}', expiry={self.expiry_date}, "
            f"quantity={self.quantity}, status='{self.status}')>"
        )

    @property
    def is_active(self) -> bool:
        """Check if batch is active"""
        return self.status == "active"

    @property
    def is_expired(self) -> bool:
        """Check if batch is expired"""
        return self.status == "expired" or self.expiry_date < date.today()

    @property
    def is_available(self) -> bool:
        """Check if batch has available stock"""
        return self.quantity > 0 and self.is_active and not self.is_expired

    @property
    def percentage_used(self) -> float:
        """Get percentage of batch that has been used"""
        if self.initial_quantity <= 0:
            return 0.0
        return ((self.initial_quantity - self.quantity) / self.initial_quantity) * 100

    @property
    def days_until_expiry(self) -> int:
        """Get days until expiry"""
        return (self.expiry_date - date.today()).days

    @property
    def is_expiring_soon(self) -> bool:
        """Check if batch is expiring within 30 days"""
        return 0 < self.days_until_expiry <= 30

    @property
    def fefo_priority(self) -> int:
        """
        FEFO Priority: Lower number = higher priority
        Prioritizes batches with closest expiry date
        """
        return self.days_until_expiry

    @property
    def fifo_priority(self) -> datetime:
        """
        FIFO Priority: Older batches have higher priority
        """
        return self.received_date

    def can_supply(self, requested_quantity: int) -> bool:
        """Check if batch can supply the requested quantity"""
        return self.quantity >= requested_quantity and self.is_available

    def reserve(self, quantity: int) -> bool:
        """Reserve quantity from batch (temporary reservation)"""
        if self.can_supply(quantity):
            self.quantity -= quantity
            return True
        return False

    def release(self, quantity: int) -> bool:
        """Release reserved quantity back to batch"""
        if self.quantity + quantity <= self.initial_quantity:
            self.quantity += quantity
            return True
        return False

    def consume(self, quantity: int) -> bool:
        """Permanently consume quantity from batch"""
        return self.reserve(quantity)
