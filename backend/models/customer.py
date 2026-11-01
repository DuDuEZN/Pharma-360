"""
Customer Model for Pharmacie 360 Backend
SQLAlchemy model for customers table
"""

from datetime import datetime
from typing import TYPE_CHECKING, Optional

from sqlalchemy import Boolean, DateTime, Integer, Numeric, String, Text, func
from sqlalchemy.orm import Mapped, mapped_column, relationship

from .base import Base

if TYPE_CHECKING:
    from .sale import Sale


class Customer(Base):
    """
    Customer model representing pharmacy customers

    Used for sales tracking and loyalty programs
    """

    __tablename__ = "customers"

    # Columns
    id: Mapped[int] = mapped_column(primary_key=True, autoincrement=True)
    name: Mapped[str] = mapped_column(String(100), nullable=False, index=True)
    contact: Mapped[Optional[str]] = mapped_column(String(100), nullable=True)
    email: Mapped[Optional[str]] = mapped_column(String(100), nullable=True, index=True)
    phone: Mapped[Optional[str]] = mapped_column(String(20), nullable=True, index=True)
    address: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    loyalty_points: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
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
    sales: Mapped[list["Sale"]] = relationship(
        "Sale", back_populates="customer", foreign_keys="Sale.customer_id"
    )

    # Constraints
    __table_args__ = ({"comment": "Pharmacy customers for sales tracking"},)

    def __repr__(self) -> str:
        return f"<Customer(id={self.id}, name='{self.name}', loyalty_points={self.loyalty_points})>"

    @property
    def full_info(self) -> str:
        """Get full customer information"""
        info = f"{self.name}"
        if self.phone:
            info += f" ({self.phone})"
        if self.email:
            info += f" - {self.email}"
        return info
