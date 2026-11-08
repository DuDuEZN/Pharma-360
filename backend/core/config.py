"""
Configuration Module for Pharmacie 360 Backend.
Application settings are loaded from environment variables or .env.
"""

from functools import lru_cache
from typing import Optional

from pydantic import Field, SecretStr, model_validator
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    """Application settings with strict checks for production deployments."""

    app_name: str = Field(default="Pharma-360", description="Application Name")
    app_version: str = Field(default="1.0.0", description="Application Version")
    app_env: str = Field(default="development", description="Application Environment")
    app_debug: bool = Field(default=False, description="Debug Mode")
    app_secret_key: SecretStr = Field(
        default="changer_par_une_cle_secrete", description="Application Secret Key"
    )

    postgres_host: str = Field(default="localhost", description="PostgreSQL Host")
    postgres_port: int = Field(default=5432, description="PostgreSQL Port")
    postgres_db: str = Field(default="pharma360_dev", description="PostgreSQL Database")
    postgres_user: str = Field(default="pharma_user", description="PostgreSQL User")
    postgres_password: SecretStr = Field(
        default="pharma_pass_2025", description="PostgreSQL Password"
    )

    jwt_secret: SecretStr = Field(
        default="changer_par_une_cle_jwt_secrete", description="JWT Secret Key"
    )
    jwt_algorithm: str = Field(default="HS256", description="JWT Algorithm")
    jwt_expire_minutes: int = Field(default=30, description="JWT Expiration in Minutes")

    backend_host: str = Field(default="0.0.0.0", description="Backend Host")
    backend_port: int = Field(default=8000, description="Backend Port")
    cors_origins: str = Field(
        default="http://localhost:3000,http://localhost",
        description="Comma-separated CORS allowed origins",
    )

    redis_host: Optional[str] = Field(default=None, description="Redis Host")
    redis_port: Optional[int] = Field(default=None, description="Redis Port")
    redis_password: Optional[SecretStr] = Field(default=None, description="Redis Password")
    redis_url: str = Field(default="redis://localhost:6379/0", description="Redis URL")
    redis_db: int = Field(default=0, description="Redis Database Number")
    redis_cache_ttl: int = Field(default=3600, description="Default cache TTL in seconds")
    cache_enabled: bool = Field(default=True, description="Enable Redis caching")
    cache_default_ttl: int = Field(default=3600, description="Default cache TTL in seconds")
    cache_products_ttl: int = Field(default=1800, description="Products cache TTL in seconds")
    cache_stock_ttl: int = Field(default=600, description="Stock cache TTL in seconds")
    cache_kpis_ttl: int = Field(default=300, description="KPIs cache TTL in seconds")

    upload_dir: str = Field(default="./uploads", description="Upload Directory")
    max_upload_size: int = Field(default=10485760, description="Max Upload Size (bytes)")
    log_level: str = Field(default="INFO", description="Logging Level")
    log_file: str = Field(default="./logs/app.log", description="Log File Path")

    @model_validator(mode="after")
    def validate_production_configuration(self):
        """Refuse known development credentials, debug mode, and wildcard CORS in production."""
        if self.app_env.lower() != "production":
            return self

        if self.app_debug:
            raise ValueError("APP_DEBUG must be false in production")

        app_secret = self.app_secret_key.get_secret_value()
        jwt_secret = self.jwt_secret.get_secret_value()
        db_password = self.postgres_password.get_secret_value()
        if len(app_secret) < 32 or app_secret == "changer_par_une_cle_secrete":
            raise ValueError("APP_SECRET_KEY must be a unique secret of at least 32 characters")
        if len(jwt_secret) < 32 or jwt_secret == "changer_par_une_cle_jwt_secrete":
            raise ValueError("JWT_SECRET must be a unique secret of at least 32 characters")
        if len(db_password) < 16 or db_password == "pharma_pass_2025":
            raise ValueError("POSTGRES_PASSWORD must be a unique production password")

        origins = [origin.strip() for origin in self.cors_origins.split(",") if origin.strip()]
        if not origins or "*" in origins:
            raise ValueError("CORS_ORIGINS must list explicit origins in production")
        return self

    model_config = SettingsConfigDict(
        env_file=".env", env_file_encoding="utf-8", case_sensitive=False, extra="ignore"
    )


@lru_cache()
def get_settings() -> Settings:
    return Settings()


settings = get_settings()
