"""
SaleItem Model for Pharmacie 360 Backend
SQLAlchemy model for sale_items table
"""

from datetime import date, datetime
from typing import TYPE_CHECKING, Optional

from sqlalchemy import Numeric,  Boolean, Date, DateTime, ForeignKey, Integer, String, Text, func
from sqlalchemy.orm import Mapped, mapped_column, relationship

from .base import Base

if TYPE_CHECKING:
    from .sale import Sale
    from .product import Product
    from .batch import Batch


class SaleItem(Base):
    """
    SaleItem model representing individual items in a sale
    
    Links:
    - Sale (parent sale)
    - Product (product sold)
    - Batch (specific batch sold, for FEFO/FIFO tracking)
    
    Contains:
    - Quantity sold
    - Price information
    - Expiry date at time of sale (for traceability)
    """
    
    __tablename__ = "sale_items"
    
    # Columns
    id: Mapped[int] = mapped_column(primary_key=True, autoincrement=True)
    sale_id: Mapped[int] = mapped_column(
        Integer,
        ForeignKey("sales.id", ondelete="CASCADE"),
        nullable=False,
        index=True
    )
    batch_id: Mapped[int] = mapped_column(
        Integer,
        ForeignKey("batches.id", ondelete="CASCADE"),
        nullable=False,
        index=True
    )
    product_id: Mapped[int] = mapped_column(
        Integer,
        ForeignKey("products.id", ondelete="CASCADE"),
        nullable=False,
        index=True
    )
    quantity: Mapped[int] = mapped_column(Integer, nullable=False)
    unit_price: Mapped[float] = mapped_column(
        Numeric(10, 2),
        nullable=False
    )
    total_price: Mapped[float] = mapped_column(
        Numeric(12, 2),
        nullable=False
    )
    expiry_date: Mapped[Optional[date]] = mapped_column(
        Date,
        nullable=True,
        comment="Expiry date at time of sale (from batch)"
    )
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        server_default=func.now(),
        nullable=False
    )
    
    # Relationships
    sale: Mapped["Sale"] = relationship(
        "Sale",
        back_populates="items"
    )
    product: Mapped["Product"] = relationship(
        "Product",
        back_populates="sale_items"
    )
    batch: Mapped["Batch"] = relationship(
        "Batch",
        back_populates="sale_items"
    )
    
    # Constraints
    __table_args__ = (
        {
            "comment": "Individual items in sales with FEFO/FIFO tracking"
        },
    )
    
    def __repr__(self) -> str:
        return (
            f"<SaleItem(id={self.id}, sale_id={self.sale_id}, "
            f"product_id={self.product_id}, batch_id={self.batch_id}, "
            f"quantity={self.quantity}, total={self.total_price})>"
        )
    
    @property
    def product_name(self) -> str:
        """Get product name"""
        return self.product.name if self.product else "Unknown"
    
    @property
    def batch_number(self) -> str:
        """Get batch number"""
        return self.batch.batch_number if self.batch else "Unknown"
    
    @property
    def expiry_info(self) -> str:
        """Get expiry date information"""
        if self.expiry_date:
            return str(self.expiry_date)
        return "N/A"
