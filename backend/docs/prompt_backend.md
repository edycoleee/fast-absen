# Prompt AI - FastAPI Clean Architecture Boilerplate (RBAC Permission-Based)

Gunakan prompt ini untuk membuat boilerplate FastAPI backend dengan clean architecture dan RBAC berbasis permission (bukan hanya role).

---

## 🤖 PROMPT UNTUK AI

```
Buatkan saya FastAPI backend project dengan clean architecture yang production-ready.

## Requirements:

### 1. Tech Stack
- FastAPI 0.109.0
- SQLAlchemy 2.0.25 (ORM)
- Pydantic 2.5.3 (Validation)
- PostgreSQL (Database)
- Uvicorn 0.27.0 (ASGI Server)
- Python 3.11+

### 2. Clean Architecture Layers
Implementasikan struktur 4-layer:
```
API/Endpoint Layer → Service Layer → Repository Layer → Model Layer
```

Layer responsibilities:
- **Endpoint**: HTTP handling, request/response
- **Service**: Business logic, validasi business rules
- **Repository**: Data access, database queries
- **Model**: Database schema, ORM models

### 3. Project Structure
```
backend/
├── api/
│   └── v1/
│       ├── endpoints/
│       │   └── halo.py              # Example endpoint
│       └── router.py                # Main API router v1
├── config/
│   ├── database.py                  # DB config + health checks
│   └── settings.py                  # Environment-based settings
├── models/
│   └── base.py                      # BaseModel + Mixins (Timestamp, SoftDelete)
├── schemas/
│   ├── base.py                      # BaseSchema, PaginationParams
│   └── halo.py                      # Example schemas
├── repositories/
│   └── base.py                      # BaseRepository[ModelType] - Generic CRUD
├── services/
│   ├── base.py                      # BaseService[ModelType, RepositoryType]
│   └── halo_service.py              # Example service
├── utils/
│   ├── constants.py                 # Enums, error messages, defaults
│   ├── dependencies.py              # CommonQueryParams, auth deps
│   ├── exception_handlers.py        # Production-safe error handling
│   ├── logger.py                    # Rotating file handlers
│   ├── middleware.py                # RequestID + RequestLogging
│   └── response.py                  # Standard response utilities
├── docs/
│   ├── CLEAN_ARCHITECTURE_GUIDE.md  # Implementation guide
│   ├── IMPROVEMENTS.md              # Architecture decisions
│   └── RESPONSE_FORMAT.md           # API response standards
├── logs/                            # Auto-generated
├── .env
├── .env.example
├── main.py                          # FastAPI app entry
├── run.py                           # Development server script
├── requirements.txt
└── README.md
```

### 4. Core Features

#### A. Base Classes (Generic dengan TypeVar)
**models/base.py:**
- BaseModel: id, created_at, updated_at
- TimestampMixin: Auto timestamp tracking
- SoftDeleteMixin: is_deleted, deleted_at, soft_delete(), restore()
- BaseModelWithSoftDelete: Combine all mixins
- Methods: to_dict(), update_from_dict()

**schemas/base.py:**
- BaseSchema: Config for from_attributes
- BaseResponseSchema: id, created_at, updated_at
- PaginationParams: page, limit validation
- SearchParams: search, sort_by, order

**repositories/base.py:**
- BaseRepository[ModelType]: Generic repository
- Methods: get_by_id, get_all, create, update, delete, soft_delete, 
  search, count, exists, get_by_field, get_by_fields
- Type-safe dengan TypeVar

**services/base.py:**
- BaseService[ModelType, RepositoryType]: Generic service
- Methods: get_by_id, get_all, create, update, delete (with soft option)
- With pagination: (items, total) tuple return
- Search support dengan multiple fields

#### B. Utilities

**utils/response.py:**
Response helpers (data selalu object, NEVER array):
```python
def success_response(message: str, data: dict) -> dict:
    """Single resource"""
    return {"success": True, "message": message, "data": data}

def list_response(message: str, items: list, total: int) -> dict:
    """Non-paginated list"""
    return {
        "success": True, 
        "message": message, 
        "data": {"items": items, "total": total}
    }

def paginated_response(message: str, items: list, page: int,
                       limit: int, total: int) -> dict:
    """Paginated list"""
    total_pages = (total + limit - 1) // limit if limit > 0 else 0
    return {
        "success": True,
        "message": message,
        "data": {
            "items": items,
            "page": page,
            "limit": limit,
            "total": total,
            "totalPages": total_pages
        }
    }
```

**utils/logger.py:**
- RotatingFileHandler: 10MB max, 5 backups
- Separate error.log untuk ERROR/CRITICAL
- Environment-based log levels (DEBUG in dev, WARNING in prod)
- Format: [timestamp] [level] [name] message

**utils/middleware.py:**
- RequestIDMiddleware: Generate UUID per request
- RequestLoggingMiddleware: Log method, path, IP, time, status
- Add X-Request-ID dan X-Process-Time headers

**utils/exception_handlers.py:**
Production-safe error handling:
- HTTPException handler
- ValidationError handler
- Generic Exception handler
- Hide internal errors di production
- Log dengan request_id

**utils/dependencies.py:**
```python
class CommonQueryParams:
    def __init__(
        self,
        page: int = Query(1, ge=1),
        limit: int = Query(10, ge=1, le=100),
        search: Optional[str] = Query(None),
        sort_by: Optional[str] = Query(None),
        order: str = Query("asc", pattern="^(asc|desc)$")
    ):
        self.page = page
        self.limit = limit
        self.search = search
        self.sort_by = sort_by
        self.order = order

# Auth dependencies
def get_current_user():
    """Decode JWT, load user + roles + permissions"""
    pass

def require_permission(permission_name: str):
    """Check permission on current user"""
    pass

def require_super_admin():
    """Allow only super-admin role"""
    pass
```

**utils/constants.py:**
```python
from enum import Enum

class UserRole(str, Enum):
    ADMIN = "admin"
    USER = "user"

class AttendanceStatus(str, Enum):
    PRESENT = "hadir"
    ABSENT = "tidak_hadir"
    LATE = "terlambat"

# Error messages
ERROR_MESSAGES = {
    "NOT_FOUND": "Data tidak ditemukan",
    "VALIDATION_ERROR": "Data tidak valid",
    # ...
}
```

**utils/permission_registry.py:**
```python
PERMISSIONS = {
    "users.read": "Melihat data user",
    "users.create": "Membuat user",
    "users.update": "Mengubah user",
    "users.delete": "Menghapus user",
    "roles.read": "Melihat data role",
    "roles.create": "Membuat role",
    "roles.update": "Mengubah role",
    "roles.delete": "Menghapus role",
    "permissions.read": "Melihat data permission",
    "permissions.create": "Membuat permission",
    "permissions.update": "Mengubah permission",
    "permissions.delete": "Menghapus permission",
    "pegawai.read": "Melihat data pegawai",
    "pegawai.create": "Membuat pegawai",
    "pegawai.update": "Mengubah pegawai",
    "pegawai.delete": "Menghapus pegawai",
    "absensi.read": "Melihat data absensi",
    "absensi.create": "Membuat absensi",
    "absensi.update": "Mengubah absensi",
    "absensi.delete": "Menghapus absensi",
    "user_sessions.read": "Melihat data session login",
    "user_sessions.create": "Membuat session login"
}

class PermissionKeys:
    USERS_READ = "users.read"
    USERS_CREATE = "users.create"
    USERS_UPDATE = "users.update"
    USERS_DELETE = "users.delete"
    ROLES_READ = "roles.read"
    ROLES_CREATE = "roles.create"
    ROLES_UPDATE = "roles.update"
    ROLES_DELETE = "roles.delete"
    PERMISSIONS_READ = "permissions.read"
    PERMISSIONS_CREATE = "permissions.create"
    PERMISSIONS_UPDATE = "permissions.update"
    PERMISSIONS_DELETE = "permissions.delete"
    PEGAWAI_READ = "pegawai.read"
    PEGAWAI_CREATE = "pegawai.create"
    PEGAWAI_UPDATE = "pegawai.update"
    PEGAWAI_DELETE = "pegawai.delete"
    ABSENSI_READ = "absensi.read"
    ABSENSI_CREATE = "absensi.create"
    ABSENSI_UPDATE = "absensi.update"
    ABSENSI_DELETE = "absensi.delete"
    USER_SESSIONS_READ = "user_sessions.read"
    USER_SESSIONS_CREATE = "user_sessions.create"
```

#### C. Configuration

**config/settings.py:**
```python
from pydantic_settings import BaseSettings
from typing import List

class Settings(BaseSettings):
    # App
    APP_NAME: str = "FastAPI App"
    ENVIRONMENT: str = "development"  # development, staging, production
    DEBUG: bool = True
    SECRET_KEY: str
    
    # Server
    HOST: str = "0.0.0.0"
    PORT: int = 8000
    
    # Database
    DATABASE_HOST: str
    DATABASE_PORT: int
    DATABASE_NAME: str
    DATABASE_USER: str
    DATABASE_PASSWORD: str
    
    @property
    def DATABASE_URL(self) -> str:
        return f"postgresql://{self.DATABASE_USER}:{self.DATABASE_PASSWORD}@{self.DATABASE_HOST}:{self.DATABASE_PORT}/{self.DATABASE_NAME}"
    
    @property
    def DATABASE_URL_SAFE(self) -> str:
        """For logging (hide password)"""
        return f"postgresql://{self.DATABASE_USER}:***@{self.DATABASE_HOST}:{self.DATABASE_PORT}/{self.DATABASE_NAME}"
    
    # CORS
    CORS_ORIGINS: List[str] = []
    
    @field_validator("CORS_ORIGINS", mode="before")
    def parse_cors_origins(cls, v):
        if isinstance(v, str):
            return [origin.strip() for origin in v.split(",")]
        return v
    
    # Logging
    LOG_LEVEL: str = "DEBUG"
    LOG_DIR: str = "logs"

    # Bootstrap super-admin (optional)
    ADMIN_USERNAME: str | None = None
    ADMIN_PASSWORD: str | None = None
    ADMIN_ID_PEGAWAI: str | None = None
    ADMIN_NIP: str | None = None
    ADMIN_NAMA: str | None = None
    ADMIN_JENIS_KELAMIN: str | None = None
    ADMIN_TEMPAT_LAHIR: str | None = None
    ADMIN_TANGGAL_LAHIR: str | None = None
    ADMIN_ALAMAT: str | None = None
    ADMIN_STATUS: str | None = None
    ADMIN_FORCE_UPDATE: bool = False
    
    # Helper methods
    @property
    def is_development(self) -> bool:
        return self.ENVIRONMENT == "development"
    
    @property
    def is_production(self) -> bool:
        return self.ENVIRONMENT == "production"
    
    class Config:
        env_file = ".env"
        case_sensitive = True
```

**config/database.py:**
```python
from sqlalchemy import create_engine, text
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker
from config.settings import settings

engine = create_engine(
    settings.DATABASE_URL,
    pool_size=5,
    max_overflow=10,
    pool_recycle=3600,
    pool_pre_ping=True,
    echo=settings.DEBUG
)

SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
Base = declarative_base()

def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

async def check_database_connection() -> bool:
    """Health check"""
    try:
        with engine.connect() as conn:
            conn.execute(text("SELECT 1"))
        return True
    except Exception:
        return False
```

#### D. Main Application

**main.py:**
```python
from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from config.settings import settings
from config.database import check_database_connection
from utils.logger import logger
from utils.middleware import RequestIDMiddleware, RequestLoggingMiddleware
from utils.exception_handlers import register_exception_handlers
from api.v1.router import api_router
from utils.bootstrap_admin import bootstrap_super_admin

@asynccontextmanager
async def lifespan(app: FastAPI):
    """Startup and shutdown events"""
    # Startup
    logger.info("Starting application...")
    db_ok = await check_database_connection()
    if db_ok:
        logger.info("Database connection OK")
        bootstrap_super_admin()
    else:
        logger.error("Database connection FAILED")
    
    yield
    
    # Shutdown
    logger.info("Shutting down application...")

app = FastAPI(
    title=settings.APP_NAME,
    version="1.0.0",
    lifespan=lifespan,
    docs_url="/docs" if not settings.is_production else None,
    redoc_url="/redoc" if not settings.is_production else None
)

# CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.CORS_ORIGINS if settings.CORS_ORIGINS else ["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Custom middleware
app.add_middleware(RequestIDMiddleware)
app.add_middleware(RequestLoggingMiddleware)

# Exception handlers
register_exception_handlers(app)

# Routers
app.include_router(api_router, prefix="/api/v1")

# Health checks
@app.get("/health")
async def health():
    return {"status": "healthy"}

@app.get("/health/detail")
async def health_detail():
    db_status = await check_database_connection()
    return {
        "status": "healthy" if db_status else "unhealthy",
        "database": "connected" if db_status else "disconnected",
        "environment": settings.ENVIRONMENT
    }
```

**run.py:**
```python
import uvicorn
from config.settings import settings

if __name__ == "__main__":
    uvicorn.run(
        "main:app",
        host=settings.HOST,
        port=settings.PORT,
        reload=settings.DEBUG
    )
```

#### E. Example Implementation (Halo Endpoint)

Buat contoh lengkap dengan endpoint "halo" yang mendemonstrasikan:
- GET /api/v1/halo/ - Simple response
- POST /api/v1/halo/ - With validation
- GET /api/v1/halo/{id} - Get by ID
- GET /api/v1/halo/?page=1&limit=10 - Pagination
- PUT /api/v1/halo/{id} - Update
- DELETE /api/v1/halo/{id}?soft=true - Soft delete

#### F. RBAC Rules (Permission-Based)

- Semua endpoint (kecuali login) memakai JWT.
- Gunakan `require_permission("...")` untuk akses endpoint.
- Endpoint roles/permissions hanya untuk `super-admin`.
- `super-admin` otomatis mendapatkan semua permission saat bootstrap.

#### F. Environment Files

**.env.example:**
```bash
# Application
APP_NAME="FastAPI Clean Architecture"
ENVIRONMENT=development
DEBUG=true
SECRET_KEY=change-this-to-random-secret-key

# Server
HOST=0.0.0.0
PORT=8000

# Database
DATABASE_HOST=localhost
DATABASE_PORT=5432
DATABASE_NAME=mydb
DATABASE_USER=postgres
DATABASE_PASSWORD=yourpassword

# CORS (comma-separated)
CORS_ORIGINS=http://localhost:3000,http://localhost:5173

# Logging
LOG_LEVEL=DEBUG
LOG_DIR=logs

# Bootstrap super-admin (optional)
ADMIN_USERNAME=admin
ADMIN_PASSWORD=admin123
ADMIN_FORCE_UPDATE=false
```

#### G. Documentation Files

1. **README.md** - Project overview, quick start, API docs
2. **docs/CLEAN_ARCHITECTURE_GUIDE.md** - Tutorial implementasi CRUD dengan base classes
3. **docs/RESPONSE_FORMAT.md** - API response standards (600+ lines)
4. **docs/IMPROVEMENTS.md** - Architecture decisions & rationale

#### H. Requirements.txt
```
fastapi==0.109.0
uvicorn[standard]==0.27.0
sqlalchemy==2.0.25
pydantic==2.5.3
pydantic-settings==2.1.0
python-dotenv==1.0.0
python-multipart==0.0.6
python-jose[cryptography]==3.3.0
passlib[bcrypt]==1.7.4
asyncpg==0.29.0
psycopg2-binary==2.9.9
```

### 5. Best Practices HARUS Diikuti

✅ **Response Format:**
- `data` field SELALU object, NEVER array
- Array wrapped dalam `items` property
- Paginated list memakai `{items, page, limit, total, totalPages}`
- Consistent structure: `{success, message, data}`

✅ **Clean Architecture:**
- Endpoint → Service → Repository → Model
- Business logic di Service layer
- Database queries di Repository layer
- No direct DB access di Endpoint

✅ **Type Safety:**
- Generic base classes dengan TypeVar
- Pydantic schemas untuk validation
- SQLAlchemy models untuk ORM

✅ **Production Ready:**
- Environment-based configuration
- Rotating log files (10MB max, 5 backups)
- Request ID tracking
- Health checks
- Production-safe error messages

✅ **Security:**
- CORS dari environment variable
- Secret key dari .env
- Password hashing dengan bcrypt
- JWT token authentication
- Permission-based RBAC (require_permission)
- Roles/permissions dikelola super-admin

### 6. Output Expected

Setelah selesai, saya harus bisa:
1. `cd backend && python -m venv venv`
2. `source venv/bin/activate`
3. `pip install -r requirements.txt`
4. `cp .env.example .env` (edit credentials)
5. `python run.py`
6. Akses http://localhost:8000/docs
7. Test semua endpoint works
8. Create new CRUD entity dengan inherit base classes dalam 5 menit

Buatkan dengan struktur lengkap, jangan skip file apapun!
```

---

## 📋 Checklist Hasil

Pastikan AI menghasilkan:

- [ ] ✅ Struktur folder lengkap sesuai tree
- [ ] ✅ Base classes (Model, Schema, Repository, Service) dengan Generic TypeVar
- [ ] ✅ All utilities (logger, response, middleware, exception_handlers, dependencies, constants)
- [ ] ✅ Configuration (settings.py dengan environment awareness, database.py dengan health checks)
- [ ] ✅ Main app dengan lifespan events, conditional docs, CORS dari env
- [ ] ✅ Example endpoint "halo" dengan 6 operations (GET list, GET detail, POST, PUT, DELETE)
- [ ] ✅ Environment files (.env.example dengan semua variables)
- [ ] ✅ Documentation files (README.md, CLEAN_ARCHITECTURE_GUIDE.md, RESPONSE_FORMAT.md, IMPROVEMENTS.md)
- [ ] ✅ requirements.txt dengan semua dependencies
- [ ] ✅ run.py untuk development server
- [ ] ✅ Response utilities dengan 3 types (success, list, paginated)
- [ ] ✅ Rotating file handlers (10MB max, 5 backups)
- [ ] ✅ Request ID middleware untuk distributed tracing
- [ ] ✅ CommonQueryParams untuk pagination & search
- [ ] ✅ Soft delete support di base classes
- [ ] ✅ to_dict() dan update_from_dict() di BaseModel

---

## 🎯 Key Principles

1. **DRY (Don't Repeat Yourself)** - Base classes untuk reusability
2. **SOLID** - Single responsibility per layer
3. **Type Safety** - Generic types dengan TypeVar
4. **Environment Awareness** - Dev/Staging/Production modes
5. **Observability** - Logging, health checks, request tracking
6. **API Consistency** - Standard response format
7. **Production Ready** - Error handling, log rotation, security

---

## 💡 Tips Penggunaan

1. **Copy prompt di atas** ke AI assistant (Claude, ChatGPT, dll)
2. **Tunggu AI generate** semua files (biasanya 15-20 files)
3. **Test immediately** dengan `python run.py`
4. **Customize** sesuai kebutuhan project Anda
5. **Extend** dengan create new entities mengikuti pattern base classes

---

## 🚀 After Generation

Langkah setelah AI generate boilerplate:

```bash
# 1. Setup virtual environment
cd backend
python -m venv venv
source venv/bin/activate  # Linux/Mac
# or venv\Scripts\activate  # Windows

# 2. Install dependencies
pip install -r requirements.txt

# 3. Setup environment
cp .env.example .env
# Edit .env dengan credentials database Anda

# 4. Start database (jika pakai Docker)
docker-compose up -d  # Jika ada docker-compose.yml

# 5. Test server
python run.py

# 6. Buka browser
# http://localhost:8000/docs
```

---

## 📚 Reference

Boilerplate ini berdasarkan project: **Fast Absen - FastAPI Clean Architecture**

Key features yang membuat boilerplate ini powerful:
- ✅ Generic base classes - Inherit untuk instant CRUD
- ✅ Type-safe architecture - Compile-time error checking
- ✅ Production-ready - Logging, health checks, error handling
- ✅ Consistent API - Standard response format
- ✅ Well documented - 4 comprehensive markdown files

---

**Happy Coding! 🚀**
