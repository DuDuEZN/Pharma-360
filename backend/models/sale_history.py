"""
Sale History Model for Pharmacie 360 Backend
SQLAlchemy model for tracking historical sales data
"""

from datetime import date, datetime
from typing import TYPE_CHECKING, Optional
from decimal import Decimal

from sqlalchemy import Numeric, Boolean, Date, DateTime, ForeignKey, Integer, String, Text, func
from sqlalchemy.orm import Mapped, mapped_column, relationship

from .base import Base

if TYPE_CHECKING:
    from .sale import Sale
    from .product import Product
    from .batch import Batch
    from .user import User


class SaleHistory(Base):
    """
    Sale History model for tracking all sales transactions
    
    This model stores historical data about sales for analytics and reporting.
    It's separate from the Sale model to allow for efficient querying of historical data.
    """
    
    __tablename__ = "sale_history"
    
    # Columns
    id: Mapped[int] = mapped_column(primary_key=True, autoincrement=True)
    sale_id: Mapped[int] = mapped_column(
        Integer,
        ForeignKey("sales.id", ondelete="CASCADE"),
        nullable=False,
        index=True
    )
    sale_number: Mapped[str] = mapped_column(
        String(50),
        nullable=False,
        index=True
    )
    product_id: Mapped[int] = mapped_column(
        Integer,
        ForeignKey("products.id", ondelete="SET NULL"),
        nullable=True,
        index=True
    )
    product_name: Mapped[str] = mapped_column(
        String(200),
        nullable=False
    )
    batch_id: Mapped[Optional[int]] = mapped_column(
        Integer,
        ForeignKey("batches.id", ondelete="SET NULL"),
        nullable=True,
        index=True
    )
    batch_number: Mapped[Optional[str]] = mapped_column(
        String(50),
        nullable=True
    )
    quantity: Mapped[int] = mapped_column(
        Integer,
        nullable=False
    )
    unit_price: Mapped[Decimal] = mapped_column(
        Numeric(10, 2),
        nullable=False
    )
    total_price: Mapped[Decimal] = mapped_column(
        Numeric(12, 2),
        nullable=False
    )
    sale_date: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        nullable=False,
        index=True
    )
    sale_day: Mapped[date] = mapped_column(
        Date,
        nullable=False,
        index=True
    )
    cashier_id: Mapped[Optional[int]] = mapped_column(
        Integer,
        ForeignKey("users.id", ondelete="SET NULL"),
        nullable=True
    )
    cashier_name: Mapped[Optional[str]] = mapped_column(
        String(100),
        nullable=True
    )
    customer_id: Mapped[Optional[int]] = mapped_column(
        Integer,
        ForeignKey("customers.id", ondelete="SET NULL"),
        nullable=True
    )
    customer_name: Mapped[Optional[str]] = mapped_column(
        String(200),
        nullable=True
    )
    payment_method: Mapped[Optional[str]] = mapped_column(
        String(50),
        nullable=True
    )
    notes: Mapped[Optional[str]] = mapped_column(
        Text,
        nullable=True
    )
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        server_default=func.now(),
        nullable=False
    )
    
    # Relationships
    sale: Mapped["Sale"] = relationship(
        "Sale",
        back_populates="history_records"
    )
    product: Mapped[Optional["Product"]] = relationship(
        "Product",
        foreign_keys=[product_id]
    )
    batch: Mapped[Optional["Batch"]] = relationship(
        "Batch",
        foreign_keys=[batch_id]
    )
    cashier: Mapped[Optional["User"]] = relationship(
        "User",
        foreign_keys=[cashier_id]
    )
    
    # Indexes for performance
    __table_args__ = (
        {
            "comment": "Historical sales data for analytics and reporting"
        },
    )
    
    def __repr__(self) -> str:
        return f"<SaleHistory(id={self.id}, sale_number='{self.sale_number}', product='{self.product_name}', quantity={self.quantity})>"
