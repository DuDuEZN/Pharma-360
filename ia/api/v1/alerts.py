"""
Alerts API Endpoints for Pharmacie 360 IA Module
Provides endpoints for managing and retrieving alerts
"""

from fastapi import APIRouter, HTTPException, Depends
from fastapi.responses import JSONResponse
from typing import Dict, Any, List, Optional
from datetime import datetime

from ...services.alert_service import alert_service
from ...analytics.stock_analysis import stock_analyzer

router = APIRouter(prefix="/alerts", tags=["Alerts"])


@router.get("/", summary="Get All Active Alerts")
async def get_all_alerts():
    """
    Get all active alerts from the IA system
    
    Returns:
        List of all active alerts sorted by priority
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


@router.get("/stats", summary="Get Alert Statistics")
async def get_alert_stats():
    """
    Get statistics about alerts
    
    Returns:
        Dictionary with alert statistics (count by type, priority, etc.)
    """
    try:
        stats = await alert_service.get_alert_stats()
        return JSONResponse(content={
            "status": "success",
            "data": stats
        })
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Error fetching alert stats: {str(e)}"
        )


@router.get("/{alert_id}", summary="Get Specific Alert")
async def get_alert(alert_id: str):
    """
    Get a specific alert by ID
    
    Args:
        alert_id: Alert ID
        
    Returns:
        Alert data or 404 if not found
    """
    try:
        alert = await alert_service.get_alert_by_id(alert_id)
        if not alert:
            raise HTTPException(status_code=404, detail="Alert not found")
        return JSONResponse(content={
            "status": "success",
            "data": alert
        })
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Error fetching alert: {str(e)}"
        )


@router.post("/generate", summary="Generate Alerts")
async def generate_alerts():
    """
    Trigger alert generation based on current data
    
    Returns:
        List of newly generated alerts
    """
    try:
        # In a real implementation, this would fetch current data
        # and generate alerts based on it
        # For now, return a success response
        
        # Mock: Generate some test alerts
        test_alerts = [
            {
                'alert_id': f"test-{datetime.now().timestamp()}",
                'type': 'STOCK_RUPTURE',
                'priority': 'HIGH',
                'category': 'STOCK_RUPTURE',
                'title': 'Test Alert - Stock Rupture',
                'message': 'This is a test alert for stock rupture detection',
                'status': 'ACTIVE',
                'created_at': datetime.now().isoformat(),
                'expires_at': (datetime.now() + timedelta(days=1)).isoformat()
            }
        ]
        
        return JSONResponse(content={
            "status": "success",
            "data": test_alerts,
            "count": len(test_alerts),
            "message": "Alerts generated successfully"
        })
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Error generating alerts: {str(e)}"
        )


@router.post("/stock-alerts", summary="Generate Stock Alerts")
async def generate_stock_alerts(products: List[Dict[str, Any]] = None):
    """
    Generate alerts based on stock data
    
    Args:
        products: Optional list of products to analyze
        
    Returns:
        List of stock-related alerts
    """
    try:
        # If no products provided, fetch from database
        # For now, use empty list
        stock_data = []
        
        alerts = await alert_service.generate_stock_alerts(
            products or [],
            stock_data
        )
        
        # Add alerts to the service
        for alert in alerts:
            await alert_service.add_alert(alert)
        
        return JSONResponse(content={
            "status": "success",
            "data": alerts,
            "count": len(alerts),
            "message": f"Generated {len(alerts)} stock alerts"
        })
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Error generating stock alerts: {str(e)}"
        )


@router.post("/sales-alerts", summary="Generate Sales Alerts")
async def generate_sales_alerts(sales_data: List[Dict[str, Any]] = None):
    """
    Generate alerts based on sales data
    
    Args:
        sales_data: Optional list of sales data to analyze
        
    Returns:
        List of sales-related alerts
    """
    try:
        alerts = await alert_service.generate_sales_alerts(
            sales_data or []
        )
        
        # Add alerts to the service
        for alert in alerts:
            await alert_service.add_alert(alert)
        
        return JSONResponse(content={
            "status": "success",
            "data": alerts,
            "count": len(alerts),
            "message": f"Generated {len(alerts)} sales alerts"
        })
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Error generating sales alerts: {str(e)}"
        )


@router.put("/{alert_id}/dismiss", summary="Dismiss Alert")
async def dismiss_alert(alert_id: str):
    """
    Dismiss a specific alert
    
    Args:
        alert_id: Alert ID to dismiss
        
    Returns:
        Success/failure message
    """
    try:
        success = await alert_service.dismiss_alert(alert_id)
        if not success:
            raise HTTPException(status_code=404, detail="Alert not found")
        
        return JSONResponse(content={
            "status": "success",
            "message": f"Alert {alert_id} dismissed"
        })
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Error dismissing alert: {str(e)}"
        )


@router.post("/clear-expired", summary="Clear Expired Alerts")
async def clear_expired_alerts():
    """
    Clear all expired alerts
    
    Returns:
        Number of alerts cleared
    """
    try:
        count = await alert_service.clear_expired_alerts()
        return JSONResponse(content={
            "status": "success",
            "message": f"Cleared {count} expired alerts",
            "count": count
        })
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Error clearing expired alerts: {str(e)}"
        )


@router.get("/critical", summary="Get Critical Alerts")
async def get_critical_alerts():
    """
    Get only critical priority alerts
    
    Returns:
        List of critical alerts
    """
    try:
        all_alerts = await alert_service.get_active_alerts()
        critical_alerts = [
            alert for alert in all_alerts
            if alert.get('priority') == 'CRITICAL'
        ]
        
        return JSONResponse(content={
            "status": "success",
            "data": critical_alerts,
            "count": len(critical_alerts)
        })
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Error fetching critical alerts: {str(e)}"
        )


@router.get("/high", summary="Get High Priority Alerts")
async def get_high_alerts():
    """
    Get high priority alerts
    
    Returns:
        List of high priority alerts
    """
    try:
        all_alerts = await alert_service.get_active_alerts()
        high_alerts = [
            alert for alert in all_alerts
            if alert.get('priority') in ['CRITICAL', 'HIGH']
        ]
        
        return JSONResponse(content={
            "status": "success",
            "data": high_alerts,
            "count": len(high_alerts)
        })
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Error fetching high priority alerts: {str(e)}"
        )


@router.get("/by-type/{alert_type}", summary="Get Alerts by Type")
async def get_alerts_by_type(alert_type: str):
    """
    Get alerts filtered by type
    
    Args:
        alert_type: Alert type (e.g., STOCK_RUPTURE, EXPIRY_ALERT)
        
    Returns:
        List of alerts of the specified type
    """
    try:
        all_alerts = await alert_service.get_active_alerts()
        filtered_alerts = [
            alert for alert in all_alerts
            if alert.get('type') == alert_type
        ]
        
        return JSONResponse(content={
            "status": "success",
            "data": filtered_alerts,
            "count": len(filtered_alerts),
            "type": alert_type
        })
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Error fetching alerts by type: {str(e)}"
        )


@router.get("/health", summary="Alerts Service Health Check")
async def health_check():
    """
    Health check endpoint for alerts service
    
    Returns:
        Health status of the alerts service
    """
    try:
        health = await alert_service.health_check()
        return JSONResponse(content={
            "status": "healthy",
            "data": health
        })
    except Exception as e:
        return JSONResponse(content={
            "status": "degraded",
            "error": str(e)
        })
