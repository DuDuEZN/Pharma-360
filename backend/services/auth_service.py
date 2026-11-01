"""
Auth Service for Pharmacie 360 Backend
Handles authentication, token management, and user registration
"""

from datetime import datetime, timedelta, timezone
from typing import Optional

from fastapi import Depends, HTTPException, status
from sqlalchemy import or_, select, text
from sqlalchemy.ext.asyncio import AsyncSession

from ..core.config import settings
from ..core.security import JWTUtils, PasswordUtils, oauth2_scheme
from ..models.user import User
from ..schemas.user import (
    LoginRequest,
    LoginResponse,
    TokenRefreshResponse,
    UserCreate,
    UserResponse,
)


class AuthService:
    """Service for handling authentication operations"""

    @staticmethod
    async def create_user(user_data: UserCreate, db: AsyncSession) -> UserResponse:
        """Create a new user"""
        # Check if username already exists
        result = await db.execute(
            text("SELECT 1 FROM users WHERE username = :username"),
            {"username": user_data.username},
        )
        if result.scalar():
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Username already exists",
            )

        # Check if email already exists
        result = await db.execute(
            text("SELECT 1 FROM users WHERE email = :email"), {"email": user_data.email}
        )
        if result.scalar():
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST, detail="Email already exists"
            )

        # Hash password
        hashed_password = PasswordUtils.hash_password(user_data.password)

        # Create user
        new_user = User(
            username=user_data.username,
            email=user_data.email,
            password_hash=hashed_password,
            full_name=user_data.full_name,
            role=user_data.role,
            is_active=user_data.is_active,
        )

        db.add(new_user)
        await db.flush()
        await db.refresh(new_user)

        return UserResponse.model_validate(new_user)

    @staticmethod
    async def authenticate_user(login_data: LoginRequest, db: AsyncSession) -> User:
        """Authenticate a user"""
        # Find user by username or email
        # Requête ORM : renvoie une instance User (un SELECT * en SQL brut combiné à
        # scalar_one_or_none() ne renvoyait que la 1re colonne, donc un int).
        result = await db.execute(
            select(User).where(
                or_(
                    User.username == login_data.username,
                    User.email == login_data.username,
                )
            )
        )
        user = result.scalars().first()

        if not user:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Incorrect username or password",
                headers={"WWW-Authenticate": "Bearer"},
            )

        # Verify password
        if not PasswordUtils.verify_password(login_data.password, user.password_hash):
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Incorrect username or password",
                headers={"WWW-Authenticate": "Bearer"},
            )

        # Check if user is active
        if not user.is_active:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="User account is disabled",
            )

        return user

    @staticmethod
    async def login(login_data: LoginRequest, db: AsyncSession) -> LoginResponse:
        """Login and return tokens"""
        user = await AuthService.authenticate_user(login_data, db)

        # Create tokens
        access_token = JWTUtils.create_token(
            subject=str(user.id),
            data={"username": user.username, "email": user.email, "role": user.role},
            token_type="access_token",
        )

        refresh_token = JWTUtils.create_token(
            subject=str(user.id),
            data={"username": user.username},
            token_type="refresh_token",
            expires_delta=timedelta(days=7),
        )

        # Update last login
        # La colonne users.last_login est TIMESTAMP WITHOUT TIME ZONE : asyncpg refuse un
        # datetime avec fuseau, on stocke donc l'heure UTC "naive".
        user.last_login = datetime.now(timezone.utc).replace(tzinfo=None)
        await db.flush()
        # updated_at est recalculé côté serveur (onupdate=func.now()) : on recharge l'objet
        # pour éviter un lazy-load interdit en async (MissingGreenlet) dans model_validate.
        await db.refresh(user)

        return LoginResponse(
            access_token=access_token,
            refresh_token=refresh_token,
            token_type="bearer",
            user=UserResponse.model_validate(user),
        )

    @staticmethod
    async def refresh_token(refresh_token: str) -> TokenRefreshResponse:
        """Refresh access token"""
        try:
            payload = JWTUtils.decode_token(refresh_token)

            # Verify it's a refresh token
            if payload.get("type") != "refresh_token":
                raise HTTPException(
                    status_code=status.HTTP_401_UNAUTHORIZED,
                    detail="Invalid token type",
                    headers={"WWW-Authenticate": "Bearer"},
                )

            # Create new access token
            user_id = payload.get("sub")
            username = payload.get("username")

            access_token = JWTUtils.create_token(
                subject=user_id, data={"username": username}, token_type="access_token"
            )

            return TokenRefreshResponse(access_token=access_token, token_type="bearer")

        except HTTPException:
            raise
        except Exception as e:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail=f"Invalid refresh token: {str(e)}",
                headers={"WWW-Authenticate": "Bearer"},
            )

    @staticmethod
    async def get_current_user(
        token: str = Depends(oauth2_scheme), db: AsyncSession = Depends()
    ) -> User:
        """Get current user from token"""
        try:
            payload = JWTUtils.decode_token(token)
            user_id = payload.get("sub")

            if not user_id:
                raise HTTPException(
                    status_code=status.HTTP_401_UNAUTHORIZED,
                    detail="Invalid token",
                    headers={"WWW-Authenticate": "Bearer"},
                )

            # Fetch user from database
            result = await db.execute(select(User).where(User.id == int(user_id)))
            user = result.scalars().first()

            if not user:
                raise HTTPException(
                    status_code=status.HTTP_401_UNAUTHORIZED,
                    detail="User not found",
                    headers={"WWW-Authenticate": "Bearer"},
                )

            return user

        except HTTPException:
            raise
        except Exception as e:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail=f"Could not validate credentials: {str(e)}",
                headers={"WWW-Authenticate": "Bearer"},
            )


# Singleton instance
auth_service = AuthService()
