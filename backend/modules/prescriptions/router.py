"""Routes du module Ordonnancier.

Préfixe : ``/api/v1/prescriptions``.
"""

from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, Query, Response, status
from sqlalchemy.ext.asyncio import AsyncSession

from ...core.database import get_db
from ...core.security import RBACUtils, get_current_user
from ...models.user import User
from .schemas import (
    AutocompleteResponse,
    PrescriptionCreate,
    PrescriptionListResponse,
    PrescriptionResponse,
    PrescriptionUpdate,
)
from .service import PrescriptionService

router = APIRouter(prefix="/prescriptions", tags=["prescriptions"])


def _require_seller(user: User) -> None:
    if not RBACUtils.has_permission(user.role, "seller"):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Accès réservé aux vendeurs et supérieurs",
        )


@router.get("/", response_model=PrescriptionListResponse)
async def list_prescriptions(
    search: Optional[str] = None,
    prescription_type: Optional[str] = Query(None, pattern="^(SIMPLE|ASSURANCE)$"),
    date_from: Optional[str] = None,
    date_to: Optional[str] = None,
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=200),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    _require_seller(current_user)
    return await PrescriptionService.list(
        db,
        search=search,
        prescription_type=prescription_type,
        date_from=date_from,
        date_to=date_to,
        page=page,
        page_size=page_size,
    )


@router.get("/export")
async def export_prescriptions(
    search: Optional[str] = None,
    prescription_type: Optional[str] = Query(None, pattern="^(SIMPLE|ASSURANCE)$"),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    _require_seller(current_user)
    content = await PrescriptionService.export_csv(
        db, search=search, prescription_type=prescription_type
    )
    return Response(
        content=content,
        media_type="text/csv; charset=utf-8",
        headers={
            "Content-Disposition": "attachment; filename=ordonnancier.csv"
        },
    )


@router.get("/autocomplete", response_model=AutocompleteResponse)
async def autocomplete(
    field: str = Query(..., pattern="^(prescriber|registration|structure)$"),
    q: str = "",
    limit: int = Query(10, ge=1, le=50),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    _require_seller(current_user)
    try:
        items = await PrescriptionService.autocomplete(db, field, q, limit)
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc))
    return AutocompleteResponse(items=items)


@router.post(
    "/",
    response_model=PrescriptionResponse,
    status_code=status.HTTP_201_CREATED,
)
async def create_prescription(
    data: PrescriptionCreate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    _require_seller(current_user)
    return await PrescriptionService.create(db, data, current_user.id)


@router.get("/{prescription_id}", response_model=PrescriptionResponse)
async def get_prescription(
    prescription_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    _require_seller(current_user)
    prescription = await PrescriptionService.get(db, prescription_id)
    if prescription is None:
        raise HTTPException(status_code=404, detail="Ordonnance introuvable")
    return prescription


@router.put("/{prescription_id}", response_model=PrescriptionResponse)
async def update_prescription(
    prescription_id: int,
    data: PrescriptionUpdate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    _require_seller(current_user)
    prescription = await PrescriptionService.update(db, prescription_id, data)
    if prescription is None:
        raise HTTPException(status_code=404, detail="Ordonnance introuvable")
    return prescription
