"""
Database Module for Pharmacie 360 Backend
Handles PostgreSQL database connections and session management
"""

from contextlib import asynccontextmanager
from typing import AsyncGenerator

from sqlalchemy import event
from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker, create_async_engine
from sqlalchemy.orm import DeclarativeBase

from .config import settings

# Database URL
DATABASE_URL = (
    f"postgresql+asyncpg://{settings.postgres_user}:{settings.postgres_password.get_secret_value()}"
    f"@{settings.postgres_host}:{settings.postgres_port}/{settings.postgres_db}"
)

# Create async engine
engine = create_async_engine(
    DATABASE_URL,
    echo=settings.app_debug,
    pool_size=20,
    max_overflow=10,
    pool_timeout=30,
    pool_pre_ping=True,
)


# Enable foreign keys for SQLite (if needed)
@event.listens_for(engine.sync_engine, "connect")
def set_sqlite_pragma(dbapi_connection, connection_record):
    """Enable foreign keys for SQLite"""
    if "sqlite" in DATABASE_URL:
        cursor = dbapi_connection.cursor()
        cursor.execute("PRAGMA foreign_keys=ON")
        cursor.close()


# Session factory
async_session_maker = async_sessionmaker(
    engine,
    class_=AsyncSession,
    expire_on_commit=False,
    autocommit=False,
    autoflush=False,
)


# Base class for models
class Base(DeclarativeBase):
    """Base class for all SQLAlchemy models"""

    pass


# Dependency for getting database session
async def get_db() -> AsyncGenerator[AsyncSession, None]:
    """
    Dependency that provides a database session
    Usage: add as dependency in FastAPI route
    """
    async with async_session_maker() as session:
        try:
            yield session
            await session.commit()
        except Exception:
            await session.rollback()
            raise
        finally:
            await session.close()


# Lifespan manager for FastAPI
@asynccontextmanager
async def lifespan(app: "FastAPI") -> AsyncGenerator[None, None]:
    """
    Application lifespan manager
    Handles startup and shutdown events
    """
    # Startup
    yield
    # Shutdown
    await engine.dispose()
