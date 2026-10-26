"""
KPI API Endpoints for Pharmacie 360
Provides REST API for KPI generation and retrieval
"""

from fastapi import APIRouter, Depends, HTTPException
from fastapi.responses import JSONResponse
from typing import Optional
from datetime import datetime
from ia.services.kpi_service import kpi_service

router = APIRouter(prefix="/kpis", tags=["KPIs"])


@router.get("/daily", summary="Get Daily KPIs")
async def get_daily_kpis(
    date: Optional[str] = None
):
    """
    Get daily KPIs
    
    Returns comprehensive KPIs for a specific date or today.
    """
    try:
        if date:
            # Validate date format
            try:
                datetime.strptime(date, '%Y-%m-%d')
            except ValueError:
                raise HTTPException(
                    status_code=400,
                    detail="Invalid date format. Use YYYY-MM-DD"
                )
        
        kpis = await kpi_service.generate_daily_kpis(date)
        
        if kpis.get('status') == 'error':
            raise HTTPException(
                status_code=500,
                detail=kpis.get('error', 'Error generating KPIs')
            )
        
        return JSONResponse(content=kpis)
        
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Error generating daily KPIs: {str(e)}"
        )


@router.get("/weekly", summary="Get Weekly KPIs")
async def get_weekly_kpis(
    start_date: Optional[str] = None
):
    """
    Get weekly KPIs
    
    Returns aggregated KPIs for a week starting from start_date or current week.
    """
    try:
        if start_date:
            try:
                datetime.strptime(start_date, '%Y-%m-%d')
            except ValueError:
                raise HTTPException(
                    status_code=400,
                    detail="Invalid date format. Use YYYY-MM-DD"
                )
        
        kpis = await kpi_service.generate_weekly_kpis(start_date)
        
        if kpis.get('status') == 'error':
            raise HTTPException(
                status_code=500,
                detail=kpis.get('error', 'Error generating KPIs')
            )
        
        return JSONResponse(content=kpis)
        
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Error generating weekly KPIs: {str(e)}"
        )


@router.get("/monthly", summary="Get Monthly KPIs")
async def get_monthly_kpis(
    year: Optional[int] = None,
    month: Optional[int] = None
):
    """
    Get monthly KPIs
    
    Returns comprehensive KPIs for a specific month or current month.
    """
    try:
        if year is None:
            year = datetime.now().year
        
        if month is None:
            month = datetime.now().month
        
        if month < 1 or month > 12:
            raise HTTPException(
                status_code=400,
                detail="Month must be between 1 and 12"
            )
        
        kpis = await kpi_service.generate_monthly_kpis(year, month)
        
        if kpis.get('status') == 'error':
            raise HTTPException(
                status_code=500,
                detail=kpis.get('error', 'Error generating KPIs')
            )
        
        return JSONResponse(content=kpis)
        
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Error generating monthly KPIs: {str(e)}"
        )


@router.get("/overall", summary="Get Overall Performance Score")
async def get_overall_performance():
    """
    Get overall performance score
    
    Returns the current overall performance score and grade.
    """
    try:
        # Get today's KPIs
        kpis = await kpi_service.generate_daily_kpis()
        
        if kpis.get('status') == 'error':
            raise HTTPException(
                status_code=500,
                detail=kpis.get('error', 'Error generating KPIs')
            )
        
        return JSONResponse(content=kpis.get('overall', {}))
        
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Error generating overall performance: {str(e)}"
        )


@router.get("/health", summary="KPI Service Health Check")
async def kpi_health_check():
    """
    Check KPI service health
    """
    return {
        'status': 'healthy',
        'service': 'KPI Generation',
        'version': '1.0.0',
        'capabilities': [
            'daily_kpis',
            'weekly_kpis',
            'monthly_kpis',
            'overall_score',
            'automatic_generation'
        ]
    }
