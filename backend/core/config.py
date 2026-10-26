"""
Configuration Module for Pharmacie 360 Backend
Handles all application configuration through environment variables
"""

from functools import lru_cache
from typing import Optional

from pydantic_settings import BaseSettings, SettingsConfigDict
from pydantic import Field, SecretStr


class Settings(BaseSettings):
    """Application Settings"""
    
    # Application
    app_name: str = Field(default="Pharma-360", description="Application Name")
    app_version: str = Field(default="1.0.0", description="Application Version")
    app_env: str = Field(default="development", description="Application Environment")
    app_debug: bool = Field(default=True, description="Debug Mode")
    app_secret_key: SecretStr = Field(
        default="changer_par_une_cle_secrete",
        description="Application Secret Key"
    )
    
    # Database
    postgres_host: str = Field(default="localhost", description="PostgreSQL Host")
    postgres_port: int = Field(default=5432, description="PostgreSQL Port")
    postgres_db: str = Field(default="pharma360_dev", description="PostgreSQL Database")
    postgres_user: str = Field(default="pharma_user", description="PostgreSQL User")
    postgres_password: SecretStr = Field(
        default="pharma_pass_2025",
        description="PostgreSQL Password"
    )
    
    # JWT Authentication
    jwt_secret: SecretStr = Field(
        default="changer_par_une_cle_jwt_secrete",
        description="JWT Secret Key"
    )
    jwt_algorithm: str = Field(default="HS256", description="JWT Algorithm")
    jwt_expire_minutes: int = Field(default=30, description="JWT Expiration in Minutes")
    
    # Server
    backend_host: str = Field(default="0.0.0.0", description="Backend Host")
    backend_port: int = Field(default=8000, description="Backend Port")
    
    # CORS
    cors_origins: str = Field(
        default="*",
        description="CORS Allowed Origins (comma-separated)"
    )
    
    # Redis Cache (optional)
    redis_host: Optional[str] = Field(default=None, description="Redis Host")
    redis_port: Optional[int] = Field(default=None, description="Redis Port")
    redis_password: Optional[SecretStr] = Field(default=None, description="Redis Password")
    redis_url: str = Field(
        default="redis://localhost:6379/0",
        description="Redis Connection URL"
    )
    redis_db: int = Field(default=0, description="Redis Database Number")
    redis_cache_ttl: int = Field(default=3600, description="Default Cache TTL in seconds")
    cache_enabled: bool = Field(default=True, description="Enable Redis caching")
    cache_default_ttl: int = Field(default=3600, description="Default cache TTL in seconds")
    cache_products_ttl: int = Field(default=1800, description="Products cache TTL in seconds")
    cache_stock_ttl: int = Field(default=600, description="Stock cache TTL in seconds")
    cache_kpis_ttl: int = Field(default=300, description="KPIs cache TTL in seconds")
    
    # File Uploads
    upload_dir: str = Field(default="./uploads", description="Upload Directory")
    max_upload_size: int = Field(default=10485760, description="Max Upload Size (bytes)")
    
    # Logging
    log_level: str = Field(default="INFO", description="Logging Level")
    log_file: str = Field(default="./logs/app.log", description="Log File Path")
    
    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        case_sensitive=False,
        extra="ignore"
    )


@lru_cache()
def get_settings() -> Settings:
    """Get cached settings instance"""
    return Settings()


# Convenience access
settings = get_settings()
