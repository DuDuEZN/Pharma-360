"""Précommandes : vente sur stock zéro sans stock négatif.

Cycle de vie :
    EN_ATTENTE -> DISPONIBLE -> LIVRE
                      |
                      +--> ANNULE

Le stock physique n'est jamais décrémenté à la création de la précommande.
À la réception fournisseur, la quantité est réservée sur un lot
(``batches.reserved_quantity``) et la précommande passe à ``DISPONIBLE``.
La remise au retrait décrémente le physique et la réservation, puis passe la
précommande à ``LIVRE``.
"""

from datetime import datetime
from decimal import Decimal
from typing import TYPE_CHECKING, Optional

from sqlalchemy import (
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
    from .customer import Customer
    from .product import Product
    from .sale import Sale
    from .sale_item import SaleItem


class Preorder(Base):
    """Engagement client sur un produit indisponible ou en rupture."""

    __tablename__ = "preorders"

    id: Mapped[int] = mapped_column(primary_key=True, autoincrement=True)
    reference: Mapped[str] = mapped_column(
        String(80), unique=True, nullable=False, index=True
    )
    pickup_code: Mapped[str] = mapped_column(
        String(40), unique=True, nullable=False, index=True,
        comment="Code de retrait communiqué au client",
    )
    sale_id: Mapped[Optional[int]] = mapped_column(
        Integer,
        ForeignKey("sales.id", ondelete="SET NULL"),
        nullable=True,
        index=True,
    )
    sale_item_id: Mapped[Optional[int]] = mapped_column(
        Integer,
        ForeignKey("sale_items.id", ondelete="SET NULL"),
        nullable=True,
        index=True,
    )
    product_id: Mapped[int] = mapped_column(
        Integer,
        ForeignKey("products.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    customer_id: Mapped[Optional[int]] = mapped_column(
        Integer,
        ForeignKey("customers.id", ondelete="SET NULL"),
        nullable=True,
        index=True,
    )
    customer_name: Mapped[str] = mapped_column(String(150), nullable=False)
    customer_phone: Mapped[str] = mapped_column(String(30), nullable=False)
    quantity: Mapped[int] = mapped_column(Integer, nullable=False, default=1)
    unit_price: Mapped[Decimal] = mapped_column(
        Numeric(10, 2), default=0, nullable=False
    )
    status: Mapped[str] = mapped_column(
        String(20), default="EN_ATTENTE", nullable=False, index=True,
        comment="EN_ATTENTE, DISPONIBLE, LIVRE, ANNULE",
    )
    reserved_batch_id: Mapped[Optional[int]] = mapped_column(
        Integer,
        ForeignKey("batches.id", ondelete="SET NULL"),
        nullable=True,
        index=True,
    )
    notes: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    available_at: Mapped[Optional[datetime]] = mapped_column(
        DateTime(timezone=True), nullable=True
    )
    delivered_at: Mapped[Optional[datetime]] = mapped_column(
        DateTime(timezone=True), nullable=True
    )
    cancelled_at: Mapped[Optional[datetime]] = mapped_column(
        DateTime(timezone=True), nullable=True
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

    product: Mapped["Product"] = relationship("Product")
    customer: Mapped[Optional["Customer"]] = relationship("Customer")
    sale: Mapped[Optional["Sale"]] = relationship(
        "Sale", back_populates="preorders", foreign_keys=[sale_id]
    )
    sale_item: Mapped[Optional["SaleItem"]] = relationship("SaleItem")
    reserved_batch: Mapped[Optional["Batch"]] = relationship("Batch")

    def __repr__(self) -> str:
        return (
            f"<Preorder(id={self.id}, code='{self.pickup_code}', "
            f"status='{self.status}')>"
        )
