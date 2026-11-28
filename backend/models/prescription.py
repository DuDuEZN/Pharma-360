"""Ordonnancier : ordonnances simples et assurance liées aux ventes."""

from datetime import datetime
from typing import TYPE_CHECKING, Optional

from sqlalchemy import DateTime, ForeignKey, Integer, String, Text, func
from sqlalchemy.orm import Mapped, mapped_column, relationship

from .base import Base

if TYPE_CHECKING:
    from .customer import Customer
    from .insurance import InsuranceClient, InsuranceStructure
    from .sale import Sale
    from .user import User


class Prescription(Base):
    """Ordonnance médicale enregistrée au comptoir.

    Les champs prescripteur / structure sanitaire sont volontairement
    dénormalisés (texte) pour conserver la valeur historique même si un
    référentiel change, tout en alimentant l'auto-complétion.
    """

    __tablename__ = "prescriptions"

    id: Mapped[int] = mapped_column(primary_key=True, autoincrement=True)
    prescription_number: Mapped[str] = mapped_column(
        String(50), unique=True, nullable=False, index=True
    )
    sale_id: Mapped[Optional[int]] = mapped_column(
        Integer,
        ForeignKey("sales.id", ondelete="SET NULL"),
        nullable=True,
        index=True,
    )
    customer_id: Mapped[Optional[int]] = mapped_column(
        Integer,
        ForeignKey("customers.id", ondelete="SET NULL"),
        nullable=True,
        index=True,
    )
    prescription_type: Mapped[str] = mapped_column(
        String(20), default="SIMPLE", nullable=False,
        comment="SIMPLE ou ASSURANCE",
    )
    patient_name: Mapped[str] = mapped_column(String(150), nullable=False)
    prescriber_name: Mapped[str] = mapped_column(String(150), nullable=False, index=True)
    prescriber_registration: Mapped[str] = mapped_column(
        String(100), nullable=False, index=True
    )
    health_structure: Mapped[str] = mapped_column(
        String(150), nullable=False, index=True
    )
    insurance_structure_id: Mapped[Optional[int]] = mapped_column(
        Integer,
        ForeignKey("insurance_structures.id", ondelete="SET NULL"),
        nullable=True,
        index=True,
    )
    insurance_client_id: Mapped[Optional[int]] = mapped_column(
        Integer,
        ForeignKey("insurance_clients.id", ondelete="SET NULL"),
        nullable=True,
        index=True,
    )
    notes: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    created_by: Mapped[Optional[int]] = mapped_column(
        Integer,
        ForeignKey("users.id", ondelete="SET NULL"),
        nullable=True,
        index=True,
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

    sale: Mapped[Optional["Sale"]] = relationship(
        "Sale", back_populates="prescription", foreign_keys=[sale_id]
    )
    customer: Mapped[Optional["Customer"]] = relationship("Customer")
    insurance_structure: Mapped[Optional["InsuranceStructure"]] = relationship(
        "InsuranceStructure"
    )
    insurance_client: Mapped[Optional["InsuranceClient"]] = relationship(
        "InsuranceClient"
    )
    author: Mapped[Optional["User"]] = relationship("User")

    def __repr__(self) -> str:
        return (
            f"<Prescription(id={self.id}, number='{self.prescription_number}', "
            f"type='{self.prescription_type}')>"
        )
