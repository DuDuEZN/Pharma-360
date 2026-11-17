"""
Audit Logs API Endpoints for Pharmacie 360 Backend
"""
import csv
import io
from datetime import datetime
from typing import Optional

from fastapi import APIRouter, Depends, Query
from fastapi.responses import StreamingResponse
from sqlalchemy.ext.asyncio import AsyncSession

from ...core.database import get_db
from ...core.security import get_current_user_with_role
from ...models.user import User
from ...services.audit_service import AuditService

router = APIRouter(prefix="/audit", tags=["audit"])


@router.get("/logs")
async def list_audit_logs(
    limit: int = Query(100, ge=1, le=500),
    offset: int = Query(0, ge=0),
    action: Optional[str] = Query(None),
    username: Optional[str] = Query(None),
    entity_type: Optional[str] = Query(None),
    method: Optional[str] = Query(None),
    search: Optional[str] = Query(None),
    date_from: Optional[datetime] = Query(None),
    date_to: Optional[datetime] = Query(None),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user_with_role(["admin", "manager"])),
):
    return await AuditService.list_logs(
        db,
        limit=limit,
        offset=offset,
        action=action,
        username=username,
        entity_type=entity_type,
        method=method,
        search=search,
        date_from=date_from,
        date_to=date_to,
    )


@router.get("/logs/export")
async def export_audit_logs(
    action: Optional[str] = Query(None),
    username: Optional[str] = Query(None),
    entity_type: Optional[str] = Query(None),
    method: Optional[str] = Query(None),
    search: Optional[str] = Query(None),
    date_from: Optional[datetime] = Query(None),
    date_to: Optional[datetime] = Query(None),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user_with_role(["admin", "manager"])),
):
    """Export CSV des journaux d'audit filtrés."""
    data = await AuditService.list_logs(
        db,
        limit=5000,
        offset=0,
        action=action,
        username=username,
        entity_type=entity_type,
        method=method,
        search=search,
        date_from=date_from,
        date_to=date_to,
    )

    buffer = io.StringIO()
    writer = csv.writer(buffer, delimiter=";")
    writer.writerow(
        [
            "Date",
            "Utilisateur",
            "Action",
            "Entité",
            "ID entité",
            "Méthode",
            "Chemin",
            "Statut",
            "Adresse IP",
            "Détails",
        ]
    )
    for log in data["logs"]:
        writer.writerow(
            [
                log.get("created_at") or "",
                log.get("username") or "",
                log.get("action") or "",
                log.get("entity_type") or "",
                log.get("entity_id") if log.get("entity_id") is not None else "",
                log.get("method") or "",
                log.get("path") or "",
                log.get("status_code") if log.get("status_code") is not None else "",
                log.get("ip_address") or "",
                (log.get("details") or "").replace("\n", " "),
            ]
        )

    content = "\ufeff" + buffer.getvalue()
    return StreamingResponse(
        io.BytesIO(content.encode("utf-8")),
        media_type="text/csv; charset=utf-8",
        headers={"Content-Disposition": "attachment; filename=audit_logs.csv"},
    )


@router.delete("/logs/purge")
async def purge_audit_logs(
    keep_days: int = Query(90, ge=1, le=3650),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user_with_role(["admin"])),
):
    """Purge les journaux d'audit plus anciens que ``keep_days`` jours."""
    deleted = await AuditService.purge_logs(db, keep_days=keep_days)
    return {"status": "success", "deleted": deleted}


@router.get("/expired-products")
async def list_expired_products_log(
    limit: int = Query(100, ge=1, le=500),
    offset: int = Query(0, ge=0),
    search: Optional[str] = Query(None),
    date_from: Optional[datetime] = Query(None),
    date_to: Optional[datetime] = Query(None),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user_with_role(["admin", "manager"])),
):
    return await AuditService.list_expired(
        db,
        limit=limit,
        offset=offset,
        search=search,
        date_from=date_from,
        date_to=date_to,
    )
