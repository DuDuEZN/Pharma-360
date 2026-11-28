"""Service des précommandes.

Règles clés :
- aucune décrémentation du stock physique à la création ;
- réservation sur un lot à la réception fournisseur (``reserved_quantity``) ;
- sortie définitive du stock uniquement à la remise au retrait.
"""

from datetime import date, datetime
from typing import Iterable, Optional

from sqlalchemy import func, or_, select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from ...models.batch import Batch
from ...models.movement import Movement
from ...models.preorder import Preorder
from ...models.product import Product
from .schemas import (
    PreparationLine,
    PreparationResponse,
    PreorderListResponse,
    PreorderResponse,
)

OPEN_STATUSES = ("EN_ATTENTE", "DISPONIBLE")


def _base_query():
    return select(Preorder).options(
        selectinload(Preorder.product),
        selectinload(Preorder.customer),
        selectinload(Preorder.reserved_batch),
        selectinload(Preorder.sale),
    )


def _to_response(row: Preorder) -> PreorderResponse:
    response = PreorderResponse.model_validate(row)
    response.product_name = row.product.name if row.product is not None else None
    response.product_barcode = (
        row.product.barcode if row.product is not None else None
    )
    response.batch_number = (
        row.reserved_batch.batch_number
        if row.reserved_batch is not None
        else None
    )
    response.sale_number = row.sale.sale_number if row.sale is not None else None
    return response


class PreorderService:
    @staticmethod
    async def list(
        db: AsyncSession,
        *,
        status_filter: Optional[str] = None,
        search: Optional[str] = None,
        page: int = 1,
        page_size: int = 50,
    ) -> PreorderListResponse:
        query = _base_query()
        count_query = select(func.count()).select_from(Preorder)

        if status_filter and status_filter.upper() != "ALL":
            status_value = status_filter.upper()
            query = query.where(Preorder.status == status_value)
            count_query = count_query.where(Preorder.status == status_value)

        if search:
            like = f"%{search.strip()}%"
            condition = or_(
                Preorder.pickup_code.ilike(like),
                Preorder.reference.ilike(like),
                Preorder.customer_name.ilike(like),
                Preorder.customer_phone.ilike(like),
            )
            query = query.where(condition)
            count_query = count_query.where(condition)

        total = (await db.execute(count_query)).scalar() or 0
        page = max(1, page)
        page_size = max(1, min(page_size, 200))
        rows = (
            await db.execute(
                query.order_by(Preorder.created_at.desc())
                .offset((page - 1) * page_size)
                .limit(page_size)
            )
        ).scalars().all()
        return PreorderListResponse(
            items=[_to_response(row) for row in rows],
            total=total,
            page=page,
            page_size=page_size,
        )

    @staticmethod
    async def get(db: AsyncSession, preorder_id: int) -> Optional[PreorderResponse]:
        row = (
            await db.execute(_base_query().where(Preorder.id == preorder_id))
        ).scalar_one_or_none()
        return _to_response(row) if row is not None else None

    @staticmethod
    async def get_by_pickup_code(
        db: AsyncSession, pickup_code: str
    ) -> Optional[PreorderResponse]:
        row = (
            await db.execute(
                _base_query().where(
                    func.upper(Preorder.pickup_code) == pickup_code.strip().upper()
                )
            )
        ).scalar_one_or_none()
        return _to_response(row) if row is not None else None

    @staticmethod
    async def preparation(db: AsyncSession) -> PreparationResponse:
        """Besoin agrégé par produit pour la préparation des commandes."""
        pending_rows = (
            await db.execute(
                select(
                    Preorder.product_id,
                    func.coalesce(func.sum(Preorder.quantity), 0).label("qty"),
                    func.count(Preorder.id).label("cnt"),
                )
                .where(Preorder.status == "EN_ATTENTE")
                .group_by(Preorder.product_id)
            )
        ).all()

        available_rows = (
            await db.execute(
                select(
                    Preorder.product_id,
                    func.count(Preorder.id).label("cnt"),
                )
                .where(Preorder.status == "DISPONIBLE")
                .group_by(Preorder.product_id)
            )
        ).all()
        available_map = {row.product_id: int(row.cnt or 0) for row in available_rows}

        items: list[PreparationLine] = []
        total_pending = 0
        for row in pending_rows:
            product = await db.get(Product, row.product_id)
            quantity = int(row.qty or 0)
            total_pending += quantity
            items.append(
                PreparationLine(
                    product_id=row.product_id,
                    product_name=product.name if product else f"Produit {row.product_id}",
                    product_barcode=product.barcode if product else None,
                    pending_quantity=quantity,
                    pending_count=int(row.cnt or 0),
                    available_count=available_map.get(row.product_id, 0),
                )
            )
        items.sort(key=lambda item: item.pending_quantity, reverse=True)
        return PreparationResponse(items=items, total_pending=total_pending)

    # ------------------------------------------------------------------
    # Réservation / remise
    # ------------------------------------------------------------------
    @staticmethod
    async def _find_available_batch(
        db: AsyncSession, product_id: int, quantity: int
    ) -> Optional[Batch]:
        result = await db.execute(
            select(Batch)
            .where(
                Batch.product_id == product_id,
                Batch.status == "active",
                Batch.expiry_date >= date.today(),
                Batch.quantity - func.coalesce(Batch.reserved_quantity, 0)
                >= int(quantity or 0),
            )
            .order_by(Batch.expiry_date.asc())
            .limit(1)
        )
        return result.scalar_one_or_none()

    @staticmethod
    async def reserve_pending_for_product(
        db: AsyncSession, product_id: int
    ) -> int:
        """Réserve les précommandes en attente d'un produit sur les lots reçus."""
        pending = (
            await db.execute(
                select(Preorder)
                .where(
                    Preorder.product_id == product_id,
                    Preorder.status == "EN_ATTENTE",
                )
                .order_by(Preorder.created_at.asc())
            )
        ).scalars().all()

        reserved = 0
        for preorder in pending:
            batch = await PreorderService._find_available_batch(
                db, product_id, preorder.quantity
            )
            if batch is None:
                break
            batch.reserved_quantity = int(batch.reserved_quantity or 0) + int(
                preorder.quantity or 0
            )
            preorder.reserved_batch_id = batch.id
            preorder.status = "DISPONIBLE"
            preorder.available_at = datetime.utcnow()
            reserved += 1
            await db.flush()
        return reserved

    @staticmethod
    async def reserve_pending_for_delivery(
        db: AsyncSession, product_ids: Iterable[int]
    ) -> int:
        """Hook appelé après réception fournisseur."""
        total = 0
        for product_id in {int(pid) for pid in product_ids if pid}:
            total += await PreorderService.reserve_pending_for_product(db, product_id)
        return total

    @staticmethod
    async def mark_available(
        db: AsyncSession, preorder_id: int
    ) -> Optional[PreorderResponse]:
        """Réserve manuellement une précommande sur un lot disponible."""
        row = await db.get(Preorder, preorder_id)
        if row is None:
            return None
        if row.status != "EN_ATTENTE":
            raise ValueError("Seule une précommande en attente peut être réservée")
        batch = await PreorderService._find_available_batch(
            db, row.product_id, row.quantity
        )
        if batch is None:
            raise ValueError("Aucun lot disponible en quantité suffisante")
        batch.reserved_quantity = int(batch.reserved_quantity or 0) + int(
            row.quantity or 0
        )
        row.reserved_batch_id = batch.id
        row.status = "DISPONIBLE"
        row.available_at = datetime.utcnow()
        await db.flush()
        return await PreorderService.get(db, preorder_id)

    @staticmethod
    async def deliver(
        db: AsyncSession, preorder_id: int, user_id: Optional[int] = None
    ) -> Optional[PreorderResponse]:
        """Remise au retrait : sortie définitive du stock."""
        row = await db.get(Preorder, preorder_id)
        if row is None:
            return None
        if row.status == "LIVRE":
            raise ValueError("Cette précommande a déjà été remise")
        if row.status == "ANNULE":
            raise ValueError("Cette précommande a été annulée")
        if row.status != "DISPONIBLE":
            raise ValueError(
                "La précommande n'est pas encore disponible : attendez la réception"
            )

        batch = (
            await db.get(Batch, row.reserved_batch_id)
            if row.reserved_batch_id
            else None
        )
        if batch is None:
            batch = await PreorderService._find_available_batch(
                db, row.product_id, row.quantity
            )
        if batch is None:
            raise ValueError("Aucun lot réservé pour cette précommande")

        quantity = int(row.quantity or 0)
        if int(batch.quantity or 0) < quantity:
            raise ValueError("Stock physique insuffisant pour la remise")

        old_quantity = int(batch.quantity or 0)
        batch.quantity = old_quantity - quantity
        batch.reserved_quantity = max(
            0, int(batch.reserved_quantity or 0) - quantity
        )
        row.status = "LIVRE"
        row.delivered_at = datetime.utcnow()

        db.add(
            Movement(
                type="sale",
                reference_id=row.sale_id or row.id,
                reference_type="preorder",
                product_id=row.product_id,
                batch_id=batch.id,
                old_quantity=old_quantity,
                new_quantity=batch.quantity,
                quantity_change=-quantity,
                user_id=user_id,
                notes=(
                    f"Remise précommande {row.pickup_code} "
                    f"({row.customer_name})"
                ),
            )
        )
        await db.flush()
        return await PreorderService.get(db, preorder_id)

    @staticmethod
    async def cancel(
        db: AsyncSession, preorder_id: int, reason: Optional[str] = None
    ) -> Optional[PreorderResponse]:
        row = await db.get(Preorder, preorder_id)
        if row is None:
            return None
        if row.status not in OPEN_STATUSES:
            raise ValueError("Cette précommande ne peut plus être annulée")

        if row.status == "DISPONIBLE" and row.reserved_batch_id:
            batch = await db.get(Batch, row.reserved_batch_id)
            if batch is not None:
                batch.reserved_quantity = max(
                    0,
                    int(batch.reserved_quantity or 0) - int(row.quantity or 0),
                )
        row.status = "ANNULE"
        row.cancelled_at = datetime.utcnow()
        if reason:
            row.notes = ((row.notes or "") + "\n[Annulation] " + reason).strip()
        await db.flush()
        return await PreorderService.get(db, preorder_id)
