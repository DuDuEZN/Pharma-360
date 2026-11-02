"""
Cache Service for Pharmacie 360 Backend
Service for caching frequently accessed data using Redis
"""

import hashlib
import json
from datetime import timedelta
from typing import Any
from typing import List as ListType
from typing import Optional

from sqlalchemy.ext.asyncio import AsyncSession

from ..core.cache import redis_cache
from ..models.batch import Batch
from ..models.category import Category
from ..models.product import Product
from ..models.sale import Sale
from ..models.user import User


class CacheService:
    """Service for caching data with Redis"""

    # Cache prefixes
    PRODUCT_PREFIX = "product:"
    BATCH_PREFIX = "batch:"
    CATEGORY_PREFIX = "category:"
    SALE_PREFIX = "sale:"
    USER_PREFIX = "user:"
    PRODUCTS_LIST_PREFIX = "products:list:"
    BATCHES_LIST_PREFIX = "batches:list:"
    STATS_PREFIX = "stats:"

    # Default TTLs
    DEFAULT_TTL = 3600  # 1 hour
    SHORT_TTL = 300  # 5 minutes
    LONG_TTL = 86400  # 24 hours

    @staticmethod
    def _make_key(prefix: str, identifier: Any) -> str:
        """Create a cache key from prefix and identifier"""
        return f"{prefix}{identifier}"

    @staticmethod
    def _hash_key(prefix: str, *args, **kwargs) -> str:
        """Create a hashed cache key from multiple parameters"""
        key_str = f"{prefix}:{args}:{json.dumps(kwargs, sort_keys=True)}"
        return hashlib.md5(key_str.encode()).hexdigest()

    @staticmethod
    async def get_product_by_id(product_id: int, db: AsyncSession) -> Optional[Product]:
        """
        Get product from cache or database

        Args:
            product_id: Product ID
            db: Database session (fallback)

        Returns:
            Product object or None
        """
        cache_key = CacheService._make_key(CacheService.PRODUCT_PREFIX, product_id)

        # Try to get from cache
        cached = await redis_cache.get(cache_key)
        if cached:
            return cached

        # Fallback to database
        from ..models.product import Product

        result = await db.execute(select(Product).where(Product.id == product_id))
        product = result.scalar_one_or_none()

        # Cache the result
        if product:
            await redis_cache.set(cache_key, product, ttl=CacheService.LONG_TTL)

        return product

    @staticmethod
    async def get_batch_by_id(batch_id: int, db: AsyncSession) -> Optional[Batch]:
        """
        Get batch from cache or database

        Args:
            batch_id: Batch ID
            db: Database session (fallback)

        Returns:
            Batch object or None
        """
        cache_key = CacheService._make_key(CacheService.BATCH_PREFIX, batch_id)

        # Try to get from cache
        cached = await redis_cache.get(cache_key)
        if cached:
            return cached

        # Fallback to database
        from ..models.batch import Batch

        result = await db.execute(select(Batch).where(Batch.id == batch_id))
        batch = result.scalar_one_or_none()

        # Cache the result
        if batch:
            await redis_cache.set(cache_key, batch, ttl=CacheService.DEFAULT_TTL)

        return batch

    @staticmethod
    async def get_category_by_id(
        category_id: int, db: AsyncSession
    ) -> Optional[Category]:
        """
        Get category from cache or database

        Args:
            category_id: Category ID
            db: Database session (fallback)

        Returns:
            Category object or None
        """
        cache_key = CacheService._make_key(CacheService.CATEGORY_PREFIX, category_id)

        # Try to get from cache
        cached = await redis_cache.get(cache_key)
        if cached:
            return cached

        # Fallback to database
        from ..models.category import Category

        result = await db.execute(select(Category).where(Category.id == category_id))
        category = result.scalar_one_or_none()

        # Cache the result
        if category:
            await redis_cache.set(cache_key, category, ttl=CacheService.LONG_TTL)

        return category

    @staticmethod
    async def get_user_by_id(user_id: int, db: AsyncSession) -> Optional[User]:
        """
        Get user from cache or database

        Args:
            user_id: User ID
            db: Database session (fallback)

        Returns:
            User object or None
        """
        cache_key = CacheService._make_key(CacheService.USER_PREFIX, user_id)

        # Try to get from cache
        cached = await redis_cache.get(cache_key)
        if cached:
            return cached

        # Fallback to database
        from ..models.user import User

        result = await db.execute(select(User).where(User.id == user_id))
        user = result.scalar_one_or_none()

        # Cache the result (with shorter TTL for user data)
        if user:
            await redis_cache.set(cache_key, user, ttl=CacheService.SHORT_TTL)

        return user

    @staticmethod
    async def get_products_list(
        page: int = 1,
        page_size: int = 20,
        category_id: Optional[int] = None,
        search: Optional[str] = None,
        db: AsyncSession = None,
    ) -> dict:
        """
        Get cached list of products

        Args:
            page: Page number
            page_size: Items per page
            category_id: Filter by category
            search: Search query
            db: Database session (fallback)

        Returns:
            Dictionary with products and pagination info
        """
        cache_key = CacheService._hash_key(
            CacheService.PRODUCTS_LIST_PREFIX, page, page_size, category_id, search
        )

        # Try to get from cache
        cached = await redis_cache.get(cache_key)
        if cached:
            return cached

        # Fallback to database
        from ..services.product_service import ProductService

        result = await ProductService.list_products(
            page=page,
            page_size=page_size,
            category_id=category_id,
            search=search,
            db=db,
        )

        # Cache the result
        if result:
            await redis_cache.set(
                cache_key,
                result.model_dump() if hasattr(result, "model_dump") else dict(result),
                ttl=CacheService.SHORT_TTL,
            )

        return result

    @staticmethod
    async def get_batches_by_product(
        product_id: int, db: AsyncSession
    ) -> ListType[Batch]:
        """
        Get cached list of batches for a product

        Args:
            product_id: Product ID
            db: Database session (fallback)

        Returns:
            List of Batch objects
        """
        cache_key = CacheService._make_key(CacheService.BATCHES_LIST_PREFIX, product_id)

        # Try to get from cache
        cached = await redis_cache.get(cache_key)
        if cached:
            return cached

        # Fallback to database
        from sqlalchemy import select

        from ..models.batch import Batch

        result = await db.execute(
            select(Batch)
            .where(Batch.product_id == product_id)
            .order_by(Batch.expiry_date.asc())
        )
        batches = result.scalars().all()

        # Cache the result
        if batches:
            await redis_cache.set(cache_key, batches, ttl=CacheService.DEFAULT_TTL)

        return batches

    @staticmethod
    async def get_fefo_batch_cached(
        product_id: int, quantity: int, db: AsyncSession
    ) -> Optional[Batch]:
        """
        Get FEFO batch with caching

        Args:
            product_id: Product ID
            quantity: Requested quantity
            db: Database session

        Returns:
            Best batch for FEFO selection or None
        """
        cache_key = CacheService._hash_key(
            f"{CacheService.BATCH_PREFIX}fefo:", product_id, quantity
        )

        # Try to get from cache
        cached = await redis_cache.get(cache_key)
        if cached:
            return cached

        # Fallback to database
        from ..services.product_service import ProductService

        batch = await ProductService.get_fefo_batch(product_id, quantity, db)

        # Cache the result (with short TTL as stock changes frequently)
        if batch:
            await redis_cache.set(cache_key, batch, ttl=CacheService.SHORT_TTL)

        return batch

    @staticmethod
    async def get_sales_stats(db: AsyncSession) -> dict:
        """
        Get cached sales statistics

        Args:
            db: Database session (fallback)

        Returns:
            Dictionary with sales statistics
        """
        cache_key = CacheService.STATS_PREFIX + "sales"

        # Try to get from cache
        cached = await redis_cache.get(cache_key)
        if cached:
            return cached

        # Fallback to database
        from sqlalchemy import func, select

        from ..models.sale import Sale

        result = await db.execute(
            select(
                func.count(Sale.id).label("total_sales"),
                func.coalesce(func.sum(Sale.total_amount), 0).label("total_revenue"),
                func.coalesce(func.avg(Sale.total_amount), 0).label("avg_sale"),
            )
        )
        row = result.one()

        stats = {
            "total_sales": int(row.total_sales or 0),
            "total_revenue": float(row.total_revenue or 0),
            "avg_sale": float(row.avg_sale or 0),
        }

        # Cache the result
        await redis_cache.set(cache_key, stats, ttl=CacheService.SHORT_TTL)

        return stats

    @staticmethod
    async def invalidate_product_cache(product_id: int):
        """Invalidate cache for a specific product"""
        cache_key = CacheService._make_key(CacheService.PRODUCT_PREFIX, product_id)
        await redis_cache.delete(cache_key)

    @staticmethod
    async def invalidate_batch_cache(batch_id: int):
        """Invalidate cache for a specific batch"""
        cache_key = CacheService._make_key(CacheService.BATCH_PREFIX, batch_id)
        await redis_cache.delete(cache_key)

    @staticmethod
    async def invalidate_products_list_cache():
        """Invalidate all products list cache"""
        pattern = CacheService.PRODUCTS_LIST_PREFIX + "*"
        await redis_cache.clear(pattern)

    @staticmethod
    async def invalidate_batches_cache(product_id: Optional[int] = None):
        """Invalidate batches cache"""
        if product_id:
            cache_key = CacheService._make_key(
                CacheService.BATCHES_LIST_PREFIX, product_id
            )
            await redis_cache.delete(cache_key)
        else:
            pattern = CacheService.BATCHES_LIST_PREFIX + "*"
            await redis_cache.clear(pattern)

    @staticmethod
    async def invalidate_fefo_cache(product_id: Optional[int] = None):
        """Invalidate FEFO batch cache"""
        if product_id:
            pattern = f"{CacheService.BATCH_PREFIX}fefo:*{product_id}*"
            await redis_cache.clear(pattern)
        else:
            pattern = f"{CacheService.BATCH_PREFIX}fefo:*"
            await redis_cache.clear(pattern)

    @staticmethod
    async def clear_all_cache():
        """Clear all application cache"""
        await redis_cache.clear("*")


# Singleton instance
cache_service = CacheService()
