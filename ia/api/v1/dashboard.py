"""
IA Dashboard API Endpoints for Pharmacie 360
Provides dashboard data and analytics for the IA module
"""

from datetime import datetime
from typing import Any, Dict, List, Optional

from fastapi import APIRouter, HTTPException, Query
from fastapi.responses import JSONResponse

from ...analytics.stock_analysis import stock_analyzer  # noqa: F401 (compat. API)
from ...services.alert_service import alert_service
from ...services.kpi_service import kpi_service
from ...services.stock_prediction import stock_prediction_service

router = APIRouter(prefix="/dashboard", tags=["IA Dashboard"])


def _severity_for(priority: Optional[str]) -> str:
    if priority == "URGENT":
        return "danger"
    if priority == "HIGH":
        return "warning"
    return "info"


def build_alerts(
    predictions: List[Dict[str, Any]],
    recommendations: List[Dict[str, Any]],
) -> List[Dict[str, Any]]:
    """Alertes dérivées des prévisions et recommandations réelles.

    Le service d'alertes historique conserve ses alertes en mémoire ; ici les
    alertes sont recalculées à partir des données de production pour être
    toujours cohérentes avec le stock et les ventes.
    """
    alerts: List[Dict[str, Any]] = []
    now_iso = datetime.now().isoformat()

    for prediction in predictions:
        risk = prediction.get("risk_level")
        if risk not in ("CRITICAL", "HIGH", "MEDIUM"):
            continue
        days = prediction.get("days_until_rupture")
        alerts.append(
            {
                "alert_id": f"rupture-{prediction.get('product_id')}",
                "type": "STOCK_RUPTURE",
                "category": "STOCK_RUPTURE",
                "priority": risk,
                "severity": "danger" if risk == "CRITICAL" else "warning",
                "status": "ACTIVE",
                "product_id": prediction.get("product_id"),
                "title": f"Risque de rupture : {prediction.get('product_name')}",
                "message": (
                    f"{prediction.get('product_name')} : stock "
                    f"{prediction.get('current_stock')} unités, couverture "
                    f"{days if days is not None else '∞'} jour(s) "
                    f"(ventes moyennes {prediction.get('daily_sales')}/jour)."
                ),
                "created_at": now_iso,
            }
        )

    for recommendation in recommendations:
        if recommendation.get("type") != "EXPIRY":
            continue
        alerts.append(
            {
                "alert_id": f"expiry-{recommendation.get('product_id')}",
                "type": "EXPIRY_ALERT",
                "category": "EXPIRY_ALERT",
                "priority": recommendation.get("priority"),
                "severity": _severity_for(recommendation.get("priority")),
                "status": "ACTIVE",
                "product_id": recommendation.get("product_id"),
                "title": recommendation.get("title"),
                "message": recommendation.get("message"),
                "created_at": now_iso,
            }
        )

    order = {"CRITICAL": 0, "URGENT": 0, "HIGH": 1, "MEDIUM": 2, "LOW": 3}
    alerts.sort(key=lambda item: order.get(item.get("priority") or "", 9))
    return alerts


@router.get("/", summary="Get IA Dashboard Overview")
async def get_ia_dashboard():
    """
    Get comprehensive IA dashboard overview with all key metrics

    Returns:
        Dictionary containing:
        - kpis: Key Performance Indicators
        - alerts: Active alerts
        - predictions: Stock predictions
        - recommendations: AI recommendations
    """
    try:
        kpis = await kpi_service.get_current_kpis()
        predictions = await stock_prediction_service.get_predictions()
        recommendations = await stock_prediction_service.get_recommendations()
        alerts = build_alerts(predictions, recommendations)

        return JSONResponse(
            content={
                "status": "success",
                "data": {
                    "kpis": kpis,
                    "alerts": alerts[:10],
                    "predictions": predictions[:10],
                    "recommendations": recommendations[:5],
                    "last_updated": datetime.now().isoformat(),
                },
            }
        )

    except Exception as e:
        raise HTTPException(
            status_code=500, detail=f"Error fetching IA dashboard: {str(e)}"
        )


@router.get("/kpis", summary="Get KPIs Summary")
async def get_kpis_summary():
    """
    Get summary of Key Performance Indicators

    Returns:
        Dictionary with current KPIs and trends
    """
    try:
        kpis = await kpi_service.get_current_kpis()
        return JSONResponse(content={"status": "success", "data": kpis})
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error fetching KPIs: {str(e)}")


@router.get("/alerts", summary="Get Active Alerts")
async def get_active_alerts():
    """
    Get list of active alerts from IA system

    Returns:
        List of active alerts sorted by priority
    """
    try:
        predictions = await stock_prediction_service.get_predictions()
        recommendations = await stock_prediction_service.get_recommendations()
        alerts = build_alerts(predictions, recommendations)
        # Fusionne les alertes éventuellement poussées dans le service mémoire.
        for alert in await alert_service.get_active_alerts():
            if all(a.get("alert_id") != alert.get("alert_id") for a in alerts):
                alerts.append(alert)
        return JSONResponse(
            content={"status": "success", "data": alerts, "count": len(alerts)}
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error fetching alerts: {str(e)}")


@router.get("/predictions", summary="Get Stock Predictions")
async def get_stock_predictions():
    """
    Get stock predictions and rupture risks

    Returns:
        List of products with predicted stock issues
    """
    try:
        predictions = await stock_prediction_service.get_predictions()
        return JSONResponse(
            content={
                "status": "success",
                "data": predictions,
                "count": len(predictions),
            }
        )
    except Exception as e:
        raise HTTPException(
            status_code=500, detail=f"Error fetching predictions: {str(e)}"
        )


@router.get("/recommendations", summary="Get AI Recommendations")
async def get_ai_recommendations():
    """
    Get AI-generated recommendations for stock management

    Returns:
        List of actionable recommendations
    """
    try:
        recommendations = await stock_prediction_service.get_recommendations()
        return JSONResponse(
            content={
                "status": "success",
                "data": recommendations,
                "count": len(recommendations),
            }
        )
    except Exception as e:
        raise HTTPException(
            status_code=500, detail=f"Error fetching recommendations: {str(e)}"
        )


@router.get("/sales-forecast", summary="Get Sales Forecast")
async def get_sales_forecast(
    forecast_days: int = Query(30, ge=1, le=365),
    history_days: int = Query(90, ge=7, le=365),
    product_id: Optional[int] = Query(None, ge=1),
):
    """Prévisions de ventes (historique + projection IA) pour les graphiques."""
    try:
        forecast = await stock_prediction_service.get_sales_forecast(
            forecast_days=forecast_days,
            history_days=history_days,
            product_id=product_id,
        )
        return JSONResponse(content={"status": "success", "data": forecast})
    except Exception as e:
        raise HTTPException(
            status_code=500, detail=f"Error fetching sales forecast: {str(e)}"
        )


@router.get("/rotation-analysis", summary="Get Stock Rotation Analysis")
async def get_rotation_analysis():
    """
    Get detailed stock rotation analysis

    Returns:
        Analysis of stock rotation rates by category and product
    """
    try:
        predictions = await stock_prediction_service.get_predictions()
        fast_moving = [
            p for p in predictions if p.get("days_until_rupture") is not None
            and p["days_until_rupture"] <= 30
        ]
        slow_moving = [
            p for p in predictions if p.get("days_until_rupture") is None
            or p["days_until_rupture"] > 180
        ]
        return JSONResponse(
            content={
                "status": "success",
                "data": {
                    "by_category": [],
                    "by_product": predictions,
                    "average_rotation": round(
                        sum(p.get("daily_sales") or 0 for p in predictions)
                        / len(predictions),
                        2,
                    )
                    if predictions
                    else 0,
                    "fast_moving": fast_moving,
                    "slow_moving": slow_moving,
                },
            }
        )
    except Exception as e:
        raise HTTPException(
            status_code=500, detail=f"Error fetching rotation analysis: {str(e)}"
        )


@router.get("/health", summary="IA Dashboard Health Check")
async def health_check():
    """
    Health check endpoint for IA dashboard

    Returns:
        Health status of all IA services
    """
    try:
        kpi_health = await kpi_service.health_check()
        alert_health = await alert_service.health_check()

        return JSONResponse(
            content={
                "status": "healthy",
                "services": {
                    "kpi_service": kpi_health,
                    "alert_service": alert_health,
                    "stock_prediction": "healthy",
                },
                "timestamp": datetime.now().isoformat(),
            }
        )
    except Exception as e:
        return JSONResponse(
            content={
                "status": "degraded",
                "error": str(e),
                "timestamp": datetime.now().isoformat(),
            }
        )
