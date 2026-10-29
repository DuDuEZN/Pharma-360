"""
Centralized Logging System for IA Module
"""

import logging
import logging.config
import os
from datetime import datetime
from pathlib import Path
from typing import Dict, Any, Optional


def setup_logging(config: Dict[str, Any]) -> logging.Logger:
    """
    Setup centralized logging system
    
    Args:
        config: Dictionary with logging configuration
            - logs_dir: Directory for log files
            - console_level: Logging level for console
            - file_level: Logging level for files
            
    Returns:
        Configured logger instance
    """
    logs_dir = Path(config.get("logs_dir", "./logs"))
    console_level = config.get("console_level", logging.INFO)
    file_level = config.get("file_level", logging.DEBUG)
    
    # Create logs directory if it doesn't exist
    logs_dir.mkdir(parents=True, exist_ok=True)
    
    # Logging configuration
    logging_config = {
        "version": 1,
        "disable_existing_loggers": False,
        "formatters": {
            "standard": {
                "format": "%(asctime)s - %(name)s - %(levelname)s - %(message)s"
            },
            "detailed": {
                "format": "%(asctime)s - %(name)s - %(levelname)s - %(filename)s:%(lineno)d - %(message)s"
            },
        },
        "handlers": {
            "console": {
                "class": "logging.StreamHandler",
                "level": console_level,
                "formatter": "standard",
                "stream": "ext://sys.stdout"
            },
            "file": {
                "class": "logging.handlers.RotatingFileHandler",
                "level": file_level,
                "formatter": "detailed",
                "filename": str(logs_dir / "ia.log"),
                "maxBytes": 10485760,  # 10MB
                "backupCount": 5,
                "encoding": "utf-8"
            },
            "error_file": {
                "class": "logging.handlers.RotatingFileHandler",
                "level": logging.ERROR,
                "formatter": "detailed",
                "filename": str(logs_dir / "ia_errors.log"),
                "maxBytes": 10485760,  # 10MB
                "backupCount": 5,
                "encoding": "utf-8"
            },
        },
        "loggers": {
            "ia": {
                "handlers": ["console", "file", "error_file"],
                "level": "DEBUG",
                "propagate": False
            },
            "ia.http": {
                "handlers": ["console", "file"],
                "level": "INFO",
                "propagate": False
            },
        },
        "root": {
            "handlers": ["console"],
            "level": "INFO",
            "propagate": True
        }
    }
    
    # Apply logging configuration
    logging.config.dictConfig(logging_config)
    
    # Return root logger
    return logging.getLogger("ia")


def get_logger(name: str) -> logging.Logger:
    """
    Get a logger instance with the given name
    
    Args:
        name: Logger name (typically __name__)
        
    Returns:
        Configured logger instance
    """
    return logging.getLogger(name)


def log_api_request(method: str, path: str, status_code: int, 
                    duration_ms: float, client: Optional[str] = None):
    """
    Log an API request
    
    Args:
        method: HTTP method (GET, POST, etc.)
        path: Request path
        status_code: Response status code
        duration_ms: Request duration in milliseconds
        client: Client IP address
    """
    logger = get_logger("ia.http")
    
    status_color = {
        2: "\033[92m",  # Green for 2xx
        3: "\033[93m",  # Yellow for 3xx
        4: "\033[91m",  # Red for 4xx
        5: "\033[91m",  # Red for 5xx
    }.get(status_code // 100, "\033[0m")
    
    reset_color = "\033[0m"
    
    log_message = f"{method} {path} - {status_code} - {duration_ms:.2f}ms"
    if client:
        log_message += f" - Client: {client}"
    
    if status_code >= 400:
        logger.error(log_message)
    elif status_code >= 300:
        logger.warning(log_message)
    else:
        logger.info(log_message)


async def add_security_headers(request, call_next):
    """
    Middleware to add security headers to responses
    """
    response = await call_next(request)
    
    # Add security headers
    response.headers["X-Content-Type-Options"] = "nosniff"
    response.headers["X-Frame-Options"] = "DENY"
    response.headers["X-XSS-Protection"] = "1; mode=block"
    response.headers["Referrer-Policy"] = "strict-origin-when-cross-origin"
    
    return response
