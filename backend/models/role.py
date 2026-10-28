"""
Role Model for Pharmacie 360 Backend
SQLAlchemy model for roles table (RBAC)
"""

from datetime import datetime
from typing import TYPE_CHECKING, Optional

from sqlalchemy import String, DateTime, func, Text
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
    name: Mapped[str] = mapped_column(String(50), unique=True, nullable=False, index=True)
    description: Mapped[str] = mapped_column(Text, nullable=True)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        server_default=func.now(),
        nullable=False
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        server_default=func.now(),
        onupdate=func.now(),
        nullable=False
    )
    
    # Relationships
    users: Mapped[list["User"]] = relationship(
        "User",
        back_populates="role_obj",
        foreign_keys="User.role_id"
    )
    
    # Constraints
    __table_args__ = (
        {
            "comment": "RBAC roles for system users"
        },
    )
