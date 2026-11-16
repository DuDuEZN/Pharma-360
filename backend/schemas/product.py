"""Shim de compatibilité — schémas du domaine Catalogue.

Le code source a été déplacé dans ``backend.modules.catalog.schemas``.
Ce fichier conserve l'ancien chemin d'import ``backend.schemas.product``
utilisé par ``barcode_service`` et les tests.
"""

from ..modules.catalog.schemas import (
    BarcodeScanRequest,
    BarcodeScanResponse,
    ProductBase,
    ProductCreate,
    ProductDetailResponse,
    ProductListResponse,
    ProductResponse,
    ProductSearchRequest,
    ProductSearchResponse,
    ProductUpdate,
)

__all__ = [
    "ProductBase",
    "ProductCreate",
    "ProductUpdate",
    "ProductResponse",
    "ProductDetailResponse",
    "ProductListResponse",
    "ProductSearchRequest",
    "ProductSearchResponse",
    "BarcodeScanRequest",
    "BarcodeScanResponse",
]
