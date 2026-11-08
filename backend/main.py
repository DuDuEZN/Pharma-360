"""
Main Application Module for Pharmacie 360 Backend
FastAPI application entry point
"""

import logging
from pathlib import Path

from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from fastapi.staticfiles import StaticFiles

from backend.core.config import settings
from backend.core.database import engine
from backend.core.logging import get_logger, setup_logging
from backend.core.security import add_security_headers

logging_service = setup_logging(
    {"logs_dir": "./logs", "console_level": logging.INFO, "file_level": logging.DEBUG}
)
logger = get_logger("main")

app = FastAPI(
    title=settings.app_name,
    version=settings.app_version,
    description="Pharmacie 360 - Plateforme de Gestion de Pharmacie",
    docs_url="/docs",
    redoc_url="/redoc",
    openapi_url="/openapi.json",
)


@app.on_event("startup")
async def startup_event():
    logger.info("Application starting up")


@app.on_event("shutdown")
async def shutdown_event():
    logger.info("Application shutting down")
    await engine.dispose()


app.middleware("http")(add_security_headers)

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
        }
    )


@app.get("/", tags=["root"])
async def root():
    return JSONResponse(
        content={
            "message": f"Welcome to {settings.app_name}",
            "version": settings.app_version,
            "docs": "/docs",
        }
    )


from backend.api.v1 import routers as v1_routers
from backend.api.websocket import router as websocket_router

for router in v1_routers:
    app.include_router(router, prefix="/api/v1")
app.include_router(websocket_router, prefix="/api")


@app.middleware("http")
async def logging_middleware(request: Request, call_next):
    import time

    start_time = time.time()
    response = await call_next(request)
    process_time = (time.time() - start_time) * 1000
    if request.url.path.startswith("/api"):
        from backend.core.logging import log_api_request

        log_api_request(
            method=request.method,
            path=str(request.url),
            status_code=response.status_code,
            duration_ms=process_time,
            client=request.client.host if request.client else None,
        )
    return response


@app.exception_handler(Exception)
async def global_exception_handler(request: Request, exc: Exception):
    logger.exception("Unhandled application exception", exc_info=exc)
    return JSONResponse(
        status_code=500,
        content={"detail": "Internal server error"},
    )


if __name__ == "__main__":
    import uvicorn

    uvicorn.run(
        "main:app",
        host=settings.backend_host,
        port=settings.backend_port,
        reload=settings.app_debug,
        log_level=settings.log_level.lower(),
    )
