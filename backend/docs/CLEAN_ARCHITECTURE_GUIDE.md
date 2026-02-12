# Clean Architecture - Quick Start Guide

Panduan cepat menggunakan base classes untuk implementasi fitur baru.

---

## 📋 Table of Contents
1. [Create New Entity (CRUD)](#create-new-entity-crud)
2. [Example: Lokasi Entity](#example-lokasi-entity)
3. [Usage in Endpoints](#usage-in-endpoints)
4. [Best Practices](#best-practices)

---

## 1. Create New Entity (CRUD)

### Step 1: Create Model (models/lokasi.py)

```python
from sqlalchemy import Column, String, Float, Boolean
from models.base import BaseModelWithSoftDelete

class Lokasi(BaseModelWithSoftDelete):
    """
    Lokasi model
    Inherits: id, created_at, updated_at, is_deleted, deleted_at
    """
    __tablename__ = "lokasi"
    
    nama = Column(String(255), nullable=False)
    alamat = Column(String(500))
    latitude = Column(Float)
    longitude = Column(Float)
    radius = Column(Float, default=100.0)
    is_active = Column(Boolean, default=True)
    
    def __repr__(self):
        return f"<Lokasi(id={self.id}, nama='{self.nama}')>"
```

**Benefits:**
✅ Auto get: `id`, `created_at`, `updated_at`, `is_deleted`, `deleted_at`  
✅ Auto get: `to_dict()`, `update_from_dict()`, `soft_delete()`, `restore()`

---

### Step 2: Create Schemas (schemas/lokasi.py)

```python
from pydantic import Field
from typing import Optional
from schemas.base import BaseSchema, BaseResponseSchema

class LokasiBase(BaseSchema):
    """Base schema dengan field umum"""
    nama: str = Field(..., min_length=1, max_length=255)
    alamat: Optional[str] = None
    latitude: Optional[float] = None
    longitude: Optional[float] = None
    radius: float = Field(default=100.0, gt=0)
    is_active: bool = True


class LokasiCreate(LokasiBase):
    """Schema untuk create lokasi"""
    pass


class LokasiUpdate(BaseSchema):
    """Schema untuk update lokasi (semua optional)"""
    nama: Optional[str] = Field(None, min_length=1, max_length=255)
    alamat: Optional[str] = None
    latitude: Optional[float] = None
    longitude: Optional[float] = None
    radius: Optional[float] = Field(None, gt=0)
    is_active: Optional[bool] = None


class LokasiResponse(LokasiBase, BaseResponseSchema):
    """
    Schema untuk response
    Inherits: id, created_at, updated_at from BaseResponseSchema
    """
    is_deleted: bool
    
    class Config:
        json_schema_extra = {
            "example": {
                "id": 1,
                "nama": "RSUD Sulfat",
                "alamat": "Jl. Kesehatan No. 1",
                "latitude": -6.2088,
                "longitude": 106.8456,
                "radius": 100.0,
                "is_active": True,
                "is_deleted": False,
                "created_at": "2026-02-12T10:00:00",
                "updated_at": "2026-02-12T10:00:00"
            }
        }
```

---

### Step 3: Create Repository (repositories/lokasi_repository.py)

```python
from sqlalchemy.orm import Session
from typing import Optional, List
from repositories.base import BaseRepository
from models.lokasi import Lokasi

class LokasiRepository(BaseRepository[Lokasi]):
    """
    Lokasi repository
    Inherits: get_by_id, get_all, create, update, delete, dll
    """
    
    def __init__(self, db: Session):
        super().__init__(Lokasi, db)
    
    # Custom methods (optional, jika ada logic khusus)
    
    def get_by_nama(self, nama: str) -> Optional[Lokasi]:
        """Get lokasi by nama"""
        return self.get_by_field("nama", nama)
    
    def get_active_only(self) -> List[Lokasi]:
        """Get only active lokasi"""
        return self.db.query(self.model)\
            .filter(self.model.is_active == True)\
            .filter(self.model.is_deleted == False)\
            .all()
    
    def search_by_name(self, query: str, skip: int = 0, limit: int = 100) -> List[Lokasi]:
        """Search lokasi by name"""
        return self.search(
            search_fields=["nama", "alamat"],
            search_query=query,
            skip=skip,
            limit=limit
        )
```

---

### Step 4: Create Service (services/lokasi_service.py)

```python
from sqlalchemy.orm import Session
from typing import Optional, List
from fastapi import HTTPException, status

from services.base import BaseService
from repositories.lokasi_repository import LokasiRepository
from models.lokasi import Lokasi
from schemas.lokasi import LokasiCreate, LokasiUpdate
from utils.logger import logger

class LokasiService(BaseService[Lokasi, LokasiRepository]):
    """
    Lokasi business logic service
    Inherits: get_by_id, get_all, create, update, delete
    """
    
    def __init__(self, db: Session):
        repository = LokasiRepository(db)
        super().__init__(repository)
        self.db = db
    
    # Override create dengan validasi business logic
    def create(self, data: LokasiCreate) -> Lokasi:
        """
        Create lokasi dengan validasi
        """
        logger.info(f"Creating lokasi: {data.nama}")
        
        # Business validation: Check duplicate name
        existing = self.repository.get_by_nama(data.nama)
        if existing:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Lokasi dengan nama '{data.nama}' sudah ada"
            )
        
        # Create
        lokasi = self.repository.create(data.model_dump())
        logger.info(f"Lokasi created: {lokasi.id}")
        
        return lokasi
    
    # Override update dengan validasi
    def update(self, id: int, data: LokasiUpdate) -> Optional[Lokasi]:
        """
        Update lokasi dengan validasi
        """
        logger.info(f"Updating lokasi ID: {id}")
        
        # Check exists
        lokasi = self.repository.get_by_id(id)
        if not lokasi:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Lokasi dengan ID {id} tidak ditemukan"
            )
        
        # Check duplicate name (jika nama diubah)
        if data.nama and data.nama != lokasi.nama:
            existing = self.repository.get_by_nama(data.nama)
            if existing:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail=f"Lokasi dengan nama '{data.nama}' sudah ada"
                )
        
        # Update
        updated = self.repository.update(id, data.model_dump(exclude_unset=True))
        logger.info(f"Lokasi updated: {id}")
        
        return updated
    
    # Custom methods
    def get_active_lokasi(self) -> List[Lokasi]:
        """Get active lokasi for dropdown"""
        return self.repository.get_active_only()
```

---

### Step 5: Create Endpoint (api/v1/endpoints/lokasi.py)

```python
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import Optional

from config.database import get_db
from services.lokasi_service import LokasiService
from schemas.lokasi import LokasiCreate, LokasiUpdate, LokasiResponse
from utils.response import success_response, list_response, paginated_response
from utils.dependencies import CommonQueryParams

router = APIRouter()


@router.post("/", status_code=status.HTTP_201_CREATED)
async def create_lokasi(
    data: LokasiCreate,
    db: Session = Depends(get_db)
):
    """Create new lokasi"""
    service = LokasiService(db)
    lokasi = service.create(data)
    
    return success_response(
        message="Lokasi berhasil dibuat",
        data=LokasiResponse.model_validate(lokasi).model_dump()
    )


@router.get("/{id}")
async def get_lokasi(
    id: int,
    db: Session = Depends(get_db)
):
    """Get lokasi by ID"""
    service = LokasiService(db)
    lokasi = service.get_by_id(id)
    
    if not lokasi:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Lokasi dengan ID {id} tidak ditemukan"
        )
    
    return success_response(
        message="Lokasi berhasil diambil",
        data=LokasiResponse.model_validate(lokasi).model_dump()
    )


@router.get("/")
async def get_all_lokasi(
    commons: CommonQueryParams = Depends(),
    db: Session = Depends(get_db)
):
    """Get all lokasi with pagination"""
    service = LokasiService(db)
    
    # With search
    if commons.search:
        items, total = service.search(
            query=commons.search,
            search_fields=["nama", "alamat"],
            page=commons.page,
            limit=commons.limit
        )
    else:
        items, total = service.get_all(
            page=commons.page,
            limit=commons.limit
        )
    
    # Convert to response schema
    items_response = [
        LokasiResponse.model_validate(item).model_dump()
        for item in items
    ]
    
    return paginated_response(
        message="Lokasi berhasil diambil",
        items=items_response,
        page=commons.page,
        limit=commons.limit,
        total=total
    )


@router.get("/filter/active")
async def get_active_lokasi(db: Session = Depends(get_db)):
    """Get active lokasi (for dropdown)"""
    service = LokasiService(db)
    items = service.get_active_lokasi()
    
    items_response = [
        LokasiResponse.model_validate(item).model_dump()
        for item in items
    ]
    
    return list_response(
        message="Lokasi aktif berhasil diambil",
        items=items_response,
        total=len(items)
    )


@router.put("/{id}")
async def update_lokasi(
    id: int,
    data: LokasiUpdate,
    db: Session = Depends(get_db)
):
    """Update lokasi"""
    service = LokasiService(db)
    lokasi = service.update(id, data)
    
    return success_response(
        message="Lokasi berhasil diupdate",
        data=LokasiResponse.model_validate(lokasi).model_dump()
    )


@router.delete("/{id}")
async def delete_lokasi(
    id: int,
    soft: bool = True,
    db: Session = Depends(get_db)
):
    """Delete lokasi (soft delete by default)"""
    service = LokasiService(db)
    
    if not service.exists(id):
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Lokasi dengan ID {id} tidak ditemukan"
        )
    
    success = service.delete(id, soft=soft)
    
    return success_response(
        message=f"Lokasi berhasil {'dinonaktifkan' if soft else 'dihapus'}",
        data={"id": id}
    )
```

---

### Step 6: Register Router (api/v1/router.py)

```python
from fastapi import APIRouter
from api.v1.endpoints import halo, lokasi  # Add import

api_router = APIRouter()

# Include routers
api_router.include_router(
    halo.router,
    prefix="/halo",
    tags=["Halo"]
)

api_router.include_router(
    lokasi.router,
    prefix="/lokasi",
    tags=["Lokasi"]
)
```

---

## 2. Example: Complete Flow

### Request Flow:
```
Client Request
    ↓
Endpoint (api/v1/endpoints/lokasi.py)
    ↓
Service (services/lokasi_service.py) ← Business Logic
    ↓
Repository (repositories/lokasi_repository.py) ← Data Access
    ↓
Database (PostgreSQL)
```

### Create Lokasi Example:

**1. POST /api/v1/lokasi/**
```json
{
  "nama": "RSUD Sulfat",
  "alamat": "Jl. Kesehatan No. 1",
  "latitude": -6.2088,
  "longitude": 106.8456,
  "radius": 100.0
}
```

**2. Service validates**: Check duplicate name

**3. Repository creates**: Insert to database

**4. Response:**
```json
{
  "success": true,
  "message": "Lokasi berhasil dibuat",
  "data": {
    "id": 1,
    "nama": "RSUD Sulfat",
    "alamat": "Jl. Kesehatan No. 1",
    "latitude": -6.2088,
    "longitude": 106.8456,
    "radius": 100.0,
    "is_active": true,
    "is_deleted": false,
    "created_at": "2026-02-12T10:00:00",
    "updated_at": "2026-02-12T10:00:00"
  }
}
```

---

## 3. Best Practices

### ✅ DO's

1. **Use Base Classes**
   ```python
   # ✅ GOOD
   class Lokasi(BaseModelWithSoftDelete):
       pass
   
   # ❌ BAD
   class Lokasi(Base):
       id = Column(Integer, primary_key=True)
       created_at = Column(DateTime)
       # ... duplicating all base fields
   ```

2. **Business Logic in Service**
   ```python
   # ✅ GOOD - Validation in service
   def create(self, data: LokasiCreate):
       if self.repository.get_by_nama(data.nama):
           raise HTTPException(400, "Duplicate")
       return self.repository.create(data.dict())
   
   # ❌ BAD - Validation in endpoint
   @router.post("/")
   def create(data: LokasiCreate, db: Session):
       if db.query(Lokasi).filter(...).first():
           raise HTTPException(400, "Duplicate")
   ```

3. **Use CommonQueryParams**
   ```python
   # ✅ GOOD
   @router.get("/")
   def get_all(commons: CommonQueryParams = Depends()):
       items, total = service.get_all(commons.page, commons.limit)
   
   # ❌ BAD
   @router.get("/")
   def get_all(page: int = 1, limit: int = 10, search: str = None):
       # ... manual parameter handling
   ```

4. **Convert to Response Schema**
   ```python
   # ✅ GOOD
   return success_response(
       "Success",
       data=LokasiResponse.model_validate(lokasi).model_dump()
   )
   
   # ❌ BAD
   return success_response("Success", data=lokasi.to_dict())
   ```

### ❌ DON'Ts

1. **Don't put business logic in repository**
   ```python
   # ❌ BAD
   class LokasiRepository:
       def create(self, data):
           # Business validation here - WRONG!
           if self.get_by_nama(data.nama):
               raise Exception("Duplicate")
   ```

2. **Don't access database directly in endpoint**
   ```python
   # ❌ BAD
   @router.get("/{id}")
   def get_lokasi(id: int, db: Session):
       lokasi = db.query(Lokasi).filter(...).first()  # Direct DB access
   ```

3. **Don't skip service layer**
   ```python
   # ❌ BAD - Endpoint -> Repository (skip service)
   @router.post("/")
   def create(data: LokasiCreate, db: Session):
       repository = LokasiRepository(db)
       return repository.create(data.dict())
   ```

---

## 4. Summary

### Layer Responsibilities

| Layer | Responsibility | Example |
|-------|---------------|---------|
| **Endpoint** | HTTP handling, request/response | Parse JSON, return response |
| **Service** | Business logic, validation | Check duplicates, complex validation |
| **Repository** | Data access, queries | CRUD operations, database queries |
| **Model** | Database structure | Table definition, relationships |
| **Schema** | Data validation, serialization | Request/response validation |

### Benefits

✅ **Code Reuse** - Base classes eliminate duplication  
✅ **Consistency** - Same patterns everywhere  
✅ **Maintainability** - Easy to update, clear structure  
✅ **Testability** - Each layer can be tested independently  
✅ **Type Safety** - Generic types catch errors early  
✅ **Scalability** - Easy to add new entities  

---

**Happy Coding! 🚀**
