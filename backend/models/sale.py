"""
Sale Model for Pharmacie 360 Backend
SQLAlchemy model for sales table
"""

from datetime import datetime
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
    from .customer import Customer
    from .sale_history import SaleHistory
    from .sale_item import SaleItem
    from .user import User


class Sale(Base):
    """
    Sale model representing completed sales transactions

    Contains:
    - Sale header information
    - Status tracking (pending, paid, cancelled, refunded)
    - Payment information
    - Links to sale items
    """

    __tablename__ = "sales"

    # Columns
    id: Mapped[int] = mapped_column(primary_key=True, autoincrement=True)
    sale_number: Mapped[str] = mapped_column(
        String(50), unique=True, nullable=False, index=True
    )
    customer_id: Mapped[Optional[int]] = mapped_column(
        Integer,
        ForeignKey("customers.id", ondelete="SET NULL"),
        nullable=True,
        index=True,
    )
    user_id: Mapped[int] = mapped_column(
        Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True
    )
    status: Mapped[str] = mapped_column(
        String(20), default="pending", nullable=False, index=True
    )
    subtotal: Mapped[float] = mapped_column(
        Numeric(12, 2), default=0.00, nullable=False
    )
    tax_amount: Mapped[float] = mapped_column(
        Numeric(10, 2), default=0.00, nullable=False
    )
    discount: Mapped[float] = mapped_column(
        Numeric(10, 2), default=0.00, nullable=False
    )
    total: Mapped[float] = mapped_column(Numeric(12, 2), default=0.00, nullable=False)
    payment_method: Mapped[Optional[str]] = mapped_column(String(50), nullable=True)
    payment_reference: Mapped[Optional[str]] = mapped_column(
        String(100), nullable=True, comment="Payment reference (e.g., receipt number)"
    )
    payment_date: Mapped[Optional[datetime]] = mapped_column(
        DateTime(timezone=True), nullable=True
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
    customer: Mapped[Optional["Customer"]] = relationship(
        "Customer", back_populates="sales"
    )
    user: Mapped["User"] = relationship("User", back_populates="sales")
    items: Mapped[list["SaleItem"]] = relationship(
        "SaleItem",
        back_populates="sale",
        foreign_keys="SaleItem.sale_id",
        cascade="all, delete-orphan",
    )
    history_records: Mapped[list["SaleHistory"]] = relationship(
        "SaleHistory", back_populates="sale", foreign_keys="SaleHistory.sale_id"
    )

    # Constraints
    __table_args__ = ({"comment": "Sales transactions with status tracking"},)

    def __repr__(self) -> str:
        return (
            f"<Sale(id={self.id}, sale_number='{self.sale_number}', "
            f"status='{self.status}', total={self.total})>"
        )

    @property
    def is_pending(self) -> bool:
        """Check if sale is pending payment"""
        return self.status == "pending"

    @property
    def is_paid(self) -> bool:
        """Check if sale is paid"""
        return self.status == "paid"

    @property
    def is_cancelled(self) -> bool:
        """Check if sale is cancelled"""
        return self.status == "cancelled"

    @property
    def is_refunded(self) -> bool:
        """Check if sale is refunded"""
        return self.status == "refunded"

    @property
    def item_count(self) -> int:
        """Get total number of items in sale"""
        return len(self.items)

    @property
    def total_items(self) -> int:
        """Get total quantity of items in sale"""
        return sum(item.quantity for item in self.items)

    def calculate_totals(self) -> None:
        """Calculate and update sale totals from items"""
        self.subtotal = sum(float(item.total_price) for item in self.items)
        self.total = self.subtotal + self.tax_amount - self.discount

    def mark_as_paid(
        self, payment_method: str, payment_reference: Optional[str] = None
    ) -> None:
        """Mark sale as paid"""
        self.status = "paid"
        self.payment_method = payment_method
        self.payment_reference = payment_reference
        self.payment_date = datetime.now(timezone=True)

    def cancel(self) -> None:
        """Cancel the sale"""
        self.status = "cancelled"
