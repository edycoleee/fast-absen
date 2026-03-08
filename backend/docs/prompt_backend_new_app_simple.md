# Prompt AI - FastAPI Simple Application (SQLite, No Auth)

Gunakan prompt ini untuk membuat aplikasi FastAPI baru dengan clean architecture, **tanpa JWT**, **tanpa RBAC**, dan menggunakan **SQLite database**.

---

## 🤖 PROMPT UNTUK AI

```
Buatkan FastAPI application sederhana dengan clean architecture yang production-ready.

## Requirements:

### 1. Tech Stack
- FastAPI 0.109.0
- SQLAlchemy 2.0.25 (ORM)
- Pydantic 2.5.3 (Validation)
- SQLite (Database)
- Uvicorn 0.27.0 (ASGI Server)
- Python 3.11+
- python-dotenv (Environment config)

### 2. Clean Architecture Layers
Implementasikan struktur 4-layer:
```
Endpoint Layer → Service Layer → Repository Layer → Model Layer
```

Layer responsibilities:
- **Endpoint**: HTTP handling, request/response validation
- **Service**: Business logic, data processing
- **Repository**: Data access, database queries
- **Model**: Database schema, ORM models

### 3. Project Structure
```
backend/
├── main.py                          # FastAPI app entry point
├── run.py                           # Server runner
├── .env.example                     # Environment template
├── requirements.txt                 # Dependencies
├── config/
│   ├── __init__.py
│   ├── database.py                  # SQLite config + session
│   └── settings.py                  # Environment-based settings
├── models/
│   ├── __init__.py                  # Import all models
│   ├── base.py                      # BaseModel with mixins (id, timestamps)
│   └── [entity].py                  # Entity models (e.g., products.py, users.py)
├── schemas/
│   ├── __init__.py
│   ├── base.py                      # BaseSchema, BaseResponseSchema
│   └── [entity].py                  # Pydantic schemas per entity
├── repositories/
│   ├── __init__.py
│   ├── base.py                      # BaseRepository[T] - Generic CRUD
│   └── [entity]_repository.py       # Entity-specific repository
├── services/
│   ├── __init__.py
│   ├── base.py                      # BaseService[T, R] - Base service logic
│   └── [entity]_service.py          # Business logic per entity
├── api/
│   ├── __init__.py
│   └── v1/
│       ├── __init__.py
│       ├── endpoints/
│       │   ├── __init__.py
│       │   ├── health.py            # Health check endpoint
│       │   └── [entity].py          # Entity endpoints (CRUD operations)
│       └── router.py                # Main API router v1
├── utils/
│   ├── __init__.py
│   ├── constants.py                 # Enums, error messages, defaults
│   ├── dependencies.py              # CommonQueryParams, shared dependencies
│   ├── exception_handlers.py        # Production-safe error handling
│   ├── logger.py                    # Logging configuration
│   ├── middleware.py                # RequestID + RequestLogging middleware
│   └── response.py                  # Standard response utilities
└── tests/
    ├── __init__.py
    ├── conftest.py                  # Pytest fixtures
    └── test_[entity].py             # Unit & integration tests
```

### 4. Database Configuration (config/database.py)

```python
import os
from sqlalchemy import create_engine, event, Engine
from sqlalchemy.orm import sessionmaker, Session
from sqlalchemy.pool import StaticPool
from config.settings import settings
from utils.logger import logger

# SQLite database setup
DATABASE_URL = settings.DATABASE_URL or "sqlite:///./app.db"

# Use StaticPool untuk SQLite in-memory testing
connect_args = {"check_same_thread": False} if "sqlite" in DATABASE_URL else {}
pool_class = StaticPool if "sqlite" in DATABASE_URL else None

engine = create_engine(
    DATABASE_URL,
    connect_args=connect_args,
    poolclass=pool_class,
    echo=settings.SQLALCHEMY_ECHO,
)

# Enable foreign keys untuk SQLite
@event.listens_for(Engine, "connect")
def set_sqlite_pragma(dbapi_connection, connection_record):
    if "sqlite" in DATABASE_URL:
        cursor = dbapi_connection.cursor()
        cursor.execute("PRAGMA foreign_keys=ON")
        cursor.close()

SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

def get_db() -> Session:
    """Dependency injection untuk database session"""
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

def get_database_info() -> dict:
    """Get database configuration info (safe for logging)"""
    return {
        "database": DATABASE_URL.split("///")[-1] if "sqlite" in DATABASE_URL else DATABASE_URL.split("@")[-1],
        "type": "SQLite" if "sqlite" in DATABASE_URL else "PostgreSQL"
    }

def check_database_connection() -> bool:
    """Check database connection"""
    try:
        with engine.connect() as conn:
            logger.info("Database connection successful")
            return True
    except Exception as e:
        logger.error(f"Database connection failed: {e}")
        return False

# Import models untuk auto-creation
from models import *

def init_db():
    """Create all tables"""
    Base.metadata.create_all(bind=engine)
    logger.info("Database tables created")
```

### 5. Base Model (models/base.py)

```python
from datetime import datetime
from sqlalchemy import Column, Integer, DateTime, func
from sqlalchemy.orm import declarative_base
from sqlalchemy.ext.hybrid import hybrid_property

Base = declarative_base()

class BaseModel(Base):
    """Base model dengan id dan timestamp"""
    __abstract__ = True
    
    id = Column(Integer, primary_key=True, index=True)
    created_at = Column(DateTime, server_default=func.now(), nullable=False)
    updated_at = Column(DateTime, server_default=func.now(), onupdate=func.now(), nullable=False)
    
    def __repr__(self):
        return f"<{self.__class__.__name__}(id={self.id})>"
    
    def to_dict(self) -> dict:
        """Convert model to dictionary"""
        return {c.name: getattr(self, c.name) for c in self.__table__.columns}
    
    def update_from_dict(self, data: dict) -> None:
        """Update model from dictionary"""
        for key, value in data.items():
            if hasattr(self, key) and key not in ["id", "created_at"]:
                setattr(self, key, value)
```

### 6. Response Utilities (utils/response.py)

```python
from typing import Any, Dict, Optional, List
from fastapi.responses import JSONResponse

def success_response(
    message: str = "Success",
    data: Any = None,
    status_code: int = 200
) -> JSONResponse:
    """Success response format"""
    return JSONResponse(
        status_code=status_code,
        content={
            "success": True,
            "message": message,
            "data": data or {}
        }
    )

def list_response(
    message: str = "Success",
    items: List = None,
    total: Optional[int] = None,
    skip: int = 0,
    limit: int = 100,
    status_code: int = 200
) -> JSONResponse:
    """List response with optional pagination"""
    data = {"items": items or []}
    if total is not None:
        data.update({
            "total": total,
            "skip": skip,
            "limit": limit,
            "pages": (total + limit - 1) // limit
        })
    return JSONResponse(
        status_code=status_code,
        content={
            "success": True,
            "message": message,
            "data": data
        }
    )

def error_response(
    message: str = "Error",
    error_code: str = None,
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
                "error_code": error_code or "UNKNOWN_ERROR",
                "details": details
            }
        }
    )
```

### 7. Base Repository (repositories/base.py)

```python
from typing import Generic, TypeVar, List, Optional, Type
from sqlalchemy.orm import Session
from sqlalchemy import desc, func

ModelType = TypeVar("ModelType")

class BaseRepository(Generic[ModelType]):
    """Base repository dengan CRUD operations"""
    
    def __init__(self, model: Type[ModelType], db: Session):
        self.model = model
        self.db = db
    
    def get_by_id(self, id: int) -> Optional[ModelType]:
        """Get record by ID"""
        return self.db.query(self.model).filter(self.model.id == id).first()
    
    def get_all(self, skip: int = 0, limit: int = 100) -> List[ModelType]:
        """Get all records with pagination"""
        return self.db.query(self.model).offset(skip).limit(limit).all()
    
    def get_count(self) -> int:
        """Get total records count"""
        return self.db.query(func.count(self.model.id)).scalar()
    
    def create(self, obj_in: dict) -> ModelType:
        """Create new record"""
        db_obj = self.model(**obj_in)
        self.db.add(db_obj)
        self.db.commit()
        self.db.refresh(db_obj)
        return db_obj
    
    def update(self, id: int, obj_in: dict) -> Optional[ModelType]:
        """Update record"""
        db_obj = self.get_by_id(id)
        if not db_obj:
            return None
        for key, value in obj_in.items():
            setattr(db_obj, key, value)
        self.db.commit()
        self.db.refresh(db_obj)
        return db_obj
    
    def delete(self, id: int) -> bool:
        """Delete record"""
        db_obj = self.get_by_id(id)
        if not db_obj:
            return False
        self.db.delete(db_obj)
        self.db.commit()
        return True
    
    def get_by_field(self, field: str, value: any) -> Optional[ModelType]:
        """Get by any field"""
        return self.db.query(self.model).filter(
            getattr(self.model, field) == value
        ).first()
    
    def search(self, search_fields: List[str], search_query: str, 
               skip: int = 0, limit: int = 100) -> List[ModelType]:
        """Search in multiple fields"""
        from sqlalchemy import or_, and_
        filters = [getattr(self.model, field).ilike(f"%{search_query}%") 
                   for field in search_fields]
        return self.db.query(self.model).filter(
            or_(*filters)
        ).offset(skip).limit(limit).all()
```

### 8. Base Service (services/base.py)

```python
from typing import Generic, TypeVar, List, Optional, Type
from sqlalchemy.orm import Session
from repositories.base import BaseRepository

ModelType = TypeVar("ModelType")
RepositoryType = TypeVar("RepositoryType", bound=BaseRepository)

class BaseService(Generic[ModelType, RepositoryType]):
    """Base service dengan common business logic"""
    
    def __init__(self, repository: RepositoryType):
        self.repository = repository
    
    def get_by_id(self, id: int) -> Optional[ModelType]:
        """Get by ID"""
        return self.repository.get_by_id(id)
    
    def get_all(self, skip: int = 0, limit: int = 100) -> tuple[List[ModelType], int]:
        """Get all with total count"""
        items = self.repository.get_all(skip, limit)
        total = self.repository.get_count()
        return items, total
    
    def create(self, obj_in: dict) -> ModelType:
        """Create"""
        return self.repository.create(obj_in)
    
    def update(self, id: int, obj_in: dict) -> Optional[ModelType]:
        """Update"""
        return self.repository.update(id, obj_in)
    
    def delete(self, id: int) -> bool:
        """Delete"""
        return self.repository.delete(id)
```

### 9. Example Entity - Product (Complete Flow)

#### Model (models/product.py)
```python
from sqlalchemy import Column, String, Float, Integer, Text
from models.base import BaseModel

class Product(BaseModel):
    """Product model"""
    __tablename__ = "products"
    
    name = Column(String(255), nullable=False, unique=True, index=True)
    description = Column(Text, nullable=True)
    price = Column(Float, nullable=False)
    stock = Column(Integer, default=0)
    sku = Column(String(50), unique=True, index=True)
    
    def __repr__(self):
        return f"<Product(id={self.id}, name='{self.name}', price={self.price})>"
```

#### Schema (schemas/product.py)
```python
from pydantic import Field
from typing import Optional
from schemas.base import BaseSchema, BaseResponseSchema

class ProductBase(BaseSchema):
    """Base product schema"""
    name: str = Field(..., min_length=1, max_length=255)
    description: Optional[str] = None
    price: float = Field(..., gt=0)
    stock: int = Field(default=0, ge=0)
    sku: Optional[str] = Field(None, max_length=50)

class ProductCreate(ProductBase):
    """Schema untuk create product"""
    pass

class ProductUpdate(BaseSchema):
    """Schema untuk update product (semua optional)"""
    name: Optional[str] = Field(None, min_length=1, max_length=255)
    description: Optional[str] = None
    price: Optional[float] = Field(None, gt=0)
    stock: Optional[int] = Field(None, ge=0)
    sku: Optional[str] = Field(None, max_length=50)

class ProductResponse(ProductBase, BaseResponseSchema):
    """Response schema dengan id dan timestamps"""
    pass
```

#### Repository (repositories/product_repository.py)
```python
from sqlalchemy.orm import Session
from repositories.base import BaseRepository
from models.product import Product

class ProductRepository(BaseRepository[Product]):
    """Product repository"""
    
    def __init__(self, db: Session):
        super().__init__(Product, db)
    
    def get_by_sku(self, sku: str):
        """Get product by SKU"""
        return self.get_by_field("sku", sku)
    
    def get_low_stock(self, threshold: int = 10):
        """Get products dengan stock rendah"""
        return self.db.query(self.model).filter(
            self.model.stock < threshold
        ).all()
```

#### Service (services/product_service.py)
```python
from services.base import BaseService
from repositories.product_repository import ProductRepository
from models.product import Product
from utils.logger import logger

class ProductService(BaseService[Product, ProductRepository]):
    """Product service dengan business logic"""
    
    def __init__(self, repository: ProductRepository):
        super().__init__(repository)
    
    def adjust_stock(self, product_id: int, quantity: int) -> Product:
        """Adjust product stock"""
        product = self.get_by_id(product_id)
        if not product:
            raise ValueError(f"Product {product_id} not found")
        
        new_stock = product.stock + quantity
        if new_stock < 0:
            raise ValueError("Stock cannot be negative")
        
        return self.update(product_id, {"stock": new_stock})
```

#### Endpoint (api/v1/endpoints/product.py)
```python
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from config.database import get_db
from schemas.product import ProductCreate, ProductUpdate, ProductResponse
from services.product_service import ProductService
from repositories.product_repository import ProductRepository
from utils.response import success_response, list_response, error_response
from utils.dependencies import CommonQueryParams

router = APIRouter(prefix="/products", tags=["products"])

def get_product_service(db: Session = Depends(get_db)) -> ProductService:
    """Dependency injection untuk ProductService"""
    repo = ProductRepository(db)
    return ProductService(repo)

@router.get("/", response_model=dict)
async def list_products(
    params: CommonQueryParams = Depends(),
    service: ProductService = Depends(get_product_service)
):
    """List all products"""
    items, total = service.get_all(params.skip, params.limit)
    return list_response(
        message="Products retrieved successfully",
        items=[item.to_dict() for item in items],
        total=total,
        skip=params.skip,
        limit=params.limit
    )

@router.get("/{id}", response_model=dict)
async def get_product(
    id: int,
    service: ProductService = Depends(get_product_service)
):
    """Get product by ID"""
    product = service.get_by_id(id)
    if not product:
        return error_response("Product not found", "PRODUCT_NOT_FOUND", status_code=404)
    return success_response("Product retrieved successfully", product.to_dict())

@router.post("/", response_model=dict, status_code=201)
async def create_product(
    obj_in: ProductCreate,
    service: ProductService = Depends(get_product_service)
):
    """Create new product"""
    product = service.create(obj_in.model_dump())
    return success_response("Product created successfully", product.to_dict(), status_code=201)

@router.put("/{id}", response_model=dict)
async def update_product(
    id: int,
    obj_in: ProductUpdate,
    service: ProductService = Depends(get_product_service)
):
    """Update product"""
    product = service.update(id, obj_in.model_dump(exclude_unset=True))
    if not product:
        return error_response("Product not found", "PRODUCT_NOT_FOUND", status_code=404)
    return success_response("Product updated successfully", product.to_dict())

@router.delete("/{id}", response_model=dict)
async def delete_product(
    id: int,
    service: ProductService = Depends(get_product_service)
):
    """Delete product"""
    success = service.delete(id)
    if not success:
        return error_response("Product not found", "PRODUCT_NOT_FOUND", status_code=404)
    return success_response("Product deleted successfully")
```

### 10. Settings (config/settings.py)

```python
from pydantic_settings import BaseSettings
from typing import Literal
import os

class Settings(BaseSettings):
    """Application settings dari environment variables"""
    
    # App
    APP_NAME: str = "Simple FastAPI App"
    APP_VERSION: str = "1.0.0"
    ENVIRONMENT: Literal["development", "staging", "production"] = "development"
    DEBUG: bool = True
    
    # Database
    DATABASE_URL: str = "sqlite:///./app.db"
    SQLALCHEMY_ECHO: bool = False
    
    # Server
    HOST: str = "0.0.0.0"
    PORT: int = 8000
    
    # Logging
    LOG_LEVEL: str = "INFO"
    LOG_FILE: str = "logs/app.log"
    
    class Config:
        env_file = ".env"
        case_sensitive = True

settings = Settings()
```

### 11. Main Application (main.py)

```python
from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.exceptions import RequestValidationError
from starlette.exceptions import HTTPException as StarletteHTTPException

from config.settings import settings
from config.database import check_database_connection, init_db, get_database_info
from api.v1.router import api_router
from utils.middleware import RequestLoggingMiddleware, RequestIDMiddleware
from utils.exception_handlers import (
    http_exception_handler,
    validation_exception_handler,
    general_exception_handler
)
from utils.logger import logger

@asynccontextmanager
async def lifespan(app: FastAPI):
    """Lifespan context manager"""
    # Startup
    logger.info(f"Starting {settings.APP_NAME} v{settings.APP_VERSION}")
    logger.info(f"Environment: {settings.ENVIRONMENT}")
    logger.info(f"Database: {get_database_info()}")
    
    if check_database_connection():
        init_db()
        logger.info("Database initialized")
    
    yield
    
    # Shutdown
    logger.info(f"Stopping {settings.APP_NAME}")

app = FastAPI(
    title=settings.APP_NAME,
    version=settings.APP_VERSION,
    description="Simple FastAPI application dengan SQLite",
    lifespan=lifespan
)

# CORS Middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"] if settings.DEBUG else ["http://localhost:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Custom Middleware
app.add_middleware(RequestIDMiddleware)
app.add_middleware(RequestLoggingMiddleware)

# Exception Handlers
app.add_exception_handler(StarletteHTTPException, http_exception_handler)
app.add_exception_handler(RequestValidationError, validation_exception_handler)
app.add_exception_handler(Exception, general_exception_handler)

# Include API Router
app.include_router(api_router, prefix="/api/v1")

@app.get("/", tags=["health"])
async def root():
    """Root endpoint"""
    return {"message": f"Welcome to {settings.APP_NAME}"}

@app.get("/health", tags=["health"])
async def health_check():
    """Health check endpoint"""
    return {
        "status": "healthy",
        "app": settings.APP_NAME,
        "version": settings.APP_VERSION
    }

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(
        app,
        host=settings.HOST,
        port=settings.PORT,
        reload=settings.DEBUG
    )
```

### 12. Dependencies & Exception Handlers

#### utils/dependencies.py
```python
from pydantic import BaseModel

class CommonQueryParams(BaseModel):
    """Common query parameters untuk pagination"""
    skip: int = 0
    limit: int = 100
    
    class Config:
        from_attributes = True
```

#### utils/exception_handlers.py
```python
from fastapi import Request
from fastapi.responses import JSONResponse
from fastapi.exceptions import RequestValidationError
from starlette.exceptions import HTTPException as StarletteHTTPException
from utils.logger import logger

async def http_exception_handler(request: Request, exc: StarletteHTTPException):
    logger.error(f"HTTP Exception: {exc.status_code} - {exc.detail}")
    return JSONResponse(
        status_code=exc.status_code,
        content={
            "success": False,
            "message": str(exc.detail),
            "data": {"error_code": "HTTP_ERROR"}
        }
    )

async def validation_exception_handler(request: Request, exc: RequestValidationError):
    logger.warning(f"Validation Error: {exc.errors()}")
    return JSONResponse(
        status_code=422,
        content={
            "success": False,
            "message": "Validation error",
            "data": {"errors": exc.errors()}
        }
    )

async def general_exception_handler(request: Request, exc: Exception):
    logger.error(f"Unhandled Exception: {str(exc)}", exc_info=True)
    return JSONResponse(
        status_code=500,
        content={
            "success": False,
            "message": "Internal server error",
            "data": {"error_code": "INTERNAL_ERROR"}
        }
    )
```

### 13. Requirements.txt

```
fastapi==0.109.0
uvicorn[standard]==0.27.0
sqlalchemy==2.0.25
pydantic==2.5.3
pydantic-settings==2.1.0
python-dotenv==1.0.0
```

### 14. .env.example

```
# App
APP_NAME=My Simple App
APP_VERSION=1.0.0
ENVIRONMENT=development
DEBUG=True

# Database
DATABASE_URL=sqlite:///./app.db

# Server
HOST=0.0.0.0
PORT=8000

# Logging
LOG_LEVEL=INFO
LOG_FILE=logs/app.log
```

### 15. run.py

```python
import uvicorn
from config.settings import settings

if __name__ == "__main__":
    uvicorn.run(
        "main:app",
        host=settings.HOST,
        port=settings.PORT,
        reload=settings.DEBUG,
        log_level=settings.LOG_LEVEL.lower()
    )
```

---

## ✅ Implementation Checklist

Ketika membuat fitur baru, ikuti checklist ini:

- [ ] **Model** - Create SQLAlchemy model yang inherit dari BaseModel
- [ ] **Schema** - Create Pydantic schema (Base, Create, Update, Response)
- [ ] **Repository** - Create repository dengan custom queries jika perlu
- [ ] **Service** - Create service dengan business logic
- [ ] **Endpoint** - Create endpoint dengan dependency injection
- [ ] **Test** - Create unit & integration tests
- [ ] **Documentation** - Update API docs / comments

---

## 🚀 Quick Start

```bash
# 1. Setup project
mkdir my-app && cd my-app
git clone ... .
python -m venv venv
source venv/bin/activate

# 2. Install dependencies
pip install -r requirements.txt

# 3. Configure environment
cp .env.example .env

# 4. Run server
python run.py

# 5. Visit
# http://localhost:8000
# http://localhost:8000/docs (Swagger)
```

---

## 📚 Best Practices

1. **Always use dependency injection** untuk repositories/services
2. **Consistent response format** - Gunakan utils/response.py
3. **Proper logging** - Use logger untuk debugging dan monitoring
4. **Validation at Pydantic level** - Jangan duplikasi di service
5. **Database transactions** - Commit/rollback properly
6. **Error handling** - Return meaningful error messages
7. **Modular endpoints** - Pisahkan per entity dalam file terpisah
8. **Testing** - Write tests untuk critical business logic
9. **Documentation** - Update docstrings dan API comments
10. **Environment-based config** - Use .env untuk configuration

---

## 🔗 Useful Resources

- [FastAPI Docs](https://fastapi.tiangolo.com/)
- [SQLAlchemy 2.0](https://docs.sqlalchemy.org/en/20/)
- [Pydantic Docs](https://docs.pydantic.dev/)
- [Clean Architecture Principles](https://blog.cleancoder.com/uncle-bob/2012/08/13/the-clean-architecture.html)
```

---

## 📝 Notes

- **SQLite** cocok untuk development, testing, dan small-scale production apps
- **Tidak ada authentication** - Umum untuk internal tools atau public APIs tanpa user management
- **Clean Architecture** tetap applicable - Struktur rapi dan scalable
- **Dependency Injection** membuat testing lebih mudah
- Untuk production, pertimbangkan PostgreSQL + caching layer
