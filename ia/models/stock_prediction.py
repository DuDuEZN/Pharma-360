"""
Stock Prediction Model for Pharmacie 360
Machine learning model for predicting stock needs
"""

import json
import logging
from datetime import datetime, timedelta
from typing import Dict, Any, List, Optional, Tuple
from pathlib import Path

import pandas as pd
import numpy as np
import joblib
from sklearn.ensemble import RandomForestRegressor
from sklearn.model_selection import train_test_split
from sklearn.metrics import mean_absolute_error, mean_squared_error
from sklearn.preprocessing import StandardScaler, OneHotEncoder
from sklearn.compose import ColumnTransformer
from sklearn.pipeline import Pipeline

# Configure logging
logger = logging.getLogger(__name__)


class StockPredictionModel:
    """
    ML model for predicting future stock needs
    """
    
    MODEL_VERSION = "1.0.0"
    MODEL_FILE = "stock_prediction_model.pkl"
    SCALER_FILE = "stock_scaler.pkl"
    ENCODER_FILE = "stock_encoder.pkl"
    
    def __init__(
        self,
        model_dir: str = "./models",
        retrain: bool = False
    ):
        """
        Initialize stock prediction model
        
        Args:
            model_dir: Directory to save/load models
            retrain: Whether to retrain the model
        """
        self.model_dir = Path(model_dir)
        self.model_dir.mkdir(parents=True, exist_ok=True)
        
        self.model = None
        self.scaler = None
        self.encoder = None
        self.preprocessor = None
        self.is_trained = False
        
        if not retrain:
            self._load_model()
    
    def _load_model(self) -> bool:
        """Load model from disk"""
        try:
            model_path = self.model_dir / self.MODEL_FILE
            scaler_path = self.model_dir / self.SCALER_FILE
            encoder_path = self.model_dir / self.ENCODER_FILE
            
            if model_path.exists() and scaler_path.exists():
                self.model = joblib.load(model_path)
                self.scaler = joblib.load(scaler_path)
                if encoder_path.exists():
                    self.encoder = joblib.load(encoder_path)
                self.is_trained = True
                logger.info("Model loaded successfully")
                return True
        except Exception as e:
            logger.error(f"Error loading model: {e}")
        
        return False
    
    def _save_model(self) -> bool:
        """Save model to disk"""
        try:
            model_path = self.model_dir / self.MODEL_FILE
            scaler_path = self.model_dir / self.SCALER_FILE
            encoder_path = self.model_dir / self.ENCODER_FILE
            
            if self.model:
                joblib.dump(self.model, model_path)
            if self.scaler:
                joblib.dump(self.scaler, scaler_path)
            if self.encoder:
                joblib.dump(self.encoder, encoder_path)
            
            logger.info("Model saved successfully")
            return True
            
        except Exception as e:
            logger.error(f"Error saving model: {e}")
            return False
    
    def _create_preprocessor(self) -> ColumnTransformer:
        """Create preprocessing pipeline"""
        numeric_features = ['quantity', 'days_since_last_sale', 'avg_daily_sales']
        categorical_features = ['product_category', 'supplier', 'day_of_week']
        
        preprocessor = ColumnTransformer(
            transformers=[
                ('num', StandardScaler(), numeric_features),
                ('cat', OneHotEncoder(handle_unknown='ignore'), categorical_features)
            ]
        )
        
        return preprocessor
    
    def prepare_training_data(
        self,
        historical_data: List[Dict[str, Any]]
    ) -> Tuple[pd.DataFrame, pd.Series]:
        """
        Prepare training data for the model
        
        Args:
            historical_data: List of historical sales/stock records
            
        Returns:
            Tuple of (features, target)
        """
        try:
            # Convert to DataFrame
            df = pd.DataFrame(historical_data)
            
            # Ensure required columns exist
            required_cols = ['product_id', 'date', 'quantity']
            for col in required_cols:
                if col not in df.columns:
                    raise ValueError(f"Missing required column: {col}")
            
            # Convert date
            df['date'] = pd.to_datetime(df['date'])
            
            # Create features
            df['days_since_last_sale'] = df.groupby('product_id')['date'].diff().dt.days.fillna(0)
            df['avg_daily_sales'] = df.groupby('product_id')['quantity'].transform(
                lambda x: x.rolling(7).mean().fillna(0)
            )
            df['day_of_week'] = df['date'].dt.dayofweek
            df['day_of_month'] = df['date'].dt.day
            df['month'] = df['date'].dt.month
            
            # Create target: next day's sales
            df['next_day_sales'] = df.groupby('product_id')['quantity'].shift(-1).fillna(0)
            
            # Add product category (if available)
            if 'category' in df.columns:
                df['product_category'] = df['category']
            else:
                df['product_category'] = 'unknown'
            
            # Add supplier (if available)
            if 'supplier' in df.columns:
                df['supplier'] = df['supplier']
            else:
                df['supplier'] = 'unknown'
            
            # Features
            features = df[[
                'quantity', 'days_since_last_sale', 'avg_daily_sales',
                'day_of_week', 'day_of_month', 'month',
                'product_category', 'supplier'
            ]]
            
            # Target
            target = df['next_day_sales']
            
            return features, target
            
        except Exception as e:
            logger.error(f"Error preparing training data: {e}")
            raise
    
    def train(
        self,
        historical_data: List[Dict[str, Any]],
        test_size: float = 0.2,
        random_state: int = 42
    ) -> Dict[str, Any]:
        """
        Train the stock prediction model
        
        Args:
            historical_data: List of historical records
            test_size: Fraction of data to use for testing
            random_state: Random seed
            
        Returns:
            Dictionary with training metrics
        """
        try:
            # Prepare data
            features, target = self.prepare_training_data(historical_data)
            
            # Split data
            X_train, X_test, y_train, y_test = train_test_split(
                features, target,
                test_size=test_size,
                random_state=random_state
            )
            
            # Create preprocessor
            self.preprocessor = self._create_preprocessor()
            
            # Create pipeline
            self.model = Pipeline([
                ('preprocessor', self.preprocessor),
                ('regressor', RandomForestRegressor(
                    n_estimators=100,
                    max_depth=10,
                    random_state=random_state,
                    n_jobs=-1
                ))
            ])
            
            # Train model
            self.model.fit(X_train, y_train)
            
            # Evaluate
            y_pred = self.model.predict(X_test)
            
            mae = mean_absolute_error(y_test, y_pred)
            mse = mean_squared_error(y_test, y_pred)
            rmse = np.sqrt(mse)
            
            self.is_trained = True
            self._save_model()
            
            return {
                'status': 'success',
                'metrics': {
                    'mae': float(mae),
                    'mse': float(mse),
                    'rmse': float(rmse),
                    'r2_score': float(self.model.score(X_test, y_test))
                },
                'training_samples': len(X_train),
                'test_samples': len(X_test),
                'model_version': self.MODEL_VERSION,
                'trained_at': datetime.now().isoformat()
            }
            
        except Exception as e:
            logger.error(f"Error training model: {e}")
            return {
                'status': 'error',
                'error': str(e),
                'trained_at': datetime.now().isoformat()
            }
    
    def predict(
        self,
        product_data: Dict[str, Any],
        days_ahead: int = 7
    ) -> Dict[str, Any]:
        """
        Predict future stock needs for a product
        
        Args:
            product_data: Product data including recent sales
            days_ahead: Number of days to predict
            
        Returns:
            Dictionary with prediction results
        """
        if not self.is_trained:
            return {
                'status': 'error',
                'error': 'Model not trained',
                'predicted_at': datetime.now().isoformat()
            }
        
        try:
            # Prepare prediction data
            df = pd.DataFrame([product_data])
            
            # Add temporal features
            if 'date' in df.columns:
                df['date'] = pd.to_datetime(df['date'])
                df['day_of_week'] = df['date'].dt.dayofweek
                df['day_of_month'] = df['date'].dt.day
                df['month'] = df['date'].dt.month
            else:
                today = datetime.now()
                df['day_of_week'] = today.weekday()
                df['day_of_month'] = today.day
                df['month'] = today.month
            
            # Ensure all required features exist
            required_features = [
                'quantity', 'days_since_last_sale', 'avg_daily_sales',
                'product_category', 'supplier'
            ]
            
            for feature in required_features:
                if feature not in df.columns:
                    df[feature] = 0 if feature in ['quantity', 'days_since_last_sale', 'avg_daily_sales'] else 'unknown'
            
            # Make prediction
            prediction = self.model.predict(df)
            
            # Scale prediction for multiple days
            daily_prediction = float(prediction[0])
            total_prediction = daily_prediction * days_ahead
            
            return {
                'status': 'success',
                'product_id': product_data.get('product_id'),
                'daily_prediction': daily_prediction,
                'total_prediction': total_prediction,
                'days_ahead': days_ahead,
                'predicted_at': datetime.now().isoformat()
            }
            
        except Exception as e:
            logger.error(f"Error making prediction: {e}")
            return {
                'status': 'error',
                'error': str(e),
                'predicted_at': datetime.now().isoformat()
            }
    
    def get_recommendations(
        self,
        products: List[Dict[str, Any]],
        days_ahead: int = 30
    ) -> List[Dict[str, Any]]:
        """
        Get stock recommendations for all products
        
        Args:
            products: List of products with current stock
            days_ahead: Prediction horizon
            
        Returns:
            List of recommendations
        """
        recommendations = []
        
        for product in products:
            # Get prediction
            prediction = self.predict(product, days_ahead)
            
            if prediction['status'] != 'success':
                continue
            
            current_stock = product.get('current_stock', 0)
            recommended_stock = prediction['total_prediction'] * 1.3  # 30% safety margin
            
            recommendations.append({
                'product_id': product.get('id'),
                'product_name': product.get('name', 'Unknown'),
                'current_stock': current_stock,
                'predicted_demand': prediction['total_prediction'],
                'recommended_stock': int(recommended_stock),
                'order_quantity': max(0, int(recommended_stock - current_stock)),
                'priority': 'HIGH' if current_stock < prediction['total_prediction'] else 'LOW'
            })
        
        # Sort by priority and order quantity
        recommendations.sort(key=lambda x: (x['priority'] == 'HIGH', -x['order_quantity']))
        
        return recommendations


# Global model instance
stock_model = StockPredictionModel()


def load_stock_prediction_model(model_dir: str = "./models") -> StockPredictionModel:
    """
    Load stock prediction model
    
    Args:
        model_dir: Directory containing model files
        
    Returns:
        StockPredictionModel instance
    """
    return StockPredictionModel(model_dir=model_dir)


def train_stock_model(
    historical_data: List[Dict[str, Any]],
    model_dir: str = "./models"
) -> Dict[str, Any]:
    """
    Train stock prediction model
    
    Args:
        historical_data: Training data
        model_dir: Directory to save model
        
    Returns:
        Training results
    """
    model = StockPredictionModel(model_dir=model_dir, retrain=True)
    return model.train(historical_data)
