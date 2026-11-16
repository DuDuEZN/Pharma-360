"""
Main Application Module for Pharmacie 360 Backend
FastAPI application entry point
"""

import logging
from pathlib import Path

from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse, Response
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
    # Création idempotente des tables d'audit (pour les déploiements existants).
    try:
        from sqlalchemy import text
        from backend.core.database import engine
        async with engine.begin() as conn:
            await conn.execute(text("""
                CREATE TABLE IF NOT EXISTS audit_logs (
                    id SERIAL PRIMARY KEY,
                    action VARCHAR(50) NOT NULL,
                    entity_type VARCHAR(50),
                    entity_id INTEGER,
                    user_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
                    username VARCHAR(100),
                    method VARCHAR(10),
                    path VARCHAR(255),
                    details TEXT,
                    ip_address VARCHAR(45),
                    status_code INTEGER,
                    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
                )
            """))
            await conn.execute(text("""
                CREATE TABLE IF NOT EXISTS expired_products_log (
                    id SERIAL PRIMARY KEY,
                    product_id INTEGER REFERENCES products(id) ON DELETE SET NULL,
                    batch_id INTEGER REFERENCES batches(id) ON DELETE SET NULL,
                    batch_number VARCHAR(50),
                    quantity INTEGER NOT NULL DEFAULT 0,
                    expiry_date DATE,
                    user_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
                    reason TEXT,
                    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
                )
            """))
            await conn.execute(text("CREATE INDEX IF NOT EXISTS ix_audit_logs_action ON audit_logs(action)"))
            await conn.execute(text("CREATE INDEX IF NOT EXISTS ix_audit_logs_created_at ON audit_logs(created_at)"))
            await conn.execute(text("CREATE INDEX IF NOT EXISTS ix_expired_products_log_created_at ON expired_products_log(created_at)"))
            # Migration douce : prix du vrac précisé à la livraison.
            try:
                async with conn.begin_nested():
                    await conn.execute(text(
                        "ALTER TABLE delivery_items ADD COLUMN IF NOT EXISTS bulk_price NUMERIC(10, 2)"
                    ))
            except Exception:
                pass
            # Migration douce : colonne expiry_date en DATE (anciennes bases).
            try:
                async with conn.begin_nested():
                    await conn.execute(text("ALTER TABLE expired_products_log ALTER COLUMN expiry_date TYPE DATE USING expiry_date::date"))
            except Exception:
                pass
            # Tables RBAC roles/permissions (création idempotente).
            await conn.execute(text("""
                CREATE TABLE IF NOT EXISTS roles (
                    id SERIAL PRIMARY KEY,
                    name VARCHAR(50) UNIQUE NOT NULL,
                    description TEXT,
                    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
                    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
                )
            """))
            await conn.execute(text("""
                CREATE TABLE IF NOT EXISTS permissions (
                    id SERIAL PRIMARY KEY,
                    name VARCHAR(80) UNIQUE NOT NULL,
                    description TEXT,
                    category VARCHAR(50),
                    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
                )
            """))
            await conn.execute(text("""
                CREATE TABLE IF NOT EXISTS role_permissions (
                    id SERIAL PRIMARY KEY,
                    role_id INTEGER NOT NULL REFERENCES roles(id) ON DELETE CASCADE,
                    permission_id INTEGER NOT NULL REFERENCES permissions(id) ON DELETE CASCADE,
                    UNIQUE(role_id, permission_id)
                )
            """))
    except Exception as exc:
        logger.warning("Audit tables init failed: %s", exc)


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


@app.get("/metrics", tags=["metrics"])
async def metrics():
    """Endpoint Prometheus (format texte) pour la supervision et Grafana."""
    from sqlalchemy import select, func
    from backend.core.database import async_session_maker
    from backend.models.product import Product
    from backend.models.batch import Batch
    from backend.models.sale import Sale
    from backend.models.user import User
    from backend.models.category import Category
    from datetime import date, datetime, time, timedelta

    lines = []
    lines.append("# HELP pharma360_up Service Pharma-360 disponible")
    lines.append("# TYPE pharma360_up gauge")
    lines.append("pharma360_up 1")
    try:
        async with async_session_maker() as session:
            products_total = (await session.execute(select(func.count(Product.id)))).scalar() or 0
            stock_total = (await session.execute(select(func.coalesce(func.sum(Batch.quantity), 0)))).scalar() or 0
            expired = (await session.execute(
                select(func.count(Batch.id)).where(Batch.expiry_date < date.today(), Batch.status == "active")
            )).scalar() or 0
            users_total = (await session.execute(select(func.count(User.id)))).scalar() or 0
            today_start = datetime.combine(date.today(), time.min)
            sales_today = (await session.execute(
                select(func.count(Sale.id)).where(Sale.created_at >= today_start)
            )).scalar() or 0
            revenue_today = (await session.execute(
                select(func.coalesce(func.sum(Sale.total), 0)).where(Sale.created_at >= today_start)
            )).scalar() or 0
            sales_total = (await session.execute(select(func.count(Sale.id)))).scalar() or 0
            revenue_total = (await session.execute(select(func.coalesce(func.sum(Sale.total), 0)))).scalar() or 0
            low_stock = (await session.execute(
                select(func.count(Product.id)).where(Product.current_stock <= Product.stock_min)
            )).scalar() or 0
            expiring_soon = (await session.execute(
                select(func.count(Batch.id)).where(
                    Batch.expiry_date >= date.today(),
                    Batch.expiry_date <= date.today() + timedelta(days=30),
                    Batch.status == "active",
                )
            )).scalar() or 0

            cat_rows = (await session.execute(
                select(Category.name, func.coalesce(func.sum(Batch.quantity), 0))
                .select_from(Category)
                .join(Product, Product.category_id == Category.id, isouter=True)
                .join(Batch, Batch.product_id == Product.id, isouter=True)
                .group_by(Category.name)
            )).all()

            price_rows = (await session.execute(
                select(Product.id, Product.name, Product.price, Product.cost_price)
                .where(Product.is_active == True)
            )).all()

        lines.append("# HELP pharma360_products_total Nombre de produits")
        lines.append("# TYPE pharma360_products_total gauge")
        lines.append(f"pharma360_products_total {products_total}")
        lines.append("# HELP pharma360_stock_total Quantite totale en stock")
        lines.append("# TYPE pharma360_stock_total gauge")
        lines.append(f"pharma360_stock_total {stock_total}")
        lines.append("# HELP pharma360_expired_batches Nombre de lots perimes actifs")
        lines.append("# TYPE pharma360_expired_batches gauge")
        lines.append(f"pharma360_expired_batches {expired}")
        lines.append("# HELP pharma360_users_total Nombre d'utilisateurs")
        lines.append("# TYPE pharma360_users_total gauge")
        lines.append(f"pharma360_users_total {users_total}")
        lines.append("# HELP pharma360_sales_today_total Ventes aujourd'hui")
        lines.append("# TYPE pharma360_sales_today_total gauge")
        lines.append(f"pharma360_sales_today_total {sales_today}")
        lines.append("# HELP pharma360_revenue_today Chiffre d'affaires aujourd'hui")
        lines.append("# TYPE pharma360_revenue_today gauge")
        lines.append(f"pharma360_revenue_today {revenue_today}")
        lines.append("# HELP pharma360_sales_total Ventes cumulees (compteur)")
        lines.append("# TYPE pharma360_sales_total counter")
        lines.append(f"pharma360_sales_total {sales_total}")
        lines.append("# HELP pharma360_revenue_total Chiffre d'affaires cumule (compteur)")
        lines.append("# TYPE pharma360_revenue_total counter")
        lines.append(f"pharma360_revenue_total {revenue_total}")
        lines.append("# HELP pharma360_low_stock_total Nombre de produits en stock faible")
        lines.append("# TYPE pharma360_low_stock_total gauge")
        lines.append(f"pharma360_low_stock_total {low_stock}")
        lines.append("# HELP pharma360_expiring_soon_total Lots expirant sous 30 jours")
        lines.append("# TYPE pharma360_expiring_soon_total gauge")
        lines.append(f"pharma360_expiring_soon_total {expiring_soon}")

        lines.append("# HELP pharma360_stock_by_category Stock par categorie")
        lines.append("# TYPE pharma360_stock_by_category gauge")
        for name, qty in cat_rows:
            safe = (name or "Autres").replace('"', '\\"')
            lines.append(f'pharma360_stock_by_category{{category="{safe}"}} {qty or 0}')

        lines.append("# HELP pharma360_product_price Prix d'achat et de vente par produit")
        lines.append("# TYPE pharma360_product_price gauge")
        for pid, name, selling, cost in price_rows:
            safe = (name or f"Produit {pid}").replace('"', '\\"')
            lines.append(f'pharma360_product_price{{product="{safe}",type="purchase"}} {float(cost or 0)}')
            lines.append(f'pharma360_product_price{{product="{safe}",type="selling"}} {float(selling or 0)}')
    except Exception as exc:
        lines.append(f"# error: {exc}")
    return Response(content="\n".join(lines) + "\n", media_type="text/plain; version=0.0.4")


from backend.api.v1 import routers as v1_routers
from backend.api.websocket import router as websocket_router

for router in v1_routers:
    app.include_router(router, prefix="/api/v1")
app.include_router(websocket_router, prefix="/api")
app.include_router(websocket_router)  # /ws/... : URL utilisée par le frontend


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

    # Audit trail pour toutes les actions modifiantes (POST/PUT/PATCH/DELETE).
    # Best-effort : ne doit jamais faire échouer la requête.
    if request.method in ("POST", "PUT", "PATCH", "DELETE") and request.url.path.startswith("/api"):
        try:
            import asyncio
            from backend.services.audit_service import AuditService
            from backend.core.database import async_session_maker
            from backend.core.security import JWTUtils

            token = None
            auth = request.headers.get("authorization", "")
            if auth.lower().startswith("bearer "):
                token = auth.split(" ", 1)[1].strip()
            user_id = None
            username = None
            if token:
                try:
                    payload = JWTUtils.decode_token(token)
                    if payload.get("sub"):
                        user_id = int(payload.get("sub"))
                        username = payload.get("username")
                except Exception:
                    pass
            # Ignore les endpoints d'audit pour éviter la récursion.
            if not request.url.path.startswith("/api/v1/audit"):
                async with async_session_maker() as session:
                    await AuditService.log(
                        db=session,
                        action=f"{request.method} {request.url.path}",
                        user_id=user_id,
                        username=username,
                        method=request.method,
                        path=str(request.url.path),
                        ip_address=request.client.host if request.client else None,
                        status_code=response.status_code,
                    )
        except Exception:
            pass
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
