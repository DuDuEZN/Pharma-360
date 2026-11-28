"""Routes du module Assurance.

Préfixe : ``/api/v1/insurance``.
"""

from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.ext.asyncio import AsyncSession

from ...core.database import get_db
from ...core.security import RBACUtils, get_current_user
from ...models.user import User
from .schemas import (
    InsuranceClientCreate,
    InsuranceClientResponse,
    InsuranceClientUpdate,
    InsuranceStructureCreate,
    InsuranceStructureResponse,
    InsuranceStructureUpdate,
)
from .service import InsuranceService

router = APIRouter(prefix="/insurance", tags=["insurance"])


def _require_manager(user: User) -> None:
    if not RBACUtils.has_permission(user.role, "manager"):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Gestion des assurances réservée au gestionnaire ou à l'administrateur",
        )


# ----------------------------------------------------------------------
# Structures
# ----------------------------------------------------------------------
@router.get("/structures", response_model=list[InsuranceStructureResponse])
async def list_structures(
    search: Optional[str] = None,
    active_only: bool = False,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    return await InsuranceService.list_structures(
        db, search=search, active_only=active_only
    )


@router.post(
    "/structures",
    response_model=InsuranceStructureResponse,
    status_code=status.HTTP_201_CREATED,
)
async def create_structure(
    data: InsuranceStructureCreate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    _require_manager(current_user)
    try:
        return await InsuranceService.create_structure(db, data)
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc))


@router.put("/structures/{structure_id}", response_model=InsuranceStructureResponse)
async def update_structure(
    structure_id: int,
    data: InsuranceStructureUpdate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    _require_manager(current_user)
    structure = await InsuranceService.update_structure(db, structure_id, data)
    if structure is None:
        raise HTTPException(status_code=404, detail="Structure introuvable")
    return structure


@router.delete("/structures/{structure_id}", status_code=204)
async def delete_structure(
    structure_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    _require_manager(current_user)
    if not await InsuranceService.delete_structure(db, structure_id):
        raise HTTPException(status_code=404, detail="Structure introuvable")
    return None


# ----------------------------------------------------------------------
# Clients assurés
# ----------------------------------------------------------------------
@router.get("/clients", response_model=list[InsuranceClientResponse])
async def list_clients(
    search: Optional[str] = None,
    structure_id: Optional[int] = None,
    active_only: bool = False,
    limit: int = Query(100, ge=1, le=500),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    return await InsuranceService.list_clients(
        db,
        search=search,
        structure_id=structure_id,
        active_only=active_only,
        limit=limit,
    )


@router.post(
    "/clients",
    response_model=InsuranceClientResponse,
    status_code=status.HTTP_201_CREATED,
)
async def create_client(
    data: InsuranceClientCreate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    # Le vendeur peut pré-enregistrer un client assuré à la volée.
    if not RBACUtils.has_permission(current_user.role, "seller"):
        raise HTTPException(status_code=403, detail="Vendeur ou supérieur requis")
    try:
        return await InsuranceService.create_client(db, data)
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc))


@router.put("/clients/{client_id}", response_model=InsuranceClientResponse)
async def update_client(
    client_id: int,
    data: InsuranceClientUpdate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    if not RBACUtils.has_permission(current_user.role, "seller"):
        raise HTTPException(status_code=403, detail="Vendeur ou supérieur requis")
    try:
        client = await InsuranceService.update_client(db, client_id, data)
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc))
    if client is None:
        raise HTTPException(status_code=404, detail="Client assuré introuvable")
    return client


@router.delete("/clients/{client_id}", status_code=204)
async def delete_client(
    client_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    _require_manager(current_user)
    if not await InsuranceService.delete_client(db, client_id):
        raise HTTPException(status_code=404, detail="Client assuré introuvable")
    return None
