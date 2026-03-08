# Prompt AI - FastAPI Middle Application (PostgreSQL, No Auth)

Gunakan prompt ini untuk membuat aplikasi FastAPI dengan clean architecture level menengah, **tanpa JWT**, **tanpa RBAC**, dan menggunakan **PostgreSQL database**.

---

## 🤖 PROMPT UNTUK AI

```
Buatkan FastAPI application dengan clean architecture yang production-ready dan scalable.

## Requirements:

### 1. Tech Stack
- FastAPI 0.109.0
- SQLAlchemy 2.0.25 (ORM)
- Pydantic 2.5.3 (Validation)
- PostgreSQL (Database)
- Alembic (Database migrations)
- Uvicorn 0.27.0 (ASGI Server)
- SQLAlchemy-Utils (Helper utilities)
- APScheduler (Background tasks)
- Redis (Optional caching/sessions - socket_io support)
- Python 3.11+
- python-dotenv (Environment config)

### 2. Clean Architecture Layers
Implementasikan struktur 4-layer dengan advanced patterns:
```
Endpoint Layer → Service Layer → Repository Layer → Model Layer
              ↓
         [Middleware & Dependencies]
              ↓
         [Exception Handlers]
```

Layer responsibilities:
- **Endpoint**: HTTP handling, validation, response formatting
- **Service**: Business logic, data processing, cross-entity operations
- **Repository**: Data access, queries, transactions
- **Model**: Database schema, ORM models, relationships

### 3. Project Structure
```
backend/
├── main.py                          # FastAPI app entry point
├── run.py                           # Server runner
├── .env.example                     # Environment template
├── .env.production                  # Production config example
├── requirements.txt                 # Dependencies
├── requirements-dev.txt             # Dev dependencies (pytest, black, etc)
├── alembic/                         # Database migrations
│   ├── env.py
│   ├── script.py.mako
│   ├── versions/
│   │   └── init_database.py
│   └── alembic.ini
├── config/
│   ├── __init__.py
│   ├── database.py                  # PostgreSQL config + session + pool
│   ├── settings.py                  # Environment-based settings
│   ├── cache.py                     # Redis caching (optional)
│   └── constants.py                 # Global constants
├── models/
│   ├── __init__.py                  # Import all models
│   ├── base.py                      # BaseModel with mixins (timestamps, soft delete)
│   ├── [entity].py                  # Domain models
│   └── associations.py              # Many-to-many relationships
├── schemas/
│   ├── __init__.py
│   ├── base.py                      # BaseSchema, BaseResponseSchema, PaginationParams
│   ├── [entity].py                  # Pydantic schemas per entity
│   └── filters.py                   # Filter schemas untuk advanced search
├── repositories/
│   ├── __init__.py
│   ├── base.py                      # BaseRepository[T] - Generic CRUD + advanced query
│   ├── [entity]_repository.py       # Custom queries per entity
│   └── spec.py                      # Query specifications pattern (optional)
├── services/
│   ├── __init__.py
│   ├── base.py                      # BaseService[T, R] - Base service logic
│   ├── [entity]_service.py          # Business logic per entity
│   └── cache_service.py             # Caching helpers (optional)
├── api/
│   ├── __init__.py
│   └── v1/
│       ├── __init__.py
│       ├── endpoints/
│       │   ├── __init__.py
│       │   ├── health.py            # Health check endpoint
│       │   └── [entity].py          # Entity endpoints (CRUD + advanced)
│       └── router.py                # Main API router v1
├── utils/
│   ├── __init__.py
│   ├── constants.py                 # Enums, error codes, defaults
│   ├── dependencies.py              # Query params, authentication deps
│   ├── exception_handlers.py        # HTTP + custom exception handlers
│   ├── logger.py                    # Structured logging with rotation
│   ├── middleware.py                # RequestID, timing, audit logging
│   ├── response.py                  # Standard response utilities
│   ├── validators.py                # Custom Pydantic validators
│   ├── async_utils.py               # Async context managers, decorators
│   └── decorators.py                # Caching, timing, retry decorators
├── tasks/
│   ├── __init__.py
│   └── [feature]_tasks.py           # Background jobs dengan APScheduler
├── tests/
│   ├── __init__.py
│   ├── conftest.py                  # Pytest fixtures + factories
│   ├── fixtures/
│   │   ├── __init__.py
│   │   └── [entity]_fixtures.py
│   ├── integration/
│   │   └── test_[entity].py
│   └── unit/
│       ├── test_[entity]_service.py
│       └── test_[entity]_repository.py
├── migrations/                      # Database migration scripts (optional)
│   └── [YYYYMMDD_init].sql
├── docs/                            # Project documentation
│   ├── ARCHITECTURE.md
│   ├── DATABASE_DESIGN.md
│   ├── API_GUIDE.md
│   └── DEPLOYMENT.md
└── scripts/
    ├── init_db.py
    └── seed_data.py
```

### 4. Advanced Database Configuration (config/database.py)

```python
import os
from sqlalchemy import create_engine, event, Engine, pool
from sqlalchemy.orm import sessionmaker, Session
from sqlalchemy.pool import QueuePool
from contextlib import contextmanager
from typing import Generator
from config.settings import settings
from utils.logger import logger

# PostgreSQL database setup dengan connection pooling
DATABASE_URL = settings.DATABASE_URL

# Optimized pool configuration untuk production
engine = create_engine(
    DATABASE_URL,
    echo=settings.SQLALCHEMY_ECHO,
    # Connection pooling untuk handle concurrent requests
    poolclass=QueuePool,
    pool_size=settings.DB_POOL_SIZE,          # Default: 5
    max_overflow=settings.DB_MAX_OVERFLOW,    # Default: 10
    pool_recycle=settings.DB_POOL_RECYCLE,    # Default: 3600 (1 hour)
    pool_pre_ping=True,                        # Test connections sebelum pakai
    connect_args={
        "connect_timeout": settings.DB_CONNECT_TIMEOUT,  # Default: 10 seconds
    }
)

# Event listener untuk Log SQL queries
if settings.SQLALCHEMY_ECHO:
    @event.listens_for(Engine, "before_cursor_execute")
    def receive_before_cursor_execute(conn, cursor, statement, parameters, context, executemany):
        logger.debug(f"SQL: {statement} | Params: {parameters}")

SessionLocal = sessionmaker(
    autocommit=False,
    autoflush=False,
    bind=engine,
    expire_on_commit=False
)

def get_db() -> Generator[Session, None, None]:
    """Dependency injection untuk database session"""
    db = SessionLocal()
    try:
        yield db
    except Exception as e:
        db.rollback()
        logger.error(f"Database error in session: {e}")
        raise
    finally:
        db.close()

@contextmanager
def get_db_context() -> Generator[Session, None, None]:
    """Context manager untuk database session"""
    db = SessionLocal()
    try:
        yield db
        db.commit()
    except Exception:
        db.rollback()
        raise
    finally:
        db.close()

def get_database_info() -> dict:
    """Get database configuration info"""
    db_url = DATABASE_URL
    if "password" in db_url:
        db_url = db_url.replace(
            db_url.split("//")[1].split("@")[0],
            "***:***"
        )
    
    return {
        "url": db_url,
        "pool_size": settings.DB_POOL_SIZE,
        "max_overflow": settings.DB_MAX_OVERFLOW,
        "pool_recycle": settings.DB_POOL_RECYCLE,
        "type": "PostgreSQL"
    }

def check_database_connection() -> bool:
    """Check database connection"""
    try:
        with engine.connect() as conn:
            conn.execute("SELECT 1")
        logger.info("✓ Database connection successful")
        return True
    except Exception as e:
        logger.error(f"✗ Database connection failed: {e}")
        return False

# Import models untuk auto-creation
from models import *

def init_db():
    """Create all tables (fallback jika tidak pakai Alembic)"""
    Base.metadata.create_all(bind=engine)
    logger.info("✓ Database tables created")

def drop_all_tables():
    """Drop all tables (DANGER: hanya untuk development)"""
    if settings.ENVIRONMENT == "production":
        raise RuntimeError("Cannot drop tables in production")
    Base.metadata.drop_all(bind=engine)
    logger.warning("✓ All tables dropped")
```

### 5. Advanced Base Models (models/base.py)

```python
from datetime import datetime
from sqlalchemy import Column, Integer, DateTime, String, func, Boolean
from sqlalchemy.orm import declarative_base
from sqlalchemy.ext.hybrid import hybrid_property
import uuid

Base = declarative_base()

class BaseModel(Base):
    """
    Base model dengan id, timestamps, dan utility methods
    
    Attributes:
        id: Primary key (Integer)
        created_at: Created timestamp (automatic)
        updated_at: Updated timestamp (automatic)
    """
    __abstract__ = True
    
    id = Column(Integer, primary_key=True, index=True)
    created_at = Column(
        DateTime(timezone=True),
        server_default=func.now(),
        nullable=False,
        index=True
    )
    updated_at = Column(
        DateTime(timezone=True),
        server_default=func.now(),
        onupdate=func.now(),
        nullable=False
    )
    
    def __repr__(self):
        return f"<{self.__class__.__name__}(id={self.id})>"
    
    def to_dict(self, exclude: list = None) -> dict:
        """Convert model to dictionary"""
        exclude = exclude or ["created_at", "updated_at"]
        return {
            c.name: getattr(self, c.name)
            for c in self.__table__.columns
            if c.name not in exclude
        }
    
    def update_from_dict(self, data: dict, exclude: list = None) -> None:
        """Update model from dictionary"""
        exclude = exclude or ["id", "created_at"]
        for key, value in data.items():
            if hasattr(self, key) and key not in exclude and value is not None:
                setattr(self, key, value)


class SoftDeleteModel(BaseModel):
    """
    Model dengan soft delete
    
    Attributes:
        is_deleted: Soft delete flag
        deleted_at: Deletion timestamp
    """
    __abstract__ = True
    
    is_deleted = Column(Boolean, default=False, index=True)
    deleted_at = Column(DateTime(timezone=True), nullable=True)
    
    def soft_delete(self) -> None:
        """Soft delete this record"""
        self.is_deleted = True
        self.deleted_at = datetime.utcnow()
    
    def restore(self) -> None:
        """Restore soft deleted record"""
        self.is_deleted = False
        self.deleted_at = None


class UUIDModel(Base):
    """Base model dengan UUID primary key"""
    __abstract__ = True
    
    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    created_at = Column(
        DateTime(timezone=True),
        server_default=func.now(),
        nullable=False
    )
    updated_at = Column(
        DateTime(timezone=True),
        server_default=func.now(),
        onupdate=func.now(),
        nullable=False
    )
    
    def to_dict(self, exclude: list = None) -> dict:
        """Convert model to dictionary"""
        exclude = exclude or ["created_at", "updated_at"]
        return {
            c.name: getattr(self, c.name)
            for c in self.__table__.columns
            if c.name not in exclude
        }
```

### 6. Advanced Repository Pattern (repositories/base.py)

```python
from typing import Generic, TypeVar, List, Optional, Type, Dict, Any
from sqlalchemy.orm import Session
from sqlalchemy import desc, func, asc, and_, or_
from datetime import datetime

ModelType = TypeVar("ModelType")

class BaseRepository(Generic[ModelType]):
    """
    Base repository dengan advanced CRUD operations
    
    Supports:
    - Pagination
    - Filtering
    - Sorting
    - Searching
    - Soft delete handling
    """
    
    def __init__(self, model: Type[ModelType], db: Session):
        self.model = model
        self.db = db
    
    # ============ BASIC CRUD ============
    
    def get_by_id(self, id: int) -> Optional[ModelType]:
        """Get record by ID"""
        return self.db.query(self.model).filter(self.model.id == id).first()
    
    def get_all(
        self,
        skip: int = 0,
        limit: int = 100,
        exclude_deleted: bool = True
    ) -> List[ModelType]:
        """Get all records with pagination and soft delete filter"""
        query = self.db.query(self.model)
        
        if exclude_deleted and hasattr(self.model, "is_deleted"):
            query = query.filter(self.model.is_deleted == False)
        
        return query.offset(skip).limit(limit).all()
    
    def get_count(self, exclude_deleted: bool = True) -> int:
        """Get total records count"""
        query = self.db.query(func.count(self.model.id))
        
        if exclude_deleted and hasattr(self.model, "is_deleted"):
            query = query.filter(self.model.is_deleted == False)
        
        return query.scalar()
    
    def create(self, obj_in: Dict[str, Any]) -> ModelType:
        """Create new record"""
        db_obj = self.model(**obj_in)
        self.db.add(db_obj)
        self.db.commit()
        self.db.refresh(db_obj)
        return db_obj
    
    def update(
        self,
        id: int,
        obj_in: Dict[str, Any],
        exclude_unset: bool = True
    ) -> Optional[ModelType]:
        """Update record"""
        db_obj = self.get_by_id(id)
        if not db_obj:
            return None
        
        update_data = {k: v for k, v in obj_in.items() if v is not None} if exclude_unset else obj_in
        
        for key, value in update_data.items():
            if hasattr(db_obj, key):
                setattr(db_obj, key, value)
        
        self.db.commit()
        self.db.refresh(db_obj)
        return db_obj
    
    def delete(self, id: int, soft: bool = True) -> bool:
        """Delete record (soft or hard)"""
        db_obj = self.get_by_id(id)
        if not db_obj:
            return False
        
        if soft and hasattr(db_obj, "soft_delete"):
            db_obj.soft_delete()
        else:
            self.db.delete(db_obj)
        
        self.db.commit()
        return True
    
    # ============ SEARCH & FILTER ============
    
    def get_by_field(self, field: str, value: Any) -> Optional[ModelType]:
        """Get by any field"""
        return self.db.query(self.model).filter(
            getattr(self.model, field) == value
        ).first()
    
    def filter_by(self, **kwargs) -> List[ModelType]:
        """Filter by multiple fields"""
        query = self.db.query(self.model)
        for key, value in kwargs.items():
            if hasattr(self.model, key):
                query = query.filter(getattr(self.model, key) == value)
        return query.all()
    
    def search(
        self,
        search_fields: List[str],
        search_query: str,
        skip: int = 0,
        limit: int = 100
    ) -> tuple[List[ModelType], int]:
        """Full-text search dalam multiple fields"""
        filters = [
            getattr(self.model, field).ilike(f"%{search_query}%")
            for field in search_fields
        ]
        
        query = self.db.query(self.model).filter(or_(*filters))
        total = query.count()
        
        return query.offset(skip).limit(limit).all(), total
    
    # ============ SORTING & PAGINATION ============
    
    def get_sorted(
        self,
        sort_by: str = "id",
        sort_desc: bool = False,
        skip: int = 0,
        limit: int = 100
    ) -> List[ModelType]:
        """Get with sorting"""
        query = self.db.query(self.model)
        
        if hasattr(self.model, sort_by):
            order_col = getattr(self.model, sort_by)
            if sort_desc:
                query = query.order_by(desc(order_col))
            else:
                query = query.order_by(asc(order_col))
        
        return query.offset(skip).limit(limit).all()
    
    # ============ BULK OPERATIONS ============
    
    def create_many(self, objs_in: List[Dict[str, Any]]) -> List[ModelType]:
        """Create multiple records"""
        db_objs = [self.model(**obj) for obj in objs_in]
        self.db.add_all(db_objs)
        self.db.commit()
        return db_objs
    
    def update_many(self, ids: List[int], obj_in: Dict[str, Any]) -> int:
        """Update multiple records"""
        count = self.db.query(self.model).filter(
            self.model.id.in_(ids)
        ).update(obj_in)
        self.db.commit()
        return count
    
    def delete_many(self, ids: List[int], soft: bool = True) -> int:
        """Delete multiple records"""
        if soft and hasattr(self.model, "is_deleted"):
            count = self.update_many(ids, {"is_deleted": True, "deleted_at": datetime.utcnow()})
        else:
            count = self.db.query(self.model).filter(
                self.model.id.in_(ids)
            ).delete()
            self.db.commit()
        return count
```

### 7. Advanced Service Pattern (services/base.py)

```python
from typing import Generic, TypeVar, List, Optional, Dict, Any, Tuple
from sqlalchemy.orm import Session
from repositories.base import BaseRepository
from utils.logger import logger

ModelType = TypeVar("ModelType")
RepositoryType = TypeVar("RepositoryType", bound=BaseRepository)

class BaseService(Generic[ModelType, RepositoryType]):
    """
    Base service dengan business logic patterns
    
    Features:
    - CRUD operations
    - Caching support
    - Transaction handling
    - Business validations
    """
    
    def __init__(self, repository: RepositoryType):
        self.repository = repository
    
    # ============ BASIC CRUD ============
    
    def get_by_id(self, id: int) -> Optional[ModelType]:
        """Get by ID"""
        return self.repository.get_by_id(id)
    
    def get_all(
        self,
        skip: int = 0,
        limit: int = 100
    ) -> Tuple[List[ModelType], int]:
        """Get all with total count"""
        items = self.repository.get_all(skip, limit)
        total = self.repository.get_count()
        return items, total
    
    def create(self, obj_in: Dict[str, Any]) -> ModelType:
        """Create"""
        logger.debug(f"Creating {self.repository.model.__name__}: {obj_in}")
        return self.repository.create(obj_in)
    
    def update(self, id: int, obj_in: Dict[str, Any]) -> Optional[ModelType]:
        """Update"""
        logger.debug(f"Updating {self.repository.model.__name__}({id})")
        return self.repository.update(id, obj_in)
    
    def delete(self, id: int) -> bool:
        """Delete"""
        logger.debug(f"Deleting {self.repository.model.__name__}({id})")
        return self.repository.delete(id)
    
    # ============ SEARCH & FILTER ============
    
    def search(
        self,
        search_fields: List[str],
        search_query: str,
        skip: int = 0,
        limit: int = 100
    ) -> Tuple[List[ModelType], int]:
        """Search"""
        return self.repository.search(search_fields, search_query, skip, limit)
    
    def filter(self, **kwargs) -> List[ModelType]:
        """Filter by fields"""
        return self.repository.filter_by(**kwargs)
```

### 8. Settings Configuration (config/settings.py)

```python
from pydantic_settings import BaseSettings
from typing import Literal, List
import os

class Settings(BaseSettings):
    """Application settings from environment variables"""
    
    # ========== App Config ==========
    APP_NAME: str = "FastAPI Middle App"
    APP_VERSION: str = "1.0.0"
    APP_DESCRIPTION: str = "FastAPI application with PostgreSQL"
    ENVIRONMENT: Literal["development", "staging", "production"] = "development"
    DEBUG: bool = True
    
    # ========== Database ==========
    DATABASE_URL: str = "postgresql://user:password@localhost:5432/dbname"
    SQLALCHEMY_ECHO: bool = False
    DB_POOL_SIZE: int = 5
    DB_MAX_OVERFLOW: int = 10
    DB_POOL_RECYCLE: int = 3600
    DB_CONNECT_TIMEOUT: int = 10
    
    # ========== Cache (Redis) ==========
    REDIS_URL: str = "redis://localhost:6379/0"
    REDIS_ENABLED: bool = False
    CACHE_TTL: int = 3600  # 1 hour
    
    # ========== Server ==========
    HOST: str = "0.0.0.0"
    PORT: int = 8000
    API_V1_PREFIX: str = "/api/v1"
    
    # ========== CORS ==========
    CORS_ORIGINS: List[str] = ["*"]
    CORS_ALLOW_CREDENTIALS: bool = True
    CORS_ALLOW_METHODS: List[str] = ["*"]
    CORS_ALLOW_HEADERS: List[str] = ["*"]
    
    # ========== Logging ==========
    LOG_LEVEL: str = "INFO"
    LOG_FILE: str = "logs/app.log"
    LOG_FORMAT: str = "%(asctime)s | %(name)s | %(levelname)s | %(message)s"
    
    # ========== Security ==========
    SECRET_KEY: str = "dev-secret-key-change-in-production"
    
    # ========== Features ==========
    ENABLE_BACKGROUND_TASKS: bool = True
    ENABLE_CACHING: bool = False
    
    class Config:
        env_file = ".env"
        case_sensitive = True

settings = Settings()

# Safe database URL untuk logging (mask password)
settings.DATABASE_URL_SAFE = settings.DATABASE_URL.replace(
    settings.DATABASE_URL.split("://")[1].split("@")[0],
    "***:***"
)
```

### 9. Advanced Response Utilities (utils/response.py)

```python
from typing import Any, Dict, Optional, List
from fastapi.responses import JSONResponse
from datetime import datetime

def success_response(
    message: str = "Success",
    data: Any = None,
    status_code: int = 200,
    metadata: Dict = None
) -> JSONResponse:
    """Success response format"""
    return JSONResponse(
        status_code=status_code,
        content={
            "success": True,
            "message": message,
            "data": data or {},
            "timestamp": datetime.utcnow().isoformat(),
            **({"metadata": metadata} if metadata else {})
        }
    )

def paginated_response(
    message: str = "Success",
    items: List = None,
    total: int = 0,
    skip: int = 0,
    limit: int = 100,
    status_code: int = 200
) -> JSONResponse:
    """Paginated list response"""
    pages = (total + limit - 1) // limit if total > 0 else 0
    
    return JSONResponse(
        status_code=status_code,
        content={
            "success": True,
            "message": message,
            "data": {
                "items": items or [],
                "pagination": {
                    "total": total,
                    "skip": skip,
                    "limit": limit,
                    "pages": pages,
                    "current_page": (skip // limit) + 1 if limit > 0 else 1
                }
            },
            "timestamp": datetime.utcnow().isoformat()
        }
    )

def error_response(
    message: str = "Error",
    error_code: str = "UNKNOWN_ERROR",
    details: Any = None,
    status_code: int = 400
) -> JSONResponse:
    """Error response format"""
    return JSONResponse(
        status_code=status_code,
        content={
            "success": False,
            "message": message,
            "data": {
                "error_code": error_code,
                "details": details
            },
            "timestamp": datetime.utcnow().isoformat()
        }
    )
```

### 10. Advanced Dependencies (utils/dependencies.py)

```python
from typing import Optional
from pydantic import BaseModel, Field

class PaginationParams(BaseModel):
    """Pagination parameters"""
    skip: int = Field(0, ge=0)
    limit: int = Field(100, ge=1, le=1000)

class SortParams(BaseModel):
    """Sorting parameters"""
    sort_by: str = "id"
    sort_desc: bool = False

class SearchParams(BaseModel):
    """Search parameters"""
    q: Optional[str] = None
    fields: list = Field(default_factory=list)

class FilterParams(BaseModel):
    """Filter parameters"""
    filters: Optional[dict] = None
```

### 11. Main Application (main.py) - Advanced Version

```python
from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.exceptions import RequestValidationError
from starlette.exceptions import HTTPException as StarletteHTTPException

from config.settings import settings
from config.database import check_database_connection, init_db, get_database_info, engine
from api.v1.router import api_router
from utils.middleware import RequestIDMiddleware, RequestLoggingMiddleware
from utils.exception_handlers import (
    http_exception_handler,
    validation_exception_handler,
    general_exception_handler
)
from utils.logger import logger

@asynccontextmanager
async def lifespan(app: FastAPI):
    """Lifespan context manager for startup and shutdown"""
    # Startup
    logger.info(f"🚀 Starting {settings.APP_NAME} v{settings.APP_VERSION}")
    logger.info(f"Environment: {settings.ENVIRONMENT}")
    logger.info(f"Debug: {settings.DEBUG}")
    logger.info(f"Database: {str(get_database_info())}")
    
    # Check database
    if check_database_connection():
        init_db()
        logger.info("✓ Database initialized")
    else:
        logger.warning("⚠ Database connection failed")
    
    yield
    
    # Shutdown
    logger.info("🛑 Shutting down application")
    engine.dispose()
    logger.info("✓ Database connections closed")

# Initialize FastAPI app
app = FastAPI(
    title=settings.APP_NAME,
    version=settings.APP_VERSION,
    description=settings.APP_DESCRIPTION,
    docs_url="/docs" if settings.DEBUG else None,
    redoc_url="/redoc" if settings.DEBUG else None,
    openapi_url="/openapi.json" if settings.DEBUG else None,
    lifespan=lifespan
)

# Exception handlers
app.add_exception_handler(StarletteHTTPException, http_exception_handler)
app.add_exception_handler(RequestValidationError, validation_exception_handler)
app.add_exception_handler(Exception, general_exception_handler)

# CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.CORS_ORIGINS,
    allow_credentials=settings.CORS_ALLOW_CREDENTIALS,
    allow_methods=settings.CORS_ALLOW_METHODS,
    allow_headers=settings.CORS_ALLOW_HEADERS,
)

# Custom middleware
app.add_middleware(RequestIDMiddleware)
app.add_middleware(RequestLoggingMiddleware)

# API routes
app.include_router(api_router, prefix=settings.API_V1_PREFIX)

@app.get("/", tags=["Health"])
def root():
    """Root endpoint"""
    return {
        "app": settings.APP_NAME,
        "version": settings.APP_VERSION,
        "environment": settings.ENVIRONMENT,
        "docs": "/docs" if settings.DEBUG else "disabled",
        "database": get_database_info()
    }

@app.get("/health", tags=["Health"])
def health_check():
    """Health check endpoint"""
    return {
        "status": "healthy",
        "version": settings.APP_VERSION,
        "environment": settings.ENVIRONMENT
    }
```

### 12. Alembic Setup untuk Database Migrations

```python
# alembic.ini atau alembic/env.py konfigurasi
# Install: pip install alembic

# Commands:
# alembic init alembic                    # Create migration environment
# alembic revision --autogenerate -m "msg" # Generate migration
# alembic upgrade head                    # Apply migrations
# alembic downgrade -1                    # Rollback last migration
# alembic history                         # View migration history
```

### 13. Requirements.txt

```
fastapi==0.109.0
uvicorn[standard]==0.27.0
sqlalchemy==2.0.25
psycopg2-binary==2.9.9
pydantic==2.5.3
pydantic-settings==2.1.0
python-dotenv==1.0.0
alembic==1.13.0
sqlalchemy-utils==0.41.1
redis==5.0.1
apscheduler==3.10.4
pytest==7.4.3
pytest-asyncio==0.21.1
pytest-cov==4.1.0
python-multipart==0.0.6
```

### 14. .env.example

```
# App
APP_NAME=My Middle App
APP_VERSION=1.0.0
ENVIRONMENT=development
DEBUG=True

# Database
DATABASE_URL=postgresql://postgres:password@localhost:5432/mydb
SQLALCHEMY_ECHO=False
DB_POOL_SIZE=5
DB_MAX_OVERFLOW=10
DB_POOL_RECYCLE=3600

# Redis
REDIS_URL=redis://localhost:6379/0
REDIS_ENABLED=False

# Server
HOST=0.0.0.0
PORT=8000

# Security
SECRET_KEY=your-secret-key-here

# Features
ENABLE_BACKGROUND_TASKS=True
ENABLE_CACHING=False
```

### 15. Alembic Migration Example

```python
# alembic/versions/001_init_tables.py

from alembic import op
import sqlalchemy as sa

def upgrade():
    """Upgrade database"""
    # Create products table
    op.create_table(
        'products',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('name', sa.String(255), nullable=False),
        sa.Column('description', sa.Text(), nullable=True),
        sa.Column('price', sa.Float(), nullable=False),
        sa.Column('stock', sa.Integer(), default=0),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.func.now()),
        sa.Column('updated_at', sa.DateTime(timezone=True), server_default=sa.func.now()),
        sa.PrimaryKeyConstraint('id'),
    )
    op.create_index('ix_products_name', 'products', ['name'])

def downgrade():
    """Downgrade database"""
    op.drop_table('products')
```

---

## ✅ Implementation Checklist

- [ ] Setup PostgreSQL database dan connection pool
- [ ] Configure Alembic untuk migrations
- [ ] Create Model dengan relationships dan constraints
- [ ] Create Pydantic schemas (Base, Create, Update, Response)
- [ ] Create Repository dengan custom queries
- [ ] Create Service dengan business logic
- [ ] Create Endpoint dengan dependency injection
- [ ] Implement searching, filtering, sorting
- [ ] Setup Redis caching (optional)
- [ ] Write integration tests
- [ ] Configure logging dan monitoring
- [ ] Setup background tasks (APScheduler)
- [ ] Create database migration scripts
- [ ] Document API endpoints
- [ ] Setup CI/CD pipeline

---

## 🚀 Quick Start

```bash
# 1. Setup project
mkdir my-middle-app && cd my-middle-app
git clone ... .
python -m venv venv
source venv/bin/activate

# 2. Install dependencies
pip install -r requirements.txt

# 3. Configure environment
cp .env.example .env
# Edit .env dengan database credentials

# 4. Database setup
alembic upgrade head        # Apply migrations
python scripts/seed_data.py # Optional: seed initial data

# 5. Run server
python run.py

# 6. Visit
# http://localhost:8000
# http://localhost:8000/docs (Swagger)
```

---

## 📊 Database Design Best Practices

1. **Use Alembic untuk migrations** - version control database
2. **Implement relationships** - foreign keys, constraints
3. **Optimize queries** - use indexes, eager loading
4. **Connection pooling** - reuse connections efficiently
5. **Transaction management** - proper commit/rollback
6. **Backup strategy** - regular database backups
7. **Performance monitoring** - track slow queries

---

## 🔒 Production Considerations

1. **Environment-based config** - use .env untuk secrets
2. **Database credentials** - never commit to git
3. **SSL/TLS** - encrypt database connections
4. **Monitoring & logging** - structured logs untuk debugging
5. **Error handling** - don't expose internal details
6. **Rate limiting** - protect API dari abuse
7. **Input validation** - Pydantic handles this
8. **CORS policy** - restrict origins in production
9. **Database indexing** - optimize frequently-queried fields
10. **Backup & disaster recovery** - plan untuk contingencies

---

## 🔗 Useful Resources

- [FastAPI Documentation](https://fastapi.tiangolo.com/)
- [SQLAlchemy 2.0 ORM](https://docs.sqlalchemy.org/en/20/orm/)
- [Pydantic Validation](https://docs.pydantic.dev/)
- [Alembic Migrations](https://alembic.sqlalchemy.org/)
- [PostgreSQL Documentation](https://www.postgresql.org/docs/)
- [APScheduler Background Tasks](https://apscheduler.readthedocs.io/)
- [Redis Caching](https://redis.io/docs/)
```

---

## 📝 Differences from Simple App (SQLite)

| Feature | Simple (SQLite) | Middle (PostgreSQL) |
|---------|-----------------|-------------------|
| Database | SQLite (file-based) | PostgreSQL (server) |
| Connection Pooling | Basic | Advanced (QueuePool) |
| Migrations | Manual | Alembic |
| Soft Delete | Optional | Built-in mixin |
| Transactions | Basic | Advanced handling |
| Background Tasks | None | APScheduler |
| Caching | None | Redis optional |
| Multi-tenancy | No | Supported |
| Scaling | Limited | Horizontal scaling |
| Production Ready | Partial | Full |

---

## 🎯 Best Suited For

- **Medium-scale applications** dengan 100K-10M records
- **Multi-user systems** dengan concurrent access
- **Microservices** yang memerlukan advanced features
- **APIs** dengan complex business logic
- **Background processing** dan long-running tasks
- Applications yang memerlukan **reliability** dan **performance**
