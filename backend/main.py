"""
Main Application Module for Pharmacie 360 Backend
FastAPI application entry point
"""

from contextlib import asynccontextmanager
from typing import AsyncGenerator

from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from fastapi.staticfiles import StaticFiles

from .core.config import settings
from .core.database import lifespan
from .core.security import add_security_headers, oauth2_scheme


# Create FastAPI application
app = FastAPI(
    title=settings.app_name,
    version=settings.app_version,
    description="Pharmacie 360 - Plateforme de Gestion de Pharmacie",
    docs_url="/docs",
    redoc_url="/redoc",
    openapi_url="/openapi.json",
    lifespan=lifespan,
)


# Add middleware
app.middleware("http")(add_security_headers)

# CORS configuration
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # In production, use settings.cors_origins.split(",")
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# Mount static files
import os
from pathlib import Path

# Create directories if they don't exist
Path("static").mkdir(exist_ok=True)
Path("uploads").mkdir(exist_ok=True)

app.mount("/static", StaticFiles(directory="static"), name="static")
app.mount("/uploads", StaticFiles(directory="uploads"), name="uploads")


# Health check endpoint
@app.get("/api/health", tags=["health"])
async def health_check():
    """Health check endpoint"""
    return JSONResponse(
        content={
            "status": "healthy",
            "app": settings.app_name,
            "version": settings.app_version,
            "environment": settings.app_env,
        }
    )


# Root endpoint
@app.get("/", tags=["root"])
async def root():
    """Root endpoint"""
    return JSONResponse(
        content={
            "message": f"Welcome to {settings.app_name}",
            "version": settings.app_version,
            "docs": "/docs",
        }
    )


# Import and include API routers
from .api.v1 import routers as v1_routers
from .api.websocket import router as websocket_router

# Include v1 REST API routers
for router in v1_routers:
    app.include_router(router, prefix="/api/v1")

# Include WebSocket router
app.include_router(websocket_router, prefix="/api")


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
        host=settings.backend_host,
        port=settings.backend_port,
        reload=settings.app_debug,
        log_level=settings.log_level.lower(),
    )
