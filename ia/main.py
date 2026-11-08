"""
Main Application Module for Pharmacie 360 IA Service
FastAPI application entry point for IA module (OCR, Analytics, Alerts, KPIs)
"""

import logging
import time
from contextlib import asynccontextmanager
from pathlib import Path
from typing import AsyncGenerator

from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from fastapi.staticfiles import StaticFiles

from .core import logging as ia_logging
from .core.config import settings

logging_service = ia_logging.setup_logging(
    {"logs_dir": "./logs", "console_level": logging.INFO, "file_level": logging.DEBUG}
)
logger = ia_logging.get_logger("ia.main")

app = FastAPI(
    title=settings.app_name,
    version=settings.app_version,
    description="Pharmacie 360 - IA Module (OCR, Analytics, Alerts, KPIs)",
    docs_url="/docs",
    redoc_url="/redoc",
    openapi_url="/openapi.json",
)


@asynccontextmanager
async def lifespan(app: FastAPI) -> AsyncGenerator[None, None]:
    logger.info("IA Service starting up")
    Path("uploads").mkdir(exist_ok=True)
    Path("logs").mkdir(exist_ok=True)
    Path("models").mkdir(exist_ok=True)
    yield
    logger.info("IA Service shutting down")


app.router.lifespan_context = lifespan
app.middleware("http")(ia_logging.add_security_headers)

cors_origins = [origin.strip() for origin in settings.cors_origins.split(",") if origin.strip()]
app.add_middleware(
    CORSMiddleware,
    allow_origins=cors_origins,
    allow_credentials=True,
    allow_methods=["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
    allow_headers=["Authorization", "Content-Type"],
)

Path("static").mkdir(exist_ok=True)
Path("uploads").mkdir(exist_ok=True)
app.mount("/static", StaticFiles(directory="static"), name="static")
app.mount("/uploads", StaticFiles(directory="uploads"), name="uploads")


@app.get("/api/health", tags=["health"])
async def health_check():
    return JSONResponse(
        content={
            "status": "healthy",
            "app": settings.app_name,
            "version": settings.app_version,
            "environment": settings.app_env,
            "service": "IA",
            "capabilities": ["OCR", "Analytics", "Alerts", "KPIs", "Stock Prediction"],
        }
    )


@app.get("/", tags=["root"])
async def root():
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
                "Alerts": "/api/v1/alerts",
            },
        }
    )


from .api.v1 import routers as v1_routers

for router in v1_routers:
    app.include_router(router, prefix="/api/v1")


@app.middleware("http")
async def logging_middleware(request: Request, call_next):
    start_time = time.time()
    response = await call_next(request)
    if request.url.path.startswith("/api"):
        ia_logging.log_api_request(
            method=request.method,
            path=str(request.url),
            status_code=response.status_code,
            duration_ms=(time.time() - start_time) * 1000,
            client=request.client.host if request.client else None,
        )
    return response


@app.exception_handler(Exception)
async def global_exception_handler(request: Request, exc: Exception):
    logger.exception("Unhandled IA service exception", exc_info=exc)
    return JSONResponse(status_code=500, content={"detail": "Internal server error"})


if __name__ == "__main__":
    import uvicorn

    uvicorn.run(
        "main:app",
        host=settings.ia_host,
        port=settings.ia_port,
        reload=settings.app_debug,
        log_level="info",
    )
