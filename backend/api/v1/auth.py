"""
Auth API Endpoints for Pharmacie 360 Backend
FastAPI endpoints for authentication (login, logout, token refresh, user registration)
"""

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession

from ...core.database import get_db
from ...core.security import get_current_user, RBACUtils
from ...models.user import User
from ...schemas.user import (
    LoginRequest,
    LoginResponse,
    TokenRefreshResponse,
    UserCreate,
    UserResponse,
)
from ...services.auth_service import AuthService


# Create router
router = APIRouter(prefix="/auth", tags=["authentication"])


auth_service = AuthService()


@router.post(
    "/login",
    response_model=LoginResponse,
    summary="Login to the system",
    description="Authenticate with username/email and password to get JWT tokens"
)
async def login(
    login_data: LoginRequest,
    db: AsyncSession = Depends(get_db)
) -> LoginResponse:
    """Login endpoint"""
    return await auth_service.login(login_data, db)


@router.post(
    "/refresh",
    response_model=TokenRefreshResponse,
    summary="Refresh access token",
    description="Get a new access token using a valid refresh token"
)
async def refresh_token(
    refresh_token: str
) -> TokenRefreshResponse:
    """Refresh token endpoint"""
    return await auth_service.refresh_token(refresh_token)


@router.post(
    "/register",
    response_model=UserResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Register a new user",
    description="Create a new user account (admin only)"
)
async def register_user(
    user_data: UserCreate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
) -> UserResponse:
    """Register new user endpoint"""
    # Check if current user is admin
    if not RBACUtils.has_permission(current_user.role, "admin"):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only admin users can create new users"
        )
    
    return await auth_service.create_user(user_data, db)


@router.get(
    "/me",
    response_model=UserResponse,
    summary="Get current user",
    description="Get information about the currently authenticated user"
)
async def get_current_user_endpoint(
    current_user: User = Depends(get_current_user)
) -> UserResponse:
    """Get current user endpoint"""
    return UserResponse.model_validate(current_user)
