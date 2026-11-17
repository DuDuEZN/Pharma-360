"""Stock Prediction Service for Pharmacie 360 IA Module.

Le service s'appuie sur l'historique réel de ventes/achats stocké dans
PostgreSQL (``sale_items``, ``batches``, ``delivery_items``) pour produire :

* des prévisions de ventes (régression linéaire sur les ventes quotidiennes) ;
* des prévisions de rupture par produit ;
* des recommandations de réapprovisionnement / déstockage / péremption.
"""

from __future__ import annotations

import logging
from collections import defaultdict
from datetime import date, datetime, timedelta
from typing import Any, Dict, List, Optional

import numpy as np
import pandas as pd

from .analytics_data_service import analytics_data_service

logger = logging.getLogger(__name__)

RISK_ORDER = {"CRITICAL": 0, "HIGH": 1, "MEDIUM": 2, "LOW": 3}
PRIORITY_ORDER = {"URGENT": 0, "HIGH": 1, "NORMAL": 2, "LOW": 3}


def _to_float(value: Any, default: float = 0.0) -> float:
    try:
        return float(value)
    except (TypeError, ValueError):
        return default


def _to_int(value: Any, default: int = 0) -> int:
    try:
        return int(value)
    except (TypeError, ValueError):
        return default


def build_daily_series(
    totals: Dict[date, int], start: date, days: int
) -> List[int]:
    """Série quotidienne complète (jours sans vente = 0)."""
    return [
        _to_int(totals.get(start + timedelta(days=offset), 0))
        for offset in range(days)
    ]


def _linear_trend(series: List[int]) -> tuple[float, float]:
    """Pente et ordonnée à l'origine d'une régression linéaire simple."""
    if len(series) < 2:
        return 0.0, _to_float(series[0] if series else 0)
    x = np.arange(len(series), dtype=float)
    y = np.asarray(series, dtype=float)
    slope, intercept = np.polyfit(x, y, 1)
    return float(slope), float(intercept)


def forecast_series(series: List[int], horizon: int) -> List[int]:
    """Prévision à ``horizon`` jours à partir de la série historique.

    La régression est bornée pour éviter les extrapolations absurdes :
    chaque valeur reste entre 0 et 5 fois la moyenne historique.
    """
    if not series:
        return [0] * horizon

    slope, intercept = _linear_trend(series)
    mean = float(np.mean(series))
    cap = max(mean * 5, 1.0)

    forecast: List[int] = []
    last_index = len(series)
    for step in range(1, horizon + 1):
        predicted = slope * (last_index + step - 1) + intercept
        forecast.append(int(max(0.0, min(round(predicted), cap))))
    return forecast


def _risk_level(days_until_rupture: float) -> str:
    if days_until_rupture <= 3:
        return "CRITICAL"
    if days_until_rupture <= 7:
        return "HIGH"
    if days_until_rupture <= 30:
        return "MEDIUM"
    return "LOW"


def _trend_label(recent: float, previous: float) -> str:
    if previous <= 0:
        return "stable" if recent <= 0 else "increasing"
    change = (recent - previous) / previous
    if change > 0.05:
        return "increasing"
    if change < -0.05:
        return "decreasing"
    return "stable"


def _trend_percent(recent: float, previous: float) -> float:
    if previous <= 0:
        return 0.0
    return round((recent - previous) / previous * 100, 2)


class StockPredictionService:
    """Prévisions et recommandations calculées sur l'historique réel."""

    def __init__(self):
        self.model = None
        self.trained = False

    # ------------------------------------------------------------------
    # Contexte produit (stock + ventes)
    # ------------------------------------------------------------------
    async def _build_product_context(
        self, history_days: int = 90
    ) -> List[Dict[str, Any]]:
        """Enrichit chaque produit avec ses ventes récentes et ses tendances."""
        history_days = max(30, int(history_days))
        products = await analytics_data_service.get_products_with_stock()
        sales_rows = await analytics_data_service.get_daily_sales(history_days)

        totals: Dict[int, Dict[date, int]] = defaultdict(lambda: defaultdict(int))
        for row in sales_rows:
            product_id = _to_int(row.get("product_id"), -1)
            if product_id < 0:
                continue
            sale_date = row.get("sale_date")
            if isinstance(sale_date, datetime):
                sale_date = sale_date.date()
            if not isinstance(sale_date, date):
                continue
            totals[product_id][sale_date] += _to_int(row.get("quantity"))

        today = date.today()
        start = today - timedelta(days=history_days - 1)

        for product in products:
            product_id = _to_int(product.get("id"), -1)
            series = build_daily_series(totals.get(product_id, {}), start, history_days)

            window = min(30, history_days)
            recent = series[-window:]
            previous = series[-2 * window : -window]

            daily_sales = float(np.mean(recent)) if recent else 0.0
            current_stock = _to_int(product.get("current_stock"))
            cover_days = (
                current_stock / daily_sales if daily_sales > 0 else float("inf")
            )

            product["daily_sales"] = round(daily_sales, 4)
            product["sales_last_30"] = int(sum(recent))
            product["sales_previous_30"] = int(sum(previous))
            product["sales_trend"] = _trend_label(
                float(sum(recent)), float(sum(previous))
            )
            product["trend_percent"] = _trend_percent(
                float(sum(recent)), float(sum(previous))
            )
            product["days_until_rupture"] = (
                round(cover_days, 1) if cover_days != float("inf") else None
            )
            product["cover_days"] = product["days_until_rupture"]
            product["risk_level"] = (
                _risk_level(cover_days)
                if cover_days != float("inf")
                else "LOW"
            )

            # Prévision de ventes sur 30 jours pour ce produit.
            product["forecast_series"] = forecast_series(series, 30)
            product["predicted_sales"] = int(sum(product["forecast_series"]))

        return products

    # ------------------------------------------------------------------
    # Prévisions de ventes (graphiques)
    # ------------------------------------------------------------------
    async def get_sales_forecast(
        self,
        forecast_days: int = 30,
        history_days: int = 90,
        product_id: Optional[int] = None,
    ) -> Dict[str, Any]:
        """Historique + prévision des ventes quotidiennes.

        Utilisé par le frontend pour tracer les courbes de ventes réelles et
        de prévision IA.
        """
        forecast_days = max(1, min(int(forecast_days), 365))
        history_days = max(7, min(int(history_days), 365))

        sales_rows = await analytics_data_service.get_daily_sales(
            history_days, product_id
        )
        totals: Dict[date, int] = defaultdict(int)
        revenue: Dict[date, float] = defaultdict(float)
        product_name = None
        for row in sales_rows:
            sale_date = row.get("sale_date")
            if isinstance(sale_date, datetime):
                sale_date = sale_date.date()
            if not isinstance(sale_date, date):
                continue
            totals[sale_date] += _to_int(row.get("quantity"))
            revenue[sale_date] += _to_float(row.get("revenue"))
            if product_name is None and row.get("product_name"):
                product_name = row.get("product_name")

        today = date.today()
        start = today - timedelta(days=history_days - 1)
        history = build_daily_series(totals, start, history_days)
        forecast = forecast_series(history, forecast_days)
        future_dates = [today + timedelta(days=offset) for offset in range(1, forecast_days + 1)]
        history_dates = [start + timedelta(days=offset) for offset in range(history_days)]

        window = min(30, history_days)
        recent_total = float(sum(history[-window:]))
        previous_total = float(sum(history[-2 * window : -window]))
        daily_average = recent_total / window if window else 0.0

        if not product_name and product_id is not None:
            for product in await analytics_data_service.get_products_with_stock():
                if _to_int(product.get("id")) == int(product_id):
                    product_name = product.get("name")
                    break

        return {
            "status": "success",
            "product_id": product_id,
            "product_name": product_name or "Tous les produits",
            "history_days": history_days,
            "forecast_days": forecast_days,
            "labels": [d.isoformat() for d in history_dates]
            + [d.isoformat() for d in future_dates],
            "history": history,
            "forecast": forecast,
            "history_revenue": [
                round(revenue.get(d, 0.0), 2) for d in history_dates
            ],
            "daily_average": round(daily_average, 2),
            "trend": _trend_label(recent_total, previous_total),
            "trend_percent": _trend_percent(recent_total, previous_total),
            "predicted_total": int(sum(forecast)),
            "predicted_daily_average": round(
                sum(forecast) / forecast_days if forecast_days else 0, 2
            ),
            "generated_at": datetime.now().isoformat(),
        }

    # ------------------------------------------------------------------
    # Prévisions de rupture
    # ------------------------------------------------------------------
    async def get_predictions(
        self,
        products: Optional[List[Dict[str, Any]]] = None,
        historical_data: Optional[Dict[str, List[Dict[str, Any]]]] = None,
    ) -> List[Dict[str, Any]]:
        """Prévisions de rupture par produit.

        Sans ``products`` fournis, les données sont lues depuis PostgreSQL.
        """
        if products is None:
            products = await self._build_product_context()

        if historical_data:
            # Compatibilité : historique fourni par un appelant externe.
            for product in products:
                product_id = product.get("id")
                rows = historical_data.get(product_id) or []
                if rows:
                    quantities = [_to_float(r.get("quantity")) for r in rows]
                    if quantities:
                        product["daily_sales"] = float(np.mean(quantities))
                current_stock = _to_int(product.get("current_stock"))
                daily_sales = _to_float(product.get("daily_sales"))
                cover = current_stock / daily_sales if daily_sales > 0 else float("inf")
                product["days_until_rupture"] = (
                    round(cover, 1) if cover != float("inf") else None
                )
                product["risk_level"] = (
                    _risk_level(cover) if cover != float("inf") else "LOW"
                )

        predictions: List[Dict[str, Any]] = []
        for product in products:
            current_stock = _to_int(product.get("current_stock"))
            daily_sales = _to_float(product.get("daily_sales"))
            if daily_sales <= 0:
                cover_days = float("inf")
            else:
                cover_days = current_stock / daily_sales

            predictions.append(
                {
                    "product_id": product.get("id"),
                    "product_name": product.get("name", "Produit"),
                    "product_barcode": product.get("barcode"),
                    "unit": product.get("unit"),
                    "current_stock": current_stock,
                    "daily_sales": round(daily_sales, 2),
                    "sales_last_30": _to_int(product.get("sales_last_30")),
                    "sales_trend": product.get("sales_trend", "stable"),
                    "trend_percent": _to_float(product.get("trend_percent")),
                    "days_until_rupture": (
                        round(cover_days, 1) if cover_days != float("inf") else None
                    ),
                    "risk_level": (
                        _risk_level(cover_days) if cover_days != float("inf") else "LOW"
                    ),
                    "predicted_sales": _to_int(product.get("predicted_sales")),
                    "forecast_next_30_days": _to_int(product.get("predicted_sales")),
                }
            )

        predictions.sort(
            key=lambda item: (
                RISK_ORDER.get(item["risk_level"], 9),
                item["days_until_rupture"]
                if item["days_until_rupture"] is not None
                else 10**9,
            )
        )
        return predictions

    # ------------------------------------------------------------------
    # Recommandations
    # ------------------------------------------------------------------
    async def get_recommendations(
        self,
        products: Optional[List[Dict[str, Any]]] = None,
        lead_time: int = 7,
    ) -> List[Dict[str, Any]]:
        """Recommandations concrètes issues des ventes, achats et lots."""
        if products is None:
            products = await self._build_product_context()

        expiring = await analytics_data_service.get_expiring_batches(90)
        expiring_by_product: Dict[int, List[Dict[str, Any]]] = defaultdict(list)
        for batch in expiring:
            expiring_by_product[_to_int(batch.get("product_id"), -1)].append(batch)

        recommendations: List[Dict[str, Any]] = []
        now_iso = datetime.now().isoformat()

        for product in products:
            product_id = _to_int(product.get("id"), -1)
            name = product.get("name", "Produit")
            current_stock = _to_int(product.get("current_stock"))
            min_stock = _to_int(product.get("min_stock"))
            daily_sales = _to_float(product.get("daily_sales"))
            cover_days = product.get("days_until_rupture")
            predicted_sales = _to_int(product.get("predicted_sales"))

            reorder_point = round(min_stock + daily_sales * lead_time, 1)

            # 1) Rupture imminente / stock sous le point de commande.
            if daily_sales > 0 and (
                cover_days is None
                or cover_days <= lead_time * 2
                or current_stock <= reorder_point
            ):
                coverage = 45  # couverture cible : 45 jours de ventes
                target_stock = daily_sales * coverage + reorder_point
                quantity = max(1, int(round(target_stock - current_stock)))
                urgent = cover_days is not None and cover_days <= lead_time
                recommendations.append(
                    {
                        "product_id": product.get("id"),
                        "product_name": name,
                        "type": "REORDER",
                        "priority": "URGENT" if urgent else "HIGH",
                        "title": f"Réapprovisionner {name}",
                        "message": (
                            f"{name} : stock {current_stock} {product.get('unit') or ''}, "
                            f"ventes moyennes {daily_sales:.1f}/jour, "
                            f"couverture {cover_days if cover_days is not None else '∞'} jours. "
                            f"Commander environ {quantity} unités."
                        ),
                        "current_stock": current_stock,
                        "min_stock": min_stock,
                        "daily_sales": round(daily_sales, 2),
                        "days_until_rupture": cover_days,
                        "reorder_point": reorder_point,
                        "recommended_quantity": quantity,
                        "predicted_sales_30d": predicted_sales,
                        "generated_at": now_iso,
                    }
                )

            # 2) Surstock : couverture très supérieure au besoin.
            elif daily_sales > 0 and cover_days is not None and cover_days > 180:
                recommendations.append(
                    {
                        "product_id": product.get("id"),
                        "product_name": name,
                        "type": "OVERSTOCK",
                        "priority": "NORMAL",
                        "title": f"Surstock de {name}",
                        "message": (
                            f"{name} : stock {current_stock} unités pour environ "
                            f"{int(cover_days)} jours de ventes "
                            f"({predicted_sales} unités prévues sur 30 jours). "
                            "Suspendre les commandes et privilégier l'écoulement."
                        ),
                        "current_stock": current_stock,
                        "daily_sales": round(daily_sales, 2),
                        "days_until_rupture": cover_days,
                        "recommended_quantity": 0,
                        "predicted_sales_30d": predicted_sales,
                        "generated_at": now_iso,
                    }
                )

            # 3) Lots proches de la péremption : à écouler en priorité.
            batches = expiring_by_product.get(product_id, [])
            if batches:
                quantity_at_risk = sum(_to_int(b.get("quantity")) for b in batches)
                soonest = min(_to_int(b.get("days_until_expiry"), 9999) for b in batches)
                recommendations.append(
                    {
                        "product_id": product.get("id"),
                        "product_name": name,
                        "type": "EXPIRY",
                        "priority": "URGENT" if soonest <= 30 else "HIGH",
                        "title": f"Écouler {name} avant péremption",
                        "message": (
                            f"{name} : {quantity_at_risk} unités de "
                            f"{len(batches)} lot(s) expirent dans {soonest} jour(s). "
                            "Planifier une promotion ou un retour fournisseur."
                        ),
                        "current_stock": current_stock,
                        "daily_sales": round(daily_sales, 2),
                        "days_until_rupture": cover_days,
                        "quantity_at_risk": quantity_at_risk,
                        "expiring_batches": len(batches),
                        "days_before_expiry": soonest,
                        "recommended_quantity": 0,
                        "predicted_sales_30d": predicted_sales,
                        "generated_at": now_iso,
                    }
                )

            # 4) Produit dormant : du stock mais aucune vente récente.
            if daily_sales <= 0 and current_stock > 0:
                recommendations.append(
                    {
                        "product_id": product.get("id"),
                        "product_name": name,
                        "type": "DORMANT",
                        "priority": "LOW",
                        "title": f"Aucune vente récente pour {name}",
                        "message": (
                            f"{name} : {current_stock} unités en stock mais aucune "
                            "vente sur les 90 derniers jours. Vérifier le prix, "
                            "la visibilité en rayon ou envisager un déstockage."
                        ),
                        "current_stock": current_stock,
                        "daily_sales": 0,
                        "days_until_rupture": None,
                        "recommended_quantity": 0,
                        "predicted_sales_30d": 0,
                        "generated_at": now_iso,
                    }
                )

        recommendations.sort(
            key=lambda item: (
                PRIORITY_ORDER.get(item.get("priority"), 9),
                item.get("days_until_rupture")
                if item.get("days_until_rupture") is not None
                else 10**9,
            )
        )
        return recommendations

    # ------------------------------------------------------------------
    # Méthodes historiques conservées pour compatibilité
    # ------------------------------------------------------------------
    async def predict_stock_needs(
        self, historical_data: List[Dict[str, Any]], forecast_days: int = 30
    ) -> Dict[str, Any]:
        """Prévision à partir d'une série fournie (compatibilité)."""
        try:
            if not historical_data:
                return {"status": "error", "error": "No historical data provided"}

            df = pd.DataFrame(historical_data)
            if "date" not in df.columns or "quantity" not in df.columns:
                return {
                    "status": "error",
                    "error": "Historical data must contain date and quantity columns",
                }

            df["date"] = pd.to_datetime(df["date"])
            df = df.sort_values("date")

            daily_avg = df["quantity"].mean()
            series = [int(v) for v in df["quantity"].tolist()]
            predictions = forecast_series(series, forecast_days)
            slope, _ = _linear_trend(series)

            return {
                "status": "success",
                "predictions": predictions,
                "forecast_days": forecast_days,
                "daily_average": float(daily_avg),
                "trend": (
                    "increasing"
                    if slope > 0
                    else "decreasing" if slope < 0 else "stable"
                ),
                "generated_at": datetime.now().isoformat(),
            }
        except Exception as exc:  # pragma: no cover - défensif
            return {"status": "error", "error": str(exc)}

    async def predict_ruptures(
        self,
        products: List[Dict[str, Any]],
        historical_data: Dict[str, List[Dict[str, Any]]],
    ) -> Dict[str, Any]:
        """Prévisions de rupture à partir de données fournies (compatibilité)."""
        predictions = await self.get_predictions(products, historical_data)
        return {
            "status": "success",
            "predictions": predictions,
            "high_risk": [p for p in predictions if p["risk_level"] == "CRITICAL"],
            "medium_risk": [p for p in predictions if p["risk_level"] == "HIGH"],
            "low_risk": [
                p for p in predictions if p["risk_level"] in ["MEDIUM", "LOW"]
            ],
            "generated_at": datetime.now().isoformat(),
        }

    async def get_reorder_recommendations(
        self, products: List[Dict[str, Any]], lead_time: int = 7
    ) -> Dict[str, Any]:
        """Recommandations à partir de produits fournis (compatibilité)."""
        recommendations = await self.get_recommendations(products, lead_time)
        return {
            "status": "success",
            "recommendations": recommendations,
            "total_recommendations": len(recommendations),
            "urgent_count": sum(
                1 for r in recommendations if r.get("priority") == "URGENT"
            ),
            "generated_at": datetime.now().isoformat(),
        }


# Global stock prediction service instance
stock_prediction_service = StockPredictionService()
