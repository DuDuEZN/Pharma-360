"""
Cash Session Model for Pharmacie 360 Backend
SQLAlchemy model for cash register sessions (ouverture / fermeture de caisse)
"""

from datetime import datetime
from typing import TYPE_CHECKING, Optional

from sqlalchemy import DateTime, ForeignKey, Integer, Numeric, String, Text, func
from sqlalchemy.orm import Mapped, mapped_column, relationship

from .base import Base

if TYPE_CHECKING:
    from .sale import Sale
    from .user import User


class CashSession(Base):
    """
    Cash register session.

    Une session est ouverte par un caissier avec un fonds de caisse initial,
    puis clôturée avec le montant réellement compté. Les ventes encaissées
    pendant la session sont rattachées via ``Sale.cash_session_id``.

    Champs calculés à la clôture :
    - ``cash_sales``      : total des ventes payées en espèces
    - ``total_sales``     : total de toutes les ventes de la session
    - ``actual_revenue``  : montant compté - fonds initial (recette réelle)
    - ``difference``      : recette réelle - ventes espèces (écart)
    """

    __tablename__ = "cash_sessions"

    id: Mapped[int] = mapped_column(primary_key=True, autoincrement=True)
    user_id: Mapped[int] = mapped_column(
        Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True
    )
    status: Mapped[str] = mapped_column(
        String(20), default="open", nullable=False, index=True
    )

    opening_amount: Mapped[float] = mapped_column(
        Numeric(12, 2), default=0.00, nullable=False
    )
    closing_amount: Mapped[Optional[float]] = mapped_column(
        Numeric(12, 2), nullable=True
    )

    # Ventes constatées (recalculées en direct, figées à la clôture)
    cash_sales: Mapped[float] = mapped_column(
        Numeric(12, 2), default=0.00, nullable=False
    )
    total_sales: Mapped[float] = mapped_column(
        Numeric(12, 2), default=0.00, nullable=False
    )
    sales_count: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    cash_sales_count: Mapped[int] = mapped_column(Integer, default=0, nullable=False)

    # Rapport de clôture
    actual_revenue: Mapped[Optional[float]] = mapped_column(
        Numeric(12, 2), nullable=True
    )
    difference: Mapped[Optional[float]] = mapped_column(Numeric(12, 2), nullable=True)

    opening_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), nullable=False
    )
    closing_at: Mapped[Optional[datetime]] = mapped_column(
        DateTime(timezone=True), nullable=True
    )

    notes: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    closing_notes: Mapped[Optional[str]] = mapped_column(Text, nullable=True)

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
    user: Mapped["User"] = relationship("User", back_populates="cash_sessions")
    sales: Mapped[list["Sale"]] = relationship(
        "Sale", back_populates="cash_session", foreign_keys="Sale.cash_session_id"
    )

    __table_args__ = (
        {"comment": "Sessions de caisse avec fonds initial et rapport d'écart"},
    )

    @property
    def is_open(self) -> bool:
        return self.status == "open"

    @property
    def expected_cash(self) -> float:
        """Montant attendu en caisse : fonds initial + ventes espèces."""
        return float(self.opening_amount or 0) + float(self.cash_sales or 0)

    def __repr__(self) -> str:
        return (
            f"<CashSession(id={self.id}, user_id={self.user_id}, "
            f"status='{self.status}', opening_amount={self.opening_amount})>"
        )
