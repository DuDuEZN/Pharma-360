"""Service du module Assurance (structures + clients assurés)."""

from typing import Optional

from sqlalchemy import or_, select
from sqlalchemy.ext.asyncio import AsyncSession

from ...models.insurance import InsuranceClient, InsuranceStructure
from .schemas import (
    InsuranceClientCreate,
    InsuranceClientResponse,
    InsuranceClientUpdate,
    InsuranceStructureCreate,
    InsuranceStructureResponse,
    InsuranceStructureUpdate,
)


def _client_response(client: InsuranceClient) -> InsuranceClientResponse:
    response = InsuranceClientResponse.model_validate(client)
    response.structure_name = (
        client.structure.name if client.structure is not None else None
    )
    return response


class InsuranceService:
    # ------------------------------------------------------------------
    # Structures
    # ------------------------------------------------------------------
    @staticmethod
    async def list_structures(
        db: AsyncSession,
        *,
        search: Optional[str] = None,
        active_only: bool = False,
    ) -> list[InsuranceStructureResponse]:
        query = select(InsuranceStructure)
        if active_only:
            query = query.where(InsuranceStructure.is_active == True)  # noqa: E712
        if search:
            like = f"%{search.strip()}%"
            query = query.where(
                or_(
                    InsuranceStructure.name.ilike(like),
                    InsuranceStructure.code.ilike(like),
                )
            )
        query = query.order_by(InsuranceStructure.name.asc())
        rows = (await db.execute(query)).scalars().all()
        return [InsuranceStructureResponse.model_validate(row) for row in rows]

    @staticmethod
    async def get_structure(
        structure_id: int, db: AsyncSession
    ) -> Optional[InsuranceStructure]:
        return await db.get(InsuranceStructure, structure_id)

    @staticmethod
    async def create_structure(
        db: AsyncSession, data: InsuranceStructureCreate
    ) -> InsuranceStructureResponse:
        existing = await db.execute(
            select(InsuranceStructure.id).where(
                InsuranceStructure.name == data.name.strip()
            )
        )
        if existing.scalar_one_or_none() is not None:
            raise ValueError(f"La structure « {data.name} » existe déjà")
        structure = InsuranceStructure(
            name=data.name.strip(),
            code=(data.code or "").strip() or None,
            contact=data.contact,
            phone=data.phone,
            email=data.email,
            address=data.address,
            default_rate=data.default_rate,
            is_active=data.is_active,
        )
        db.add(structure)
        await db.flush()
        await db.refresh(structure)
        return InsuranceStructureResponse.model_validate(structure)

    @staticmethod
    async def update_structure(
        db: AsyncSession, structure_id: int, data: InsuranceStructureUpdate
    ) -> Optional[InsuranceStructureResponse]:
        structure = await db.get(InsuranceStructure, structure_id)
        if structure is None:
            return None
        updates = data.model_dump(exclude_unset=True)
        for field, value in updates.items():
            if field in ("code", "name") and isinstance(value, str):
                value = value.strip() or (None if field == "code" else value)
            setattr(structure, field, value)
        await db.flush()
        await db.refresh(structure)
        return InsuranceStructureResponse.model_validate(structure)

    @staticmethod
    async def delete_structure(db: AsyncSession, structure_id: int) -> bool:
        structure = await db.get(InsuranceStructure, structure_id)
        if structure is None:
            return False
        await db.delete(structure)
        await db.flush()
        return True

    # ------------------------------------------------------------------
    # Clients assurés
    # ------------------------------------------------------------------
    @staticmethod
    async def list_clients(
        db: AsyncSession,
        *,
        search: Optional[str] = None,
        structure_id: Optional[int] = None,
        active_only: bool = False,
        limit: int = 100,
    ) -> list[InsuranceClientResponse]:
        query = select(InsuranceClient)
        if structure_id:
            query = query.where(InsuranceClient.structure_id == structure_id)
        if active_only:
            query = query.where(InsuranceClient.is_active == True)  # noqa: E712
        if search:
            like = f"%{search.strip()}%"
            query = query.where(
                or_(
                    InsuranceClient.name.ilike(like),
                    InsuranceClient.phone.ilike(like),
                    InsuranceClient.policy_number.ilike(like),
                )
            )
        query = (
            query.order_by(InsuranceClient.name.asc())
            .limit(max(1, min(limit, 500)))
        )
        rows = (await db.execute(query)).scalars().all()
        return [_client_response(row) for row in rows]

    @staticmethod
    async def get_client(
        client_id: int, db: AsyncSession
    ) -> Optional[InsuranceClient]:
        return await db.get(InsuranceClient, client_id)

    @staticmethod
    async def create_client(
        db: AsyncSession, data: InsuranceClientCreate
    ) -> InsuranceClientResponse:
        structure = await db.get(InsuranceStructure, data.structure_id)
        if structure is None:
            raise ValueError("Structure d'assurance introuvable")
        client = InsuranceClient(
            structure_id=data.structure_id,
            customer_id=data.customer_id,
            name=data.name.strip(),
            phone=(data.phone or "").strip() or None,
            policy_number=(data.policy_number or "").strip() or None,
            coverage_rate=data.coverage_rate,
            is_active=data.is_active,
        )
        db.add(client)
        await db.flush()
        await db.refresh(client)
        return _client_response(client)

    @staticmethod
    async def update_client(
        db: AsyncSession, client_id: int, data: InsuranceClientUpdate
    ) -> Optional[InsuranceClientResponse]:
        client = await db.get(InsuranceClient, client_id)
        if client is None:
            return None
        updates = data.model_dump(exclude_unset=True)
        if "structure_id" in updates:
            structure = await db.get(InsuranceStructure, updates["structure_id"])
            if structure is None:
                raise ValueError("Structure d'assurance introuvable")
        for field, value in updates.items():
            if field in ("phone", "policy_number") and isinstance(value, str):
                value = value.strip() or None
            if field == "name" and isinstance(value, str):
                value = value.strip()
            setattr(client, field, value)
        await db.flush()
        await db.refresh(client)
        return _client_response(client)

    @staticmethod
    async def delete_client(db: AsyncSession, client_id: int) -> bool:
        client = await db.get(InsuranceClient, client_id)
        if client is None:
            return False
        await db.delete(client)
        await db.flush()
        return True
