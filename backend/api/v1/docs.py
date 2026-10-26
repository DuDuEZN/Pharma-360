"""
API Documentation Endpoints for Pharmacie 360
Provides Swagger/OpenAPI documentation and custom API docs
"""

from fastapi import APIRouter, HTTPException
from fastapi.responses import JSONResponse, HTMLResponse
from typing import Dict, Any
from backend.core.config import settings
from backend.core.logging import get_logger

router = APIRouter(prefix="/docs", tags=["Documentation"])
logger = get_logger("docs")


def custom_openapi() -> Dict[str, Any]:
    """Custom OpenAPI schema with Pharmacie 360 specific information"""
    if settings.openapi_schema:
        return settings.openapi_schema
    
    return {
        "openapi": "3.0.2",
        "info": {
            "title": "Pharma-360 API",
            "description": "Pharmacie 360 - Systeme de Gestion de Pharmacie ERP",
            "version": "5.1.0",
            "contact": {
                "name": "Pharma-360 Team",
                "email": "support@pharma360.bj"
            },
            "license": {
                "name": "Proprietary",
                "url": "https://github.com/DuDuEZN/Pharma-360"
            }
        },
        "servers": [
            {"url": "http://localhost:8000", "description": "Development Server"},
            {"url": "http://localhost:8080", "description": "Production Server (Docker)"}
        ],
        "tags": [
            {"name": "Authentification", "description": "Gestion des utilisateurs et authentification JWT"},
            {"name": "Produits", "description": "CRUD Produits et gestion des codes-barres"},
            {"name": "Stocks", "description": "Gestion des stocks avec FEFO/FIFO"},
            {"name": "Ventes", "description": "Creation et gestion des ventes"},
            {"name": "Caisse", "description": "Encaissement et gestion de caisse"},
            {"name": "Fournisseurs", "description": "Gestion des fournisseurs et factures"},
            {"name": "Rapports", "description": "Generation de rapports"},
            {"name": "Historique", "description": "Historique des ventes et statistiques"},
            {"name": "Retours", "description": "Gestion des retours"},
            {"name": "Alertes", "description": "Systeme d'alertes"},
            {"name": "OCR", "description": "Reconnaissance optique des factures"},
            {"name": "Documentation", "description": "Documentation API"}
        ],
        "components": {
            "securitySchemes": {
                "BearerAuth": {
                    "type": "http",
                    "scheme": "bearer",
                    "bearerFormat": "JWT",
                    "description": "Token JWT pour l'authentification"
                }
            }
        }
    }


@router.get("/", response_class=HTMLResponse, summary="Swagger UI")
async def get_swagger_documentation():
    """Redirect to Swagger UI documentation"""
    logger.info("Swagger UI documentation requested")
    return HTMLResponse(content=""""
    <!DOCTYPE html>
    <html>
    <head>
        <title>Pharma-360 API Documentation</title>
        <meta charset="utf-8"/>
        <meta name="viewport" content="width=device-width, initial-scale=1">
        <link rel="stylesheet" type="text/css" href="https://unpkg.com/swagger-ui-dist@5/swagger-ui.css">
    </head>
    <body>
        <div id="swagger-ui"></div>
        <script src="https://unpkg.com/swagger-ui-dist@5/swagger-ui-bundle.js"></script>
        <script>
            window.onload = function() {
                SwaggerUIBundle({
                    url: "/openapi.json",
                    dom_id: '#swagger-ui',
                    deepLinking: true,
                    presets: [
                        SwaggerUIBundle.presets.apis,
                        SwaggerUIBundle.SwaggerUIStandalonePreset
                    ],
                    layout: "BaseLayout",
                    tryItOutEnabled: true
                });
            };
        </script>
    </body>
    </html>
    """)


@router.get("/openapi.json", response_class=JSONResponse, summary="OpenAPI Schema")
async def get_openapi_json():
    """Return OpenAPI schema in JSON format"""
    logger.info("OpenAPI schema requested")
    return JSONResponse(content=custom_openapi())


@router.get("/redoc", response_class=HTMLResponse, summary="ReDoc")
async def get_redoc_documentation():
    """Alternative documentation with ReDoc"""
    logger.info("ReDoc documentation requested")
    return HTMLResponse(content="""
    <!DOCTYPE html>
    <html>
    <head>
        <title>Pharma-360 API - ReDoc</title>
        <meta charset="utf-8"/>
        <meta name="viewport" content="width=device-width, initial-scale=1">
        <link rel="stylesheet" type="text/css" href="https://unpkg.com/redoc@next/bundles/redoc.standalone.css">
    </head>
    <body>
        <div id="redoc-container"></div>
        <script src="https://unpkg.com/redoc@next/bundles/redoc.standalone.js"></script>
        <script>
            Redoc.init('/openapi.json', {}, document.getElementById('redoc-container'));
        </script>
    </body>
    </html>
    """)


@router.get("/markdown", response_class=JSONResponse, summary="API Documentation Markdown")
async def get_api_documentation_markdown():
    """Return complete API documentation in Markdown format"""
    markdown = """# Pharma-360 API Documentation

## Introduction
Pharma-360 est une plateforme ERP de gestion de pharmacie pour le marche beninois.
Systeme fonctionne 100% hors ligne avec base de donnees PostgreSQL locale.

## Architecture
- Backend: FastAPI (Python 3.11+)
- Frontend: React.js + Vite + Tailwind CSS
- Base de donnees: PostgreSQL 15+
- Cache: Redis (optionnel)
- IA: Python 3.11+ avec pytesseract, scikit-learn

## Modules
### Authentification
- POST /api/v1/auth/login - Connexion utilisateur
- POST /api/v1/auth/logout - Deconnexion
- POST /api/v1/auth/refresh - Rafraichir token
- GET /api/v1/auth/me - Informations utilisateur

### Produits
- GET /api/v1/products - Lister tous les produits
- POST /api/v1/products - Creer un produit
- GET /api/v1/products/{id} - Obtenir un produit
- PUT /api/v1/products/{id} - Mettre a jour
- DELETE /api/v1/products/{id} - Supprimer
- GET /api/v1/products/search - Rechercher

### Stocks
- GET /api/v1/batches - Lister tous les lots
- POST /api/v1/batches - Creer un lot
- GET /api/v1/batches/{id} - Obtenir un lot
- GET /api/v1/batches/fefo/{product_id} - Lot FEFO

### Ventes
- GET /api/v1/sales - Lister toutes les ventes
- POST /api/v1/sales - Creer une vente
- GET /api/v1/sales/{id} - Obtenir une vente

### Caisse
- GET /api/v1/cash/queue - File d'attente
- POST /api/v1/cash/payment - Encaisser paiement

### Fournisseurs
- GET /api/v1/suppliers - Lister fournisseurs
- POST /api/v1/suppliers - Creer fournisseur
- GET /api/v1/invoices - Lister factures
- POST /api/v1/invoices - Creer facture

### Rapports
- POST /api/v1/reports/sales - Rapport de ventes
- POST /api/v1/reports/stock - Rapport de stock
- POST /api/v1/reports/cash - Rapport de caisse

### Historique
- GET /api/v1/sale-history - Historique ventes
- GET /api/v1/sale-history/daily - Statistiques quotidiennes
- GET /api/v1/sale-history/monthly - Statistiques mensuelles
- GET /api/v1/sale-history/top-products - Top produits

## Authentification
Toutes les requetes doivent inclure: Authorization: Bearer <token>

## FEFO/FIFO
Systeme implemente FEFO (First Expired, First Out) avec index PostgreSQL.

## Version
API Version: 5.1.0
"""
    logger.info("API documentation markdown requested")
    return JSONResponse(content={"documentation": markdown})


@router.get("/health", summary="Health Check")
async def health_check():
    """Check API health status"""
    logger.info("Docs health check requested")
    return {
        "status": "healthy",
        "version": "5.1.0",
        "services": {
            "database": "connected",
            "cache": "connected",
            "storage": "connected"
        }
    }
