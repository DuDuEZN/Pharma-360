"""
Cash API Endpoints for Pharmacie 360 Backend
Ouverture / suivi / clôture des sessions de caisse et rapport d'écart.
"""

from typing import Annotated, Optional

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.ext.asyncio import AsyncSession

from ...core.database import get_db
from ...core.security import get_current_user
from ...models.user import User
from ...schemas.cash import (
    CashCurrentResponse,
    CashSessionClose,
    CashSessionListResponse,
    CashSessionOpen,
    CashSessionResponse,
)
from ...services.cash_service import CashService, CashServiceError

router = APIRouter(prefix="/cash", tags=["cash"])

CASHIER_ROLES = ("cashier", "admin")
MANAGER_ROLES = ("manager", "admin")


def _require_cashier(current_user: User) -> None:
    if current_user.role not in CASHIER_ROLES:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Seul un caissier ou un administrateur peut gérer la caisse.",
        )


@router.get(
    "/current",
    response_model=CashCurrentResponse,
    summary="État de la caisse",
    description="Session de caisse ouverte de l'utilisateur, sinon dernière clôturée.",
)
async def get_current_cash_session(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> CashCurrentResponse:
    _require_cashier(current_user)
    return await CashService.get_current(db, current_user)


@router.post(
    "/open",
    response_model=CashSessionResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Ouvrir la caisse",
    description="Ouvre une session avec un fonds de caisse initial obligatoire.",
)
async def open_cash_session(
    payload: CashSessionOpen,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> CashSessionResponse:
    _require_cashier(current_user)
    try:
        return await CashService.open_session(
            db,
            current_user,
            opening_amount=payload.opening_amount,
            notes=payload.notes,
        )
    except CashServiceError as exc:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST, detail=str(exc)
        ) from exc


@router.get(
    "/summary",
    response_model=CashSessionResponse,
    summary="Rapport de synthèse",
    description=(
        "Rapport temps réel de la session ouverte : ventes théoriques, "
        "attendu en caisse et écart (avant clôture)."
    ),
)
async def get_cash_summary(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> CashSessionResponse:
    _require_cashier(current_user)
    try:
        return await CashService.get_summary(db, current_user)
    except CashServiceError as exc:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail=str(exc)
        ) from exc


@router.post(
    "/close",
    response_model=CashSessionResponse,
    summary="Clôturer la caisse",
    description=(
        "Le caissier saisit uniquement le montant final compté. Le système "
        "calcule la recette réelle, l'écart avec les ventes espèces et génère "
        "le rapport de synthèse horodaté."
    ),
)
async def close_cash_session(
    payload: CashSessionClose,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> CashSessionResponse:
    _require_cashier(current_user)
    try:
        return await CashService.close_session(
            db,
            current_user,
            closing_amount=payload.closing_amount,
            closing_notes=payload.closing_notes,
        )
    except CashServiceError as exc:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST, detail=str(exc)
        ) from exc


@router.get(
    "/sessions",
    response_model=CashSessionListResponse,
    summary="Historique des sessions de caisse",
    description="Un caissier voit ses sessions ; manager/admin voient tout.",
)
async def list_cash_sessions(
    page: Annotated[int, Query(ge=1)] = 1,
    page_size: Annotated[int, Query(ge=1, le=100)] = 20,
    session_status: Annotated[Optional[str], Query(alias="status")] = None,
    user_id: Annotated[Optional[int], Query()] = None,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> CashSessionListResponse:
    if current_user.role in MANAGER_ROLES:
        filter_user_id = user_id
    elif current_user.role == "cashier":
        filter_user_id = current_user.id
    else:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Accès réservé aux caissiers, managers et administrateurs.",
        )

    return await CashService.list_sessions(
        db,
        user_id=filter_user_id,
        status=session_status,
        page=page,
        page_size=page_size,
    )


@router.get(
    "/sessions/{session_id}",
    response_model=CashSessionResponse,
    summary="Détail d'une session de caisse",
)
async def get_cash_session(
    session_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> CashSessionResponse:
    session = await CashService._get_session_by_id(db, session_id)
    if not session:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Session de caisse non trouvée.",
        )

    if current_user.role not in MANAGER_ROLES and session.user_id != current_user.id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Vous ne pouvez consulter que vos propres sessions.",
        )

    return CashService._to_response(session)
