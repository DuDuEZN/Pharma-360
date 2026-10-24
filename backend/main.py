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
# This will be populated as we create the API modules
# from .api.v1 import auth, users, products, batches, sales, returns, invoices, reports
# app.include_router(auth.router, prefix="/api/v1/auth", tags=["auth"])
# app.include_router(users.router, prefix="/api/v1/users", tags=["users"])
# app.include_router(products.router, prefix="/api/v1/products", tags=["products"])
# app.include_router(batches.router, prefix="/api/v1/batches", tags=["batches"])
# app.include_router(sales.router, prefix="/api/v1/sales", tags=["sales"])
# app.include_router(returns.router, prefix="/api/v1/returns", tags=["returns"])
# app.include_router(invoices.router, prefix="/api/v1/invoices", tags=["invoices"])
# app.include_router(reports.router, prefix="/api/v1/reports", tags=["reports"])


# WebSocket endpoints will be added here
# from .api.websocket import websocket_router
# app.include_router(websocket_router)


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
