"""
Supplier Model for Pharmacie 360 Backend
SQLAlchemy model for suppliers table
"""

from datetime import datetime
from typing import TYPE_CHECKING, Optional

from sqlalchemy import Boolean, Date, DateTime, Numeric, String, Text, func
from sqlalchemy.orm import Mapped, mapped_column, relationship

from .base import Base

if TYPE_CHECKING:
    from .batch import Batch
    from .invoice import Invoice
    from .product import Product


class Supplier(Base):
    """
    Supplier model representing product suppliers

    Contains all supplier information for procurement and invoice management
    """

    __tablename__ = "suppliers"

    # Columns
    id: Mapped[int] = mapped_column(primary_key=True, autoincrement=True)
    name: Mapped[str] = mapped_column(String(100), nullable=False, index=True)
    contact: Mapped[Optional[str]] = mapped_column(String(100), nullable=True)
    email: Mapped[Optional[str]] = mapped_column(String(100), nullable=True, index=True)
    phone: Mapped[Optional[str]] = mapped_column(String(20), nullable=True, index=True)
    address: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    city: Mapped[Optional[str]] = mapped_column(String(50), nullable=True)
    country: Mapped[str] = mapped_column(String(50), default="Bénin", nullable=False)
    tax_id: Mapped[Optional[str]] = mapped_column(String(50), nullable=True)
    payment_terms: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    is_active: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)
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
    products: Mapped[list["Product"]] = relationship(
        "Product", back_populates="supplier", foreign_keys="Product.supplier_id"
    )
    batches: Mapped[list["Batch"]] = relationship(
        "Batch", back_populates="supplier", foreign_keys="Batch.supplier_id"
    )
    invoices: Mapped[list["Invoice"]] = relationship(
        "Invoice", back_populates="supplier", foreign_keys="Invoice.supplier_id"
    )

    # Constraints
    __table_args__ = ({"comment": "Product suppliers for procurement"},)

    def __repr__(self) -> str:
        return f"<Supplier(id={self.id}, name='{self.name}')>"

    @property
    def full_address(self) -> str:
        """Get full address"""
        parts = [self.address, self.city, self.country]
        return ", ".join(filter(None, parts))
