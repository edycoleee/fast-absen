# Prompt AI - FastAPI Advanced Application (PostgreSQL, JWT, RBAC)

Gunakan prompt ini untuk membuat aplikasi FastAPI production-grade dengan clean architecture level advanced, **dengan JWT & Refresh Token**, **dengan RBAC**, dan menggunakan **PostgreSQL database** (optional terpisah server).

---

## 🤖 PROMPT UNTUK AI

```
Buatkan FastAPI application enterprise-grade dengan clean architecture yang production-ready, secure, dan fully featured.

## Requirements:

### 1. Tech Stack
- FastAPI 0.109.0
- SQLAlchemy 2.0.25 (ORM)
- Pydantic 2.5.3 (Validation)
- PostgreSQL (Database - dapat di server terpisah)
- Alembic (Database migrations)
- Uvicorn 0.27.0 (ASGI Server)
- PyJWT (JSON Web Token)
- python-jose[cryptography] (Token encryption)
- passlib[bcrypt] (Password hashing)
- APScheduler (Background tasks)
- Redis (Token blacklist & caching)
- SQLAlchemy-Utils (Helper utilities)
- python-dotenv (Environment config)
- Python 3.11+

### 2. Security Architecture
Implementasikan enterprise-grade security:
```
Frontend Request
     ↓
[CORS Middleware] → [Request Logging] → [Rate Limiting]
     ↓
[OAuth2/JWT Authentication] ← [Token Validation]
     ↓
[RBAC Authorization] ← [Permission Check]
     ↓
Endpoint Layer → Service Layer → Repository Layer → Model Layer
     ↓
[Response Formatting] → [Error Handling] → [Audit Logging]
```

### 3. Project Structure
```
backend/
├── main.py                          # FastAPI app entry point
├── run.py                           # Server runner
├── .env.example                     # Environment template
├── .env.production                  # Production config example
├── requirements.txt                 # Dependencies
├── requirements-dev.txt             # Dev dependencies
├── alembic/                         # Database migrations
│   ├── versions/
│   └── alembic.ini
├── config/
│   ├── __init__.py
│   ├── database.py                  # PostgreSQL config (optional terpisah server)
│   ├── settings.py                  # Environment-based settings
│   ├── cache.py                     # Redis untuk token blacklist & caching
│   └── constants.py                 # Global constants & enums
├── models/
│   ├── __init__.py
│   ├── base.py                      # BaseModel dengan timestamps
│   ├── user.py                      # User model dengan password hash
│   ├── role.py                      # Role model
│   ├── permission.py                # Permission model
│   ├── role_permission.py           # Role-Permission relationships
│   ├── user_role.py                 # User-Role relationships
│   └── [entity].py                  # Domain models lainnya
├── schemas/
│   ├── __init__.py
│   ├── base.py                      # BaseSchema, BaseResponseSchema
│   ├── auth.py                      # Auth schemas (LoginRequest, TokenResponse)
│   ├── user.py                      # User schemas
│   ├── role.py                      # Role schemas
│   ├── permission.py                # Permission schemas
│   └── [entity].py                  # Domain schemas
├── repositories/
│   ├── __init__.py
│   ├── base.py                      # BaseRepository dengan CRUD advanced
│   ├── user_repository.py           # Custom queries untuk user
│   ├── role_repository.py
│   ├── permission_repository.py
│   └── [entity]_repository.py
├── services/
│   ├── __init__.py
│   ├── base.py                      # BaseService
│   ├── auth_service.py              # Authentication & token management
│   ├── user_service.py              # User management
│   ├── role_service.py              # Role management
│   ├── permission_service.py        # Permission management
│   └── [entity]_service.py
├── api/
│   ├── __init__.py
│   └── v1/
│       ├── __init__.py
│       ├── endpoints/
│       │   ├── __init__.py
│       │   ├── auth.py              # Login, refresh, logout
│       │   ├── users.py             # User CRUD & profile management
│       │   ├── roles.py             # Role management (admin only)
│       │   ├── permissions.py       # Permission management
│       │   └── [entity].py          # Entity endpoints dengan RBAC
│       └── router.py                # Main router dengan semua endpoints
├── utils/
│   ├── __init__.py
│   ├── constants.py                 # Enums, error codes, default values
│   ├── jwt_utils.py                 # JWT creation, validation, refresh
│   ├── security.py                  # Password hashing, token validation
│   ├── dependencies.py              # Authentication & authorization deps
│   ├── decorators.py                # @require_permission, @require_role decorators
│   ├── exception_handlers.py        # Custom exception handlers
│   ├── logger.py                    # Structured logging
│   ├── middleware.py                # RequestID, audit logging, rate limiting
│   ├── response.py                  # Standard response utilities
│   ├── validators.py                # Custom validators
│   └── async_utils.py               # Async utilities
├── tasks/
│   ├── __init__.py
│   ├── token_tasks.py               # Refresh token cleanup
│   └── audit_tasks.py               # Audit log cleanup
├── tests/
│   ├── __init__.py
│   ├── conftest.py                  # Pytest fixtures
│   ├── integration/
│   │   ├── test_auth.py             # Auth endpoints
│   │   └── test_[entity].py
│   └── unit/
│       ├── test_jwt_utils.py
│       └── test_[entity]_service.py
└── docs/
    ├── ARCHITECTURE.md
    ├── SECURITY.md
    ├── RBAC_GUIDE.md
    └── TOKEN_MANAGEMENT.md
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

# PostgreSQL dengan optional terpisah server
DATABASE_URL = settings.DATABASE_URL

# Optimization untuk production
engine = create_engine(
    DATABASE_URL,
    echo=settings.SQLALCHEMY_ECHO,
    poolclass=QueuePool,
    pool_size=settings.DB_POOL_SIZE,
    max_overflow=settings.DB_MAX_OVERFLOW,
    pool_recycle=settings.DB_POOL_RECYCLE,
    pool_pre_ping=True,
    connect_args={
        "connect_timeout": settings.DB_CONNECT_TIMEOUT,
        "application_name": f"{settings.APP_NAME}/{settings.APP_VERSION}",
    }
)

# SQL logging untuk debugging
if settings.SQLALCHEMY_ECHO:
    @event.listens_for(Engine, "before_cursor_execute")
    def receive_before_cursor_execute(conn, cursor, statement, parameters, context, executemany):
        logger.debug(f"SQL: {statement}")

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
        logger.error(f"Database error: {e}")
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

def init_db():
    """Create all tables"""
    from models import *
    Base.metadata.create_all(bind=engine)
    logger.info("✓ Database tables created")
```

### 5. Advanced Security Models (models)

#### models/user.py
```python
from sqlalchemy import Column, String, Boolean, Text
from sqlalchemy.orm import relationship
from models.base import BaseModel
from passlib.context import CryptContext

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

class User(BaseModel):
    """User model dengan password hashing"""
    __tablename__ = "users"
    
    username = Column(String(50), unique=True, nullable=False, index=True)
    email = Column(String(255), unique=True, nullable=False, index=True)
    full_name = Column(String(255), nullable=True)
    hashed_password = Column(String(255), nullable=False)
    is_active = Column(Boolean, default=True, index=True)
    is_superuser = Column(Boolean, default=False)
    last_login = Column(DateTime(timezone=True), nullable=True)
    
    # Relationships
    roles = relationship("Role", secondary="user_role", back_populates="users")
    refresh_tokens = relationship("RefreshToken", back_populates="user", cascade="all, delete-orphan")
    audit_logs = relationship("AuditLog", back_populates="user")
    
    def set_password(self, password: str):
        """Hash dan set password"""
        self.hashed_password = pwd_context.hash(password)
    
    def verify_password(self, password: str) -> bool:
        """Verify password"""
        return pwd_context.verify(password, self.hashed_password)
    
    def get_permissions(self) -> set:
        """Get semua permissions dari roles"""
        permissions = set()
        for role in self.roles:
            permissions.update(perm.code for perm in role.permissions)
        return permissions
    
    def has_permission(self, permission_code: str) -> bool:
        """Check if user has permission"""
        return permission_code in self.get_permissions()
    
    def has_role(self, role_name: str) -> bool:
        """Check if user has role"""
        return any(role.name == role_name for role in self.roles)
```

#### models/role.py
```python
from sqlalchemy import Column, String, Text
from sqlalchemy.orm import relationship
from models.base import BaseModel

class Role(BaseModel):
    """Role model untuk RBAC"""
    __tablename__ = "roles"
    
    name = Column(String(100), unique=True, nullable=False, index=True)
    description = Column(Text, nullable=True)
    
    # Relationships
    users = relationship("User", secondary="user_role", back_populates="roles")
    permissions = relationship("Permission", secondary="role_permission", back_populates="roles")
```

#### models/permission.py
```python
from sqlalchemy import Column, String, Text
from sqlalchemy.orm import relationship
from models.base import BaseModel

class Permission(BaseModel):
    """Permission model"""
    __tablename__ = "permissions"
    
    code = Column(String(100), unique=True, nullable=False, index=True)  # e.g., "users:create"
    name = Column(String(255), nullable=False)
    description = Column(Text, nullable=True)
    
    # Relationships
    roles = relationship("Role", secondary="role_permission", back_populates="permissions")
```

#### models/refresh_token.py
```python
from sqlalchemy import Column, String, Integer, ForeignKey
from sqlalchemy.orm import relationship
from models.base import BaseModel
import uuid

class RefreshToken(BaseModel):
    """Refresh token model untuk token rotation"""
    __tablename__ = "refresh_tokens"
    
    token = Column(String(500), unique=True, nullable=False, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False, index=True)
    expires_at = Column(DateTime(timezone=True), nullable=False)
    revoked = Column(Boolean, default=False, index=True)
    revoked_at = Column(DateTime(timezone=True), nullable=True)
    
    # Relationship
    user = relationship("User", back_populates="refresh_tokens")
    
    def is_expired(self) -> bool:
        """Check if token expired"""
        return datetime.utcnow() > self.expires_at
    
    def revoke(self):
        """Revoke token"""
        self.revoked = True
        self.revoked_at = datetime.utcnow()
```

#### models/user_role.py & role_permission.py
```python
from sqlalchemy import Table, Column, Integer, ForeignKey
from models.base import Base

# Many-to-many relationship: User <-> Role
user_role = Table(
    'user_role',
    Base.metadata,
    Column('user_id', Integer, ForeignKey('users.id'), primary_key=True),
    Column('role_id', Integer, ForeignKey('roles.id'), primary_key=True),
)

# Many-to-many relationship: Role <-> Permission
role_permission = Table(
    'role_permission',
    Base.metadata,
    Column('role_id', Integer, ForeignKey('roles.id'), primary_key=True),
    Column('permission_id', Integer, ForeignKey('permissions.id'), primary_key=True),
)
```

### 6. JWT & Security Utilities (utils/jwt_utils.py)

```python
from datetime import datetime, timedelta
from typing import Optional, Dict, Any
from jose import JWTError, jwt
from config.settings import settings
from utils.logger import logger

class JWTHandler:
    """JWT token creation, validation, dan refresh handling"""
    
    @staticmethod
    def create_access_token(
        data: Dict[str, Any],
        expires_delta: Optional[timedelta] = None
    ) -> str:
        """Create JWT access token"""
        to_encode = data.copy()
        expire = datetime.utcnow() + (expires_delta or timedelta(minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES))
        to_encode.update({"exp": expire, "type": "access"})
        
        encoded_jwt = jwt.encode(
            to_encode,
            settings.SECRET_KEY,
            algorithm=settings.ALGORITHM
        )
        logger.debug(f"Access token created for user: {data.get('sub')}")
        return encoded_jwt
    
    @staticmethod
    def create_refresh_token(user_id: int) -> str:
        """Create JWT refresh token"""
        to_encode = {
            "sub": str(user_id),
            "type": "refresh",
            "exp": datetime.utcnow() + timedelta(days=settings.REFRESH_TOKEN_EXPIRE_DAYS)
        }
        
        encoded_jwt = jwt.encode(
            to_encode,
            settings.SECRET_KEY,
            algorithm=settings.ALGORITHM
        )
        logger.debug(f"Refresh token created for user_id: {user_id}")
        return encoded_jwt
    
    @staticmethod
    def verify_token(token: str, token_type: str = "access") -> Optional[Dict[str, Any]]:
        """Verify JWT token"""
        try:
            payload = jwt.decode(
                token,
                settings.SECRET_KEY,
                algorithms=[settings.ALGORITHM]
            )
            
            # Validate token type
            if payload.get("type") != token_type:
                logger.warning(f"Invalid token type: expected {token_type}, got {payload.get('type')}")
                return None
            
            return payload
        except JWTError as e:
            logger.error(f"JWT verification failed: {e}")
            return None
    
    @staticmethod
    def decode_token(token: str) -> Optional[Dict[str, Any]]:
        """Decode token without validation"""
        try:
            payload = jwt.decode(
                token,
                settings.SECRET_KEY,
                algorithms=[settings.ALGORITHM],
                options={"verify_signature": False}
            )
            return payload
        except JWTError:
            return None
```

### 7. Authentication Dependencies (utils/dependencies.py)

```python
from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPBearer, HTTPAuthCredentials
from sqlalchemy.orm import Session
from config.database import get_db
from utils.jwt_utils import JWTHandler
from repositories.user_repository import UserRepository
from utils.logger import logger

security = HTTPBearer()

async def get_current_user(
    credentials: HTTPAuthCredentials = Depends(security),
    db: Session = Depends(get_db)
):
    """
    Dependency untuk authentication
    Validates JWT token dan return current user
    """
    token = credentials.credentials
    
    # Verify token
    payload = JWTHandler.verify_token(token, token_type="access")
    if not payload:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid authentication credentials",
            headers={"WWW-Authenticate": "Bearer"},
        )
    
    user_id: int = payload.get("sub")
    if user_id is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid token payload",
        )
    
    # Get user dari database
    user_repo = UserRepository(db)
    user = user_repo.get_by_id(user_id)
    
    if not user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="User not found",
        )
    
    if not user.is_active:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="User is inactive",
        )
    
    return user

async def check_permission(
    permission_code: str
):
    """Dependency untuk check permission"""
    async def verify_permission(current_user = Depends(get_current_user)):
        if current_user.is_superuser:
            return current_user
        
        if not current_user.has_permission(permission_code):
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail=f"Insufficient permissions. Required: {permission_code}",
            )
        
        return current_user
    
    return verify_permission

async def check_role(role_name: str):
    """Dependency untuk check role"""
    async def verify_role(current_user = Depends(get_current_user)):
        if current_user.is_superuser:
            return current_user
        
        if not current_user.has_role(role_name):
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail=f"User does not have required role: {role_name}",
            )
        
        return current_user
    
    return verify_role
```

### 8. Authentication Endpoints (api/v1/endpoints/auth.py)

```python
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from datetime import datetime, timedelta
from config.database import get_db
from config.settings import settings
from schemas.auth import LoginRequest, TokenResponse
from services.auth_service import AuthService
from repositories.user_repository import UserRepository
from repositories.refresh_token_repository import RefreshTokenRepository
from utils.response import success_response, error_response
from utils.jwt_utils import JWTHandler
from utils.dependencies import get_current_user
from utils.logger import logger

router = APIRouter(prefix="/auth", tags=["auth"])

@router.post("/login", response_model=dict)
async def login(
    request: LoginRequest,
    db: Session = Depends(get_db)
):
    """
    Login endpoint
    Returns access token dan refresh token
    """
    user_repo = UserRepository(db)
    user = user_repo.get_by_username(request.username)
    
    # Validate user
    if not user or not user.verify_password(request.password):
        logger.warning(f"Failed login attempt for username: {request.username}")
        return error_response(
            message="Invalid username or password",
            error_code="INVALID_CREDENTIALS",
            status_code=status.HTTP_401_UNAUTHORIZED
        )
    
    if not user.is_active:
        return error_response(
            message="User is inactive",
            error_code="USER_INACTIVE",
            status_code=status.HTTP_403_FORBIDDEN
        )
    
    # Create tokens
    access_token = JWTHandler.create_access_token({"sub": user.id})
    refresh_token = JWTHandler.create_refresh_token(user.id)
    
    # Store refresh token dalam database
    refresh_token_repo = RefreshTokenRepository(db)
    refresh_token_repo.create({
        "token": refresh_token,
        "user_id": user.id,
        "expires_at": datetime.utcnow() + timedelta(days=settings.REFRESH_TOKEN_EXPIRE_DAYS)
    })
    
    # Update last login
    user.last_login = datetime.utcnow()
    db.commit()
    
    logger.info(f"User logged in: {user.username}")
    
    return success_response(
        message="Login successful",
        data={
            "access_token": access_token,
            "refresh_token": refresh_token,
            "token_type": "bearer",
            "user": {
                "id": user.id,
                "username": user.username,
                "email": user.email,
                "roles": [role.name for role in user.roles]
            }
        }
    )

@router.post("/refresh", response_model=dict)
async def refresh(
    refresh_token: str,
    db: Session = Depends(get_db)
):
    """
    Refresh access token
    Exchange refresh token untuk new access & refresh token
    """
    # Verify refresh token
    payload = JWTHandler.verify_token(refresh_token, token_type="refresh")
    if not payload:
        return error_response(
            message="Invalid refresh token",
            error_code="INVALID_TOKEN",
            status_code=status.HTTP_401_UNAUTHORIZED
        )
    
    user_id = payload.get("sub")
    refresh_token_repo = RefreshTokenRepository(db)
    
    # Check refresh token existence & validity
    stored_token = refresh_token_repo.get_by_token(refresh_token)
    if not stored_token or stored_token.revoked or stored_token.is_expired():
        logger.warning(f"Invalid refresh token attempt for user_id: {user_id}")
        return error_response(
            message="Refresh token is invalid or expired",
            error_code="TOKEN_EXPIRED",
            status_code=status.HTTP_401_UNAUTHORIZED
        )
    
    # Get user
    user_repo = UserRepository(db)
    user = user_repo.get_by_id(int(user_id))
    if not user or not user.is_active:
        return error_response(
            message="User not found or inactive",
            error_code="USER_NOT_FOUND",
            status_code=status.HTTP_401_UNAUTHORIZED
        )
    
    # Create new tokens (refresh token rotation)
    new_access_token = JWTHandler.create_access_token({"sub": user.id})
    new_refresh_token = JWTHandler.create_refresh_token(user.id)
    
    # Revoke old refresh token
    stored_token.revoke()
    
    # Store new refresh token
    refresh_token_repo.create({
        "token": new_refresh_token,
        "user_id": user.id,
        "expires_at": datetime.utcnow() + timedelta(days=settings.REFRESH_TOKEN_EXPIRE_DAYS)
    })
    
    logger.info(f"Token refreshed for user_id: {user_id}")
    
    return success_response(
        message="Token refreshed successfully",
        data={
            "access_token": new_access_token,
            "refresh_token": new_refresh_token,
            "token_type": "bearer"
        }
    )

@router.post("/logout", response_model=dict)
async def logout(
    current_user = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Logout endpoint
    Revoke all refresh tokens user
    """
    refresh_token_repo = RefreshTokenRepository(db)
    refresh_token_repo.revoke_all_user_tokens(current_user.id)
    
    logger.info(f"User logged out: {current_user.username}")
    
    return success_response(message="Logout successful")

@router.get("/me", response_model=dict)
async def get_current_user_profile(
    current_user = Depends(get_current_user)
):
    """Get current user profile"""
    return success_response(
        message="Profile retrieved successfully",
        data={
            "id": current_user.id,
            "username": current_user.username,
            "email": current_user.email,
            "full_name": current_user.full_name,
            "roles": [role.name for role in current_user.roles],
            "permissions": list(current_user.get_permissions()),
            "is_active": current_user.is_active,
            "is_superuser": current_user.is_superuser
        }
    )
```

### 9. Protected Endpoints Example (api/v1/endpoints/users.py)

```python
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from config.database import get_db
from schemas.user import UserCreate, UserUpdate, UserResponse
from services.user_service import UserService
from repositories.user_repository import UserRepository
from utils.response import success_response, paginated_response, error_response
from utils.dependencies import get_current_user, check_permission, check_role
from utils.logger import logger

router = APIRouter(prefix="/users", tags=["users"])

def get_user_service(db: Session = Depends(get_db)) -> UserService:
    """Dependency injection untuk UserService"""
    repo = UserRepository(db)
    return UserService(repo)

@router.get("/", response_model=dict)
async def list_users(
    skip: int = 0,
    limit: int = 100,
    current_user = Depends(check_permission("users:read")),
    service: UserService = Depends(get_user_service)
):
    """
    List users
    Requires: users:read permission
    """
    items, total = service.get_all(skip, limit)
    return paginated_response(
        message="Users retrieved successfully",
        items=[item.to_dict(exclude=["hashed_password"]) for item in items],
        total=total,
        skip=skip,
        limit=limit
    )

@router.post("/", response_model=dict, status_code=201)
async def create_user(
    obj_in: UserCreate,
    current_user = Depends(check_permission("users:create")),
    service: UserService = Depends(get_user_service)
):
    """
    Create user
    Requires: users:create permission
    """
    try:
        user = service.create(obj_in.model_dump())
        logger.info(f"User created: {user.username} by {current_user.username}")
        return success_response(
            message="User created successfully",
            data=user.to_dict(exclude=["hashed_password"]),
            status_code=201
        )
    except ValueError as e:
        return error_response(
            message=str(e),
            error_code="INVALID_INPUT",
            status_code=status.HTTP_400_BAD_REQUEST
        )

@router.put("/{id}", response_model=dict)
async def update_user(
    id: int,
    obj_in: UserUpdate,
    current_user = Depends(check_permission("users:update")),
    service: UserService = Depends(get_user_service)
):
    """
    Update user
    Requires: users:update permission
    """
    user = service.update(id, obj_in.model_dump(exclude_unset=True))
    if not user:
        return error_response(
            message="User not found",
            error_code="USER_NOT_FOUND",
            status_code=status.HTTP_404_NOT_FOUND
        )
    
    logger.info(f"User updated: {user.username} by {current_user.username}")
    return success_response(
        message="User updated successfully",
        data=user.to_dict(exclude=["hashed_password"])
    )

@router.delete("/{id}", response_model=dict)
async def delete_user(
    id: int,
    current_user = Depends(check_permission("users:delete")),
    service: UserService = Depends(get_user_service)
):
    """
    Delete user
    Requires: users:delete permission
    """
    success = service.delete(id)
    if not success:
        return error_response(
            message="User not found",
            error_code="USER_NOT_FOUND",
            status_code=status.HTTP_404_NOT_FOUND
        )
    
    logger.info(f"User deleted: {id} by {current_user.username}")
    return success_response(message="User deleted successfully")
```

### 10. Advanced Settings (config/settings.py)

```python
from pydantic_settings import BaseSettings
from typing import Literal, List
import os

class Settings(BaseSettings):
    """Application settings"""
    
    # ========== App Config ==========
    APP_NAME: str = "FastAPI Advanced App"
    APP_VERSION: str = "1.0.0"
    APP_DESCRIPTION: str = "FastAPI dengan JWT, RBAC, dan PostgreSQL"
    ENVIRONMENT: Literal["development", "staging", "production"] = "development"
    DEBUG: bool = True
    
    # ========== Database ==========
    DATABASE_URL: str = "postgresql://user:password@localhost:5432/dbname"
    # Optional: Separate database server
    # DATABASE_URL: str = "postgresql://user:password@db-server.example.com:5432/dbname"
    SQLALCHEMY_ECHO: bool = False
    DB_POOL_SIZE: int = 5
    DB_MAX_OVERFLOW: int = 10
    DB_POOL_RECYCLE: int = 3600
    DB_CONNECT_TIMEOUT: int = 10
    
    # ========== JWT / Security ==========
    SECRET_KEY: str = "your-secret-key-change-in-production-min-32-chars"
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 30
    REFRESH_TOKEN_EXPIRE_DAYS: int = 7
    
    # ========== Redis ==========
    REDIS_URL: str = "redis://localhost:6379/0"
    REDIS_ENABLED: bool = False
    
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
    
    # ========== Features ==========
    ENABLE_BACKGROUND_TASKS: bool = True
    ENABLE_AUDIT_LOGGING: bool = True
    
    class Config:
        env_file = ".env"
        case_sensitive = True

settings = Settings()
```

### 11. Role & Permission Bootstrap (utils/bootstrap_security.py)

```python
from sqlalchemy.orm import Session
from models.role import Role
from models.permission import Permission
from repositories.role_repository import RoleRepository
from repositories.permission_repository import PermissionRepository
from utils.logger import logger

def bootstrap_permissions(db: Session):
    """Create default permissions"""
    permission_repo = PermissionRepository(db)
    
    default_permissions = [
        # Users
        {"code": "users:read", "name": "Read Users"},
        {"code": "users:create", "name": "Create User"},
        {"code": "users:update", "name": "Update User"},
        {"code": "users:delete", "name": "Delete User"},
        # Roles
        {"code": "roles:read", "name": "Read Roles"},
        {"code": "roles:create", "name": "Create Role"},
        {"code": "roles:update", "name": "Update Role"},
        {"code": "roles:delete", "name": "Delete Role"},
        # Permissions
        {"code": "permissions:read", "name": "Read Permissions"},
        {"code": "permissions:manage", "name": "Manage Permissions"},
    ]
    
    for perm_data in default_permissions:
        existing = permission_repo.get_by_field("code", perm_data["code"])
        if not existing:
            permission_repo.create(perm_data)
            logger.info(f"Created permission: {perm_data['code']}")

def bootstrap_roles(db: Session):
    """Create default roles"""
    role_repo = RoleRepository(db)
    permission_repo = PermissionRepository(db)
    
    # Create admin role
    admin_role = role_repo.get_by_field("name", "admin")
    if not admin_role:
        admin_role = role_repo.create({
            "name": "admin",
            "description": "Administrator with all permissions"
        })
        
        # Assign all permissions to admin
        all_perms = permission_repo.get_all()
        admin_role.permissions = all_perms
        db.commit()
        logger.info("Created admin role")
    
    # Create user role
    user_role = role_repo.get_by_field("name", "user")
    if not user_role:
        user_role = role_repo.create({
            "name": "user",
            "description": "Regular user"
        })
        logger.info("Created user role")

def bootstrap_super_admin(db: Session, username: str = "admin", password: str = "admin123"):
    """Create super admin user if not exists"""
    from repositories.user_repository import UserRepository
    
    user_repo = UserRepository(db)
    admin = user_repo.get_by_username(username)
    
    if not admin:
        from models.user import User
        
        admin = User(
            username=username,
            email="admin@example.com",
            full_name="Administrator",
            is_active=True,
            is_superuser=True
        )
        admin.set_password(password)
        
        db.add(admin)
        db.commit()
        logger.info(f"Created super admin user: {username}")
```

### 12. Requirements.txt

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
python-jose[cryptography]==3.3.0
passlib[bcrypt]==1.7.4
python-multipart==0.0.6
redis==5.0.1
apscheduler==3.10.4
pytest==7.4.3
pytest-asyncio==0.21.1
pytest-cov==4.1.0
httpx==0.25.2
```

### 13. .env.example / .env.production

```
# .env.example
APP_NAME=My Advanced App
APP_VERSION=1.0.0
ENVIRONMENT=development
DEBUG=True

# Database (local)
DATABASE_URL=postgresql://postgres:password@localhost:5432/myapp

# Database (optional separate server)
# DATABASE_URL=postgresql://user:password@db-server.internal.company.com:5432/myapp

# JWT
SECRET_KEY=your-secret-key-min-32-characters-for-production
ALGORITHM=HS256
ACCESS_TOKEN_EXPIRE_MINUTES=30
REFRESH_TOKEN_EXPIRE_DAYS=7

# Redis
REDIS_URL=redis://localhost:6379/0
REDIS_ENABLED=False

# Server
HOST=0.0.0.0
PORT=8000

# CORS
CORS_ORIGINS=["http://localhost:3000","http://localhost:3001"]

# Features
ENABLE_BACKGROUND_TASKS=True
ENABLE_AUDIT_LOGGING=True
```

### 14. Main Application (main.py) - Enterprise Version

```python
from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.exceptions import RequestValidationError
from starlette.exceptions import HTTPException as StarletteHTTPException

from config.settings import settings
from config.database import check_database_connection, init_db, get_database_info, engine, get_db
from api.v1.router import api_router
from utils.middleware import RequestIDMiddleware, RequestLoggingMiddleware, RateLimitMiddleware
from utils.exception_handlers import (
    http_exception_handler,
    validation_exception_handler,
    general_exception_handler
)
from utils.logger import logger
from utils.bootstrap_security import bootstrap_permissions, bootstrap_roles, bootstrap_super_admin

@asynccontextmanager
async def lifespan(app: FastAPI):
    """Lifespan context manager"""
    # Startup
    logger.info(f"🚀 Starting {settings.APP_NAME} v{settings.APP_VERSION}")
    logger.info(f"Environment: {settings.ENVIRONMENT} | Debug: {settings.DEBUG}")
    logger.info(f"Database: {str(get_database_info())}")
    
    # Check database
    if check_database_connection():
        init_db()
        
        # Bootstrap security (permissions, roles, admin)
        from config.database import SessionLocal
        db = SessionLocal()
        try:
            bootstrap_permissions(db)
            bootstrap_roles(db)
            bootstrap_super_admin(db)
            logger.info("✓ Security bootstrapped")
        finally:
            db.close()
    else:
        logger.warning("⚠ Database connection failed")
    
    yield
    
    # Shutdown
    logger.info("🛑 Shutting down application")
    engine.dispose()

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
app.add_middleware(RateLimitMiddleware)
app.add_middleware(RequestIDMiddleware)
app.add_middleware(RequestLoggingMiddleware)

# API routes
app.include_router(api_router, prefix=settings.API_V1_PREFIX)

@app.get("/", tags=["Health"])
def root():
    """Root endpoint"""
    return {"app": settings.APP_NAME, "version": settings.APP_VERSION}

@app.get("/health", tags=["Health"])
def health_check():
    """Health check"""
    return {"status": "healthy"}
```

---

## ✅ Security Checklist

### JWT & Token Management
- [ ] Use HTTPS in production (https only cookies)
- [ ] Store SECRET_KEY securely (environment variable)
- [ ] Implement token expiration (short-lived access tokens)
- [ ] Implement refresh token rotation
- [ ] Revoke tokens on logout
- [ ] Validate token signature & expiration

### Password Security
- [ ] Hash passwords dengan bcrypt
- [ ] Validate password strength
- [ ] Never log passwords
- [ ] Implement password change flow

### Authorization
- [ ] Define permissions granularly (not just roles)
- [ ] Check permissions di endpoint level
- [ ] Implement audit logging untuk sensitive operations
- [ ] Validate user ownership sebelum update/delete

### Database Security
- [ ] Use parameterized queries (SQLAlchemy handles this)
- [ ] Encrypt database connection (SSL/TLS)
- [ ] Implement proper backups
- [ ] Monitor database access

### API Security
- [ ] Implement rate limiting
- [ ] Validate input dengan Pydantic
- [ ] Use CORS properly
- [ ] Implement request logging
- [ ] Handle errors safely (no internal details)

### Infrastructure
- [ ] Use environment variables untuk secrets
- [ ] Rotate SECRET_KEY periodically
- [ ] Monitor for suspicious activities
- [ ] Implement DDoS protection

---

## 🚀 Quick Start

```bash
# 1. Setup project
mkdir my-advanced-app && cd my-advanced-app
git clone ... .
python -m venv venv
source venv/bin/activate

# 2. Install dependencies
pip install -r requirements.txt

# 3. Configure
cp .env.example .env
# Edit .env dengan database credentials

# 4. Database setup
alembic upgrade head

# 5. Run server
python run.py

# 6. Login
# POST /api/v1/auth/login
# {
#   "username": "admin",
#   "password": "admin123"
# }

# 7. Use token
# Header: Authorization: Bearer <access_token>
```

---

## 📊 Token Flow

```
1. Login
   POST /auth/login → {access_token, refresh_token}

2. Use Access Token
   GET /users (Header: Authorization: Bearer <access_token>)

3. Token Expired
   POST /auth/refresh {refresh_token} → {new_access_token, new_refresh_token}

4. Logout
   POST /auth/logout (Header: Authorization: Bearer <access_token>)
   All refresh tokens revoked
```

---

## 🔗 Permission Examples

```
users:read
users:create
users:update
users:delete

roles:read
roles:manage

reports:read
reports:export
reports:delete

data:import
data:export
```

---

## 📚 Key Differences from Middle App

| Feature | Middle | Advanced |
|---------|--------|----------|
| Authentication | None | JWT + Refresh Token |
| Authorization | None | RBAC dengan Permissions |
| User Management | Basic | Full dengan password hash |
| Token Management | None | Token blacklist, rotation |
| Role/Permission | None | Built-in models & endpoints |
| Audit Logging | Optional | Full support |
| Security Headers | Basic | Advanced |
| Production Ready | High | Enterprise Grade |

---

## 🎯 Best Suited For

- **Enterprise applications** dengan strict security requirements
- **Multi-tenant systems** dengan role-based access
- **SaaS products** dengan user management
- **Regulated industries** dengan audit requirements
- **APIs** yang memerlukan persistent user authentication
- Applications dengan **sensitive data** dan **complex permissions**

---

## 🔐 Security Best Practices Summary

1. **Always use HTTPS** in production
2. **Never log secrets** (passwords, tokens, keys)
3. **Validate & sanitize** semua input
4. **Use parameterized queries** (SQLAlchemy)
5. **Implement rate limiting** untuk brute-force protection
6. **Rotate secrets** secara berkala
7. **Monitor & log** suspicious activities
8. **Test security** dengan penetration testing
9. **Keep dependencies** up-to-date
10. **Document security** policies & procedures
```

---

## 📚 Additional Resources

- [FastAPI Security Docs](https://fastapi.tiangolo.com/tutorial/security/)
- [JWT Best Practices](https://tools.ietf.org/html/rfc8725)
- [OWASP Top 10](https://owasp.org/www-project-top-ten/)
- [SQLAlchemy Relationships](https://docs.sqlalchemy.org/en/20/orm/relationships.html)
- [PostgreSQL Security](https://www.postgresql.org/docs/current/sql-security.html)

---

## 🎓 Implementation Order

1. **Setup database & models** (User, Role, Permission)
2. **Implement JWT utilities** (create, verify, refresh)
3. **Create authentication endpoints** (login, refresh, logout)
4. **Create user management endpoints** dengan RBAC
5. **Setup permission bootstrapping** (default roles & permissions)
6. **Implement audit logging** untuk sensitive operations
7. **Add rate limiting** & security headers
8. **Write comprehensive tests** untuk auth flow
9. **Setup monitoring & alerting** untuk security events
10. **Deploy dengan security hardening** (HTTPS, etc)
