"""
Audit Service for Pharmacie 360 Backend
Centralized recording of user activities (HTTP mutations + business events).
"""
from datetime import date, datetime
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
        expiry_date: Optional[date],
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
    def _serialize_log(entry: AuditLog) -> dict:
        return {
            "id": entry.id,
            "action": entry.action,
            "entity_type": entry.entity_type,
            "entity_id": entry.entity_id,
            "user_id": entry.user_id,
            "username": entry.username,
            "method": entry.method,
            "path": entry.path,
            "details": entry.details,
            "ip_address": entry.ip_address,
            "status_code": entry.status_code,
            "created_at": entry.created_at.isoformat() if entry.created_at else None,
        }

    @staticmethod
    def _serialize_expired(
        entry: ExpiredProductLog, product_name: Optional[str] = None
    ) -> dict:
        return {
            "id": entry.id,
            "product_id": entry.product_id,
            "product_name": product_name or getattr(entry, "product_name", None),
            "batch_id": entry.batch_id,
            "batch_number": entry.batch_number,
            "quantity": entry.quantity,
            "expiry_date": entry.expiry_date.isoformat() if entry.expiry_date else None,
            "user_id": entry.user_id,
            "reason": entry.reason,
            "created_at": entry.created_at.isoformat(),
        }

    @staticmethod
    async def list_logs(
        db: AsyncSession,
        limit: int = 100,
        offset: int = 0,
        action: Optional[str] = None,
        username: Optional[str] = None,
        entity_type: Optional[str] = None,
        method: Optional[str] = None,
        search: Optional[str] = None,
        date_from: Optional[datetime] = None,
        date_to: Optional[datetime] = None,
    ) -> dict:
        from sqlalchemy import func, or_, select, desc
        from ..models.product import Product

        conditions = []
        if action:
            conditions.append(AuditLog.action == action)
        if username:
            conditions.append(AuditLog.username.ilike(f"%{username}%"))
        if entity_type:
            conditions.append(AuditLog.entity_type == entity_type)
        if method:
            conditions.append(AuditLog.method == method.upper())
        if search:
            like = f"%{search}%"
            conditions.append(
                or_(
                    AuditLog.path.ilike(like),
                    AuditLog.details.ilike(like),
                    AuditLog.username.ilike(like),
                    AuditLog.action.ilike(like),
                )
            )
        if date_from:
            conditions.append(AuditLog.created_at >= date_from)
        if date_to:
            conditions.append(AuditLog.created_at <= date_to)

        query = select(AuditLog)
        count_query = select(func.count(AuditLog.id))
        if conditions:
            query = query.where(*conditions)
            count_query = count_query.where(*conditions)

        total = int((await db.execute(count_query)).scalar() or 0)
        result = await db.execute(
            query.order_by(desc(AuditLog.created_at)).limit(limit).offset(offset)
        )
        rows = result.scalars().all()
        return {
            "logs": [AuditService._serialize_log(row) for row in rows],
            "total": total,
        }

    @staticmethod
    async def list_expired(
        db: AsyncSession,
        limit: int = 100,
        offset: int = 0,
        search: Optional[str] = None,
        date_from: Optional[datetime] = None,
        date_to: Optional[datetime] = None,
    ) -> dict:
        from sqlalchemy import func, or_, select, desc
        from ..models.product import Product

        conditions = []
        if search:
            like = f"%{search}%"
            conditions.append(
                or_(
                    ExpiredProductLog.batch_number.ilike(like),
                    ExpiredProductLog.reason.ilike(like),
                    Product.name.ilike(like),
                )
            )
        if date_from:
            conditions.append(ExpiredProductLog.created_at >= date_from)
        if date_to:
            conditions.append(ExpiredProductLog.created_at <= date_to)

        from ..models.product import Product

        query = select(ExpiredProductLog, Product.name).outerjoin(
            Product, Product.id == ExpiredProductLog.product_id
        )
        count_query = select(func.count(ExpiredProductLog.id)).outerjoin(
            Product, Product.id == ExpiredProductLog.product_id
        )
        if conditions:
            query = query.where(*conditions)
            count_query = count_query.where(*conditions)

        total = int((await db.execute(count_query)).scalar() or 0)
        result = await db.execute(
            query.order_by(desc(ExpiredProductLog.created_at))
            .limit(limit)
            .offset(offset)
        )
        rows = result.all()
        return {
            "logs": [
                AuditService._serialize_expired(row[0], row[1]) for row in rows
            ],
            "total": total,
        }

    @staticmethod
    async def purge_logs(
        db: AsyncSession, before: Optional[datetime] = None, keep_days: int = 90
    ) -> int:
        """Supprime les entrées d'audit plus anciennes qu'une date/heure."""
        from datetime import timedelta

        from sqlalchemy import delete as sql_delete

        if before is None:
            before = datetime.utcnow() - timedelta(days=max(int(keep_days), 1))

        result = await db.execute(
            sql_delete(AuditLog).where(AuditLog.created_at < before)
        )
        await db.commit()
        return int(result.rowcount or 0)
