"""
IA Module Configuration
"""

from pydantic_settings import BaseSettings
from typing import Optional


class IASettings(BaseSettings):
    """IA Module Configuration Settings"""
    
    # IA Service Configuration
    ia_host: str = "0.0.0.0"
    ia_port: int = 8001
    
    # Database Configuration
    postgres_host: str = "pharma360-db"
    postgres_port: int = 5432
    postgres_db: str = "pharma360_dev"
    postgres_user: str = "pharma_user"
    postgres_password: str = "pharma_pass_2025"
    
    # Tesseract OCR Configuration
    tessdata_prefix: str = "/usr/share/tesseract-ocr/4.00/tessdata"
    
    # Upload directories
    upload_dir: str = "./uploads"
    
    # Application settings
    app_name: str = "Pharma-360 IA"
    app_version: str = "1.0.0"
    app_env: str = "development"
    app_debug: bool = True
    
    class Config:
        env_file = ".env.ia"
        env_file_encoding = 'utf-8'
        extra = "ignore"


# Create settings instance
settings = IASettings()
