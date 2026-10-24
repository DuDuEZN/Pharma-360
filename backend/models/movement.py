"""
Movement Model for Pharmacie 360 Backend
SQLAlchemy model for movements table (AUDIT TRAIL)
"""

from datetime import datetime
from typing import TYPE_CHECKING, Optional

from sqlalchemy import DateTime, ForeignKey, Integer, String, Text, func
from sqlalchemy.orm import Mapped, mapped_column, relationship

from .base import Base

if TYPE_CHECKING:
    from .user import User
    from .product import Product
    from .batch import Batch


class Movement(Base):
    """
    Movement model - COMPLETE AUDIT TRAIL for stock movements
    
    Tracks EVERY change to stock quantities with:
    - Type of movement (purchase, sale, return, adjustment, expiry)
    - Reference to the source document/table
    - Product and batch affected
    - Old and new quantities
    - User who performed the action
    - Timestamp
    
    This is CRITICAL for traceability and compliance
    """
    
    __tablename__ = "movements"
    
    # Columns
    id: Mapped[int] = mapped_column(primary_key=True, autoincrement=True)
    type: Mapped[str] = mapped_column(
        String(20),
        nullable=False,
        index=True
    )
    reference_id: Mapped[int] = mapped_column(
        Integer,
        nullable=False,
        comment="ID of the reference document (batch, sale, return, invoice)"
    )
    reference_type: Mapped[str] = mapped_column(
        String(20),
        nullable=False,
        index=True,
        comment="Type of reference (batch, sale, return, invoice)"
    )
    product_id: Mapped[Optional[int]] = mapped_column(
        Integer,
        ForeignKey("products.id", ondelete="CASCADE"),
        nullable=True,
        index=True
    )
    batch_id: Mapped[Optional[int]] = mapped_column(
        Integer,
        ForeignKey("batches.id", ondelete="SET NULL"),
        nullable=True,
        index=True
    )
    old_quantity: Mapped[int] = mapped_column(
        Integer,
        nullable=False,
        comment="Quantity before the change"
    )
    new_quantity: Mapped[int] = mapped_column(
        Integer,
        nullable=False,
        comment="Quantity after the change"
    )
    quantity_change: Mapped[int] = mapped_column(
        Integer,
        nullable=False,
        comment="Net change (new - old)"
    )
    user_id: Mapped[Optional[int]] = mapped_column(
        Integer,
        ForeignKey("users.id", ondelete="SET NULL"),
        nullable=True,
        index=True
    )
    notes: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        server_default=func.now(),
        nullable=False
    )
    
    # Relationships
    product: Mapped[Optional["Product"]] = relationship(
        "Product",
        back_populates="movements"
    )
    batch: Mapped[Optional["Batch"]] = relationship(
        "Batch",
        back_populates="movements"
    )
    user: Mapped[Optional["User"]] = relationship(
        "User",
        back_populates="movements"
    )
    
    # Constraints
    __table_args__ = (
        {
            "comment": "Complete audit trail for all stock movements"
        },
    )
    
    def __repr__(self) -> str:
        return (
            f"<Movement(id={self.id}, type='{self.type}', "
            f"product_id={self.product_id}, batch_id={self.batch_id}, "
            f"change={self.quantity_change})>"
        )
    
    @property
    def type_display(self) -> str:
        """Get display-friendly movement type"""
        types = {
            "purchase": "Achats",
            "sale": "Vente",
            "return": "Retour",
            "adjustment": "Ajustement",
            "expiry": "Péremption"
        }
        return types.get(self.type, self.type)
    
    @property
    def product_name(self) -> str:
        """Get product name"""
        return self.product.name if self.product else "Unknown"
    
    @property
    def batch_number(self) -> str:
        """Get batch number"""
        return self.batch.batch_number if self.batch else "N/A"
    
    @property
    def user_name(self) -> str:
        """Get user name"""
        return self.user.username if self.user else "System"
    
    @property
    def is_increase(self) -> bool:
        """Check if movement increased stock"""
        return self.quantity_change > 0
    
    @property
    def is_decrease(self) -> bool:
        """Check if movement decreased stock"""
        return self.quantity_change < 0
