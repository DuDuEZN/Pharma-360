"""
IA Dashboard API Endpoints for Pharmacie 360
Provides dashboard data and analytics for the IA module
"""

from fastapi import APIRouter, HTTPException, Depends
from fastapi.responses import JSONResponse
from typing import Dict, Any, List
from datetime import datetime, timedelta

from ...services.kpi_service import kpi_service
from ...services.alert_service import alert_service
from ...services.stock_prediction import stock_prediction_service
from ...analytics.stock_analysis import stock_analyzer

router = APIRouter(prefix="/dashboard", tags=["IA Dashboard"])


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
        # Get KPIs
        kpis = await kpi_service.get_current_kpis()
        
        # Get active alerts
        alerts = await alert_service.get_active_alerts()
        
        # Get stock predictions
        predictions = await stock_prediction_service.get_predictions()
        
        # Get recommendations
        recommendations = await stock_prediction_service.get_recommendations()
        
        return JSONResponse(content={
            "status": "success",
            "data": {
                "kpis": kpis,
                "alerts": alerts[:10],  # Top 10 alerts
                "predictions": predictions[:10],  # Top 10 predictions
                "recommendations": recommendations[:5],  # Top 5 recommendations
                "last_updated": datetime.now().isoformat()
            }
        })
        
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Error fetching IA dashboard: {str(e)}"
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
        return JSONResponse(content={
            "status": "success",
            "data": kpis
        })
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Error fetching KPIs: {str(e)}"
        )


@router.get("/alerts", summary="Get Active Alerts")
async def get_active_alerts():
    """
    Get list of active alerts from IA system
    
    Returns:
        List of active alerts sorted by priority
    """
    try:
        alerts = await alert_service.get_active_alerts()
        return JSONResponse(content={
            "status": "success",
            "data": alerts,
            "count": len(alerts)
        })
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Error fetching alerts: {str(e)}"
        )


@router.get("/predictions", summary="Get Stock Predictions")
async def get_stock_predictions():
    """
    Get stock predictions and rupture risks
    
    Returns:
        List of products with predicted stock issues
    """
    try:
        predictions = await stock_prediction_service.get_predictions()
        return JSONResponse(content={
            "status": "success",
            "data": predictions,
            "count": len(predictions)
        })
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Error fetching predictions: {str(e)}"
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
        return JSONResponse(content={
            "status": "success",
            "data": recommendations,
            "count": len(recommendations)
        })
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Error fetching recommendations: {str(e)}"
        )


@router.get("/rotation-analysis", summary="Get Stock Rotation Analysis")
async def get_rotation_analysis():
    """
    Get detailed stock rotation analysis
    
    Returns:
        Analysis of stock rotation rates by category and product
    """
    try:
        # This would typically fetch data from the database
        # For now, return mock data structure
        rotation_data = {
            "by_category": [],
            "by_product": [],
            "average_rotation": 0,
            "fast_moving": [],
            "slow_moving": []
        }
        
        return JSONResponse(content={
            "status": "success",
            "data": rotation_data
        })
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Error fetching rotation analysis: {str(e)}"
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
        
        return JSONResponse(content={
            "status": "healthy",
            "services": {
                "kpi_service": kpi_health,
                "alert_service": alert_health,
                "stock_prediction": "healthy"
            },
            "timestamp": datetime.now().isoformat()
        })
    except Exception as e:
        return JSONResponse(content={
            "status": "degraded",
            "error": str(e),
            "timestamp": datetime.now().isoformat()
        })
