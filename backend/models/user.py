"""
User Model for Pharmacie 360 Backend
SQLAlchemy model for users table with RBAC
"""

from datetime import datetime
from typing import TYPE_CHECKING, Optional

from sqlalchemy import Numeric,  Boolean, DateTime, String, func
from sqlalchemy.orm import Mapped, mapped_column, relationship

from .base import Base

if TYPE_CHECKING:
    from .sale import Sale
    from .return_ import Return


class User(Base):
    """
    User model representing system users with RBAC roles
    
    Roles:
    - admin: Full access (CRUD on everything)
    - seller: Sales, product search, send to cashier
    - cashier: Validate payments, manage queue
    - manager: Stock management, returns, reports
    """
    
    __tablename__ = "users"
    
    # Columns
    id: Mapped[int] = mapped_column(primary_key=True, autoincrement=True)
    username: Mapped[str] = mapped_column(String(50), unique=True, nullable=False, index=True)
    password_hash: Mapped[str] = mapped_column(String(255), nullable=False)
    email: Mapped[str] = mapped_column(String(100), unique=True, nullable=False, index=True)
    full_name: Mapped[Optional[str]] = mapped_column(String(100), nullable=True)
    role: Mapped[str] = mapped_column(
        String(20),
        nullable=False,
        index=True,
        server_default="seller"
    )
    is_active: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)
    last_login: Mapped[Optional[datetime]] = mapped_column(DateTime, nullable=True)
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
    sales: Mapped[list["Sale"]] = relationship(
        "Sale",
        back_populates="user",
        foreign_keys="Sale.user_id"
    )
    returns: Mapped[list["Return"]] = relationship(
        "Return",
        back_populates="user",
        foreign_keys="Return.user_id"
    )
    movements: Mapped[list["Movement"]] = relationship(
        "Movement",
        back_populates="user",
        foreign_keys="Movement.user_id"
    )
    
    # Constraints
    __table_args__ = (
        {
            "comment": "System users with RBAC roles"
        },
    )
    
    def __repr__(self) -> str:
        return f"<User(id={self.id}, username='{self.username}', role='{self.role}')>"
    
    @property
    def is_admin(self) -> bool:
        """Check if user is admin"""
        return self.role == "admin"
    
    @property
    def can_sell(self) -> bool:
        """Check if user can perform sales"""
        return self.role in ["admin", "seller"]
    
    @property
    def can_cashier(self) -> bool:
        """Check if user can perform cashier operations"""
        return self.role in ["admin", "cashier"]
    
    @property
    def can_manage(self) -> bool:
        """Check if user can perform management operations"""
        return self.role in ["admin", "manager"]
