"""Service de l'ordonnancier (registre, auto-complétion, export)."""

from __future__ import annotations

import csv
import io
from datetime import datetime
from typing import Optional

from sqlalchemy import func, or_, select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from ...models.prescription import Prescription
from .schemas import (
    PrescriptionCreate,
    PrescriptionListResponse,
    PrescriptionResponse,
    PrescriptionUpdate,
)

AUTOCOMPLETE_FIELDS = {
    "prescriber": Prescription.prescriber_name,
    "registration": Prescription.prescriber_registration,
    "structure": Prescription.health_structure,
}


def _to_response(row: Prescription) -> PrescriptionResponse:
    response = PrescriptionResponse.model_validate(row)
    response.sale_number = row.sale.sale_number if row.sale is not None else None
    response.customer_name = (
        row.customer.name if row.customer is not None else None
    )
    response.insurance_structure_name = (
        row.insurance_structure.name
        if row.insurance_structure is not None
        else None
    )
    response.insurance_client_name = (
        row.insurance_client.name if row.insurance_client is not None else None
    )
    response.author_name = row.author.username if row.author is not None else None
    return response


def _base_query():
    return select(Prescription).options(
        selectinload(Prescription.sale),
        selectinload(Prescription.customer),
        selectinload(Prescription.insurance_structure),
        selectinload(Prescription.insurance_client),
        selectinload(Prescription.author),
    )


class PrescriptionService:
    @staticmethod
    async def _next_number(db: AsyncSession) -> str:
        base = f"ORD-{datetime.now().strftime('%Y%m%d-%H%M%S')}"
        candidate = base
        suffix = 1
        while (
            await db.execute(
                select(Prescription.id).where(
                    Prescription.prescription_number == candidate
                )
            )
        ).scalar_one_or_none() is not None:
            suffix += 1
            candidate = f"{base}-{suffix}"
        return candidate

    @staticmethod
    async def create(
        db: AsyncSession, data: PrescriptionCreate, user_id: Optional[int] = None
    ) -> PrescriptionResponse:
        row = Prescription(
            prescription_number=await PrescriptionService._next_number(db),
            sale_id=data.sale_id,
            customer_id=data.customer_id,
            prescription_type=data.prescription_type,
            patient_name=data.patient_name.strip(),
            prescriber_name=data.prescriber_name.strip(),
            prescriber_registration=data.prescriber_registration.strip(),
            health_structure=data.health_structure.strip(),
            insurance_structure_id=data.insurance_structure_id,
            insurance_client_id=data.insurance_client_id,
            notes=data.notes,
            created_by=user_id,
        )
        db.add(row)
        await db.flush()
        row = (
            await db.execute(_base_query().where(Prescription.id == row.id))
        ).scalar_one()
        return _to_response(row)

    @staticmethod
    async def get(db: AsyncSession, prescription_id: int) -> Optional[PrescriptionResponse]:
        row = (
            await db.execute(
                _base_query().where(Prescription.id == prescription_id)
            )
        ).scalar_one_or_none()
        return _to_response(row) if row is not None else None

    @staticmethod
    async def list(
        db: AsyncSession,
        *,
        search: Optional[str] = None,
        prescription_type: Optional[str] = None,
        date_from: Optional[str] = None,
        date_to: Optional[str] = None,
        page: int = 1,
        page_size: int = 20,
    ) -> PrescriptionListResponse:
        query = _base_query()
        count_query = select(func.count()).select_from(Prescription)

        if search:
            like = f"%{search.strip()}%"
            condition = or_(
                Prescription.prescription_number.ilike(like),
                Prescription.patient_name.ilike(like),
                Prescription.prescriber_name.ilike(like),
                Prescription.prescriber_registration.ilike(like),
                Prescription.health_structure.ilike(like),
            )
            query = query.where(condition)
            count_query = count_query.where(condition)

        if prescription_type:
            query = query.where(
                Prescription.prescription_type == prescription_type.upper()
            )
            count_query = count_query.where(
                Prescription.prescription_type == prescription_type.upper()
            )

        if date_from:
            try:
                start = datetime.strptime(date_from, "%Y-%m-%d")
                query = query.where(Prescription.created_at >= start)
                count_query = count_query.where(Prescription.created_at >= start)
            except ValueError:
                pass

        if date_to:
            try:
                end = datetime.strptime(date_to, "%Y-%m-%d").replace(
                    hour=23, minute=59, second=59
                )
                query = query.where(Prescription.created_at <= end)
                count_query = count_query.where(Prescription.created_at <= end)
            except ValueError:
                pass

        total = (await db.execute(count_query)).scalar() or 0
        page = max(1, page)
        page_size = max(1, min(page_size, 200))
        rows = (
            await db.execute(
                query.order_by(Prescription.created_at.desc())
                .offset((page - 1) * page_size)
                .limit(page_size)
            )
        ).scalars().all()

        return PrescriptionListResponse(
            items=[_to_response(row) for row in rows],
            total=total,
            page=page,
            page_size=page_size,
        )

    @staticmethod
    async def autocomplete(
        db: AsyncSession, field: str, query: str = "", limit: int = 10
    ) -> list[str]:
        column = AUTOCOMPLETE_FIELDS.get(field)
        if column is None:
            raise ValueError("Champ d'auto-complétion invalide")
        stmt = select(column).where(column.is_not(None), column != "")
        if query.strip():
            stmt = stmt.where(column.ilike(f"%{query.strip()}%"))
        stmt = (
            stmt.distinct()
            .order_by(column.asc())
            .limit(max(1, min(limit, 50)))
        )
        rows = (await db.execute(stmt)).scalars().all()
        return [str(value) for value in rows]

    @staticmethod
    async def update(
        db: AsyncSession, prescription_id: int, data: PrescriptionUpdate
    ) -> Optional[PrescriptionResponse]:
        row = await db.get(Prescription, prescription_id)
        if row is None:
            return None
        for field, value in data.model_dump(exclude_unset=True).items():
            if isinstance(value, str):
                value = value.strip()
            setattr(row, field, value)
        await db.flush()
        return await PrescriptionService.get(db, prescription_id)

    @staticmethod
    async def export_csv(
        db: AsyncSession,
        *,
        search: Optional[str] = None,
        prescription_type: Optional[str] = None,
    ) -> str:
        result = await PrescriptionService.list(
            db,
            search=search,
            prescription_type=prescription_type,
            page=1,
            page_size=200,
        )
        buffer = io.StringIO()
        writer = csv.writer(buffer, delimiter=";")
        writer.writerow(
            [
                "Numero",
                "Date",
                "Type",
                "Patient",
                "Prescripteur",
                "Enregistrement",
                "Structure sanitaire",
                "Assurance",
                "Vente",
            ]
        )
        for item in result.items:
            writer.writerow(
                [
                    item.prescription_number,
                    item.created_at.strftime("%Y-%m-%d %H:%M"),
                    item.prescription_type,
                    item.patient_name,
                    item.prescriber_name,
                    item.prescriber_registration,
                    item.health_structure,
                    item.insurance_structure_name or "",
                    item.sale_number or "",
                ]
            )
        return buffer.getvalue()
