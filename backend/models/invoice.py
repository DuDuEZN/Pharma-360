"""
Invoice Model for Pharmacie 360 Backend
SQLAlchemy model for invoices table (supplier purchase invoices)
"""

from datetime import date, datetime
from typing import TYPE_CHECKING, Optional

from sqlalchemy import (
    JSON,
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
    from .batch import Batch
    from .supplier import Supplier


class Invoice(Base):
    """
    Invoice model representing supplier purchase invoices

    Used for:
    - Tracking supplier purchases
    - OCR processing of scanned invoices
    - Payment status management
    - Batch creation from invoice items
    """

    __tablename__ = "invoices"

    # Columns
    id: Mapped[int] = mapped_column(primary_key=True, autoincrement=True)
    invoice_number: Mapped[str] = mapped_column(
        String(50), unique=True, nullable=False, index=True
    )
    supplier_id: Mapped[int] = mapped_column(
        Integer,
        ForeignKey("suppliers.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    date: Mapped[date] = mapped_column(
        Date, default=func.current_date(), nullable=False
    )
    due_date: Mapped[Optional[date]] = mapped_column(Date, nullable=True)
    subtotal: Mapped[float] = mapped_column(
        Numeric(12, 2), default=0.00, nullable=False
    )
    tax_amount: Mapped[float] = mapped_column(
        Numeric(10, 2), default=0.00, nullable=False
    )
    discount: Mapped[float] = mapped_column(
        Numeric(10, 2), default=0.00, nullable=False
    )
    total_final: Mapped[float] = mapped_column(
        Numeric(12, 2), default=0.00, nullable=False
    )
    status: Mapped[str] = mapped_column(
        String(20), default="draft", nullable=False, index=True
    )
    payment_method: Mapped[Optional[str]] = mapped_column(String(50), nullable=True)
    payment_date: Mapped[Optional[date]] = mapped_column(Date, nullable=True)
    file_path: Mapped[Optional[str]] = mapped_column(String(255), nullable=True)
    ocr_processed: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)
    ocr_data: Mapped[Optional[dict]] = mapped_column(
        JSON, nullable=True, comment="Data extracted by OCR from invoice image"
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
    supplier: Mapped["Supplier"] = relationship("Supplier", back_populates="invoices")
    batches: Mapped[list["Batch"]] = relationship(
        "Batch",
        back_populates="purchase_invoice",
        foreign_keys="Batch.purchase_invoice_id",
    )

    # Constraints
    __table_args__ = ({"comment": "Supplier purchase invoices with OCR support"},)

    def __repr__(self) -> str:
        return f"<Invoice(id={self.id}, number='{self.invoice_number}', status='{self.status}')>"

    @property
    def is_paid(self) -> bool:
        """Check if invoice is paid"""
        return self.status == "paid"

    @property
    def is_pending(self) -> bool:
        """Check if invoice is pending payment"""
        return self.status == "pending"

    @property
    def is_overdue(self) -> bool:
        """Check if invoice is overdue"""
        if self.due_date and self.status != "paid":
            return self.due_date < date.today()
        return False

    @property
    def days_until_due(self) -> Optional[int]:
        """Get days until due date"""
        if self.due_date:
            return (self.due_date - date.today()).days
        return None

    @property
    def total_with_tax(self) -> float:
        """Get total including tax"""
        return float(self.subtotal) + float(self.tax_amount) - float(self.discount)
