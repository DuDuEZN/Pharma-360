"""
Audit Logs API Endpoints for Pharmacie 360 Backend
"""
from typing import Optional

from fastapi import APIRouter, Depends, Query
from sqlalchemy.ext.asyncio import AsyncSession

from ...core.database import get_db
from ...core.security import get_current_user, get_current_user_with_role
from ...models.user import User
from ...services.audit_service import AuditService

router = APIRouter(prefix="/audit", tags=["audit"])


@router.get("/logs")
async def list_audit_logs(
    limit: int = Query(100, ge=1, le=500),
    offset: int = Query(0, ge=0),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user_with_role(["admin", "manager"])),
):
    logs = await AuditService.list_logs(db, limit=limit, offset=offset)
    return {"logs": logs}


@router.get("/expired-products")
async def list_expired_products_log(
    limit: int = Query(100, ge=1, le=500),
    offset: int = Query(0, ge=0),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user_with_role(["admin", "manager"])),
):
    logs = await AuditService.list_expired(db, limit=limit, offset=offset)
    return {"logs": logs}
