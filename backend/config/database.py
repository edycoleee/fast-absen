"""
Database configuration and session management
"""
from sqlalchemy import create_engine, text
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker
from sqlalchemy.exc import SQLAlchemyError
from config.settings import settings
from utils.logger import logger

# Create SQLAlchemy engine
engine = create_engine(
    settings.DATABASE_URL,
    pool_pre_ping=True,  # Verify connections before using
    pool_size=5,  # Number of connections to maintain
    max_overflow=10,  # Max number of connections to create beyond pool_size
    pool_recycle=3600,  # Recycle connections after 1 hour
    echo=settings.DEBUG,  # Log SQL queries in debug mode
)

# Create SessionLocal class
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

# Create Base class for models
Base = declarative_base()


def get_db():
    """
    Dependency untuk mendapatkan database session
    
    Usage:
        @app.get("/items")
        def get_items(db: Session = Depends(get_db)):
            ...
    
    Yields:
        Database session
    """
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


def check_database_connection() -> bool:
    """
    Check database connection health
    
    Returns:
        True if database is accessible, False otherwise
    """
    try:
        # Try to execute a simple query
        with engine.connect() as connection:
            connection.execute(text("SELECT 1"))
        logger.info("Database connection check: OK")
        return True
    except SQLAlchemyError as e:
        logger.error(f"Database connection check failed: {str(e)}")
        return False
    except Exception as e:
        logger.error(f"Unexpected error during database check: {str(e)}")
        return False


def get_database_info() -> dict:
    """
    Get database connection information
    
    Returns:
        Dictionary with database info
    """
    try:
        with engine.connect() as connection:
            result = connection.execute(text("SELECT version()"))
            version = result.scalar()
            
            return {
                "connected": True,
                "url": settings.DATABASE_URL_SAFE,
                "pool_size": engine.pool.size(),
                "checked_in": engine.pool.checkedin(),
                "checked_out": engine.pool.checkedout(),
                "overflow": engine.pool.overflow(),
                "version": version
            }
    except Exception as e:
        logger.error(f"Failed to get database info: {str(e)}")
        return {
            "connected": False,
            "error": str(e)
        }
