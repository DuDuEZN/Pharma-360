"""
Stock Prediction Service for Pharmacie 360 IA Module
Provides ML-based stock prediction capabilities
"""

import asyncio
from datetime import datetime, timedelta
from typing import Dict, Any, List, Optional
import numpy as np
import pandas as pd


class StockPredictionService:
    """
    Service for predicting stock needs and potential shortages
    """
    
    def __init__(self):
        """Initialize stock prediction service"""
        self.model = None
        self.trained = False
    
    async def predict_stock_needs(
        self,
        historical_data: List[Dict[str, Any]],
        forecast_days: int = 30
    ) -> Dict[str, Any]:
        """
        Predict future stock needs based on historical data
        
        Args:
            historical_data: List of historical sales/stock data
            forecast_days: Number of days to forecast
            
        Returns:
            Dictionary with predictions and recommendations
        """
        try:
            if not historical_data:
                return {
                    'status': 'error',
                    'error': 'No historical data provided'
                }
            
            # Convert to DataFrame
            df = pd.DataFrame(historical_data)
            
            if 'date' not in df.columns or 'quantity' not in df.columns:
                return {
                    'status': 'error',
                    'error': 'Historical data must contain date and quantity columns'
                }
            
            # Simple moving average prediction (placeholder for ML model)
            df['date'] = pd.to_datetime(df['date'])
            df = df.sort_values('date')
            
            # Calculate daily average
            daily_avg = df['quantity'].mean()
            
            # Calculate trend (simple linear regression)
            X = np.arange(len(df)).reshape(-1, 1)
            y = df['quantity'].values
            
            # Simple trend calculation
            if len(df) > 1:
                # Calculate slope
                n = len(df)
                x_mean = X.mean()
                y_mean = y.mean()
                numerator = np.sum((X - x_mean) * (y - y_mean))
                denominator = np.sum((X - x_mean) ** 2)
                slope = numerator / denominator if denominator != 0 else 0
                intercept = y_mean - slope * x_mean
                
                # Predict for next days
                last_x = len(df)
                predictions = []
                for day in range(1, forecast_days + 1):
                    pred_x = last_x + day
                    pred_y = slope * pred_x + intercept
                    predictions.append(max(0, int(pred_y)))
            else:
                predictions = [int(daily_avg)] * forecast_days
            
            return {
                'status': 'success',
                'predictions': predictions,
                'forecast_days': forecast_days,
                'daily_average': float(daily_avg),
                'trend': 'increasing' if slope > 0 else 'decreasing' if slope < 0 else 'stable',
                'generated_at': datetime.now().isoformat()
            }
            
        except Exception as e:
            return {
                'status': 'error',
                'error': str(e)
            }
    
    async def predict_ruptures(
        self,
        products: List[Dict[str, Any]],
        historical_data: Dict[str, List[Dict[str, Any]]]
    ) -> Dict[str, Any]:
        """
        Predict potential stock ruptures
        
        Args:
            products: List of product information
            historical_data: Dictionary mapping product IDs to historical sales data
            
        Returns:
            Dictionary with rupture predictions
        """
        try:
            predictions = []
            
            for product in products:
                product_id = product.get('id')
                current_stock = product.get('current_stock', 0)
                daily_sales = product.get('daily_sales', 0)
                
                if product_id in historical_data:
                    # Calculate average daily sales from historical data
                    sales_data = historical_data[product_id]
                    if sales_data:
                        daily_sales = sum(s.get('quantity', 0) for s in sales_data) / len(sales_data)
                
                if daily_sales > 0:
                    days_until_rupture = current_stock / daily_sales
                else:
                    days_until_rupture = float('inf')
                
                predictions.append({
                    'product_id': product_id,
                    'product_name': product.get('name', 'Unknown'),
                    'current_stock': current_stock,
                    'daily_sales': daily_sales,
                    'days_until_rupture': days_until_rupture,
                    'risk_level': self._calculate_risk_level(days_until_rupture, current_stock)
                })
            
            # Sort by risk level (most critical first)
            predictions.sort(key=lambda x: x['risk_level'], reverse=True)
            
            return {
                'status': 'success',
                'predictions': predictions,
                'high_risk': [p for p in predictions if p['risk_level'] == 'CRITICAL'],
                'medium_risk': [p for p in predictions if p['risk_level'] == 'HIGH'],
                'low_risk': [p for p in predictions if p['risk_level'] in ['MEDIUM', 'LOW']],
                'generated_at': datetime.now().isoformat()
            }
            
        except Exception as e:
            return {
                'status': 'error',
                'error': str(e)
            }
    
    def _calculate_risk_level(self, days_until_rupture: float, current_stock: int) -> str:
        """Calculate risk level based on days until rupture"""
        if days_until_rupture <= 3:
            return 'CRITICAL'
        elif days_until_rupture <= 7:
            return 'HIGH'
        elif days_until_rupture <= 30:
            return 'MEDIUM'
        else:
            return 'LOW'
    
    async def get_reorder_recommendations(
        self,
        products: List[Dict[str, Any]],
        lead_time: int = 7
    ) -> Dict[str, Any]:
        """
        Generate reorder recommendations based on predictions
        
        Args:
            products: List of product information
            lead_time: Average lead time for reordering (in days)
            
        Returns:
            Dictionary with reorder recommendations
        """
        try:
            recommendations = []
            
            for product in products:
                product_id = product.get('id')
                current_stock = product.get('current_stock', 0)
                min_stock = product.get('min_stock', 0)
                daily_sales = product.get('daily_sales', 0)
                
                if daily_sales <= 0:
                    continue
                
                days_until_rupture = current_stock / daily_sales
                
                # Calculate reorder point
                reorder_point = min_stock + (daily_sales * lead_time)
                
                if current_stock <= reorder_point:
                    # Calculate recommended order quantity
                    recommended_quantity = max(
                        reorder_point - current_stock + (daily_sales * 30),
                        0
                    )
                    
                    recommendations.append({
                        'product_id': product_id,
                        'product_name': product.get('name', 'Unknown'),
                        'current_stock': current_stock,
                        'min_stock': min_stock,
                        'reorder_point': reorder_point,
                        'recommended_quantity': int(recommended_quantity),
                        'priority': 'URGENT' if days_until_rupture <= lead_time else 'NORMAL'
                    })
            
            # Sort by priority
            recommendations.sort(
                key=lambda x: (0 if x['priority'] == 'URGENT' else 1, -x['recommended_quantity'])
            )
            
            return {
                'status': 'success',
                'recommendations': recommendations,
                'total_recommendations': len(recommendations),
                'urgent_count': sum(1 for r in recommendations if r['priority'] == 'URGENT'),
                'generated_at': datetime.now().isoformat()
            }
            
        except Exception as e:
            return {
                'status': 'error',
                'error': str(e)
            }


# Global stock prediction service instance
stock_prediction_service = StockPredictionService()
