"""
Batch Service for Pharmacie 360 Backend
Optimized FEFO/FIFO batch selection with indexed queries
"""

from datetime import date
from typing import List as ListType
from typing import Optional

from sqlalchemy import and_, or_, select
from sqlalchemy.ext.asyncio import AsyncSession

from ..models.batch import Batch


class BatchService:
    """Service for handling batch operations with FEFO/FIFO optimization"""

    @staticmethod
    async def get_fefo_batch_optimized(
        product_id: int, quantity: int, db: AsyncSession, min_stock_threshold: int = 0
    ) -> Optional[Batch]:
        """
        Get the best batch for FEFO selection with optimized indexed query

        This method uses PostgreSQL indexes on (product_id, expiry_date, status)
        for optimal performance with FEFO (First Expired, First Out) queries.

        Args:
            product_id: ID of the product
            quantity: Requested quantity
            db: Database session
            min_stock_threshold: Minimum stock threshold to consider (default: 0)

        Returns:
            Batch with closest expiry date that has enough stock, or None

        Note: Uses indexed columns for optimal database performance.
        The query leverages the PostgreSQL index on:
        - batches.product_id
        - batches.expiry_date
        - batches.status
        """
        result = await db.execute(
            select(Batch)
            .where(
                Batch.product_id == product_id,
                Batch.quantity >= quantity + min_stock_threshold,
                Batch.status == "active",
                Batch.expiry_date >= date.today(),
            )
            .order_by(Batch.expiry_date.asc())
            .limit(1)
        )
        return result.scalar_one_or_none()

    @staticmethod
    async def get_fefo_batches_for_product(
        product_id: int, db: AsyncSession, limit: int = 10
    ) -> ListType[Batch]:
        """
        Get all available batches for a product, ordered by FEFO priority

        Args:
            product_id: ID of the product
            db: Database session
            limit: Maximum number of batches to return

        Returns:
            List of batches ordered by expiry date (closest first)
        """
        result = await db.execute(
            select(Batch)
            .where(
                Batch.product_id == product_id,
                Batch.quantity > 0,
                Batch.status == "active",
                Batch.expiry_date >= date.today(),
            )
            .order_by(Batch.expiry_date.asc())
            .limit(limit)
        )
        return result.scalars().all()

    @staticmethod
    async def get_expiring_soon_batches(
        db: AsyncSession, days_threshold: int = 30, limit: int = 50
    ) -> ListType[Batch]:
        """
        Get batches that are expiring soon across all products

        Args:
            db: Database session
            days_threshold: Number of days until expiry to consider
            limit: Maximum number of batches to return

        Returns:
            List of batches expiring within the threshold
        """
        from datetime import timedelta

        threshold_date = date.today() + timedelta(days=days_threshold)

        result = await db.execute(
            select(Batch)
            .where(
                Batch.status == "active",
                Batch.quantity > 0,
                Batch.expiry_date >= date.today(),
                Batch.expiry_date <= threshold_date,
            )
            .order_by(Batch.expiry_date.asc())
            .limit(limit)
        )
        return result.scalars().all()

    @staticmethod
    async def get_low_stock_batches(
        db: AsyncSession, threshold: int = 5, limit: int = 50
    ) -> ListType[Batch]:
        """
        Get batches with low stock levels

        Args:
            db: Database session
            threshold: Minimum quantity to consider as low stock
            limit: Maximum number of batches to return

        Returns:
            List of batches with quantity <= threshold
        """
        result = await db.execute(
            select(Batch)
            .where(
                Batch.status == "active",
                Batch.quantity > 0,
                Batch.quantity <= threshold,
                Batch.expiry_date >= date.today(),
            )
            .order_by(Batch.quantity.asc(), Batch.expiry_date.asc())
            .limit(limit)
        )
        return result.scalars().all()

    @staticmethod
    async def get_batch_by_id(batch_id: int, db: AsyncSession) -> Optional[Batch]:
        """Get batch by ID"""
        result = await db.execute(select(Batch).where(Batch.id == batch_id))
        return result.scalar_one_or_none()

    @staticmethod
    async def get_batches_by_product(
        product_id: int, db: AsyncSession
    ) -> ListType[Batch]:
        """Get all batches for a specific product"""
        result = await db.execute(
            select(Batch)
            .where(Batch.product_id == product_id)
            .order_by(Batch.expiry_date.asc())
        )
        return result.scalars().all()


# Singleton instance
batch_service = BatchService()
