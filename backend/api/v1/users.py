"""
Users API Endpoints for Pharmacie 360 Backend
FastAPI endpoints for user management (CRUD operations)
"""

from typing import Annotated, Optional

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy import select, func
from sqlalchemy.ext.asyncio import AsyncSession

from ...core.database import get_db
from ...core.security import get_current_user, get_current_user_with_role, RBACUtils
from ...core.logging import get_logger
from ...models.user import User
from ...schemas.user import (
    UserCreate,
    UserListResponse,
    UserResponse,
    UserUpdate,
    PasswordChange,
)
from ...services.auth_service import AuthService


# Create router
router = APIRouter(prefix="/users", tags=["users"])

logger = get_logger(__name__)


@router.get(
    "/",
    response_model=UserListResponse,
    summary="List all users",
    description="Get a paginated list of all users (admin only)"
)
async def list_users(
    page: Annotated[int, Query(ge=1)] = 1,
    page_size: Annotated[int, Query(ge=1, le=100)] = 20,
    search: Annotated[Optional[str], Query()] = None,
    role: Annotated[Optional[str], Query()] = None,
    is_active: Annotated[Optional[bool], Query()] = None,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user_with_role("admin"))
) -> UserListResponse:
    """List users endpoint"""
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


@router.get(
    "/{user_id}",
    response_model=UserResponse,
    summary="Get a specific user",
    description="Get user details by ID"
)
async def get_user(
    user_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
) -> UserResponse:
    """Get user endpoint"""
    # Check if user is admin or requesting their own info
    if not RBACUtils.has_permission(current_user.role, "admin") and current_user.id != user_id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You can only view your own profile or have admin privileges"
        )
    
    result = await db.execute(
        select(User).where(User.id == user_id)
    )
    user = result.scalar_one_or_none()
    
    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User not found"
        )
    
    return UserResponse.model_validate(user)


@router.post(
    "/",
    response_model=UserResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Create a new user",
    description="Create a new user (admin only)"
)
async def create_user(
    user_data: UserCreate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user_with_role("admin"))
) -> UserResponse:
    """Create user endpoint"""
    auth_service = AuthService()
    return await auth_service.create_user(user_data, db)


@router.put(
    "/{user_id}",
    response_model=UserResponse,
    summary="Update a user",
    description="Update user information (admin or self)"
)
async def update_user(
    user_id: int,
    user_data: UserUpdate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
) -> UserResponse:
    """Update user endpoint"""
    # Check if user is admin or updating their own info
    if not RBACUtils.has_permission(current_user.role, "admin") and current_user.id != user_id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You can only update your own profile or have admin privileges"
        )
    
    result = await db.execute(
        select(User).where(User.id == user_id)
    )
    user = result.scalar_one_or_none()
    
    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User not found"
        )
    
    # Update fields
    if user_data.username:
        user.username = user_data.username
    if user_data.email:
        user.email = user_data.email
    if user_data.full_name:
        user.full_name = user_data.full_name
    if user_data.role:
        user.role = user_data.role
    if user_data.is_active is not None:
        user.is_active = user_data.is_active
    if user_data.password:
        user.password_hash = AuthService.hash_password(user_data.password)
    
    await db.flush()
    await db.refresh(user)
    
    return UserResponse.model_validate(user)


@router.delete(
    "/{user_id}",
    status_code=status.HTTP_204_NO_CONTENT,
    summary="Delete a user",
    description="Delete a user (admin only)"
)
async def delete_user(
    user_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user_with_role("admin"))
) -> None:
    """Delete user endpoint"""
    # Prevent self-deletion
    if current_user.id == user_id:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Cannot delete your own account"
        )
    
    result = await db.execute(
        select(User).where(User.id == user_id)
    )
    user = result.scalar_one_or_none()
    
    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User not found"
        )
    
    await db.delete(user)
    await db.commit()


@router.post(
    "/{user_id}/change-password",
    status_code=status.HTTP_204_NO_CONTENT,
    summary="Change user password",
    description="Change user password (admin or self)"
)
async def change_password(
    user_id: int,
    password_data: PasswordChange,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
) -> None:
    """Change password endpoint"""
    # Check if user is admin or changing their own password
    if not RBACUtils.has_permission(current_user.role, "admin") and current_user.id != user_id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You can only change your own password or have admin privileges"
        )
    
    result = await db.execute(
        select(User).where(User.id == user_id)
    )
    user = result.scalar_one_or_none()
    
    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User not found"
        )
    
    # Verify current password
    if not AuthService.verify_password(password_data.current_password, user.password_hash):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Current password is incorrect"
        )
    
    # Verify new passwords match
    if password_data.new_password != password_data.confirm_password:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="New passwords do not match"
        )
    
    # Update password
    user.password_hash = AuthService.hash_password(password_data.new_password)
    await db.flush()
    await db.commit()
