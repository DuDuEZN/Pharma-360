"""
User Schemas for Pharmacie 360 Backend
Pydantic models for user-related API validation
"""

from datetime import datetime
from typing import Optional

from pydantic import BaseModel, ConfigDict, EmailStr, Field


# Base User Schema
class UserBase(BaseModel):
    """Base user schema with common fields"""
    username: str = Field(..., min_length=3, max_length=50, description="User username")
    email: EmailStr = Field(..., description="User email address")
    full_name: Optional[str] = Field(None, max_length=100, description="Full name")
    role: str = Field(default="seller", description="User role (admin, seller, cashier, manager)")
    is_active: bool = Field(default=True, description="Whether user is active")


# User Create Schema
class UserCreate(UserBase):
    """Schema for creating a new user"""
    password: str = Field(..., min_length=8, max_length=128, description="User password")


# User Update Schema
class UserUpdate(BaseModel):
    """Schema for updating a user"""
    username: Optional[str] = Field(None, min_length=3, max_length=50)
    email: Optional[EmailStr] = Field(None)
    full_name: Optional[str] = Field(None, max_length=100)
    role: Optional[str] = Field(None)
    is_active: Optional[bool] = Field(None)
    password: Optional[str] = Field(None, min_length=8, max_length=128)


# User Response Schema
class UserResponse(UserBase):
    """Schema for user response (includes computed fields)"""
    id: int = Field(..., description="User ID")
    created_at: datetime = Field(..., description="Creation timestamp")
    updated_at: datetime = Field(..., description="Last update timestamp")
    last_login: Optional[datetime] = Field(None, description="Last login timestamp")
    
    model_config = ConfigDict(from_attributes=True)


# User Detail Response Schema
class UserDetailResponse(UserResponse):
    """Schema for detailed user response"""
    is_admin: bool = Field(..., description="Whether user is admin")
    can_sell: bool = Field(..., description="Whether user can perform sales")
    can_cashier: bool = Field(..., description="Whether user can perform cashier operations")
    can_manage: bool = Field(..., description="Whether user can perform management operations")


# User List Response Schema
class UserListResponse(BaseModel):
    """Schema for listing users with pagination"""
    users: list[UserResponse] = Field(..., description="List of users")
    total: int = Field(..., description="Total number of users")
    page: int = Field(..., description="Current page")
    page_size: int = Field(..., description="Number of items per page")
    total_pages: int = Field(..., description="Total number of pages")


# Login Request Schema
class LoginRequest(BaseModel):
    """Schema for login request"""
    username: str = Field(..., description="Username or email")
    password: str = Field(..., description="Password")


# Login Response Schema
class LoginResponse(BaseModel):
    """Schema for login response"""
    access_token: str = Field(..., description="JWT access token")
    refresh_token: str = Field(..., description="JWT refresh token")
    token_type: str = Field(default="bearer", description="Token type")
    user: UserResponse = Field(..., description="User information")


# Token Refresh Response Schema
class TokenRefreshResponse(BaseModel):
    """Schema for token refresh response"""
    access_token: str = Field(..., description="New JWT access token")
    token_type: str = Field(default="bearer", description="Token type")


# Password Change Schema
class PasswordChange(BaseModel):
    """Schema for password change"""
    current_password: str = Field(..., description="Current password")
    new_password: str = Field(..., min_length=8, max_length=128, description="New password")
    confirm_password: str = Field(..., description="Confirm new password")
