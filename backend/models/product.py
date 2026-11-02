"""
Product Model for Pharmacie 360 Backend
SQLAlchemy model for products table
"""

from datetime import datetime
from decimal import Decimal
from typing import TYPE_CHECKING, Optional

from sqlalchemy import (
    Boolean,
    DateTime,
    ForeignKey,
    Integer,
    Numeric,
    String,
    Text,
    func,
    select,
)
from sqlalchemy.ext.hybrid import hybrid_property
from sqlalchemy.orm import Mapped, mapped_column, relationship
from sqlalchemy.types import Numeric

from .base import Base

if TYPE_CHECKING:
    from .batch import Batch
    from .category import Category
    from .movement import Movement
    from .sale_item import SaleItem
    from .supplier import Supplier


class Product(Base):
    """
    Product model representing pharmacy products (medicines, medical supplies)

    Core product information with support for:
    - Barcode scanning
    - FEFO/FIFO stock management
    - Multiple batches with different expiry dates
    - Category and supplier relationships
    """

    __tablename__ = "products"

    # Columns
    id: Mapped[int] = mapped_column(primary_key=True, autoincrement=True)
    name: Mapped[str] = mapped_column(String(200), nullable=False, index=True)
    dci: Mapped[Optional[str]] = mapped_column(
        String(100),
        nullable=True,
        index=True,
        comment="Denomination Commune Internationale",
    )
    barcode: Mapped[Optional[str]] = mapped_column(
        String(50), unique=True, nullable=True, index=True
    )
    category_id: Mapped[Optional[int]] = mapped_column(
        Integer,
        ForeignKey("categories.id", ondelete="SET NULL"),
        nullable=True,
        index=True,
    )
    description: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    price: Mapped[float] = mapped_column(Numeric(10, 2), default=0.00, nullable=False)
    cost_price: Mapped[float] = mapped_column(
        Numeric(10, 2), default=0.00, nullable=False
    )
    stock_min: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    stock_max: Mapped[int] = mapped_column(Integer, default=100, nullable=False)
    unit: Mapped[str] = mapped_column(String(20), default="unité", nullable=False)
    manufacturer: Mapped[Optional[str]] = mapped_column(String(100), nullable=True)
    is_active: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)
    requires_prescription: Mapped[bool] = mapped_column(
        Boolean, default=False, nullable=False
    )
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
    category: Mapped[Optional["Category"]] = relationship(
        "Category", back_populates="products", lazy="selectin"
    )
    supplier: Mapped[Optional["Supplier"]] = relationship(
        "Supplier",
        back_populates="products",
        foreign_keys="Product.supplier_id",
        lazy="selectin",
    )
    batches: Mapped[list["Batch"]] = relationship(
        "Batch",
        back_populates="product",
        foreign_keys="Batch.product_id",
        cascade="all, delete-orphan",
        lazy="selectin",  # chargement anticipé : current_stock lit batches (pas de lazy-load en async)
    )
    sale_items: Mapped[list["SaleItem"]] = relationship(
        "SaleItem", back_populates="product", foreign_keys="SaleItem.product_id"
    )
    movements: Mapped[list["Movement"]] = relationship(
        "Movement", back_populates="product", foreign_keys="Movement.product_id"
    )

    # Additional foreign key (for supplier relationship)
    supplier_id: Mapped[Optional[int]] = mapped_column(
        Integer,
        ForeignKey("suppliers.id", ondelete="SET NULL"),
        nullable=True,
        index=True,
    )

    # Constraints
    __table_args__ = ({"comment": "Pharmacy products with FEFO/FIFO support"},)

    def __repr__(self) -> str:
        return f"<Product(id={self.id}, name='{self.name}', barcode={self.barcode or 'N/A'})>"

    @hybrid_property
    def current_stock(self) -> int:
        """Get current total stock across all batches"""
        if self.batches:
            return sum(
                batch.quantity for batch in self.batches if batch.status == "active"
            )
        return 0

    @current_stock.inplace.expression
    @classmethod
    def _current_stock_expression(cls):
        """Version SQL : somme des quantités des lots actifs (sous-requête corrélée)"""
        from .batch import Batch

        return (
            select(func.coalesce(func.sum(Batch.quantity), 0))
            .where(Batch.product_id == cls.id, Batch.status == "active")
            .correlate_except(Batch)
            .scalar_subquery()
        )

    @hybrid_property
    def is_low_stock(self) -> bool:
        """Check if product is below minimum stock level"""
        return self.current_stock < self.stock_min

    @is_low_stock.inplace.expression
    @classmethod
    def _is_low_stock_expression(cls):
        return cls.current_stock < cls.stock_min

    @hybrid_property
    def is_overstocked(self) -> bool:
        """Check if product is above maximum stock level"""
        return self.current_stock > self.stock_max

    @is_overstocked.inplace.expression
    @classmethod
    def _is_overstocked_expression(cls):
        return cls.current_stock > cls.stock_max

    @property
    def next_expiring_batch(self) -> Optional["Batch"]:
        """Get the batch with the closest expiry date (FEFO)"""
        if not self.batches:
            return None

        active_batches = [
            batch
            for batch in self.batches
            if batch.status == "active" and batch.quantity > 0
        ]

        if not active_batches:
            return None

        return min(active_batches, key=lambda b: b.expiry_date)

    @property
    def has_expiring_soon(self) -> bool:
        """Check if any batch is expiring within 30 days"""
        from datetime import date, timedelta

        if not self.batches:
            return False

        today = date.today()
        threshold = today + timedelta(days=30)

        return any(
            batch.expiry_date <= threshold and batch.status == "active"
            for batch in self.batches
        )
