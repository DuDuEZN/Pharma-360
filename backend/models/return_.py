"""
Return Model for Pharmacie 360 Backend
SQLAlchemy model for returns table
"""

from datetime import datetime
from typing import TYPE_CHECKING

from sqlalchemy import DateTime, ForeignKey, Integer, String, Text, func
from sqlalchemy.orm import Mapped, mapped_column, relationship

from .base import Base

if TYPE_CHECKING:
    from .user import User
    from .product import Product
    from .batch import Batch


class Return(Base):
    """
    Return model representing product returns
    
    Types of returns:
    - supplier: Return to supplier
    - expiry: Product expired
    - damage: Product damaged
    - other: Other reasons
    
    Tracks:
    - Which batch is being returned
    - Quantity returned
    - Reason for return
    - Who processed the return
    """
    
    __tablename__ = "returns"
    
    # Columns
    id: Mapped[int] = mapped_column(primary_key=True, autoincrement=True)
    return_number: Mapped[str] = mapped_column(
        String(50),
        unique=True,
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
    reason: Mapped[str] = mapped_column(
        String(50),
        nullable=False,
        index=True
    )
    user_id: Mapped[int] = mapped_column(
        Integer,
        ForeignKey("users.id", ondelete="CASCADE"),
        nullable=False,
        index=True
    )
    notes: Mapped[str] = mapped_column(Text, nullable=True)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        server_default=func.now(),
        nullable=False
    )
    
    # Relationships
    batch: Mapped["Batch"] = relationship(
        "Batch",
        back_populates="returns"
    )
    product: Mapped["Product"] = relationship(
        "Product",
        back_populates="sale_items",
        foreign_keys=[product_id]
    )
    user: Mapped["User"] = relationship(
        "User",
        back_populates="returns"
    )
    
    # Constraints
    __table_args__ = (
        {
            "comment": "Product returns with reason tracking"
        },
    )
    
    def __repr__(self) -> str:
        return (
            f"<Return(id={self.id}, return_number='{self.return_number}', "
            f"batch_id={self.batch_id}, quantity={self.quantity}, "
            f"reason='{self.reason}')>"
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
    def user_name(self) -> str:
        """Get user name"""
        return self.user.username if self.user else "Unknown"
    
    @property
    def reason_display(self) -> str:
        """Get display-friendly reason"""
        reasons = {
            "supplier": "Retour Fournisseur",
            "expiry": "Péremption",
            "damage": "Casse",
            "other": "Autre"
        }
        return reasons.get(self.reason, self.reason)
