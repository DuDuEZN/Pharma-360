"""
Audit Service for Pharmacie 360 Backend
Centralized recording of user activities (HTTP mutations + business events).
"""
from datetime import datetime
from typing import Optional

from sqlalchemy.ext.asyncio import AsyncSession

from ..models.audit_log import AuditLog, ExpiredProductLog


class AuditService:
    @staticmethod
    async def log(
        db: AsyncSession,
        action: str,
        user_id: Optional[int] = None,
        username: Optional[str] = None,
        entity_type: Optional[str] = None,
        entity_id: Optional[int] = None,
        method: Optional[str] = None,
        path: Optional[str] = None,
        details: Optional[str] = None,
        ip_address: Optional[str] = None,
        status_code: Optional[int] = None,
    ) -> None:
        try:
            entry = AuditLog(
                action=action,
                entity_type=entity_type,
                entity_id=entity_id,
                user_id=user_id,
                username=username,
                method=method,
                path=path,
                details=details,
                ip_address=ip_address,
                status_code=status_code,
            )
            db.add(entry)
            await db.commit()
        except Exception:
            # L'audit ne doit jamais casser la requête principale.
            try:
                await db.rollback()
            except Exception:
                pass

    @staticmethod
    async def log_expired_product(
        db: AsyncSession,
        product_id: Optional[int],
        batch_id: Optional[int],
        batch_number: Optional[str],
        quantity: int,
        expiry_date: Optional[datetime],
        user_id: Optional[int],
        reason: Optional[str] = None,
    ) -> None:
        try:
            entry = ExpiredProductLog(
                product_id=product_id,
                batch_id=batch_id,
                batch_number=batch_number,
                quantity=quantity,
                expiry_date=expiry_date,
                user_id=user_id,
                reason=reason,
            )
            db.add(entry)
            await db.commit()
        except Exception:
            try:
                await db.rollback()
            except Exception:
                pass

    @staticmethod
    async def list_logs(db: AsyncSession, limit: int = 100, offset: int = 0):
        from sqlalchemy import select, desc
        result = await db.execute(
            select(AuditLog).order_by(desc(AuditLog.created_at)).limit(limit).offset(offset)
        )
        return result.scalars().all()

    @staticmethod
    async def list_expired(db: AsyncSession, limit: int = 100, offset: int = 0):
        from sqlalchemy import select, desc
        result = await db.execute(
            select(ExpiredProductLog).order_by(desc(ExpiredProductLog.created_at)).limit(limit).offset(offset)
        )
        return result.scalars().all()
