"""
Category Model for Pharmacie 360 Backend
SQLAlchemy model for categories table
"""

from datetime import datetime
from typing import TYPE_CHECKING, Optional

from sqlalchemy import Boolean, DateTime, ForeignKey, Integer, String, Text, func
from sqlalchemy.orm import Mapped, mapped_column, relationship

from .base import Base

if TYPE_CHECKING:
    from .product import Product


class Category(Base):
    """
    Category model representing product categories
    
    Examples: Antipaludéens, Antibiotiques, Antidouleurs, etc.
    Supports hierarchical categories (parent-child relationships)
    """
    
    __tablename__ = "categories"
    
    # Columns
    id: Mapped[int] = mapped_column(primary_key=True, autoincrement=True)
    name: Mapped[str] = mapped_column(String(50), unique=True, nullable=False, index=True)
    description: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    parent_id: Mapped[Optional[int]] = mapped_column(
        Integer,
        ForeignKey("categories.id", ondelete="SET NULL"),
        nullable=True,
        index=True
    )
    is_active: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        server_default=func.now(),
        nullable=False
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        server_default=func.now(),
        onupdate=func.now(),
        nullable=False
    )
    
    # Relationships
    parent: Mapped[Optional["Category"]] = relationship(
        "Category",
        remote_side=[id],
        back_populates="children"
    )
    children: Mapped[list["Category"]] = relationship(
        "Category",
        back_populates="parent"
    )
    products: Mapped[list["Product"]] = relationship(
        "Product",
        back_populates="category",
        foreign_keys="Product.category_id"
    )
    
    # Constraints
    __table_args__ = (
        {
            "comment": "Product categories with hierarchical support"
        },
    )
    
    def __repr__(self) -> str:
        return f"<Category(id={self.id}, name='{self.name}')>"
    
    @property
    def path(self) -> str:
        """Get full category path (e.g., 'Médicaments > Antipaludéens')"""
        if self.parent:
            return f"{self.parent.path} > {self.name}"
        return self.name
