"""
Database configuration and session management
"""
from sqlalchemy import create_engine, text
from sqlalchemy.orm import sessionmaker, declarative_base
from sqlalchemy.exc import SQLAlchemyError
from config.settings import settings
from utils.logger import logger

# Create SQLAlchemy engine
# pool_size=10 + max_overflow=20 = maks 30 koneksi bersamaan
# Cukup untuk ~800 karyawan dengan pola spike jam masuk/pulang
# Setiap worker Uvicorn berbagi pool ini
engine = create_engine(
    settings.DATABASE_URL,
    pool_pre_ping=True,       # Verify connections before using (handles DB restarts)
    pool_size=10,             # Koneksi idle permanen (naik dari 5)
    max_overflow=20,          # Koneksi extra saat spike (total maks: 30)
    pool_recycle=1800,        # Recycle setiap 30 menit (lebih konservatif dari 1 jam)
    pool_timeout=30,          # Timeout tunggu koneksi dari pool (detik)
    echo=settings.DEBUG,      # Log SQL queries in debug mode
    connect_args={
        "options": "-c statement_timeout=30000"  # Kill query > 30 detik otomatis
    },
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
