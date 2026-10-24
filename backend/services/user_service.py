"""
User Service for Pharmacie 360 Backend
Handles user management operations
"""

from typing import Optional

from sqlalchemy import select, func
from sqlalchemy.ext.asyncio import AsyncSession

from ..models.user import User
from ..schemas.user import UserResponse, UserListResponse


class UserService:
    """Service for handling user operations"""
    
    @staticmethod
    async def get_user_by_id(
        user_id: int,
        db: AsyncSession
    ) -> Optional[User]:
        """Get user by ID"""
        result = await db.execute(
            select(User).where(User.id == user_id)
        )
        return result.scalar_one_or_none()
    
    @staticmethod
    async def get_user_by_username(
        username: str,
        db: AsyncSession
    ) -> Optional[User]:
        """Get user by username"""
        result = await db.execute(
            select(User).where(User.username == username)
        )
        return result.scalar_one_or_none()
    
    @staticmethod
    async def get_user_by_email(
        email: str,
        db: AsyncSession
    ) -> Optional[User]:
        """Get user by email"""
        result = await db.execute(
            select(User).where(User.email == email)
        )
        return result.scalar_one_or_none()
    
    @staticmethod
    async def list_users(
        page: int = 1,
        page_size: int = 20,
        search: Optional[str] = None,
        role: Optional[str] = None,
        is_active: Optional[bool] = None,
        db: AsyncSession = None
    ) -> UserListResponse:
        """List users with pagination"""
        offset = (page - 1) * page_size
        
        # Build query
        query = select(User)
        count_query = select(func.count()).select_from(User)
        
        # Apply filters
        if search:
            query = query.where(
                User.username.ilike(f"%{search}%") |
                User.email.ilike(f"%{search}%") |
                User.full_name.ilike(f"%{search}%")
            )
            count_query = count_query.where(
                User.username.ilike(f"%{search}%") |
                User.email.ilike(f"%{search}%") |
                User.full_name.ilike(f"%{search}%")
            )
        
        if role:
            query = query.where(User.role == role)
            count_query = count_query.where(User.role == role)
        
        if is_active is not None:
            query = query.where(User.is_active == is_active)
            count_query = count_query.where(User.is_active == is_active)
        
        # Execute count query
        total_result = await db.execute(count_query)
        total = total_result.scalar()
        
        # Execute main query
        query = query.offset(offset).limit(page_size).order_by(User.username)
        result = await db.execute(query)
        users = result.scalars().all()
        
        # Calculate pagination
        total_pages = (total + page_size - 1) // page_size
        
        return UserListResponse(
            users=[UserResponse.model_validate(user) for user in users],
            total=total,
            page=page,
            page_size=page_size,
            total_pages=total_pages
        )


# Singleton instance
user_service = UserService()
