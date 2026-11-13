"""
Cash Service for Pharmacie 360 Backend
Gestion des sessions de caisse : ouverture, suivi temps réel, clôture
et rapport d'écart.
"""

from datetime import datetime, timezone
from decimal import Decimal
from typing import Optional

from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from ..models.cash_session import CashSession
from ..models.sale import Sale
from ..models.user import User
from ..schemas.cash import (
    CashCurrentResponse,
    CashSessionListResponse,
    CashSessionResponse,
)


class CashServiceError(Exception):
    """Erreur métier de caisse (message destiné à l'utilisateur)."""


def _money(value) -> Decimal:
    """Convertit une valeur DB en Decimal à 2 décimales."""
    return Decimal(str(value or 0)).quantize(Decimal("0.01"))


class CashService:
    """Service de gestion des sessions de caisse."""

    @staticmethod
    async def _compute_totals(
        db: AsyncSession, session_id: int
    ) -> tuple[Decimal, int, Decimal, int]:
        """Calcule en temps réel les ventes rattachées à une session.

        Retourne (total_sales, sales_count, cash_sales, cash_sales_count).
        Seules les ventes payées sont comptabilisées.
        """
        base_conditions = (
            Sale.cash_session_id == session_id,
            Sale.status == "paid",
        )

        total_query = select(
            func.coalesce(func.sum(Sale.total), 0).label("total"),
            func.count(Sale.id).label("count"),
        ).where(*base_conditions)
        total_row = (await db.execute(total_query)).one()

        cash_query = select(
            func.coalesce(func.sum(Sale.total), 0).label("total"),
            func.count(Sale.id).label("count"),
        ).where(*base_conditions, func.lower(Sale.payment_method) == "cash")
        cash_row = (await db.execute(cash_query)).one()

        return (
            _money(total_row.total),
            int(total_row.count or 0),
            _money(cash_row.total),
            int(cash_row.count or 0),
        )

    @staticmethod
    def _to_response(
        session: CashSession,
        *,
        total_sales: Optional[Decimal] = None,
        sales_count: Optional[int] = None,
        cash_sales: Optional[Decimal] = None,
        cash_sales_count: Optional[int] = None,
    ) -> CashSessionResponse:
        """Construit la réponse API avec le rapport de synthèse."""
        total_sales = (
            _money(total_sales) if total_sales is not None else _money(session.total_sales)
        )
        sales_count = (
            int(sales_count) if sales_count is not None else int(session.sales_count or 0)
        )
        cash_sales = (
            _money(cash_sales) if cash_sales is not None else _money(session.cash_sales)
        )
        cash_sales_count = (
            int(cash_sales_count)
            if cash_sales_count is not None
            else int(session.cash_sales_count or 0)
        )

        opening = _money(session.opening_amount)
        expected_cash = opening + cash_sales

        return CashSessionResponse(
            id=session.id,
            user_id=session.user_id,
            user_name=(
                session.user.username
                if getattr(session, "user", None)
                else f"Utilisateur #{session.user_id}"
            ),
            status=session.status,
            opening_amount=opening,
            closing_amount=(
                _money(session.closing_amount)
                if session.closing_amount is not None
                else None
            ),
            cash_sales=cash_sales,
            total_sales=total_sales,
            cash_sales_count=cash_sales_count,
            sales_count=sales_count,
            expected_cash=expected_cash,
            actual_revenue=(
                _money(session.actual_revenue)
                if session.actual_revenue is not None
                else None
            ),
            difference=(
                _money(session.difference) if session.difference is not None else None
            ),
            opening_at=session.opening_at,
            closing_at=session.closing_at,
            notes=session.notes,
            closing_notes=session.closing_notes,
            created_at=session.created_at,
        )

    @staticmethod
    async def get_open_session(
        db: AsyncSession, user_id: int
    ) -> Optional[CashSession]:
        """Retourne la session ouverte de l'utilisateur, s'il y en a une."""
        result = await db.execute(
            select(CashSession)
            .options(selectinload(CashSession.user))
            .where(
                CashSession.user_id == user_id,
                CashSession.status == "open",
            )
            .order_by(CashSession.opening_at.desc())
            .limit(1)
        )
        return result.scalars().first()

    @staticmethod
    async def open_session(
        db: AsyncSession,
        current_user: User,
        opening_amount: Decimal,
        notes: Optional[str] = None,
    ) -> CashSessionResponse:
        """Ouvre une session de caisse avec un fonds initial obligatoire."""
        existing = await CashService.get_open_session(db, current_user.id)
        if existing:
            raise CashServiceError(
                "Une session de caisse est déjà ouverte. "
                "Clôturez-la avant d'en ouvrir une nouvelle."
            )

        if opening_amount is None or Decimal(opening_amount) < 0:
            raise CashServiceError("Le fonds de caisse initial est invalide.")

        session = CashSession(
            user_id=current_user.id,
            status="open",
            opening_amount=Decimal(opening_amount),
            cash_sales=Decimal("0.00"),
            total_sales=Decimal("0.00"),
            sales_count=0,
            cash_sales_count=0,
            opening_at=datetime.now(timezone.utc),
            notes=notes,
        )
        db.add(session)
        await db.flush()
        await db.refresh(session)

        # Recharge la relation utilisateur pour le nom affiché.
        session = await CashService._get_session_by_id(db, session.id)
        return CashService._to_response(session)

    @staticmethod
    async def _get_session_by_id(
        db: AsyncSession, session_id: int
    ) -> Optional[CashSession]:
        result = await db.execute(
            select(CashSession)
            .options(selectinload(CashSession.user))
            .where(CashSession.id == session_id)
        )
        return result.scalars().first()

    @staticmethod
    async def get_current(
        db: AsyncSession, current_user: User
    ) -> CashCurrentResponse:
        """État de la caisse : session ouverte sinon dernière session clôturée."""
        open_session = await CashService.get_open_session(db, current_user.id)

        if open_session:
            total, count, cash, cash_count = await CashService._compute_totals(
                db, open_session.id
            )
            return CashCurrentResponse(
                session=CashService._to_response(
                    open_session,
                    total_sales=total,
                    sales_count=count,
                    cash_sales=cash,
                    cash_sales_count=cash_count,
                ),
                has_open_session=True,
            )

        result = await db.execute(
            select(CashSession)
            .options(selectinload(CashSession.user))
            .where(
                CashSession.user_id == current_user.id,
                CashSession.status == "closed",
            )
            .order_by(CashSession.closing_at.desc())
            .limit(1)
        )
        last_closed = result.scalars().first()

        return CashCurrentResponse(
            session=(
                CashService._to_response(last_closed) if last_closed else None
            ),
            has_open_session=False,
        )

    @staticmethod
    async def get_summary(
        db: AsyncSession, current_user: User
    ) -> CashSessionResponse:
        """Rapport de synthèse de la session ouverte (avant clôture)."""
        open_session = await CashService.get_open_session(db, current_user.id)
        if not open_session:
            raise CashServiceError("Aucune session de caisse ouverte.")

        total, count, cash, cash_count = await CashService._compute_totals(
            db, open_session.id
        )
        return CashService._to_response(
            open_session,
            total_sales=total,
            sales_count=count,
            cash_sales=cash,
            cash_sales_count=cash_count,
        )

    @staticmethod
    async def close_session(
        db: AsyncSession,
        current_user: User,
        closing_amount: Decimal,
        closing_notes: Optional[str] = None,
    ) -> CashSessionResponse:
        """Clôture la session : calcule recette réelle et écart."""
        open_session = await CashService.get_open_session(db, current_user.id)
        if not open_session:
            raise CashServiceError("Aucune session de caisse ouverte à clôturer.")

        if closing_amount is None or Decimal(closing_amount) < 0:
            raise CashServiceError("Le montant compté est invalide.")

        closing = Decimal(closing_amount)
        total, count, cash, cash_count = await CashService._compute_totals(
            db, open_session.id
        )

        opening = _money(open_session.opening_amount)
        actual_revenue = closing - opening
        difference = actual_revenue - cash

        open_session.status = "closed"
        open_session.closing_amount = closing
        open_session.cash_sales = cash
        open_session.total_sales = total
        open_session.sales_count = count
        open_session.cash_sales_count = cash_count
        open_session.actual_revenue = actual_revenue
        open_session.difference = difference
        open_session.closing_at = datetime.now(timezone.utc)
        if closing_notes:
            open_session.closing_notes = closing_notes

        await db.flush()
        session = await CashService._get_session_by_id(db, open_session.id)

        return CashService._to_response(
            session,
            total_sales=total,
            sales_count=count,
            cash_sales=cash,
            cash_sales_count=cash_count,
        )

    @staticmethod
    async def list_sessions(
        db: AsyncSession,
        *,
        user_id: Optional[int] = None,
        status: Optional[str] = None,
        page: int = 1,
        page_size: int = 20,
    ) -> CashSessionListResponse:
        """Historique des sessions de caisse."""
        conditions = []
        if user_id is not None:
            conditions.append(CashSession.user_id == user_id)
        if status is not None:
            conditions.append(CashSession.status == status)

        count_query = select(func.count()).select_from(CashSession)
        query = select(CashSession).options(selectinload(CashSession.user))
        if conditions:
            count_query = count_query.where(*conditions)
            query = query.where(*conditions)

        total = (await db.execute(count_query)).scalar() or 0
        offset = (page - 1) * page_size
        result = await db.execute(
            query.order_by(CashSession.opening_at.desc())
            .offset(offset)
            .limit(page_size)
        )
        sessions = result.scalars().all()

        return CashSessionListResponse(
            sessions=[CashService._to_response(s) for s in sessions],
            total=total,
            page=page,
            page_size=page_size,
            total_pages=(total + page_size - 1) // page_size,
        )


# Singleton instance
cash_service = CashService()
