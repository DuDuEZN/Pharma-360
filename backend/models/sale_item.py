"""
SaleItem Model for Pharmacie 360 Backend
SQLAlchemy model for sale_items table
"""

from datetime import date, datetime
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
    from .batch import Batch
    from .product import Product
    from .sale import Sale


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
        Integer, ForeignKey("sales.id", ondelete="CASCADE"), nullable=False, index=True
    )
    batch_id: Mapped[Optional[int]] = mapped_column(
        Integer,
        ForeignKey("batches.id", ondelete="CASCADE"),
        nullable=True,
        index=True,
        comment="Lot vendu ; NULL pour une ligne en précommande",
    )
    product_id: Mapped[int] = mapped_column(
        Integer,
        ForeignKey("products.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    quantity: Mapped[int] = mapped_column(Integer, nullable=False)
    sale_unit: Mapped[str] = mapped_column(
        String(10),
        default="box",
        nullable=False,
        comment="Unité vendue : 'box' (boîte) ou 'bulk' (vrac)",
    )
    unit_price: Mapped[float] = mapped_column(Numeric(10, 2), nullable=False)
    total_price: Mapped[float] = mapped_column(Numeric(12, 2), nullable=False)
    tax_rate: Mapped[float] = mapped_column(
        Numeric(5, 2), default=0.00, server_default="0.00", nullable=False,
        comment="Taux de TVA appliqué à la ligne (0 si exonéré)",
    )
    tax_amount: Mapped[float] = mapped_column(
        Numeric(12, 2), default=0.00, server_default="0.00", nullable=False,
        comment="Montant de TVA de la ligne",
    )
    is_preorder: Mapped[bool] = mapped_column(
        Boolean, default=False, server_default="false", nullable=False,
        comment="Ligne vendue en précommande (aucun stock décrémenté)",
    )
    is_reimbursable: Mapped[bool] = mapped_column(
        Boolean, default=True, server_default="true", nullable=False,
        comment="Éligibilité assurance figée à la vente",
    )
    insurance_rate: Mapped[float] = mapped_column(
        Numeric(5, 2), default=0, server_default="0.00", nullable=False,
        comment="Taux de couverture effectif de la ligne (%)",
    )
    insurance_amount: Mapped[float] = mapped_column(
        Numeric(12, 2), default=0, server_default="0.00", nullable=False,
        comment="Part assurance de la ligne (hors TVA)",
    )
    patient_amount: Mapped[float] = mapped_column(
        Numeric(12, 2), default=0, server_default="0.00", nullable=False,
        comment="Part client de la ligne (TVA incluse)",
    )
    expiry_date: Mapped[Optional[date]] = mapped_column(
        Date, nullable=True, comment="Expiry date at time of sale (from batch)"
    )
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), nullable=False
    )

    # Relationships
    sale: Mapped["Sale"] = relationship("Sale", back_populates="items")
    product: Mapped["Product"] = relationship("Product", back_populates="sale_items")
    batch: Mapped["Batch"] = relationship("Batch", back_populates="sale_items")

    # Constraints
    __table_args__ = ({"comment": "Individual items in sales with FEFO/FIFO tracking"},)

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
        if self.batch:
            return self.batch.batch_number
        return "Précommande" if self.is_preorder else "Unknown"

    @property
    def expiry_info(self) -> str:
        """Get expiry date information"""
        if self.expiry_date:
            return str(self.expiry_date)
        return "N/A"
