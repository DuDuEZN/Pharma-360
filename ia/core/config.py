"""
IA Module Configuration
"""

from pydantic import model_validator
from pydantic_settings import BaseSettings


class IASettings(BaseSettings):
    """IA service settings with production safety checks."""

    ia_host: str = "0.0.0.0"
    ia_port: int = 8001
    postgres_host: str = "pharma360-db"
    postgres_port: int = 5432
    postgres_db: str = "pharma360_dev"
    postgres_user: str = "pharma_user"
    postgres_password: str = "pharma_pass_2025"
    tessdata_prefix: str = "/usr/share/tesseract-ocr/4.00/tessdata"
    upload_dir: str = "./uploads"
    app_name: str = "Pharma-360 IA"
    app_version: str = "1.0.0"
    app_env: str = "development"
    app_debug: bool = False
    cors_origins: str = "http://localhost:3000,http://localhost"

    @model_validator(mode="after")
    def validate_production_configuration(self):
        """Reject unsafe debug, password, and CORS settings in production."""
        if self.app_env.lower() == "production":
            if self.app_debug:
                raise ValueError("APP_DEBUG must be false in production")
            if len(self.postgres_password) < 16 or self.postgres_password == "pharma_pass_2025":
                raise ValueError("POSTGRES_PASSWORD must be a unique production password")
            origins = [origin.strip() for origin in self.cors_origins.split(",") if origin.strip()]
            if not origins or "*" in origins:
                raise ValueError("CORS_ORIGINS must list explicit origins in production")
        return self

    class Config:
        env_file = ".env.ia"
        env_file_encoding = "utf-8"
        extra = "ignore"


settings = IASettings()
