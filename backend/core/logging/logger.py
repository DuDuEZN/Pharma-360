"""
Centralized Logging Configuration for Pharmacie 360
Implements structured logging with file rotation and multiple handlers
"""

import logging
import logging.handlers
import os
import sys
from datetime import datetime
from pathlib import Path
from typing import Optional, Dict, Any
import json
import threading


class JSONFormatter(logging.Formatter):
    """Custom formatter that outputs JSON for structured logging"""
    
    def format(self, record: logging.LogRecord) -> str:
        log_data = {
            "timestamp": datetime.utcnow().isoformat() + "Z",
            "level": record.levelname,
            "logger": record.name,
            "message": record.getMessage(),
            "module": record.module,
            "function": record.funcName,
            "line": record.lineno,
            "thread": record.threadName,
            "process": record.processName,
        }
        
        # Add extra fields
        if hasattr(record, "extra_fields"):
            log_data.update(record.extra_fields)
        
        # Add exception info
        if record.exc_info:
            log_data["exception"] = self.formatException(record.exc_info)
        
        return json.dumps(log_data, ensure_ascii=False, default=str)


class StructuredFormatter(logging.Formatter):
    """Human-readable formatter with colors for console output"""
    
    LEVEL_COLORS = {
        logging.DEBUG: "\033[36m",    # Cyan
        logging.INFO: "\033[32m",     # Green
        logging.WARNING: "\033[33m",  # Yellow
        logging.ERROR: "\033[31m",    # Red
        logging.CRITICAL: "\033[35m", # Purple
    }
    
    def format(self, record: logging.LogRecord) -> str:
        level_color = self.LEVEL_COLORS.get(record.levelno, "")
        reset_color = "\033[0m"
        
        timestamp = datetime.utcnow().strftime("%Y-%m-%d %H:%M:%S")
        level_name = f"{level_color}{record.levelname}{reset_color}"
        
        base_msg = f"[{timestamp}] {level_name} [{record.module}:{record.lineno}] {record.getMessage()}"
        
        # Add extra fields if present
        if hasattr(record, "extra_fields") and record.extra_fields:
            extra_str = " ".join(f"{k}={v}" for k, v in record.extra_fields.items())
            base_msg += f" {extra_str}"
        
        # Add exception info
        if record.exc_info:
            base_msg += f"\n{self.formatException(record.exc_info)}"
        
        return base_msg


class CentralizedLogger:
    """
    Centralized logging system with multiple handlers:
    - Console output (colored)
    - File output (JSON structured)
    - Rotating file handler (daily rotation)
    """
    
    _instance = None
    _lock = threading.Lock()
    
    def __new__(cls, config: Optional[Dict[str, Any]] = None):
        if cls._instance is None:
            with cls._lock:
                if cls._instance is None:
                    cls._instance = super().__new__(cls)
                    cls._instance._initialized = False
        return cls._instance
    
    def __init__(self, config: Optional[Dict[str, Any]] = None):
        if self._initialized:
            return
        
        self.config = config or {}
        self.logger = logging.getLogger("pharma360")
        self.logger.setLevel(logging.DEBUG)  # Capture all levels
        
        # Prevent duplicate handlers
        if not self.logger.handlers:
            self._setup_handlers()
        
        self._initialized = True
    
    def _setup_handlers(self):
        """Setup all logging handlers"""
        
        # Console handler (colored output)
        console_handler = logging.StreamHandler(sys.stdout)
        console_handler.setLevel(self.config.get("console_level", logging.INFO))
        console_handler.setFormatter(StructuredFormatter())
        self.logger.addHandler(console_handler)
        
        # Logs directory
        logs_dir = self.config.get("logs_dir", "./logs")
        Path(logs_dir).mkdir(parents=True, exist_ok=True)
        
        # Daily rotating file handler (JSON format)
        log_file = os.path.join(logs_dir, "pharma360.log")
        file_handler = logging.handlers.RotatingFileHandler(
            log_file,
            maxBytes=10 * 1024 * 1024,  # 10 MB
            backupCount=10,
            encoding="utf-8"
        )
        file_handler.setLevel(self.config.get("file_level", logging.DEBUG))
        file_handler.setFormatter(JSONFormatter())
        self.logger.addHandler(file_handler)
        
        # Error log file (separate)
        error_log = os.path.join(logs_dir, "pharma360_errors.log")
        error_handler = logging.FileHandler(error_log, encoding="utf-8")
        error_handler.setLevel(logging.ERROR)
        error_handler.setFormatter(JSONFormatter())
        self.logger.addHandler(error_handler)
        
        # Prevent propagation to root logger
        self.logger.propagate = False
    
    def get_logger(self, name: str) -> logging.Logger:
        """Get a named logger instance"""
        return logging.getLogger(f"pharma360.{name}")
    
    def debug(self, message: str, **kwargs):
        self.logger.debug(message, extra={"extra_fields": kwargs})
    
    def info(self, message: str, **kwargs):
        self.logger.info(message, extra={"extra_fields": kwargs})
    
    def warning(self, message: str, **kwargs):
        self.logger.warning(message, extra={"extra_fields": kwargs})
    
    def error(self, message: str, **kwargs):
        self.logger.error(message, extra={"extra_fields": kwargs})
    
    def critical(self, message: str, **kwargs):
        self.logger.critical(message, extra={"extra_fields": kwargs})
    
    def exception(self, message: str, **kwargs):
        self.logger.exception(message, extra={"extra_fields": kwargs})


# Global logger instance
_logger: Optional[CentralizedLogger] = None


def setup_logging(config: Optional[Dict[str, Any]] = None) -> CentralizedLogger:
    """
    Setup centralized logging system
    
    Args:
        config: Optional configuration dictionary
            - logs_dir: Directory for log files (default: ./logs)
            - console_level: Console logging level (default: INFO)
            - file_level: File logging level (default: DEBUG)
    
    Returns:
        CentralizedLogger instance
    """
    global _logger
    if _logger is None:
        _logger = CentralizedLogger(config)
    return _logger


def get_logger(name: str) -> logging.Logger:
    """
    Get a named logger instance
    
    Args:
        name: Logger name (typically __name__)
    
    Returns:
        Configured logger instance
    """
    if _logger is None:
        setup_logging()
    return _logger.get_logger(name)


# Module-level convenience functions
def log_api_request(method: str, path: str, status_code: int, duration_ms: float, **kwargs):
    """Log API request details"""
    get_logger("api").info(
        f"{method} {path} - {status_code}",
        method=method,
        path=path,
        status_code=status_code,
        duration_ms=duration_ms,
        **kwargs
    )


def log_database_query(query: str, duration_ms: float, row_count: int = 0, **kwargs):
    """Log database query details"""
    get_logger("database").debug(
        f"Query executed in {duration_ms:.2f}ms",
        query=query[:200] + "..." if len(query) > 200 else query,
        duration_ms=duration_ms,
        row_count=row_count,
        **kwargs
    )


def log_cache_operation(operation: str, key: str, hit: bool = False, **kwargs):
    """Log cache operation details"""
    get_logger("cache").debug(
        f"Cache {operation}: {key}",
        operation=operation,
        key=key,
        hit=hit,
        **kwargs
    )


def log_business_event(event_type: str, details: Dict[str, Any], **kwargs):
    """Log business event for audit trail"""
    get_logger("business").info(
        f"Business event: {event_type}",
        event_type=event_type,
        details=details,
        **kwargs
    )
