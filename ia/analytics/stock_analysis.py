"""
Stock Analytics Module for Pharmacie 360
Provides predictive analytics for stock management
"""

import json
import logging
from datetime import date, datetime, timedelta
from pathlib import Path
from typing import Any, Dict, List, Optional, Tuple

import numpy as np
import pandas as pd
from sklearn.ensemble import IsolationForest
from sklearn.preprocessing import StandardScaler
from statsmodels.tsa.arima.model import ARIMA
from statsmodels.tsa.statespace.sarimax import SARIMAX

# Configure logging
logger = logging.getLogger(__name__)


class StockAnalyzer:
    """
    Analyzes stock rotation and predicts potential ruptures
    """

    def __init__(self):
        """Initialize stock analyzer"""
        self.scaler = StandardScaler()
        self.anomaly_detector = IsolationForest(contamination=0.1)

    def calculate_rotation_rate(
        self, sales_data: List[Dict[str, Any]], product_id: int, days_window: int = 30
    ) -> float:
        """
        Calculate stock rotation rate for a product

        Args:
            sales_data: List of sales records
            product_id: Product ID to analyze
            days_window: Time window in days

        Returns:
            Rotation rate (units per day)
        """
        try:
            # Filter sales for this product
            product_sales = [s for s in sales_data if s.get("product_id") == product_id]

            if not product_sales:
                return 0.0

            # Convert to DataFrame
            df = pd.DataFrame(product_sales)

            # Convert date column
            if "sale_date" in df.columns:
                df["sale_date"] = pd.to_datetime(df["sale_date"])
            elif "created_at" in df.columns:
                df["sale_date"] = pd.to_datetime(df["created_at"])

            # Filter by time window
            cutoff_date = datetime.now() - timedelta(days=days_window)
            df = df[df["sale_date"] >= cutoff_date]

            if df.empty:
                return 0.0

            # Calculate total quantity sold
            total_quantity = df["quantity"].sum()
            total_days = (df["sale_date"].max() - df["sale_date"].min()).days + 1

            return total_quantity / total_days if total_days > 0 else 0.0

        except Exception as e:
            logger.error(f"Error calculating rotation rate: {e}")
            return 0.0

    def predict_stock_rupture(
        self,
        stock_data: List[Dict[str, Any]],
        product_id: int,
        current_stock: int,
        safety_threshold: float = 0.2,
    ) -> Tuple[bool, float, int]:
        """
        Predict if a product is at risk of stock rupture

        Args:
            stock_data: Historical stock data
            product_id: Product ID
            current_stock: Current stock level
            safety_threshold: Minimum safety stock percentage

        Returns:
            Tuple of (is_at_risk, risk_score, days_until_rupture)
        """
        try:
            # Filter stock data for product
            product_stock = [s for s in stock_data if s.get("product_id") == product_id]

            if not product_stock or len(product_stock) < 3:
                # Not enough data - use simple heuristic
                if current_stock <= 0:
                    return True, 1.0, 0
                return False, 0.0, 999

            # Convert to DataFrame
            df = pd.DataFrame(product_stock)
            df = df.sort_values("date")

            # Calculate daily consumption rate
            df["daily_consumption"] = df["stock_level"].diff().abs()
            avg_consumption = df["daily_consumption"].mean()

            if avg_consumption <= 0:
                return False, 0.0, 999

            # Calculate days until rupture
            days_until_rupture = int(current_stock / avg_consumption)

            # Calculate risk score (0-1)
            safety_stock = current_stock * safety_threshold
            risk_score = max(
                0, min(1, 1 - (current_stock - safety_stock) / (current_stock + 1))
            )

            # Determine if at risk
            is_at_risk = days_until_rupture <= 7 or risk_score > 0.7

            return is_at_risk, risk_score, days_until_rupture

        except Exception as e:
            logger.error(f"Error predicting stock rupture: {e}")
            return False, 0.0, 999

    def analyze_stock_rotation(
        self, sales_data: List[Dict[str, Any]], products: List[Dict[str, Any]]
    ) -> List[Dict[str, Any]]:
        """
        Analyze stock rotation for all products

        Args:
            sales_data: List of sales records
            products: List of products

        Returns:
            List of rotation analysis results per product
        """
        results = []

        for product in products:
            product_id = product.get("id")
            rotation_rate = self.calculate_rotation_rate(sales_data, product_id)

            # Categorize rotation
            if rotation_rate > 10:
                category = "FAST"
            elif rotation_rate > 2:
                category = "MEDIUM"
            elif rotation_rate > 0:
                category = "SLOW"
            else:
                category = "STATIC"

            results.append(
                {
                    "product_id": product_id,
                    "product_name": product.get("name", "Unknown"),
                    "rotation_rate": round(rotation_rate, 2),
                    "category": category,
                    "current_stock": product.get("current_stock", 0),
                    "recommended_stock": self._calculate_recommended_stock(
                        rotation_rate, product.get("current_stock", 0)
                    ),
                }
            )

        # Sort by rotation rate (descending)
        results.sort(key=lambda x: x["rotation_rate"], reverse=True)

        return results

    def _calculate_recommended_stock(
        self, rotation_rate: float, current_stock: int
    ) -> int:
        """
        Calculate recommended stock level based on rotation rate

        Args:
            rotation_rate: Rotation rate in units/day
            current_stock: Current stock level

        Returns:
            Recommended stock level
        """
        if rotation_rate <= 0:
            return current_stock

        # Calculate optimal stock for 30 days
        optimal_stock = int(rotation_rate * 30)

        # Add safety margin
        safety_margin = int(optimal_stock * 0.3)

        return optimal_stock + safety_margin

    def detect_anomalies(
        self, sales_data: List[Dict[str, Any]]
    ) -> List[Dict[str, Any]]:
        """
        Detect anomalous sales patterns

        Args:
            sales_data: List of sales records

        Returns:
            List of anomalies detected
        """
        if not sales_data or len(sales_data) < 10:
            return []

        # Convert to DataFrame
        df = pd.DataFrame(sales_data)

        # Ensure we have quantity column
        if "quantity" not in df.columns:
            return []

        # Prepare features
        features = df[["quantity"]].fillna(0)

        # Scale features
        features_scaled = self.scaler.fit_transform(features)

        # Detect anomalies
        anomalies = self.anomaly_detector.fit_predict(features_scaled)

        # Get anomaly indices
        anomaly_indices = np.where(anomalies == -1)[0]

        # Return anomaly details
        results = []
        for idx in anomaly_indices:
            row = df.iloc[idx]
            results.append(
                {
                    "sale_id": row.get("id"),
                    "product_id": row.get("product_id"),
                    "quantity": row.get("quantity"),
                    "date": row.get("sale_date", row.get("created_at")),
                    "anomaly_score": 1.0,  # Simplified
                    "type": (
                        "HIGH_VOLUME"
                        if row.get("quantity", 0) > df["quantity"].quantile(0.95)
                        else "LOW_VOLUME"
                    ),
                }
            )

        return results

    def generate_kpis(
        self, sales_data: List[Dict[str, Any]], products: List[Dict[str, Any]]
    ) -> Dict[str, Any]:
        """
        Generate Key Performance Indicators for stock management

        Args:
            sales_data: List of sales records
            products: List of products

        Returns:
            Dictionary with KPIs
        """
        try:
            # Convert to DataFrames
            sales_df = pd.DataFrame(sales_data)
            products_df = pd.DataFrame(products)

            # Total sales
            total_sales = (
                sales_df["quantity"].sum() if "quantity" in sales_df.columns else 0
            )
            total_revenue = (
                sales_df["total_amount"].sum()
                if "total_amount" in sales_df.columns
                else 0
            )

            # Active products
            if "is_active" in products_df.columns:
                active_mask = products_df["is_active"].astype(bool)
            else:
                active_mask = pd.Series(True, index=products_df.index)
            active_products = int(active_mask.sum())

            # Low stock products (produits actifs sous leur stock minimum)
            low_stock = 0
            if (
                "current_stock" in products_df.columns
                and "stock_min" in products_df.columns
            ):
                low_stock = int(
                    (
                        (products_df["current_stock"] < products_df["stock_min"])
                        & active_mask
                    ).sum()
                )

            # Calculate average rotation
            avg_rotation = 0
            if len(products_df) > 0:
                rotation_rates = []
                for _, product in products_df.iterrows():
                    rate = self.calculate_rotation_rate(
                        sales_data, product.get("id", 0)
                    )
                    rotation_rates.append(rate)
                avg_rotation = np.mean(rotation_rates)

            return {
                "total_sales": int(total_sales),
                "total_revenue": float(total_revenue),
                "active_products": int(active_products),
                "low_stock_products": int(low_stock),
                "avg_rotation_rate": float(avg_rotation),
                "stock_turnover_ratio": (
                    float(total_sales / active_products) if active_products > 0 else 0
                ),
                "last_updated": datetime.now().isoformat(),
            }

        except Exception as e:
            logger.error(f"Error generating KPIs: {e}")
            return {"error": str(e), "last_updated": datetime.now().isoformat()}


# Global analyzer instance
stock_analyzer = StockAnalyzer()


def stock_rotation_analysis(
    sales_data: List[Dict[str, Any]], products: List[Dict[str, Any]]
) -> List[Dict[str, Any]]:
    """
    Analyze stock rotation for all products

    Args:
        sales_data: List of sales records
        products: List of products

    Returns:
        List of rotation analysis results
    """
    return stock_analyzer.analyze_stock_rotation(sales_data, products)


def predict_stock_ruptures(
    stock_data: List[Dict[str, Any]], products: List[Dict[str, Any]]
) -> List[Dict[str, Any]]:
    """
    Predict stock ruptures for all products

    Args:
        stock_data: Historical stock data
        products: List of products

    Returns:
        List of rupture predictions
    """
    results = []

    for product in products:
        product_id = product.get("id")
        current_stock = product.get("current_stock", 0)

        is_at_risk, risk_score, days_until_rupture = (
            stock_analyzer.predict_stock_rupture(stock_data, product_id, current_stock)
        )

        results.append(
            {
                "product_id": product_id,
                "product_name": product.get("name", "Unknown"),
                "current_stock": current_stock,
                "is_at_risk": is_at_risk,
                "risk_score": round(risk_score, 2),
                "days_until_rupture": days_until_rupture,
                "status": (
                    "CRITICAL"
                    if days_until_rupture <= 3
                    else "WARNING" if days_until_rupture <= 7 else "OK"
                ),
            }
        )

    # Sort by risk (highest first)
    results.sort(key=lambda x: x["risk_score"], reverse=True)

    return results


def generate_stock_kpis(
    sales_data: List[Dict[str, Any]], products: List[Dict[str, Any]]
) -> Dict[str, Any]:
    """
    Generate stock KPIs

    Args:
        sales_data: List of sales records
        products: List of products

    Returns:
        Dictionary with KPIs
    """
    return stock_analyzer.generate_kpis(sales_data, products)
