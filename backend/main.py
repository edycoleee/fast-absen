"""
RSUD Sulfat Attendance System API
FastAPI application with Clean Architecture
"""
from contextlib import asynccontextmanager
import os
from fastapi import FastAPI
from fastapi.staticfiles import StaticFiles
from fastapi.middleware.cors import CORSMiddleware
from fastapi.exceptions import RequestValidationError
from starlette.exceptions import HTTPException as StarletteHTTPException

from config.settings import settings
from config.database import Base, engine, check_database_connection, get_database_info
from api.v1.router import api_router
from utils.middleware import RequestLoggingMiddleware, RequestIDMiddleware
from utils.exception_handlers import (
    http_exception_handler,
    validation_exception_handler,
    general_exception_handler
)
from utils.logger import logger
from utils.bootstrap_admin import bootstrap_super_admin


@asynccontextmanager
async def lifespan(app: FastAPI):
    """
    Lifespan context manager for startup and shutdown events
    """
    # Startup
    logger.info(f"Starting {settings.APP_NAME} v{settings.APP_VERSION}")
    logger.info(f"Environment: {settings.ENVIRONMENT}")
    logger.info(f"Debug mode: {settings.DEBUG}")
    logger.info(f"Database: {settings.DATABASE_URL_SAFE}")
    
    # Check database connection
    if check_database_connection():
        logger.info("Database connection established")
        bootstrap_super_admin()
    else:
        logger.warning("Database connection failed - app will start but may not work properly")
    
    # Create database tables (uncomment when models are ready)
    # Base.metadata.create_all(bind=engine)
    
    yield
    
    # Shutdown
    logger.info("Shutting down application")
    engine.dispose()
    logger.info("Database connections closed")


# Initialize FastAPI app
app = FastAPI(
    title=settings.APP_NAME,
    version=settings.APP_VERSION,
    description=settings.APP_DESCRIPTION,
    docs_url="/docs" if settings.DEBUG else None,  # Disable docs in production
    redoc_url="/redoc" if settings.DEBUG else None,
    openapi_url="/openapi.json" if settings.DEBUG else None,
    lifespan=lifespan
)

# Add exception handlers
app.add_exception_handler(StarletteHTTPException, http_exception_handler)
app.add_exception_handler(RequestValidationError, validation_exception_handler)
app.add_exception_handler(Exception, general_exception_handler)

# CORS middleware (from settings)
# Support dynamic ports for development (3000, 3001, 3002, etc.)
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.CORS_ORIGINS,
    allow_origin_regex=r"http://(localhost|127\.0\.0\.1|192\.168\.171\.\d+|192\.168\.30\.\d+):\d+",
    allow_credentials=settings.CORS_ALLOW_CREDENTIALS,
    allow_methods=settings.CORS_ALLOW_METHODS,
    allow_headers=settings.CORS_ALLOW_HEADERS,
)

# Custom middlewares
app.add_middleware(RequestIDMiddleware)  # Must be before logging middleware
app.add_middleware(RequestLoggingMiddleware)

# Include API v1 router
app.include_router(api_router, prefix=settings.API_V1_PREFIX)

# Serve uploaded files
uploads_dir = os.path.join(os.getcwd(), "uploads")
if os.path.isdir(uploads_dir):
    app.mount("/uploads", StaticFiles(directory=uploads_dir), name="uploads")


@app.get("/", tags=["Root"])
def root():
    """Root endpoint - API information"""
    return {
        "message": settings.APP_NAME,
        "version": settings.APP_VERSION,
        "environment": settings.ENVIRONMENT,
        "database": "PostgreSQL",
        "docs": "/docs" if settings.DEBUG else "disabled",
        "api_v1": settings.API_V1_PREFIX,
        "endpoints": {
            "halo": f"{settings.API_V1_PREFIX}/halo",
            "health": "/health",
            "health_detail": "/health/detail"
        }
    }


@app.get("/health", tags=["Health"])
def health_check():
    """
    Basic health check endpoint
    Fast response without database check
    """
    return {
        "status": "healthy",
        "version": settings.APP_VERSION,
        "environment": settings.ENVIRONMENT
    }


@app.get("/health/detail", tags=["Health"])
def health_check_detail():
    """
    Detailed health check endpoint
    Includes database connection check
    """
    db_info = get_database_info()
    
    return {
        "status": "healthy" if db_info.get("connected") else "unhealthy",
        "version": settings.APP_VERSION,
        "environment": settings.ENVIRONMENT,
        "database": db_info
    }
