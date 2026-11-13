"""
Cash Session Schemas for Pharmacie 360 Backend
Pydantic models for cash register opening, closing and reports
"""

from datetime import datetime
from decimal import Decimal
from typing import Optional

from pydantic import BaseModel, ConfigDict, Field


class CashSessionOpen(BaseModel):
    """Ouverture de caisse : fonds de caisse initial obligatoire."""

    opening_amount: Decimal = Field(
        ..., ge=0, description="Fonds de caisse initial (espèces en caisse)"
    )
    notes: Optional[str] = Field(None, description="Notes d'ouverture")


class CashSessionClose(BaseModel):
    """Clôture de caisse : le caissier saisit uniquement le montant compté."""

    closing_amount: Decimal = Field(
        ..., ge=0, description="Montant final réellement compté en caisse"
    )
    closing_notes: Optional[str] = Field(None, description="Notes de clôture")


class CashSessionResponse(BaseModel):
    """Session de caisse avec son rapport de synthèse."""

    id: int
    user_id: int
    user_name: str
    status: str
    opening_amount: Decimal
    closing_amount: Optional[Decimal] = None
    cash_sales: Decimal
    total_sales: Decimal
    cash_sales_count: int
    sales_count: int
    expected_cash: Decimal
    actual_revenue: Optional[Decimal] = None
    difference: Optional[Decimal] = None
    opening_at: datetime
    closing_at: Optional[datetime] = None
    notes: Optional[str] = None
    closing_notes: Optional[str] = None
    created_at: datetime

    model_config = ConfigDict(from_attributes=True, json_encoders={Decimal: float})


class CashCurrentResponse(BaseModel):
    """État courant de la caisse pour l'utilisateur connecté."""

    session: Optional[CashSessionResponse] = Field(
        None, description="Session ouverte, ou dernière session clôturée"
    )
    has_open_session: bool = Field(
        ..., description="Indique si l'utilisateur a une session ouverte"
    )


class CashSessionListResponse(BaseModel):
    """Historique paginé des sessions de caisse."""

    sessions: list[CashSessionResponse]
    total: int
    page: int
    page_size: int
    total_pages: int
