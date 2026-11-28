"""Routes du module Précommandes.

Préfixe : ``/api/v1/preorders``.
"""

from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.ext.asyncio import AsyncSession

from ...core.database import get_db
from ...core.security import RBACUtils, get_current_user
from ...models.user import User
from .schemas import (
    CancelPreorderRequest,
    PreparationResponse,
    PreorderListResponse,
    PreorderResponse,
)
from .service import PreorderService

router = APIRouter(prefix="/preorders", tags=["preorders"])


def _require_seller(user: User) -> None:
    if not RBACUtils.has_permission(user.role, "seller"):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Accès réservé aux vendeurs et supérieurs",
        )


@router.get("/", response_model=PreorderListResponse)
async def list_preorders(
    status_filter: Optional[str] = Query(None, alias="status"),
    search: Optional[str] = None,
    page: int = Query(1, ge=1),
    page_size: int = Query(50, ge=1, le=200),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    if not RBACUtils.has_permission(current_user.role, "cashier"):
        raise HTTPException(status_code=403, detail="Accès caisse requis")
    return await PreorderService.list(
        db,
        status_filter=status_filter,
        search=search,
        page=page,
        page_size=page_size,
    )


@router.get("/preparation", response_model=PreparationResponse)
async def preparation(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    _require_seller(current_user)
    return await PreorderService.preparation(db)


@router.get("/lookup/{pickup_code}", response_model=PreorderResponse)
async def lookup(
    pickup_code: str,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    if not RBACUtils.has_permission(current_user.role, "cashier"):
        raise HTTPException(status_code=403, detail="Accès caisse requis")
    preorder = await PreorderService.get_by_pickup_code(db, pickup_code)
    if preorder is None:
        raise HTTPException(status_code=404, detail="Code de retrait inconnu")
    return preorder


@router.get("/{preorder_id}", response_model=PreorderResponse)
async def get_preorder(
    preorder_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    if not RBACUtils.has_permission(current_user.role, "cashier"):
        raise HTTPException(status_code=403, detail="Accès caisse requis")
    preorder = await PreorderService.get(db, preorder_id)
    if preorder is None:
        raise HTTPException(status_code=404, detail="Précommande introuvable")
    return preorder


@router.post("/{preorder_id}/mark-available", response_model=PreorderResponse)
async def mark_available(
    preorder_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    _require_seller(current_user)
    try:
        preorder = await PreorderService.mark_available(db, preorder_id)
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc))
    if preorder is None:
        raise HTTPException(status_code=404, detail="Précommande introuvable")
    return preorder


@router.post("/{preorder_id}/deliver", response_model=PreorderResponse)
async def deliver(
    preorder_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    if not RBACUtils.has_permission(current_user.role, "cashier"):
        raise HTTPException(status_code=403, detail="Accès caisse requis")
    try:
        preorder = await PreorderService.deliver(
            db, preorder_id, user_id=current_user.id
        )
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc))
    if preorder is None:
        raise HTTPException(status_code=404, detail="Précommande introuvable")
    return preorder


@router.post("/{preorder_id}/cancel", response_model=PreorderResponse)
async def cancel(
    preorder_id: int,
    body: Optional[CancelPreorderRequest] = None,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    _require_seller(current_user)
    try:
        preorder = await PreorderService.cancel(
            db, preorder_id, reason=body.reason if body else None
        )
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc))
    if preorder is None:
        raise HTTPException(status_code=404, detail="Précommande introuvable")
    return preorder
