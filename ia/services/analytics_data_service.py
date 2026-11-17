"""Lecture des données de production utilisées par les analyses IA.

Toutes les requêtes sont en lecture seule et s'appuient sur le pool
``asyncpg`` défini dans :mod:`ia.core.database`. Chaque méthode échoue
proprement (liste vide + log) afin que le tableau de bord IA reste
disponible même si une requête échoue.
"""

from __future__ import annotations

import logging
from datetime import date, datetime, timedelta
from typing import Any, Dict, List, Optional

from ia.core.database import get_pool, reset_pool

logger = logging.getLogger(__name__)

# Statuts de vente considérés comme du chiffre d'affaires réalisé.
PAID_SALE_STATUSES = ("paid",)


class AnalyticsDataService:
    """Accès aux produits, lots, ventes et livraisons."""

    async def _fetch(self, query: str, *args: Any) -> List[Dict[str, Any]]:
        try:
            pool = await get_pool()
            rows = await pool.fetch(query, *args)
            return [dict(row) for row in rows]
        except Exception:
            logger.exception("IA data query failed")
            try:
                await reset_pool()
            except Exception:  # pragma: no cover - best effort
                pass
            return []

    # ------------------------------------------------------------------
    # Produits et stock
    # ------------------------------------------------------------------
    async def get_products_with_stock(self) -> List[Dict[str, Any]]:
        """Produits actifs avec leur stock disponible (lots actifs)."""
        rows = await self._fetch(
            """
            SELECT
                p.id,
                p.name,
                p.barcode,
                p.unit,
                COALESCE(p.price, 0)         AS price,
                COALESCE(p.stock_min, 0)     AS min_stock,
                COALESCE(p.stock_max, 0)     AS max_stock,
                COALESCE(SUM(
                    CASE WHEN b.status = 'active' AND b.quantity > 0
                         THEN b.quantity ELSE 0 END
                ), 0)::int                    AS current_stock
            FROM products p
            LEFT JOIN batches b ON b.product_id = p.id
            WHERE p.is_active IS TRUE
            GROUP BY p.id, p.name, p.barcode, p.unit, p.price, p.stock_min, p.stock_max
            ORDER BY p.name
            """
        )
        return rows

    async def get_expiring_batches(self, days: int = 90) -> List[Dict[str, Any]]:
        """Lots actifs qui expirent dans ``days`` jours."""
        rows = await self._fetch(
            """
            SELECT
                b.id,
                b.product_id,
                p.name                    AS product_name,
                b.batch_number,
                b.quantity::int           AS quantity,
                b.expiry_date,
                (b.expiry_date - CURRENT_DATE)::int AS days_until_expiry
            FROM batches b
            JOIN products p ON p.id = b.product_id
            WHERE b.status = 'active'
              AND b.quantity > 0
              AND b.expiry_date <= CURRENT_DATE + ($1::int * INTERVAL '1 day')
            ORDER BY b.expiry_date ASC
            """,
            int(days),
        )
        return rows

    # ------------------------------------------------------------------
    # Historique des ventes
    # ------------------------------------------------------------------
    async def get_daily_sales(
        self, days: int = 90, product_id: Optional[int] = None
    ) -> List[Dict[str, Any]]:
        """Ventes agrégées par jour (une ligne par produit et par jour)."""
        since = date.today() - timedelta(days=max(1, int(days)) - 1)
        query = """
            SELECT
                si.product_id,
                DATE(s.created_at)               AS sale_date,
                SUM(si.quantity)::int            AS quantity,
                COALESCE(SUM(si.total_price), 0) AS revenue
            FROM sale_items si
            JOIN sales s ON s.id = si.sale_id
            WHERE s.status = ANY($1::text[])
              AND s.created_at >= $2
        """
        args: List[Any] = [list(PAID_SALE_STATUSES), since]
        if product_id is not None:
            query += " AND si.product_id = $3"
            args.append(int(product_id))
        query += " GROUP BY si.product_id, DATE(s.created_at) ORDER BY sale_date"
        return await self._fetch(query, *args)

    async def get_sales_totals(self, days: int = 30) -> Dict[str, Any]:
        """Agrégats de ventes sur ``days`` jours (CA, transactions, articles)."""
        since = date.today() - timedelta(days=max(1, int(days)) - 1)
        rows = await self._fetch(
            """
            SELECT
                COALESCE(SUM(s.total), 0)          AS revenue,
                COUNT(DISTINCT s.id)::int          AS transactions,
                COALESCE(SUM(st.items), 0)::int    AS items_sold
            FROM sales s
            LEFT JOIN (
                SELECT sale_id, SUM(quantity) AS items
                FROM sale_items
                GROUP BY sale_id
            ) st ON st.sale_id = s.id
            WHERE s.status = ANY($1::text[])
              AND s.created_at >= $2
            """,
            list(PAID_SALE_STATUSES),
            since,
        )
        if not rows:
            return {"revenue": 0.0, "transactions": 0, "items_sold": 0}
        row = rows[0]
        return {
            "revenue": float(row.get("revenue") or 0),
            "transactions": int(row.get("transactions") or 0),
            "items_sold": int(row.get("items_sold") or 0),
        }

    async def get_sales_for_day(self, day: date) -> Dict[str, Any]:
        """Statistiques de ventes d'une journée (CA, tickets, répartition horaire)."""
        start = datetime.combine(day, datetime.min.time())
        end = start + timedelta(days=1)
        rows = await self._fetch(
            """
            SELECT
                COALESCE(SUM(s.total), 0)        AS revenue,
                COUNT(DISTINCT s.id)::int        AS transactions,
                COALESCE(SUM(st.items), 0)::int  AS items_sold
            FROM sales s
            LEFT JOIN (
                SELECT sale_id, SUM(quantity) AS items
                FROM sale_items
                GROUP BY sale_id
            ) st ON st.sale_id = s.id
            WHERE s.status = ANY($1::text[])
              AND s.created_at >= $2
              AND s.created_at < $3
            """,
            list(PAID_SALE_STATUSES),
            start,
            end,
        )
        hourly_rows = await self._fetch(
            """
            SELECT
                EXTRACT(HOUR FROM s.created_at)::int AS hour,
                COALESCE(SUM(s.total), 0)           AS amount,
                COUNT(DISTINCT s.id)::int           AS transactions
            FROM sales s
            WHERE s.status = ANY($1::text[])
              AND s.created_at >= $2
              AND s.created_at < $3
            GROUP BY EXTRACT(HOUR FROM s.created_at)
            ORDER BY hour
            """,
            list(PAID_SALE_STATUSES),
            start,
            end,
        )

        row = rows[0] if rows else {}
        revenue = float(row.get("revenue") or 0)
        transactions = int(row.get("transactions") or 0)
        hourly = [
            {
                "hour": int(item.get("hour") or 0),
                "amount": float(item.get("amount") or 0),
                "transactions": int(item.get("transactions") or 0),
            }
            for item in hourly_rows
        ]
        peak_hour = max(hourly, key=lambda item: item["amount"])["hour"] if hourly else None

        return {
            "date": day.isoformat(),
            "total_sales": transactions,
            "total_revenue": revenue,
            "average_sale_value": round(revenue / transactions, 2)
            if transactions
            else 0.0,
            "hourly_distribution": hourly,
            "peak_hour": peak_hour,
        }

    async def get_stock_stats(self) -> Dict[str, Any]:
        """Indicateurs de stock agrégés (lots, quantités, alertes)."""
        rows = await self._fetch(
            """
            SELECT
                COUNT(*) FILTER (WHERE b.status = 'active' AND b.quantity > 0)::int AS total_batches,
                COALESCE(SUM(CASE WHEN b.status = 'active' AND b.quantity > 0
                                  THEN b.quantity ELSE 0 END), 0)::int             AS total_quantity,
                COUNT(*) FILTER (
                    WHERE b.status = 'active' AND b.quantity > 0
                      AND b.expiry_date <= CURRENT_DATE + INTERVAL '90 days'
                )::int                                                            AS expiring_soon
            FROM batches b
            """
        )
        low_rows = await self._fetch(
            """
            SELECT COUNT(*)::int AS low_stock
            FROM (
                SELECT p.id, p.stock_min,
                       COALESCE(SUM(CASE WHEN b.status = 'active' AND b.quantity > 0
                                         THEN b.quantity ELSE 0 END), 0) AS stock
                FROM products p
                LEFT JOIN batches b ON b.product_id = p.id
                WHERE p.is_active IS TRUE
                GROUP BY p.id, p.stock_min
            ) sub
            WHERE sub.stock <= COALESCE(sub.stock_min, 0) OR sub.stock = 0
            """
        )
        category_rows = await self._fetch(
            """
            SELECT COALESCE(c.name, 'Sans catégorie') AS category,
                   COALESCE(SUM(b.quantity), 0)::int  AS quantity
            FROM batches b
            JOIN products p ON p.id = b.product_id
            LEFT JOIN categories c ON c.id = p.category_id
            WHERE b.status = 'active' AND b.quantity > 0
            GROUP BY COALESCE(c.name, 'Sans catégorie')
            ORDER BY quantity DESC
            """
        )

        row = rows[0] if rows else {}
        return {
            "total_batches": int(row.get("total_batches") or 0),
            "total_quantity": int(row.get("total_quantity") or 0),
            "expiring_soon": int(row.get("expiring_soon") or 0),
            "low_stock": int((low_rows[0] if low_rows else {}).get("low_stock") or 0),
            "category_distribution": {
                item.get("category"): int(item.get("quantity") or 0)
                for item in category_rows
            },
        }

    async def get_top_products(self, days: int = 30, limit: int = 5) -> List[Dict[str, Any]]:
        """Produits les plus vendus sur la période."""
        since = date.today() - timedelta(days=max(1, int(days)) - 1)
        return await self._fetch(
            """
            SELECT
                p.id                    AS product_id,
                p.name                  AS product_name,
                COALESCE(SUM(si.quantity), 0)::int       AS quantity,
                COALESCE(SUM(si.total_price), 0)         AS revenue
            FROM sale_items si
            JOIN sales s ON s.id = si.sale_id
            JOIN products p ON p.id = si.product_id
            WHERE s.status = ANY($1::text[])
              AND s.created_at >= $2
            GROUP BY p.id, p.name
            ORDER BY quantity DESC
            LIMIT $3
            """,
            list(PAID_SALE_STATUSES),
            since,
            int(limit),
        )

    # ------------------------------------------------------------------
    # Historique des achats / réceptions
    # ------------------------------------------------------------------
    async def get_daily_purchases(self, days: int = 90) -> List[Dict[str, Any]]:
        """Quantités reçues par jour et par produit (livraisons validées)."""
        since = date.today() - timedelta(days=max(1, int(days)) - 1)
        return await self._fetch(
            """
            SELECT
                di.product_id,
                DATE(COALESCE(d.received_at, d.created_at)) AS purchase_date,
                SUM(di.received_quantity)::int              AS quantity
            FROM delivery_items di
            JOIN deliveries d ON d.id = di.delivery_id
            WHERE d.status = 'delivered'
              AND COALESCE(d.received_at, d.created_at) >= $1
            GROUP BY di.product_id, DATE(COALESCE(d.received_at, d.created_at))
            ORDER BY purchase_date
            """,
            since,
        )

    async def get_supplier_stats(self, days: int = 30) -> Dict[str, Any]:
        """Statistiques fournisseurs sur la période."""
        since = date.today() - timedelta(days=max(1, int(days)) - 1)
        rows = await self._fetch(
            """
            SELECT
                COUNT(DISTINCT s.id) FILTER (WHERE s.is_active IS TRUE)::int AS active_suppliers,
                COUNT(DISTINCT s.id)::int                                    AS total_suppliers,
                COUNT(DISTINCT d.id)::int                                    AS deliveries,
                COALESCE(SUM(di.received_quantity * di.unit_price), 0)        AS purchase_value
            FROM suppliers s
            LEFT JOIN deliveries d
                   ON d.supplier_id = s.id
                  AND d.status = 'delivered'
                  AND COALESCE(d.received_at, d.created_at) >= $1
            LEFT JOIN delivery_items di ON di.delivery_id = d.id
            """,
            since,
        )
        if not rows:
            return {
                "total_suppliers": 0,
                "active_suppliers": 0,
                "deliveries": 0,
                "purchase_value": 0.0,
            }
        row = rows[0]
        return {
            "total_suppliers": int(row.get("total_suppliers") or 0),
            "active_suppliers": int(row.get("active_suppliers") or 0),
            "deliveries": int(row.get("deliveries") or 0),
            "purchase_value": float(row.get("purchase_value") or 0),
        }

    async def get_purchase_history_by_product(self, days: int = 365) -> List[Dict[str, Any]]:
        """Quantités achetées par produit sur la période (historique d'achat)."""
        since = date.today() - timedelta(days=max(1, int(days)) - 1)
        return await self._fetch(
            """
            SELECT
                di.product_id,
                p.name                          AS product_name,
                SUM(di.received_quantity)::int  AS quantity,
                COALESCE(AVG(di.unit_price), 0) AS average_unit_price
            FROM delivery_items di
            JOIN deliveries d ON d.id = di.delivery_id
            JOIN products p ON p.id = di.product_id
            WHERE d.status = 'delivered'
              AND COALESCE(d.received_at, d.created_at) >= $1
            GROUP BY di.product_id, p.name
            ORDER BY quantity DESC
            """,
            since,
        )


analytics_data_service = AnalyticsDataService()
