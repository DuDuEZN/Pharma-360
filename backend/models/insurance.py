"""Structures d'assurance et clients assurés.

Une structure (mutuelle, assurance santé, employeur...) est pré-enregistrée.
Un client assuré porte un taux de couverture propre (0 à 100 %) et un numéro
de police / matricule. Les deux tables sont indépendantes des ventes : une
vente référence simplement la structure et le client utilisés.
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
    UniqueConstraint,
    func,
)
from sqlalchemy.orm import Mapped, mapped_column, relationship

from .base import Base

if TYPE_CHECKING:
    from .customer import Customer


class InsuranceStructure(Base):
    """Organisme preneur en charge (assurance, mutuelle, société...)."""

    __tablename__ = "insurance_structures"

    id: Mapped[int] = mapped_column(primary_key=True, autoincrement=True)
    name: Mapped[str] = mapped_column(String(150), unique=True, nullable=False, index=True)
    code: Mapped[Optional[str]] = mapped_column(String(50), unique=True, nullable=True)
    contact: Mapped[Optional[str]] = mapped_column(String(150), nullable=True)
    phone: Mapped[Optional[str]] = mapped_column(String(30), nullable=True)
    email: Mapped[Optional[str]] = mapped_column(String(120), nullable=True)
    address: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    default_rate: Mapped[Decimal] = mapped_column(
        Numeric(5, 2), default=0, server_default="0", nullable=False,
        comment="Taux de couverture par défaut (%)",
    )
    is_active: Mapped[bool] = mapped_column(
        Boolean, default=True, server_default="true", nullable=False
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

    clients: Mapped[list["InsuranceClient"]] = relationship(
        "InsuranceClient", back_populates="structure", cascade="all, delete-orphan"
    )

    def __repr__(self) -> str:
        return f"<InsuranceStructure(id={self.id}, name='{self.name}')>"


class InsuranceClient(Base):
    """Client couvert par une structure d'assurance."""

    __tablename__ = "insurance_clients"
    __table_args__ = (
        UniqueConstraint(
            "structure_id", "policy_number", name="uq_insurance_client_policy"
        ),
        {"comment": "Clients assurés avec taux de couverture individuel"},
    )

    id: Mapped[int] = mapped_column(primary_key=True, autoincrement=True)
    structure_id: Mapped[int] = mapped_column(
        Integer,
        ForeignKey("insurance_structures.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    customer_id: Mapped[Optional[int]] = mapped_column(
        Integer,
        ForeignKey("customers.id", ondelete="SET NULL"),
        nullable=True,
        index=True,
    )
    name: Mapped[str] = mapped_column(String(150), nullable=False, index=True)
    phone: Mapped[Optional[str]] = mapped_column(String(30), nullable=True, index=True)
    policy_number: Mapped[Optional[str]] = mapped_column(
        String(80), nullable=True, comment="Numéro de police / matricule"
    )
    coverage_rate: Mapped[Decimal] = mapped_column(
        Numeric(5, 2), default=0, server_default="0", nullable=False,
        comment="Taux de couverture individuel (%)",
    )
    is_active: Mapped[bool] = mapped_column(
        Boolean, default=True, server_default="true", nullable=False
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

    structure: Mapped["InsuranceStructure"] = relationship(
        "InsuranceStructure", back_populates="clients"
    )
    customer: Mapped[Optional["Customer"]] = relationship("Customer")

    def __repr__(self) -> str:
        return (
            f"<InsuranceClient(id={self.id}, name='{self.name}', "
            f"rate={self.coverage_rate})>"
        )
