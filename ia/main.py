"""
Main Application Module for Pharmacie 360 IA Service
FastAPI application entry point for IA module (OCR, Analytics, Alerts, KPIs)
"""

from contextlib import asynccontextmanager
from typing import AsyncGenerator
import logging
import os
from pathlib import Path

from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from fastapi.staticfiles import StaticFiles

from .core.config import settings
from .core import logging as ia_logging

# Initialize centralized logging system
logging_service = ia_logging.setup_logging({
    "logs_dir": "./logs",
    "console_level": logging.INFO,
    "file_level": logging.DEBUG
})
logger = ia_logging.get_logger("ia.main")


# Create FastAPI application
app = FastAPI(
    title=settings.app_name,
    version=settings.app_version,
    description="Pharmacie 360 - IA Module (OCR, Analytics, Alerts, KPIs)",
    docs_url="/docs",
    redoc_url="/redoc",
    openapi_url="/openapi.json"
)


# Lifecycle events
@asynccontextmanager
async def lifespan(app: FastAPI) -> AsyncGenerator[None, None]:
    """Application lifespan manager"""
    # Startup
    logger.info("IA Service starting up")
    
    # Create necessary directories
    Path("uploads").mkdir(exist_ok=True)
    Path("logs").mkdir(exist_ok=True)
    Path("models").mkdir(exist_ok=True)
    
    yield
    
    # Shutdown
    logger.info("IA Service shutting down")


app.router.lifespan_context = lifespan


# Add middleware
app.middleware("http")(ia_logging.add_security_headers)

# CORS configuration
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# Mount static files
from pathlib import Path
Path("static").mkdir(exist_ok=True)
Path("uploads").mkdir(exist_ok=True)
app.mount("/static", StaticFiles(directory="static"), name="static")
app.mount("/uploads", StaticFiles(directory="uploads"), name="uploads")


# Health check endpoint
@app.get("/api/health", tags=["health"])
async def health_check():
    """Health check endpoint for IA service"""
    logger.info("IA Health check requested")
    return JSONResponse(
        content={
            "status": "healthy",
            "app": settings.app_name,
            "version": settings.app_version,
            "environment": settings.app_env,
            "service": "IA",
            "capabilities": [
                "OCR",
                "Analytics",
                "Alerts",
                "KPIs",
                "Stock Prediction"
            ]
        }
    )


# Root endpoint
@app.get("/", tags=["root"])
async def root():
    """Root endpoint"""
    return JSONResponse(
        content={
            "message": f"Welcome to {settings.app_name} - IA Module",
            "version": settings.app_version,
            "docs": "/docs",
            "health": "/api/health",
            "endpoints": {
                "OCR": "/api/v1/ocr",
                "KPIs": "/api/v1/kpis",
                "Dashboard": "/api/v1/dashboard",
                "Alerts": "/api/v1/alerts"
            }
        }
    )


# Import and include API routers
from .api.v1 import routers as v1_routers

# Include v1 REST API routers
for router in v1_routers:
    app.include_router(router, prefix="/api/v1")


# Add logging middleware
@app.middleware("http")
async def logging_middleware(request: Request, call_next):
    """Middleware for logging all HTTP requests"""
    import time
    start_time = time.time()
    
    response = await call_next(request)
    
    process_time = (time.time() - start_time) * 1000
    logger = ia_logging.get_logger("ia.http")
    
    # Log API requests
    if request.url.path.startswith("/api"):
        ia_logging.log_api_request(
            method=request.method,
            path=str(request.url),
            status_code=response.status_code,
            duration_ms=process_time,
            client=request.client.host if request.client else None
        )
    
    return response


# Error handlers
@app.exception_handler(Exception)
async def global_exception_handler(request: Request, exc: Exception):
    """Global exception handler"""
    if settings.app_debug:
        return JSONResponse(
            status_code=500,
            content={
                "detail": str(exc),
                "type": type(exc).__name__,
            },
        )
    else:
        return JSONResponse(
            status_code=500,
            content={"detail": "Internal server error"},
        )


# Run the application
if __name__ == "__main__":
    import uvicorn
    
    uvicorn.run(
        "main:app",
        host=settings.ia_host,
        port=settings.ia_port,
        reload=settings.app_debug,
        log_level="info",
    )
