"""
Health Check Endpoint for API v1
"""

from fastapi import APIRouter
from fastapi.responses import JSONResponse

from ...core.config import settings
from ...core.logging import get_logger

router = APIRouter(prefix="/health", tags=["health"])

logger = get_logger(__name__)


@router.get("/", summary="Health check for v1 API")
async def health_check_v1():
    """Health check endpoint for API v1"""
    logger.info("API v1 Health check requested")
    return JSONResponse(
        content={
            "status": "healthy",
            "app": settings.app_name,
            "version": settings.app_version,
            "environment": settings.app_env,
            "api_version": "v1",
        }
    )
