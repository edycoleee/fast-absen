# Response Format Best Practices Documentation

**RSUD Sulfat Attendance System - FastAPI Backend**  
Version: 2.0.0  
Last Updated: February 2026

---

## 📑 Table of Contents
1. [Overview](#overview)
2. [Response Types](#response-types)
3. [Implementation Examples](#implementation-examples)
4. [TypeScript Integration](#typescript-integration)
5. [Best Practices](#best-practices)
6. [Anti-Patterns](#anti-patterns)
7. [Error Handling](#error-handling)
8. [Testing Examples](#testing-examples)

---

## 1. Overview

### Design Philosophy

**Golden Rule:** The `data` field MUST ALWAYS be an object, NEVER a raw array.

**Why This Matters?**
- ✅ **Consistency** - Frontend doesn't need runtime type checking (`Array.isArray()`)
- ✅ **Type Safety** - Easier TypeScript/interface definitions
- ✅ **Extensibility** - Can add metadata without breaking existing clients
- ✅ **Clear Intent** - Explicit structure communicates single vs multiple items
- ✅ **Future-proof** - Add fields without API versioning
- ✅ **Predictability** - Developers know exactly what to expect

### Base Response Structure

All responses follow this base structure:

```json
{
  "success": boolean,    // true = success, false = error
  "message": string,     // Human-readable message
  "data": object | {}    // Response payload (ALWAYS object, never array)
}
```

### Available Response Functions

| Function | Use Case | Returns |
|----------|----------|---------|
| `success_response()` | Single resource | `data` as object |
| `list_response()` | Multiple items (no pagination) | `data.items` as array |
| `paginated_response()` | Multiple items (with pagination) | `data.items` + pagination metadata |
| `error_response()` | Error cases | `data` as object with error details |

---

## 2. Response Types

### 2.1. Single Resource Response

**When to use:** Retrieving, creating, updating, or deleting a single resource

**Function:** `success_response(message: str, data: dict)`

**Example Endpoint:** `GET /api/v1/users/1`

```python
from utils.response import success_response

@router.get("/{id}")
async def get_user(id: int):
    user = {
        "id": 1,
        "nama": "Sultan",
        "email": "sultan@example.com",
        "role": "admin"
    }
    return success_response("User retrieved successfully", data=user)
```

**Response:**
```json
{
  "success": true,
  "message": "User retrieved successfully",
  "data": {
    "id": 1,
    "nama": "Sultan",
    "email": "sultan@example.com",
    "role": "admin"
  }
}
```

**HTTP Status Code:** 200 OK

---

### 2.2. List Response (Non-Paginated)

**When to use:** Retrieving a collection of items without pagination (e.g., dropdowns, filters, small datasets)

**Function:** `list_response(message: str, items: list, total: int = None)`

**Example Endpoint:** `GET /api/v1/users/active`

```python
from utils.response import list_response

@router.get("/active")
async def get_active_users():
    users = [
        {"id": 1, "nama": "Sultan", "status": "active"},
        {"id": 2, "nama": "Ahmad", "status": "active"},
        {"id": 3, "nama": "Budi", "status": "active"}
    ]
    
    return list_response(
        message="Active users retrieved",
        items=users,
        total=len(users)  # Optional
    )
```

**Response:**
```json
{
  "success": true,
  "message": "Active users retrieved",
  "data": {
    "items": [
      {"id": 1, "nama": "Sultan", "status": "active"},
      {"id": 2, "nama": "Ahmad", "status": "active"},
      {"id": 3, "nama": "Budi", "status": "active"}
    ],
    "total": 3
  }
}
```

**Without `total`:**
```python
return list_response(
    message="Active users retrieved",
    items=users
)
```
```json
{
  "success": true,
  "message": "Active users retrieved",
  "data": {
    "items": [...]
  }
}
```

**HTTP Status Code:** 200 OK

---

### 2.3. Paginated Response

**When to use:** Retrieving large collections with pagination support

**Function:** `paginated_response(message: str, items: list, page: int, limit: int, total: int)`

**Example Endpoint:** `GET /api/v1/users?page=1&limit=10`

```python
from utils.response import paginated_response
from typing import Optional

@router.get("/")
async def get_users(
    page: int = 1,
    limit: int = 10,
    search: Optional[str] = None
):
    # Calculate offset
    offset = (page - 1) * limit
    
    # Get data from database
    users = db.query(User)\
        .filter(User.nama.like(f"%{search}%") if search else True)\
        .limit(limit)\
        .offset(offset)\
        .all()
    
    # Get total count
    total = db.query(User)\
        .filter(User.nama.like(f"%{search}%") if search else True)\
        .count()
    
    return paginated_response(
        message="Users retrieved successfully",
        items=[user.to_dict() for user in users],
        page=page,
        limit=limit,
        total=total
    )
```

**Response:**
```json
{
  "success": true,
  "message": "Users retrieved successfully",
  "data": {
    "items": [
      {"id": 1, "nama": "Sultan"},
      {"id": 2, "nama": "Ahmad"},
      {"id": 3, "nama": "Budi"}
    ],
    "page": 1,
    "limit": 10,
    "total": 50,
    "totalPages": 5
  }
}
```

**Pagination Metadata Explained:**
- `page`: Current page number (1-indexed)
- `limit`: Items per page
- `total`: Total number of items in database
- `totalPages`: Calculated as `ceil(total / limit)`

**HTTP Status Code:** 200 OK

---

### 2.4. Error Response

**When to use:** Automatically handled by exception handlers

**Function:** `error_response(message: str, data: dict = None)`

```python
from fastapi import HTTPException

@router.get("/{id}")
async def get_user(id: int):
    user = db.query(User).filter(User.id == id).first()
    
    if not user:
        raise HTTPException(
            status_code=404,
            detail="User not found"
        )
    
    return success_response("User retrieved", data=user.to_dict())
```

**Error Response (404):**
```json
{
  "success": false,
  "message": "User not found",
  "data": {}
}
```

**Validation Error Response (422):**
```json
{
  "success": false,
  "message": "Validation error",
  "data": {
    "errors": [
      {
        "field": "body -> email",
        "message": "value is not a valid email address",
        "type": "value_error.email"
      }
    ]
  }
}
```

**Common HTTP Status Codes:**
- `400` Bad Request - Invalid request data
- `401` Unauthorized - Authentication required
- `403` Forbidden - Insufficient permissions
- `404` Not Found - Resource not found
- `422` Unprocessable Entity - Validation error
- `500` Internal Server Error - Unexpected error

---

## 3. Implementation Examples

### 3.1. Complete CRUD Example - Lokasi (Location)

```python
from fastapi import APIRouter, HTTPException, Depends, status
from sqlalchemy.orm import Session
from typing import Optional

from config.database import get_db
from models.lokasi import Lokasi
from schemas.lokasi import LokasiCreate, LokasiUpdate
from utils.response import (
    success_response,
    list_response,
    paginated_response
)

router = APIRouter(prefix="/lokasi", tags=["Lokasi"])


# CREATE - POST /api/v1/lokasi
@router.post("/", status_code=status.HTTP_201_CREATED)
async def create_lokasi(
    data: LokasiCreate,
    db: Session = Depends(get_db)
):
    """Create new lokasi"""
    # Check if name already exists
    existing = db.query(Lokasi).filter(Lokasi.nama == data.nama).first()
    if existing:
        raise HTTPException(
            status_code=400,
            detail=f"Lokasi '{data.nama}' already exists"
        )
    
    # Create new lokasi
    lokasi = Lokasi(**data.dict())
    db.add(lokasi)
    db.commit()
    db.refresh(lokasi)
    
    return success_response(
        message="Lokasi created successfully",
        data=lokasi.to_dict()
    )


# READ ONE - GET /api/v1/lokasi/{id}
@router.get("/{id}")
async def get_lokasi(id: int, db: Session = Depends(get_db)):
    """Get single lokasi by ID"""
    lokasi = db.query(Lokasi).filter(Lokasi.id == id).first()
    
    if not lokasi:
        raise HTTPException(
            status_code=404,
            detail=f"Lokasi with ID {id} not found"
        )
    
    return success_response(
        message="Lokasi retrieved successfully",
        data=lokasi.to_dict()
    )


# READ ALL (Paginated) - GET /api/v1/lokasi?page=1&limit=10
@router.get("/")
async def get_all_lokasi(
    page: int = 1,
    limit: int = 10,
    search: Optional[str] = None,
    is_active: Optional[bool] = None,
    db: Session = Depends(get_db)
):
    """Get all lokasi with pagination and filters"""
    # Base query
    query = db.query(Lokasi)
    
    # Apply filters
    if search:
        query = query.filter(Lokasi.nama.ilike(f"%{search}%"))
    
    if is_active is not None:
        query = query.filter(Lokasi.is_active == is_active)
    
    # Get total count
    total = query.count()
    
    # Apply pagination
    offset = (page - 1) * limit
    lokasi_list = query.offset(offset).limit(limit).all()
    
    return paginated_response(
        message="Lokasi list retrieved successfully",
        items=[lok.to_dict() for lok in lokasi_list],
        page=page,
        limit=limit,
        total=total
    )


# READ ACTIVE (Non-paginated) - GET /api/v1/lokasi/active
@router.get("/filter/active")
async def get_active_lokasi(db: Session = Depends(get_db)):
    """Get all active lokasi (for dropdowns, etc)"""
    lokasi_list = db.query(Lokasi)\
        .filter(Lokasi.is_active == True)\
        .order_by(Lokasi.nama)\
        .all()
    
    return list_response(
        message="Active lokasi retrieved",
        items=[lok.to_dict() for lok in lokasi_list],
        total=len(lokasi_list)
    )


# UPDATE - PUT /api/v1/lokasi/{id}
@router.put("/{id}")
async def update_lokasi(
    id: int,
    data: LokasiUpdate,
    db: Session = Depends(get_db)
):
    """Update lokasi by ID"""
    lokasi = db.query(Lokasi).filter(Lokasi.id == id).first()
    
    if not lokasi:
        raise HTTPException(
            status_code=404,
            detail=f"Lokasi with ID {id} not found"
        )
    
    # Update fields
    for field, value in data.dict(exclude_unset=True).items():
        setattr(lokasi, field, value)
    
    db.commit()
    db.refresh(lokasi)
    
    return success_response(
        message="Lokasi updated successfully",
        data=lokasi.to_dict()
    )


# DELETE - DELETE /api/v1/lokasi/{id}
@router.delete("/{id}")
async def delete_lokasi(id: int, db: Session = Depends(get_db)):
    """Delete lokasi by ID"""
    lokasi = db.query(Lokasi).filter(Lokasi.id == id).first()
    
    if not lokasi:
        raise HTTPException(
            status_code=404,
            detail=f"Lokasi with ID {id} not found"
        )
    
    # Soft delete (recommended):
    lokasi.is_active = False
    lokasi.deleted_at = datetime.now()
    db.commit()
    
    return success_response(
        message="Lokasi deleted successfully",
        data={"id": id}
    )
```

---

### 3.2. Absensi (Attendance) Example

```python
from datetime import datetime, date
from typing import Optional
from sqlalchemy import func

@router.post("/checkin")
async def checkin(
    data: AbsensiCreate,
    request: Request,
    db: Session = Depends(get_db)
):
    """Employee check-in"""
    # Validate pegawai exists
    pegawai = db.query(Pegawai).filter(
        Pegawai.id_pegawai == data.id_pegawai
    ).first()
    
    if not pegawai:
        raise HTTPException(
            status_code=404,
            detail="Pegawai not found"
        )
    
    # Check if already checked in today
    today = date.today()
    existing = db.query(Absensi).filter(
        Absensi.id_pegawai == data.id_pegawai,
        func.date(Absensi.tanggal) == today
    ).first()
    
    if existing:
        raise HTTPException(
            status_code=400,
            detail="Already checked in today"
        )
    
    # Create absensi record
    absensi = Absensi(
        id_pegawai=data.id_pegawai,
        id_lokasi=data.id_lokasi,
        uid=data.uid,
        tanggal=datetime.now(),
        keterangan="Hadir",
        ip_address=request.client.host
    )
    
    db.add(absensi)
    db.commit()
    db.refresh(absensi)
    
    return success_response(
        message=f"Check-in berhasil! Selamat pagi, {pegawai.nama}",
        data={
            "absensi": absensi.to_dict(),
            "pegawai": {
                "id": pegawai.id_pegawai,
                "nama": pegawai.nama,
                "foto": pegawai.foto
            },
            "waktu": absensi.tanggal.strftime("%H:%M:%S")
        }
    )


@router.get("/history/{id_pegawai}")
async def get_absensi_history(
    id_pegawai: str,
    page: int = 1,
    limit: int = 20,
    start_date: Optional[date] = None,
    end_date: Optional[date] = None,
    db: Session = Depends(get_db)
):
    """Get attendance history for an employee"""
    query = db.query(Absensi).filter(
        Absensi.id_pegawai == id_pegawai
    )
    
    # Date range filter
    if start_date:
        query = query.filter(func.date(Absensi.tanggal) >= start_date)
    if end_date:
        query = query.filter(func.date(Absensi.tanggal) <= end_date)
    
    # Order by most recent first
    query = query.order_by(Absensi.tanggal.desc())
    
    total = query.count()
    offset = (page - 1) * limit
    history = query.offset(offset).limit(limit).all()
    
    return paginated_response(
        message="Attendance history retrieved",
        items=[h.to_dict() for h in history],
        page=page,
        limit=limit,
        total=total
    )
```

---

## 4. TypeScript Integration

### 4.1. Type Definitions

Create `src/types/api.ts`:

```typescript
/**
 * Base API Response
 */
export interface ApiResponse<T = any> {
  success: boolean;
  message: string;
  data: T;
}

/**
 * List Response (non-paginated)
 */
export interface ListResponse<T> {
  success: boolean;
  message: string;
  data: {
    items: T[];
    total?: number;
  };
}

/**
 * Paginated Response
 */
export interface PaginatedResponse<T> {
  success: boolean;
  message: string;
  data: {
    items: T[];
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

/**
 * Error Response
 */
export interface ErrorResponse {
  success: false;
  message: string;
  data: {
    errors?: Array<{
      field: string;
      message: string;
      type: string;
    }>;
    [key: string]: any;
  };
}
```

### 4.2. Domain Types

Create `src/types/models.ts`:

```typescript
/**
 * User Model
 */
export interface User {
  id: number;
  username: string;
  nama: string;
  email: string;
  role: string;
  is_active: boolean;
  created_at: string;
}

/**
 * Lokasi Model
 */
export interface Lokasi {
  id: number;
  nama: string;
  alamat: string;
  latitude: number;
  longitude: number;
  radius: number;
  is_active: boolean;
}

/**
 * Absensi Model
 */
export interface Absensi {
  id: number;
  id_pegawai: string;
  id_lokasi: number;
  tanggal: string;
  keterangan: string;
  ip_address: string;
}
```

### 4.3. API Service Implementation

Create `src/services/api.service.ts`:

```typescript
import axios, { AxiosInstance, AxiosError } from 'axios';
import type { ApiResponse, ListResponse, PaginatedResponse, ErrorResponse } from '@/types/api';
import type { User, Lokasi, Absensi } from '@/types/models';

class ApiService {
  private client: AxiosInstance;

  constructor() {
    this.client = axios.create({
      baseURL: import.meta.env.VITE_API_URL || 'http://localhost:8000',
      timeout: 10000,
      headers: {
        'Content-Type': 'application/json'
      }
    });

    // Request interceptor (add auth token)
    this.client.interceptors.request.use((config) => {
      const token = localStorage.getItem('token');
      if (token) {
        config.headers.Authorization = `Bearer ${token}`;
      }
      return config;
    });

    // Response interceptor (error handling)
    this.client.interceptors.response.use(
      (response) => response,
      (error: AxiosError<ErrorResponse>) => {
        if (error.response) {
          console.error('API Error:', error.response.data);
        } else if (error.request) {
          console.error('Network Error:', error.message);
        }
        return Promise.reject(error);
      }
    );
  }

  /**
   * GET single user
   */
  async getUser(id: number): Promise<User> {
    const response = await this.client.get<ApiResponse<User>>(
      `/api/v1/users/${id}`
    );
    return response.data.data;
  }

  /**
   * GET all users (paginated)
   */
  async getUsers(page = 1, limit = 10, search?: string) {
    const response = await this.client.get<PaginatedResponse<User>>(
      '/api/v1/users',
      { params: { page, limit, search } }
    );
    return response.data;
  }

  /**
   * GET active users (non-paginated)
   */
  async getActiveUsers() {
    const response = await this.client.get<ListResponse<User>>(
      '/api/v1/users/active'
    );
    return response.data.data.items;
  }

  /**
   * POST create user
   */
  async createUser(userData: Partial<User>): Promise<User> {
    const response = await this.client.post<ApiResponse<User>>(
      '/api/v1/users',
      userData
    );
    return response.data.data;
  }

  /**
   * PUT update user
   */
  async updateUser(id: number, userData: Partial<User>): Promise<User> {
    const response = await this.client.put<ApiResponse<User>>(
      `/api/v1/users/${id}`,
      userData
    );
    return response.data.data;
  }

  /**
   * DELETE user
   */
  async deleteUser(id: number): Promise<void> {
    await this.client.delete(`/api/v1/users/${id}`);
  }
}

export const api = new ApiService();
```

### 4.4. React Hook Examples

Create `src/hooks/useUsers.ts`:

```typescript
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/services/api.service';
import type { User } from '@/types/models';

/**
 * Fetch single user
 */
export function useUser(id: number) {
  return useQuery({
    queryKey: ['user', id],
    queryFn: () => api.getUser(id),
    enabled: !!id
  });
}

/**
 * Fetch paginated users with search
 */
export function useUsers(page = 1, limit = 10, search?: string) {
  return useQuery({
    queryKey: ['users', page, limit, search],
    queryFn: () => api.getUsers(page, limit, search),
    keepPreviousData: true
  });
}

/**
 * Fetch active users for dropdown
 */
export function useActiveUsers() {
  return useQuery({
    queryKey: ['users', 'active'],
    queryFn: () => api.getActiveUsers(),
    staleTime: 5 * 60 * 1000 // 5 minutes
  });
}

/**
 * Create user mutation
 */
export function useCreateUser() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (userData: Partial<User>) => api.createUser(userData),
    onSuccess: () => {
      queryClient.invalidateQueries(['users']);
    }
  });
}
```

### 4.5. React Component Examples

```typescript
import React from 'react';
import { useUsers, useActiveUsers } from '@/hooks/useUsers';

/**
 * Users List Component (Paginated)
 */
export function UsersList() {
  const [page, setPage] = React.useState(1);
  const [search, setSearch] = React.useState('');
  
  const { data, isLoading, error } = useUsers(page, 10, search);

  if (isLoading) return <div>Loading...</div>;
  if (error) return <div>Error loading users</div>;

  return (
    <div>
      <input
        type="text"
        placeholder="Search users..."
        value={search}
        onChange={(e) => setSearch(e.target.value)}
      />

      <table>
        <tbody>
          {data?.data.items.map((user) => (
            <tr key={user.id}>
              <td>{user.nama}</td>
              <td>{user.email}</td>
            </tr>
          ))}
        </tbody>
      </table>

      {/* Pagination */}
      <div>
        <button
          disabled={page === 1}
          onClick={() => setPage(p => p - 1)}
        >
          Previous
        </button>
        
        <span>
          Page {data?.data.page} of {data?.data.totalPages}
        </span>
        
        <button
          disabled={page === data?.data.totalPages}
          onClick={() => setPage(p => p + 1)}
        >
          Next
        </button>
      </div>
    </div>
  );
}

/**
 * User Dropdown Component (Non-paginated)
 */
export function UserDropdown() {
  const { data: users, isLoading } = useActiveUsers();

  if (isLoading) return <select disabled><option>Loading...</option></select>;

  return (
    <select>
      <option value="">Select user...</option>
      {users?.map((user) => (
        <option key={user.id} value={user.id}>
          {user.nama}
        </option>
      ))}
    </select>
  );
}
```

---

## 5. Best Practices

### ✅ DO's

#### 1. **Always Use Helper Functions**
```python
# ✅ GOOD
return success_response("User created", data=user_dict)

# ❌ BAD
return {"success": True, "message": "User created", "data": user_dict}
```

#### 2. **Provide Meaningful Messages**
```python
# ✅ GOOD
return success_response("Lokasi created successfully", data=lokasi)

# ❌ BAD
return success_response("Success", data=lokasi)
```

#### 3. **Include Metadata for Collections**
```python
# ✅ GOOD
return list_response("Active users", items=users, total=len(users))
```

#### 4. **Use Appropriate Response Types**
```python
# ✅ GOOD - Small list
@router.get("/roles")
def get_roles():
    return list_response("Roles", items=["admin", "user"])

# ✅ GOOD - Large dataset
@router.get("/users")
def get_users(page: int = 1):
    return paginated_response("Users", items, page, 10, total)
```

#### 5. **Handle Empty Results Gracefully**
```python
# ✅ GOOD
return list_response(
    "No lokasi found" if not lokasi_list else "Lokasi retrieved",
    items=lokasi_list or [],
    total=0
)
```

---

## 6. Anti-Patterns

### ❌ DON'T's

#### 1. **Never Return Raw Arrays**
```python
# ❌ BAD
@router.get("/users")
def get_users():
    return [{"id": 1}, {"id": 2}]  # Wrong!
```

#### 2. **Don't Mix Response Formats**
```python
# ❌ BAD
@router.get("/{id}")
def get_user(id: int):
    return {"id": 1, "nama": "Sultan"}  # Missing success, message
```

#### 3. **Don't Put Pagination in Separate Meta**
```python
# ❌ BAD
{
  "data": [{"id": 1}],  # Array!
  "meta": {"page": 1}
}

# ✅ GOOD
{
  "data": {
    "items": [{"id": 1}],
    "page": 1
  }
}
```

---

## 7. Error Handling

### Exception Handlers

Errors are automatically formatted by `utils/exception_handlers.py`:

```python
# HTTP Exceptions (404, 401, etc.)
raise HTTPException(status_code=404, detail="User not found")

# Response:
{
  "success": false,
  "message": "User not found",
  "data": {}
}
```

---

## 8. Testing Examples

### pytest Tests

```python
def test_get_user_success():
    response = client.get("/api/v1/users/1")
    
    assert response.status_code == 200
    data = response.json()
    assert data["success"] is True
    assert isinstance(data["data"], dict)  # Always object!

def test_get_users_paginated():
    response = client.get("/api/v1/users?page=1&limit=10")
    
    data = response.json()
    assert "items" in data["data"]
    assert "page" in data["data"]
    assert isinstance(data["data"]["items"], list)
```

---

## Summary

### Quick Reference Table

| Scenario | Function | `data` Structure |
|----------|----------|------------------|
| Single resource | `success_response()` | `{ id: 1, ... }` |
| Collection (dropdown) | `list_response()` | `{ items: [...], total?: N }` |
| Large dataset | `paginated_response()` | `{ items: [...], page, limit, total, totalPages }` |
| Delete operation | `success_response()` | `{ id: deleted_id }` |
| Error | Auto via exceptions | `{}` or `{ errors: [...] }` |

### Key Takeaways

1. ✅ **`data` is ALWAYS an object**, never a raw array
2. ✅ **Use helper functions** for consistency
3. ✅ **Collections go in `data.items`**
4. ✅ **Pagination metadata inside `data`**, not separate `meta`
5. ✅ **Empty results return empty arrays**, not null
6. ✅ **Errors follow same structure** with `success: false`
7. ✅ **TypeScript types are straightforward** - no union types
8. ✅ **Frontend code is predictable** - no type checking

---

**Document Version:** 1.0  
**Last Updated:** February 12, 2026  
**Author:** Sultan (Backend Team)
