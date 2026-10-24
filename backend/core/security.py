"""
Security Module for Pharmacie 360 Backend
Handles authentication, JWT tokens, and password hashing
"""

import hashlib
import secrets
from datetime import datetime, timedelta, timezone
from typing import Optional, Annotated

from fastapi import Depends, HTTPException, status, Request
from fastapi.security import OAuth2PasswordBearer
from jose import JWTError, jwt
from passlib.context import CryptContext

from .config import settings


# Password hashing context
pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

# OAuth2 scheme for token authentication
oauth2_scheme = OAuth2PasswordBearer(tokenUrl="api/auth/login")


# Token types
class TokenType:
    ACCESS = "access_token"
    REFRESH = "refresh_token"


# Password utilities
class PasswordUtils:
    """Password hashing and verification utilities"""
    
    @staticmethod
    def hash_password(password: str) -> str:
        """Hash a password using bcrypt"""
        return pwd_context.hash(password)
    
    @staticmethod
    def verify_password(plain_password: str, hashed_password: str) -> bool:
        """Verify a password against its hash"""
        return pwd_context.verify(plain_password, hashed_password)
    
    @staticmethod
    def generate_temp_password(length: int = 12) -> str:
        """Generate a temporary password"""
        return secrets.token_urlsafe(length)


# JWT utilities
class JWTUtils:
    """JWT token utilities"""
    
    @staticmethod
    def create_token(
        subject: str,
        data: Optional[dict] = None,
        token_type: str = TokenType.ACCESS,
        expires_delta: Optional[timedelta] = None
    ) -> str:
        """Create a JWT token"""
        if data is None:
            data = {}
        
        to_encode = data.copy()
        
        # Set expiration
        if expires_delta:
            expire = datetime.now(timezone.utc) + expires_delta
        else:
            if token_type == TokenType.ACCESS:
                expire = datetime.now(timezone.utc) + timedelta(
                    minutes=settings.jwt_expire_minutes
                )
            else:
                expire = datetime.now(timezone.utc) + timedelta(days=7)
        
        to_encode.update({
            "exp": expire,
            "iat": datetime.now(timezone.utc),
            "sub": str(subject),
            "type": token_type
        })
        
        encoded_jwt = jwt.encode(
            to_encode,
            settings.jwt_secret.get_secret_value(),
            algorithm=settings.jwt_algorithm
        )
        
        return encoded_jwt
    
    @staticmethod
    def decode_token(token: str) -> dict:
        """Decode and verify a JWT token"""
        try:
            payload = jwt.decode(
                token,
                settings.jwt_secret.get_secret_value(),
                algorithms=[settings.jwt_algorithm]
            )
            return payload
        except JWTError as e:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail=f"Invalid token: {str(e)}",
                headers={"WWW-Authenticate": "Bearer"},
            )
    
    @staticmethod
    def verify_token_type(token: str, expected_type: str) -> bool:
        """Verify token type"""
        payload = JWTUtils.decode_token(token)
        return payload.get("type") == expected_type


# RBAC utilities
class RBACUtils:
    """Role-Based Access Control utilities"""
    
    # Role hierarchy
    ROLE_HIERARCHY = {
        "admin": 4,
        "manager": 3,
        "seller": 2,
        "cashier": 1,
    }
    
    @staticmethod
    def has_permission(user_role: str, required_role: Optional[str] = None) -> bool:
        """Check if user has required permission"""
        if required_role is None:
            return True
        
        user_level = RBACUtils.ROLE_HIERARCHY.get(user_role, 0)
        required_level = RBACUtils.ROLE_HIERARCHY.get(required_role, 0)
        
        return user_level >= required_level
    
    @staticmethod
    def can_access_resource(user_role: str, resource_permissions: dict) -> bool:
        """Check if user can access a resource based on permissions"""
        if user_role == "admin":
            return True
        
        permissions = resource_permissions.get(user_role, [])
        return len(permissions) > 0


# Dependency for getting current user
async def get_current_user(
    token: Annotated[str, Depends(oauth2_scheme)]
) -> dict:
    """
    Dependency that provides the current authenticated user
    """
    try:
        payload = JWTUtils.decode_token(token)
        
        # In production, you would fetch user from database
        # For now, we return the payload which should contain user info
        return payload
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail=f"Could not validate credentials: {str(e)}",
            headers={"WWW-Authenticate": "Bearer"},
        )


# Dependency for role-based access
def get_current_user_with_role(
    required_role: Optional[str] = None
):
    """
    Factory for creating role-based access dependencies
    """
    async def dependency(
        current_user: Annotated[dict, Depends(get_current_user)]
    ) -> dict:
        user_role = current_user.get("role")
        
        if required_role and not RBACUtils.has_permission(user_role, required_role):
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Insufficient permissions"
            )
        
        return current_user
    
    return dependency


# Request ID generator
class RequestID:
    """Generate unique request IDs"""
    
    @staticmethod
    def generate() -> str:
        """Generate a unique request ID"""
        return hashlib.sha256(secrets.token_bytes(16)).hexdigest()[:12]


# Security headers middleware
async def add_security_headers(request: Request, call_next):
    """Add security headers to all responses"""
    response = await call_next(request)
    
    response.headers["X-Content-Type-Options"] = "nosniff"
    response.headers["X-Frame-Options"] = "DENY"
    response.headers["X-XSS-Protection"] = "1; mode=block"
    response.headers["Strict-Transport-Security"] = "max-age=63072000; includeSubDomains; preload"
    response.headers["Content-Security-Policy"] = "default-src 'self'"
    
    return response
