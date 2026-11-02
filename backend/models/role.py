"""
Role Model for Pharmacie 360 Backend
SQLAlchemy model for roles table (RBAC)
"""

from datetime import datetime
from typing import TYPE_CHECKING, Optional

from sqlalchemy import DateTime, String, Text, func
from sqlalchemy.orm import Mapped, mapped_column, relationship

from .base import Base

if TYPE_CHECKING:
    from .user import User


class Role(Base):
    """
    Role model representing RBAC roles

    Default Roles:
    - admin: Full access (CRUD on everything)
    - seller: Sales, product search, send to cashier
    - cashier: Validate payments, manage queue
    - manager: Stock management, returns, reports
    """

    __tablename__ = "roles"

    # Columns
    id: Mapped[int] = mapped_column(primary_key=True, autoincrement=True)
    name: Mapped[str] = mapped_column(
        String(50), unique=True, nullable=False, index=True
    )
    description: Mapped[str] = mapped_column(Text, nullable=True)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), nullable=False
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        server_default=func.now(),
        onupdate=func.now(),
        nullable=False,
    )

    # NOTE: pas de relation vers User. Dans le schéma actuel (init-db.sql), le rôle est
    # stocké dans la colonne texte users.role : il n'existe ni table "roles" ni colonne
    # users.role_id. L'ancienne relation (foreign_keys="User.role_id") faisait échouer la
    # configuration des mappers SQLAlchemy dès la première requête ORM.

    # Constraints
    __table_args__ = ({"comment": "RBAC roles for system users"},)
