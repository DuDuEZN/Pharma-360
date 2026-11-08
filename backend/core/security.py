"""
Security Module for Pharmacie 360 Backend
Handles authentication, JWT tokens, and password hashing
"""

import hashlib
import secrets
from datetime import datetime, timedelta, timezone
from typing import Annotated, Any, Dict, List, Optional, Union

from fastapi import Depends, HTTPException, Request, status
from fastapi.security import OAuth2PasswordBearer
from jose import JWTError, jwt
from passlib.context import CryptContext
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from .config import settings
from .database import get_db

pwd_context = CryptContext(schemes=["sha256_crypt"], deprecated="auto")
oauth2_scheme = OAuth2PasswordBearer(tokenUrl="api/v1/auth/login")


class TokenType:
    ACCESS = "access_token"
    REFRESH = "refresh_token"


class PasswordUtils:
    """Password hashing and verification utilities."""

    @staticmethod
    def hash_password(password: str) -> str:
        return pwd_context.hash(password)

    @staticmethod
    def verify_password(plain_password: str, hashed_password: str) -> bool:
        return pwd_context.verify(plain_password, hashed_password)

    @staticmethod
    def generate_temp_password(length: int = 12) -> str:
        return secrets.token_urlsafe(length)


class JWTUtils:
    """JWT token utilities."""

    @staticmethod
    def create_token(
        subject: str,
        data: Optional[dict] = None,
        token_type: str = TokenType.ACCESS,
        expires_delta: Optional[timedelta] = None,
    ) -> str:
        to_encode = (data or {}).copy()
        if expires_delta:
            expire = datetime.now(timezone.utc) + expires_delta
        elif token_type == TokenType.ACCESS:
            expire = datetime.now(timezone.utc) + timedelta(
                minutes=settings.jwt_expire_minutes
            )
        else:
            expire = datetime.now(timezone.utc) + timedelta(days=7)

        to_encode.update(
            {
                "exp": expire,
                "iat": datetime.now(timezone.utc),
                "sub": str(subject),
                "type": token_type,
            }
        )
        return jwt.encode(
            to_encode,
            settings.jwt_secret.get_secret_value(),
            algorithm=settings.jwt_algorithm,
        )

    @staticmethod
    def decode_token(token: str) -> dict:
        try:
            return jwt.decode(
                token,
                settings.jwt_secret.get_secret_value(),
                algorithms=[settings.jwt_algorithm],
            )
        except JWTError as exc:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Invalid token",
                headers={"WWW-Authenticate": "Bearer"},
            ) from exc

    @staticmethod
    def verify_token_type(token: str, expected_type: str) -> bool:
        return JWTUtils.decode_token(token).get("type") == expected_type


class RBACUtils:
    """Role-Based Access Control utilities."""

    ROLE_HIERARCHY = {"admin": 4, "manager": 3, "seller": 2, "cashier": 1}

    @staticmethod
    def has_permission(
        user_role: str, required_role: Optional[Union[str, List[str]]] = None
    ) -> bool:
        if required_role is None:
            return True
        if isinstance(required_role, list):
            return any(
                RBACUtils.ROLE_HIERARCHY.get(user_role, 0)
                >= RBACUtils.ROLE_HIERARCHY.get(role, 0)
                for role in required_role
            )
        return RBACUtils.ROLE_HIERARCHY.get(
            user_role, 0
        ) >= RBACUtils.ROLE_HIERARCHY.get(required_role, 0)

    @staticmethod
    def can_access_resource(
        user_role: str, resource_permissions: Dict[str, Any]
    ) -> bool:
        if user_role == "admin":
            return True
        return bool(resource_permissions.get(user_role, []))


async def get_current_user(
    token: Annotated[str, Depends(oauth2_scheme)],
    db: Annotated[AsyncSession, Depends(get_db)],
):
    """Return the active user only for a valid access token."""
    from ..models.user import User

    credentials_error = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Could not validate credentials",
        headers={"WWW-Authenticate": "Bearer"},
    )

    try:
        payload = JWTUtils.decode_token(token)
        if payload.get("type") != TokenType.ACCESS:
            raise credentials_error
        subject = payload.get("sub")
        if subject is None:
            raise credentials_error
        user_id = int(subject)
    except HTTPException:
        raise
    except (TypeError, ValueError):
        raise credentials_error

    result = await db.execute(select(User).where(User.id == user_id))
    user = result.scalars().first()
    if user is None:
        raise credentials_error
    if not user.is_active:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="User account is disabled",
        )
    return user


def get_current_user_with_role(required_role: Optional[str] = None):
    """Create a role-based access dependency."""

    async def dependency(current_user=Depends(get_current_user)):
        user_role = current_user.role or "seller"
        if required_role and not RBACUtils.has_permission(user_role, required_role):
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Insufficient permissions",
            )
        return current_user

    return dependency


class RequestID:
    @staticmethod
    def generate() -> str:
        return hashlib.sha256(secrets.token_bytes(16)).hexdigest()[:12]


async def add_security_headers(request: Request, call_next):
    response = await call_next(request)
    response.headers["X-Content-Type-Options"] = "nosniff"
    response.headers["X-Frame-Options"] = "DENY"
    response.headers["X-XSS-Protection"] = "1; mode=block"
    response.headers["Strict-Transport-Security"] = (
        "max-age=63072000; includeSubDomains; preload"
    )
    response.headers["Content-Security-Policy"] = "default-src 'self'"
    return response
