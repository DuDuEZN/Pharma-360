"""
Cache Configuration for Pharmacie 360 Backend
Redis cache configuration and utilities
"""

import json
import pickle
from datetime import timedelta
from typing import Any, Optional, Union

from redis.asyncio import Redis, from_url
from redis.exceptions import ConnectionError, RedisError

from .config import settings


class RedisCache:
    """
    Redis cache wrapper for async operations
    """

    _instance: Optional["RedisCache"] = None

    def __new__(cls) -> "RedisCache":
        """Singleton pattern"""
        if cls._instance is None:
            cls._instance = super().__new__(cls)
        return cls._instance

    def __init__(self):
        """Initialize Redis cache connection"""
        if not hasattr(self, "_initialized"):
            self._redis: Optional[Redis] = None
            self._initialized = True

    async def get_connection(self) -> Redis:
        """Get or create Redis connection"""
        if self._redis is None:
            try:
                self._redis = from_url(
                    settings.redis_url,
                    decode_responses=True,
                    encoding="utf-8",
                    socket_timeout=5,
                    socket_connect_timeout=5,
                    retry_on_timeout=True,
                )
            except ConnectionError as e:
                # Fallback: use in-memory cache if Redis is not available
                # In production, this should fail fast
                raise RedisError(f"Cannot connect to Redis: {e}")
        return self._redis

    async def close(self):
        """Close Redis connection"""
        if self._redis:
            await self._redis.close()
            self._redis = None

    async def set(
        self,
        key: str,
        value: Any,
        ttl: Optional[int] = None,
        expire: Optional[timedelta] = None,
    ) -> bool:
        """
        Set a value in cache

        Args:
            key: Cache key
            value: Value to cache (will be serialized)
            ttl: Time to live in seconds
            expire: Time to live as timedelta

        Returns:
            True if successful, False otherwise
        """
        try:
            redis = await self.get_connection()

            # Serialize value
            if isinstance(value, (dict, list)):
                serialized_value = json.dumps(value)
            else:
                serialized_value = pickle.dumps(value)

            # Set with optional expiration
            if expire:
                await redis.setex(key, int(expire.total_seconds()), serialized_value)
            elif ttl:
                await redis.setex(key, ttl, serialized_value)
            else:
                await redis.set(key, serialized_value)

            return True
        except (RedisError, pickle.PickleError, json.JSONDecodeError) as e:
            # Log error in production
            return False

    async def get(self, key: str) -> Optional[Any]:
        """
        Get a value from cache

        Args:
            key: Cache key

        Returns:
            Cached value or None if not found
        """
        try:
            redis = await self.get_connection()
            value = await redis.get(key)

            if value is None:
                return None

            # Try to deserialize
            try:
                return json.loads(value)
            except json.JSONDecodeError:
                try:
                    return pickle.loads(
                        value.encode() if isinstance(value, str) else value
                    )
                except:
                    return value
        except RedisError:
            return None

    async def delete(self, key: str) -> bool:
        """Delete a key from cache"""
        try:
            redis = await self.get_connection()
            result = await redis.delete(key)
            return result > 0
        except RedisError:
            return False

    async def exists(self, key: str) -> bool:
        """Check if a key exists in cache"""
        try:
            redis = await self.get_connection()
            return await redis.exists(key) > 0
        except RedisError:
            return False

    async def get_many(self, keys: list[str]) -> dict[str, Any]:
        """Get multiple values from cache"""
        try:
            redis = await self.get_connection()
            values = await redis.mget(keys)

            result = {}
            for key, value in zip(keys, values):
                if value is not None:
                    try:
                        result[key] = json.loads(value)
                    except json.JSONDecodeError:
                        try:
                            result[key] = pickle.loads(
                                value.encode() if isinstance(value, str) else value
                            )
                        except:
                            result[key] = value

            return result
        except RedisError:
            return {}

    async def set_many(self, data: dict[str, Any], ttl: Optional[int] = None) -> bool:
        """Set multiple values in cache"""
        try:
            redis = await self.get_connection()

            pipeline = redis.pipeline()
            for key, value in data.items():
                if isinstance(value, (dict, list)):
                    serialized_value = json.dumps(value)
                else:
                    serialized_value = pickle.dumps(value)

                if ttl:
                    pipeline.setex(key, ttl, serialized_value)
                else:
                    pipeline.set(key, serialized_value)

            await pipeline.execute()
            return True
        except RedisError:
            return False

    async def clear(self, pattern: str = "*") -> int:
        """Clear cache by pattern"""
        try:
            redis = await self.get_connection()
            keys = await redis.keys(pattern)
            if keys:
                return await redis.delete(*keys)
            return 0
        except RedisError:
            return 0

    async def increment(self, key: str, amount: int = 1) -> int:
        """Increment a numeric value in cache"""
        try:
            redis = await self.get_connection()
            return await redis.incrby(key, amount)
        except RedisError:
            return 0

    async def decrement(self, key: str, amount: int = 1) -> int:
        """Decrement a numeric value in cache"""
        try:
            redis = await self.get_connection()
            return await redis.decrby(key, amount)
        except RedisError:
            return 0

    async def ping(self) -> bool:
        """Check Redis connection"""
        try:
            redis = await self.get_connection()
            return await redis.ping()
        except RedisError:
            return False


# Singleton instance
redis_cache = RedisCache()
