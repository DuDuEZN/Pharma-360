"""
Manager Analytics alias.

Exposes the analytics endpoints under ``/analytics`` so the manager
dashboard can use the same data as the administrator dashboard.
The handlers are shared with :mod:`admin_analytics` (manager/admin only).
"""
from fastapi import APIRouter

from .admin_analytics import (
    export_analytics,
    get_analytics_sales,
    get_analytics_stats,
    get_analytics_stock,
    get_analytics_top_products,
    get_analytics_users,
    get_product_margin_trend,
    get_product_stats,
)

router = APIRouter(prefix="/analytics", tags=["analytics"])

router.add_api_route("/stats", get_analytics_stats, methods=["GET"])
router.add_api_route("/sales", get_analytics_sales, methods=["GET"])
router.add_api_route("/stock", get_analytics_stock, methods=["GET"])
router.add_api_route("/top-products", get_analytics_top_products, methods=["GET"])
router.add_api_route("/users", get_analytics_users, methods=["GET"])
router.add_api_route("/export", export_analytics, methods=["GET"])
router.add_api_route(
    "/product-margin-trend", get_product_margin_trend, methods=["GET"]
)
router.add_api_route("/product-stats", get_product_stats, methods=["GET"])
