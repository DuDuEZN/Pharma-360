"""
Logging Service for Pharmacie 360
Provides centralized logging with business context and audit trail
"""

from typing import Optional, Dict, Any
from backend.core.logging import get_logger, log_api_request, log_database_query, log_cache_operation, log_business_event


class LoggingService:
    """
    Service for centralized logging with business context
    Integrates with the centralized logging system
    """
    
    @staticmethod
    def log_authentication(user_id: Optional[str], action: str, success: bool = True, **kwargs):
        """Log authentication events"""
        details = {
            "user_id": user_id,
            "action": action,
            "success": success,
            **kwargs
        }
        log_business_event("authentication", details)
    
    @staticmethod
    def log_sale(sale_id: str, user_id: str, items_count: int, total_amount: float, **kwargs):
        """Log sale events"""
        details = {
            "sale_id": sale_id,
            "user_id": user_id,
            "items_count": items_count,
            "total_amount": total_amount,
            **kwargs
        }
        log_business_event("sale", details)
    
    @staticmethod
    def log_stock_movement(batch_id: str, product_id: str, quantity: int, 
                           movement_type: str, reason: str = "", **kwargs):
        """Log stock movement events"""
        details = {
            "batch_id": batch_id,
            "product_id": product_id,
            "quantity": quantity,
            "movement_type": movement_type,
            "reason": reason,
            **kwargs
        }
        log_business_event("stock_movement", details)
    
    @staticmethod
    def log_expiry_alert(product_id: str, batch_id: str, expiry_date: str, 
                        days_until_expiry: int, **kwargs):
        """Log expiry alert events"""
        details = {
            "product_id": product_id,
            "batch_id": batch_id,
            "expiry_date": expiry_date,
            "days_until_expiry": days_until_expiry,
            **kwargs
        }
        log_business_event("expiry_alert", details)
    
    @staticmethod
    def log_fefo_operation(product_id: str, selected_batch_id: str, 
                          available_batches: list, **kwargs):
        """Log FEFO/FIFO selection operations"""
        details = {
            "product_id": product_id,
            "selected_batch_id": selected_batch_id,
            "available_batches": available_batches,
            **kwargs
        }
        log_business_event("fefo_selection", details)
    
    @staticmethod
    def log_error(error_type: str, message: str, context: Dict[str, Any] = None, **kwargs):
        """Log error events with full context"""
        details = {
            "error_type": error_type,
            "message": message,
            "context": context or {},
            **kwargs
        }
        log_business_event("error", details)
    
    @staticmethod
    def log_performance(operation: str, duration_ms: float, 
                       metadata: Dict[str, Any] = None, **kwargs):
        """Log performance metrics"""
        details = {
            "operation": operation,
            "duration_ms": duration_ms,
            "metadata": metadata or {},
            **kwargs
        }
        log_business_event("performance", details)


# Singleton instance
logging_service = LoggingService()
