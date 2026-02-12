"""
Logging configuration dengan rotating file handler dan separate error logs
"""
import logging
import sys
import os
from pathlib import Path
from logging.handlers import RotatingFileHandler, TimedRotatingFileHandler

# Create logs directory if not exists
logs_dir = Path(__file__).parent.parent / "logs"
logs_dir.mkdir(exist_ok=True)

# Configure logging format
LOG_FORMAT = "%(asctime)s - %(name)s - %(levelname)s - [%(filename)s:%(lineno)d] - %(message)s"
DATE_FORMAT = "%Y-%m-%d %H:%M:%S"

# Get environment (default: development)
ENV = os.getenv("ENVIRONMENT", "development")

# Create logger
logger = logging.getLogger("attendance_system")

# Set log level based on environment
if ENV == "production":
    logger.setLevel(logging.WARNING)
else:
    logger.setLevel(logging.DEBUG)

# Console handler
console_handler = logging.StreamHandler(sys.stdout)
console_handler.setLevel(logging.DEBUG if ENV != "production" else logging.INFO)
console_formatter = logging.Formatter(LOG_FORMAT, DATE_FORMAT)
console_handler.setFormatter(console_formatter)

# Rotating file handler for general logs (max 10MB, keep 5 backups)
file_handler = RotatingFileHandler(
    logs_dir / "app.log",
    maxBytes=10 * 1024 * 1024,  # 10MB
    backupCount=5,
    encoding="utf-8"
)
file_handler.setLevel(logging.INFO)
file_formatter = logging.Formatter(LOG_FORMAT, DATE_FORMAT)
file_handler.setFormatter(file_formatter)

# Separate error log file (only ERROR and CRITICAL)
error_handler = RotatingFileHandler(
    logs_dir / "error.log",
    maxBytes=10 * 1024 * 1024,  # 10MB
    backupCount=5,
    encoding="utf-8"
)
error_handler.setLevel(logging.ERROR)
error_formatter = logging.Formatter(LOG_FORMAT, DATE_FORMAT)
error_handler.setFormatter(error_formatter)

# Add handlers to logger
logger.addHandler(console_handler)
logger.addHandler(file_handler)
logger.addHandler(error_handler)

# Prevent duplicate logs
logger.propagate = False

logger.info(f"Logger initialized - Environment: {ENV}")
