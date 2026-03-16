# PROMPT: Role, Permission, User & System Settings Management

> **Reusable best-practice prompt** — ambil pola ini untuk membangun fitur manajemen Role, Permission, User, dan Pengaturan Sistem pada aplikasi apapun berbasis **FastAPI + React + Tailwind CSS**.
> Semua kode di bawah adalah pola nyata dari aplikasi `fast-absen`. Sesuaikan nama entitas dan field sesuai domain baru.

---

## 1. Konteks Arsitektur

```
Stack   : FastAPI (backend) · React + Tailwind CSS (frontend)
Auth    : JWT (access token cookie + refresh token cookie)
Pola    : Router → Service → Repository (Clean Architecture)
UI Kit  : .btn-primary · .btn-secondary · .input-field · .card (index.css)
```

**Aturan registrasi router** — daftarkan semua sub-router di `api/v1/__init__.py`:
```python
from .endpoints import roles, permissions, users, app_settings

router.include_router(roles.router)
router.include_router(permissions.router)
router.include_router(users.router)
router.include_router(app_settings.router)
```

---

## 2. Backend — Model SQLAlchemy

### 2a. Permission
```python
# models/permission.py
from sqlalchemy import Column, Integer, String, DateTime
from sqlalchemy.sql import func
from config.database import Base

class Permission(Base):
    __tablename__ = "permissions"
    id          = Column(Integer, primary_key=True, index=True)
    name        = Column(String(100), unique=True, nullable=False, index=True)
    description = Column(String(255), nullable=True)
    created_at  = Column(DateTime(timezone=True), server_default=func.now())
    updated_at  = Column(DateTime(timezone=True), onupdate=func.now())
```

### 2b. Role + relasi Permission (many-to-many)
```python
# models/role.py
from sqlalchemy import Column, Integer, String, DateTime, Table, ForeignKey
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from config.database import Base

role_permissions = Table(
    "role_permissions", Base.metadata,
    Column("role_id",       ForeignKey("roles.id"),       primary_key=True),
    Column("permission_id", ForeignKey("permissions.id"), primary_key=True),
)

class Role(Base):
    __tablename__ = "roles"
    id          = Column(Integer, primary_key=True, index=True)
    name        = Column(String(100), unique=True, nullable=False, index=True)
    description = Column(String(255), nullable=True)
    created_at  = Column(DateTime(timezone=True), server_default=func.now())
    updated_at  = Column(DateTime(timezone=True), onupdate=func.now())
    permissions = relationship("Permission", secondary=role_permissions, backref="roles")
```

### 2c. User + relasi Role (many-to-many)
```python
# models/user.py
from sqlalchemy import Column, Integer, String, Boolean, DateTime, Table, ForeignKey
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from config.database import Base

user_roles = Table(
    "user_roles", Base.metadata,
    Column("user_id", ForeignKey("users.id"), primary_key=True),
    Column("role_id", ForeignKey("roles.id"), primary_key=True),
)

class User(Base):
    __tablename__ = "users"
    id          = Column(Integer, primary_key=True, index=True)
    username    = Column(String(100), unique=True, nullable=False, index=True)
    password    = Column(String(255), nullable=False)       # bcrypt hash
    is_active   = Column(Boolean, default=True, nullable=False)
    created_at  = Column(DateTime(timezone=True), server_default=func.now())
    updated_at  = Column(DateTime(timezone=True), onupdate=func.now())
    roles       = relationship("Role", secondary=user_roles, backref="users")
```

### 2d. AppSetting (key–value store)
```python
# models/app_setting.py
from sqlalchemy import Column, String, Boolean, DateTime
from sqlalchemy.sql import func
from config.database import Base

class AppSetting(Base):
    __tablename__ = "app_settings"
    key         = Column(String(100), primary_key=True)
    value       = Column(String(500), nullable=False)
    description = Column(String(255), nullable=True)
    locked      = Column(Boolean, default=False)            # kunci agar user tidak bisa ubah
    updated_at  = Column(DateTime(timezone=True), onupdate=func.now())
```

---

## 3. Backend — Pydantic Schemas

```python
# schemas/role.py
from pydantic import BaseModel, field_validator
from typing import Optional, List

class RoleCreate(BaseModel):
    name:           str
    description:    Optional[str] = None
    permission_ids: List[int]     = []

    @field_validator("name")
    @classmethod
    def name_not_empty(cls, v):
        if not v.strip():
            raise ValueError("name tidak boleh kosong")
        return v.strip()

class RoleUpdate(RoleCreate):
    pass

class RoleResponse(BaseModel):
    id:          int
    name:        str
    description: Optional[str]
    permissions: List[str] = []   # nama permission (bukan id)

    model_config = {"from_attributes": True}

# ──────────────────────────────────────────────
# schemas/permission.py
class PermissionCreate(BaseModel):
    name:        str
    description: Optional[str] = None

class PermissionResponse(BaseModel):
    id:   int
    name: str
    description: Optional[str]
    model_config = {"from_attributes": True}

# ──────────────────────────────────────────────
# schemas/user.py
class UserCreate(BaseModel):
    username:    str
    password:    str
    is_active:   bool      = True
    role_ids:    List[int] = []

class UserUpdate(BaseModel):
    username:    Optional[str]      = None
    password:    Optional[str]      = None   # kosong = tidak diubah
    is_active:   Optional[bool]     = None
    role_ids:    Optional[List[int]] = None

class UserResponse(BaseModel):
    id:        int
    username:  str
    is_active: bool
    roles:     List[str] = []
    model_config = {"from_attributes": True}

# ──────────────────────────────────────────────
# schemas/app_setting.py
class AppSettingUpdate(BaseModel):
    value:       str
    description: Optional[str] = None
    locked:      Optional[bool] = None

    @field_validator("value")
    @classmethod
    def value_not_empty(cls, v):
        if not v.strip():
            raise ValueError("value tidak boleh kosong")
        return v.strip()
```

---

## 4. Backend — FastAPI Endpoints

### 4a. Roles
```python
# api/v1/endpoints/roles.py
from fastapi import APIRouter, Depends, status
from sqlalchemy.orm import Session
from config.database import get_db
from schemas.role import RoleCreate, RoleUpdate
from services.role_service import RoleService
from utils.response import success_response
from utils.dependencies import require_super_admin

router = APIRouter(prefix="/roles", tags=["Roles"])

@router.get("/",       dependencies=[Depends(require_super_admin)])
def list_roles(skip: int = 0, limit: int = 10, db: Session = Depends(get_db)):
    svc   = RoleService(db)
    items = svc.get_all(skip=skip, limit=limit)
    total = svc.count_all()
    page  = skip // limit + 1
    return success_response(data={"items": [r.model_dump() for r in items],
                                  "total": total, "page": page, "limit": limit})

@router.post("/",      dependencies=[Depends(require_super_admin)], status_code=201)
def create_role(data: RoleCreate, db: Session = Depends(get_db)):
    return success_response(data=RoleService(db).create(data).model_dump())

@router.get("/{id}",   dependencies=[Depends(require_super_admin)])
def get_role(id: int,  db: Session = Depends(get_db)):
    return success_response(data=RoleService(db).get_by_id(id).model_dump())

@router.put("/{id}",   dependencies=[Depends(require_super_admin)])
def update_role(id: int, data: RoleUpdate, db: Session = Depends(get_db)):
    return success_response(data=RoleService(db).update(id, data).model_dump())

@router.delete("/{id}", dependencies=[Depends(require_super_admin)], status_code=204)
def delete_role(id: int, db: Session = Depends(get_db)):
    RoleService(db).delete(id)
```

### 4b. Permissions
```python
# api/v1/endpoints/permissions.py
# (pola identik dengan roles, tanpa permission_ids)
router = APIRouter(prefix="/permissions", tags=["Permissions"])

@router.get("/",       dependencies=[Depends(require_super_admin)])
def list_permissions(skip: int = 0, limit: int = 10, db: Session = Depends(get_db)):
    ...
@router.post("/",      ...)
@router.put("/{id}",   ...)
@router.delete("/{id}", ...)
```

### 4c. Users
```python
# api/v1/endpoints/users.py
router = APIRouter(prefix="/users", tags=["Users"])

@router.get("/",       dependencies=[Depends(require_super_admin)])
def list_users(skip: int = 0, limit: int = 10, search: str = "", db=Depends(get_db)):
    # filter username ILIKE %search%
    ...

@router.post("/",      dependencies=[Depends(require_super_admin)], status_code=201)
def create_user(data: UserCreate, db=Depends(get_db)):
    # hash password dengan bcrypt sebelum simpan
    ...

@router.put("/{id}",   dependencies=[Depends(require_super_admin)])
def update_user(id: int, data: UserUpdate, db=Depends(get_db)):
    # password hanya di-hash jika tidak kosong
    ...

@router.delete("/{id}", dependencies=[Depends(require_super_admin)], status_code=204)
def delete_user(id: int, db=Depends(get_db)): ...
```

**Catatan keamanan password:**
```python
# utils/security.py
from passlib.context import CryptContext
pwd_ctx = CryptContext(schemes=["bcrypt"], deprecated="auto")

def hash_password(plain: str) -> str:
    return pwd_ctx.hash(plain)

def verify_password(plain: str, hashed: str) -> bool:
    return pwd_ctx.verify(plain, hashed)
```

### 4d. App Settings
```python
# api/v1/endpoints/app_settings.py
router = APIRouter(prefix="/app-settings", tags=["App Settings"])

@router.get("/")                                  # publik — frontend bisa baca tanpa login
def get_all(db=Depends(get_db)):
    repo = AppSettingRepository(db)
    return {"success": True, "data": [
        {"key": s.key, "value": s.value, "description": s.description,
         "locked": s.locked, "updated_at": s.updated_at}
        for s in repo.get_all()
    ]}

@router.get("/{key}")                             # publik
def get_one(key: str, db=Depends(get_db)): ...

@router.put("/{key}", dependencies=[Depends(require_super_admin)])
def update_setting(key: str, data: AppSettingUpdate, db=Depends(get_db)):
    # Jika locked=True di DB, tolak update value
    ...
```

---

## 5. Frontend — Repository Layer

```js
// src/data/repositories/RoleRepository.js
import apiClient from '../api/client';

const RoleRepository = {
  getAll:  (page = 1, limit = 10) =>
    apiClient.get(`/roles/?page=${page}&limit=${limit}`).then(r => r.data),
  getById: (id) =>
    apiClient.get(`/roles/${id}`).then(r => r.data),
  create:  (data) =>
    apiClient.post('/roles/', data).then(r => r.data),
  update:  (id, data) =>
    apiClient.put(`/roles/${id}`, data).then(r => r.data),
  delete:  (id) =>
    apiClient.delete(`/roles/${id}`).then(r => r.data),
};
export default RoleRepository;

// ── PermissionRepository.js ──────────────────────────────────────────────────
// Pola identik, prefix /permissions/

// ── UserRepository.js ────────────────────────────────────────────────────────
const UserRepository = {
  getAll:  (page = 1, limit = 10, search = '') =>
    apiClient.get(`/users/?page=${page}&limit=${limit}&search=${encodeURIComponent(search)}`).then(r => r.data),
  create:  (data) =>
    apiClient.post('/users/', data).then(r => r.data),
  update:  (id, data) =>
    apiClient.put(`/users/${id}`, data).then(r => r.data),
  delete:  (id) =>
    apiClient.delete(`/users/${id}`).then(r => r.data),
  downloadTemplate: () =>
    apiClient.get('/users/template/download', { responseType: 'blob' }).then(r => r.data),
};
export default UserRepository;

// ── AppSettingRepository.js ───────────────────────────────────────────────────
const AppSettingRepository = {
  getAll: () =>
    apiClient.get('/app-settings/').then(r => r.data),
  update: (key, value, opts = {}) => {
    const body = { value: String(value), ...opts };
    return apiClient.put(`/app-settings/${key}`, body).then(r => r.data);
  },
};
export default AppSettingRepository;
```

---

## 6. Frontend — Custom Hooks

```js
// src/domain/hooks/useRoles.js
import { useState, useCallback } from 'react';
import RoleRepository from '../../data/repositories/RoleRepository';

export const useRoles = () => {
  const [roles,      setRoles]      = useState([]);
  const [loading,    setLoading]    = useState(false);
  const [error,      setError]      = useState(null);
  const [pagination, setPagination] = useState({ page: 1, limit: 10, total: 0 });

  const fetchRoles = useCallback(async (page = 1, limit = 10) => {
    setLoading(true); setError(null);
    try {
      const res  = await RoleRepository.getAll(page, limit);
      const data = res?.data ?? {};
      setRoles(data.items ?? []);
      setPagination({ page: data.page ?? page, limit: data.limit ?? limit, total: data.total ?? 0 });
    } catch (err) {
      setError(err?.response?.data?.message ?? 'Gagal memuat roles');
    } finally { setLoading(false); }
  }, []);

  const createRole = useCallback(async (payload) => {
    const res = await RoleRepository.create(payload);
    return res;
  }, []);

  const updateRole = useCallback(async (id, payload) => {
    const res = await RoleRepository.update(id, payload);
    return res;
  }, []);

  const deleteRole = useCallback(async (id) => {
    await RoleRepository.delete(id);
  }, []);

  return { roles, loading, error, pagination, fetchRoles, createRole, updateRole, deleteRole };
};

// ── useUsers.js pola identik (tambah param search di fetchUsers) ─────────────
// export const useUsers = () => { ... fetchUsers(page, limit, search) ... }
```

---

## 7. Frontend — RolesPage (template halaman admin)

```jsx
// src/presentation/pages/admin/RolesPage.jsx
import { useEffect, useMemo, useState } from 'react';
import { useRoles } from '../../../domain/hooks';
import PermissionRepository from '../../../data/repositories/PermissionRepository';
import { formatErrorMessage, formatErrorForAlert } from '../../../utils/errorHandler';

const RolesPage = () => {
  const { roles, loading, error, pagination, fetchRoles,
          createRole, updateRole, deleteRole } = useRoles();
  const { user } = useAuth();
  const [page, setPage] = useState(1);

  // ── Modal state ────────────────────────────────────────────────────────────
  const [isModalOpen,  setIsModalOpen]  = useState(false);
  const [modalMode,    setModalMode]    = useState('create');   // 'create' | 'edit'
  const [editingId,    setEditingId]    = useState(null);
  const [formLoading,  setFormLoading]  = useState(false);
  const [formError,    setFormError]    = useState('');
  const [formData,     setFormData]     = useState({ name: '', description: '', permission_ids: [] });

  // ── Permission options ─────────────────────────────────────────────────────
  const [permOptions,  setPermOptions]  = useState([]);
  const [permLoading,  setPermLoading]  = useState(false);
  const [pendingNames, setPendingNames] = useState([]);   // nama permission saat edit

  useEffect(() => { fetchRoles(page, 10); }, [page, fetchRoles]);

  // Muat permission list saat modal terbuka
  useEffect(() => {
    if (!isModalOpen) return;
    setPermLoading(true);
    PermissionRepository.getAll(1, 200)
      .then(res => setPermOptions(res?.data?.items ?? []))
      .catch(() => {})
      .finally(() => setPermLoading(false));
  }, [isModalOpen]);

  // Resolve nama permission → id saat edit
  useEffect(() => {
    if (!pendingNames.length || !permOptions.length) return;
    const ids = permOptions.filter(p => pendingNames.includes(p.name)).map(p => p.id);
    setFormData(prev => ({ ...prev, permission_ids: ids }));
    setPendingNames([]);
  }, [pendingNames, permOptions]);

  // Tutup modal dengan Esc
  useEffect(() => {
    if (!isModalOpen) return;
    const handler = (e) => { if (e.key === 'Escape') closeModal(); };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [isModalOpen]);

  const permIdSet = useMemo(() => new Set(formData.permission_ids), [formData.permission_ids]);

  const resetForm = () => setFormData({ name: '', description: '', permission_ids: [] });

  const openCreateModal = () => { resetForm(); setModalMode('create'); setEditingId(null); setIsModalOpen(true); };
  const openEditModal   = (role) => {
    setFormData({ name: role.name, description: role.description ?? '', permission_ids: [] });
    setPendingNames(role.permissions ?? []);      // role.permissions = array of name strings
    setEditingId(role.id);
    setModalMode('edit');
    setIsModalOpen(true);
  };
  const closeModal = () => { setIsModalOpen(false); setFormError(''); setFormLoading(false); };

  const togglePerm = (id) => setFormData(prev => ({
    ...prev,
    permission_ids: prev.permission_ids.includes(id)
      ? prev.permission_ids.filter(x => x !== id)
      : [...prev.permission_ids, id],
  }));

  const handleSubmit = async (e) => {
    e.preventDefault(); setFormError(''); setFormLoading(true);
    try {
      if (modalMode === 'create') await createRole(formData);
      else                        await updateRole(editingId, formData);
      closeModal();
      fetchRoles(page, 10);
    } catch (err) {
      setFormError(formatErrorMessage(err, 'Gagal menyimpan role', user));
    } finally { setFormLoading(false); }
  };

  const handleDelete = async (id) => {
    if (!confirm('Hapus role ini?')) return;
    try { await deleteRole(id); fetchRoles(page, 10); }
    catch (err) { alert(formatErrorForAlert(formatErrorMessage(err, 'Gagal hapus', user))); }
  };

  return (
    <div>
      {/* ── Header ── */}
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Roles</h1>
          <p className="text-gray-600 mt-1">Kelola data roles sistem</p>
        </div>
        <button className="btn-primary" onClick={openCreateModal}>+ Tambah Role</button>
      </div>

      {error && <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg mb-4">{error}</div>}

      {/* ── Tabel ── */}
      <div className="bg-white rounded-lg shadow-md overflow-hidden">
        {loading ? (
          <div className="p-8 text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600 mx-auto" />
            <p className="mt-4 text-gray-600">Loading...</p>
          </div>
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    {['Nama', 'Deskripsi', 'Permissions', 'Actions'].map(h => (
                      <th key={h} className={`px-6 py-3 text-${h === 'Actions' ? 'right' : 'left'} text-xs font-medium text-gray-500 uppercase tracking-wider`}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {roles.length === 0 ? (
                    <tr><td colSpan={4} className="px-6 py-8 text-center text-gray-500">Tidak ada data</td></tr>
                  ) : roles.map(role => (
                    <tr key={role.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 font-medium text-gray-900 whitespace-nowrap">{role.name}</td>
                      <td className="px-6 py-4 text-sm text-gray-700">{role.description || '-'}</td>
                      <td className="px-6 py-4 text-xs text-gray-600">
                        {role.permissions?.length ? role.permissions.join(', ') : '-'}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                        <button className="text-primary-600 hover:text-primary-900 mr-3" onClick={() => openEditModal(role)}>Edit</button>
                        <button className="text-red-600 hover:text-red-900" onClick={() => handleDelete(role.id)}>Hapus</button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* ── Pagination ── */}
            {pagination.total > roles.length && (
              <div className="bg-gray-50 px-6 py-4 flex items-center justify-between border-t border-gray-200">
                <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1}
                  className="btn-secondary disabled:opacity-50 disabled:cursor-not-allowed">Previous</button>
                <span className="text-sm text-gray-700">
                  Page {pagination.page} of {Math.ceil(pagination.total / pagination.limit) || 1}
                </span>
                <button onClick={() => setPage(p => p + 1)} disabled={roles.length < pagination.limit}
                  className="btn-secondary disabled:opacity-50 disabled:cursor-not-allowed">Next</button>
              </div>
            )}
          </>
        )}
      </div>

      {/* ── Modal Create/Edit ── */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-black/50 px-4 py-6">
          <div className="mx-auto w-full max-w-2xl rounded-lg bg-white p-6 shadow-xl max-h-[calc(100vh-3rem)] overflow-y-auto">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-xl font-semibold text-gray-900">
                {modalMode === 'create' ? 'Tambah Role' : 'Edit Role'}
              </h2>
              <button className="text-gray-400 hover:text-gray-600" onClick={closeModal}>✕</button>
            </div>

            {formError && <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg mb-4 text-sm">{formError}</div>}

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Nama Role *</label>
                <input className="input-field" value={formData.name}
                  onChange={e => setFormData(p => ({ ...p, name: e.target.value }))} required />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Deskripsi</label>
                <textarea className="input-field" rows={2} value={formData.description}
                  onChange={e => setFormData(p => ({ ...p, description: e.target.value }))} />
              </div>

              {/* ── Checkbox permissions ── */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Permissions</label>
                {permLoading ? (
                  <p className="text-sm text-gray-500">Memuat permissions…</p>
                ) : (
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 max-h-64 overflow-y-auto border border-gray-200 rounded-lg p-3">
                    {permOptions.map(p => (
                      <label key={p.id} className="flex items-center gap-2 cursor-pointer text-sm">
                        <input type="checkbox" checked={permIdSet.has(p.id)} onChange={() => togglePerm(p.id)}
                          className="rounded border-gray-300 text-primary-600 focus:ring-primary-500" />
                        <span className="text-gray-700 truncate">{p.name}</span>
                      </label>
                    ))}
                    {permOptions.length === 0 && <p className="text-sm text-gray-400 col-span-3">Tidak ada permission</p>}
                  </div>
                )}
              </div>

              <div className="flex justify-end gap-3 pt-2">
                <button type="button" className="btn-secondary" onClick={closeModal}>Batal</button>
                <button type="submit" className="btn-primary" disabled={formLoading}>
                  {formLoading ? 'Menyimpan...' : 'Simpan'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
export default RolesPage;
```

---

## 8. Frontend — UsersPage (dengan pencarian)

Fitur tambahan dibanding RolesPage: **search bar** + **dropdown pencarian pegawai** + **toggle aktif/nonaktif**.

```jsx
// src/presentation/pages/admin/UsersPage.jsx  (pola kunci)

// ── State tambahan untuk pencarian ──────────────────────────────────────────
const [search, setSearch] = useState('');    // search input di tabel
const [pegawaiSearch,  setPegawaiSearch]  = useState('');
const [pegawaiDropdownOpen, setPegawaiDropdownOpen] = useState(false);

// Fetch otomatis saat page/search berubah
useEffect(() => { fetchUsers(page, 10, search); }, [page, search, fetchUsers]);

// Search submit
const handleSearch = (e) => {
  e.preventDefault();
  setPage(1);
  fetchUsers(1, 10, search);
};

// ── Filter pegawai inline (tanpa debounce — filter dari daftar sudah dimuat) ─
const filteredPegawai = useMemo(() => {
  const q = pegawaiSearch.trim().toLowerCase();
  const list = q
    ? pegawaiOptions.filter(p =>
        (p.nama || '').toLowerCase().includes(q) ||
        String(p.id_pegawai).toLowerCase().includes(q))
    : pegawaiOptions;
  return list.slice(0, 60);              // batasi tampilan
}, [pegawaiSearch, pegawaiOptions]);

// ── JSX search bar ────────────────────────────────────────────────────────────
<form onSubmit={handleSearch} className="flex gap-2 mb-4">
  <input
    className="input-field flex-1"
    placeholder="Cari username..."
    value={search}
    onChange={e => setSearch(e.target.value)}
  />
  <button type="submit" className="btn-primary">Cari</button>
</form>

// ── JSX dropdown pegawai di dalam modal ───────────────────────────────────────
<div className="relative">
  <input
    className="input-field"
    placeholder="Ketik nama atau ID pegawai..."
    value={pegawaiSearch}
    onChange={e => { setPegawaiSearch(e.target.value); setPegawaiDropdownOpen(true); }}
    onFocus={() => setPegawaiDropdownOpen(true)}
  />
  {pegawaiDropdownOpen && filteredPegawai.length > 0 && (
    <div className="absolute z-10 w-full bg-white border border-gray-200 rounded-lg shadow-lg max-h-48 overflow-y-auto mt-1">
      {filteredPegawai.map(p => (
        <button key={p.id_pegawai} type="button"
          className="w-full text-left px-4 py-2 hover:bg-gray-50 text-sm"
          onClick={() => {
            setFormData(prev => ({ ...prev, id_pegawai: p.id_pegawai }));
            setPegawaiSearch(`${p.nama} (${p.id_pegawai})`);
            setPegawaiDropdownOpen(false);
          }}>
          <span className="font-medium">{p.nama}</span>
          <span className="text-gray-400 ml-2 text-xs">{p.id_pegawai}</span>
        </button>
      ))}
    </div>
  )}
</div>

// ── Toggle is_active ──────────────────────────────────────────────────────────
<label className="flex items-center gap-3 cursor-pointer">
  <span className="text-sm font-medium text-gray-700">Status Aktif</span>
  <button type="button"
    onClick={() => setFormData(prev => ({ ...prev, is_active: !prev.is_active }))}
    className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors
      ${formData.is_active ? 'bg-green-500' : 'bg-gray-300'}`}
  >
    <span className={`inline-block h-4 w-4 transform rounded-full bg-white shadow transition-transform
      ${formData.is_active ? 'translate-x-6' : 'translate-x-1'}`} />
  </button>
  <span className={`text-sm ${formData.is_active ? 'text-green-600 font-medium' : 'text-gray-500'}`}>
    {formData.is_active ? 'Aktif' : 'Nonaktif'}
  </span>
</label>
```

---

## 9. Frontend — SystemSettingsPage

```jsx
// src/presentation/pages/admin/SystemSettingsPage.jsx

// ── Pola: SectionCard + Alert auto-dismiss ───────────────────────────────────

const SectionCard = ({ title, subtitle, children }) => (
  <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 mb-6">
    <h2 className="text-base font-semibold text-gray-800 mb-1">{title}</h2>
    {subtitle && <p className="text-sm text-gray-500 mb-4">{subtitle}</p>}
    {children}
  </div>
);

// Alert state + auto-dismiss setelah 4 detik
const [alert, setAlert] = useState(null);   // { type: 'success'|'error', msg }

const showAlert = (type, msg) => {
  setAlert({ type, msg });
  setTimeout(() => setAlert(null), 4000);
};

// Save setting
const saveSetting = async (key, value) => {
  setSaving(true);
  try {
    await AppSettingRepository.update(key, value);
    showAlert('success', `Setting '${key}' disimpan.`);
  } catch (err) {
    showAlert('error', err?.response?.data?.detail ?? 'Gagal menyimpan.');
  } finally { setSaving(false); }
};

// ── Toggle Lock ───────────────────────────────────────────────────────────────
<button
  onClick={() => saveLock(!locked)}
  disabled={saving}
  className={`relative inline-flex h-7 w-14 items-center rounded-full transition-colors
    ${locked ? 'bg-red-500' : 'bg-gray-300'}`}
>
  <span className={`inline-block h-5 w-5 transform rounded-full bg-white shadow transition-transform
    ${locked ? 'translate-x-7' : 'translate-x-1'}`} />
</button>

// ── Alert Banner ──────────────────────────────────────────────────────────────
{alert && (
  <div className={`mb-5 px-4 py-3 rounded-lg text-sm font-medium flex items-start gap-2 ${
    alert.type === 'success'
      ? 'bg-green-50 border border-green-200 text-green-800'
      : 'bg-red-50 border border-red-200 text-red-800'}`}>
    <span>{alert.type === 'success' ? '✅' : '⚠️'}</span>
    <span>{alert.msg}</span>
  </div>
)}
```

---

## 10. Pola Pencarian Reusable

### Tabel dengan search param (backend)
```python
# Di service/repository:
query = db.query(User)
if search:
    query = query.filter(User.username.ilike(f"%{search}%"))
total = query.count()
items = query.offset(skip).limit(limit).all()
```

### Dropdown inline (frontend) — tanpa komponen tambahan
```jsx
// Gunakan pola filteredPegawai dari UsersPage (Section 8)
// Berlaku untuk memilih entitas apapun (unit, role, kategori, dll.)
// Batasi list.slice(0, 60) agar performa tetap baik
```

### Debounce search (untuk pencarian ke API)
```js
// Jika list tidak di-preload, gunakan debounce:
import { useEffect, useRef } from 'react';

const useDebounce = (value, delay = 400) => {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const timer = setTimeout(() => setDebounced(value), delay);
    return () => clearTimeout(timer);
  }, [value, delay]);
  return debounced;
};

// Penggunaan:
const debouncedSearch = useDebounce(search, 400);
useEffect(() => { fetchItems(1, 10, debouncedSearch); }, [debouncedSearch]);
```

---

## 11. Routing & Guard

```jsx
// App.jsx — daftarkan route di bawah ProtectedRoute
<Route path="/roles"       element={<RolesPage />}          />
<Route path="/permissions" element={<PermissionsPage />}    />
<Route path="/users"       element={<UsersPage />}          />
<Route path="/settings"    element={<SystemSettingsPage />} />

// ProtectedRoute — cek menu_guard dari JWT payload
const ProtectedRoute = ({ children }) => {
  const { user } = useAuth();
  if (!user) return <Navigate to="/login" />;
  return children;
};
```

```python
# Backend — dependency guard
# utils/dependencies.py
async def require_super_admin(current_user: User = Depends(get_current_user)):
    if not current_user.is_super_admin:       # atau cek permission 'manage_roles'
        raise HTTPException(status_code=403, detail="Akses ditolak")
    return current_user
```

---

## 12. Checklist Implementasi

### Backend
- [ ] Model: `Permission`, `Role`, `User`, `AppSetting` + tabel pivot `role_permissions`, `user_roles`
- [ ] Pydantic schemas: `Create`, `Update`, `Response` per entitas
- [ ] Service layer: validasi duplikasi `name`, hash password bcrypt, resolve permission/role by ID
- [ ] Endpoint CRUD masing-masing (prefix: `/roles/`, `/permissions/`, `/users/`, `/app-settings/`)
- [ ] Guard `require_super_admin` di semua endpoint mutasi
- [ ] Endpoint `/app-settings/` (GET) bersifat publik untuk baca konfigurasi
- [ ] Registrasi semua router di `api/v1/__init__.py` **sebelum** route dinamis `/{id}`
- [ ] Seed data awal permission (misal di `init.sql` atau script startup)

### Frontend
- [ ] Repository per entitas: `RoleRepository`, `PermissionRepository`, `UserRepository`, `AppSettingRepository`
- [ ] Custom hook: `useRoles`, `useUsers` (atau gabung `usePermissions` langsung di halaman)
- [ ] `RolesPage`: tabel + pagination + modal create/edit + checkbox permission
- [ ] `PermissionsPage`: tabel + pagination + modal sederhana (2 field)
- [ ] `UsersPage`: tabel + **search bar** + modal + dropdown pegawai + toggle `is_active` + role checkbox
- [ ] `SystemSettingsPage`: `SectionCard` + slider/input + toggle lock + alert auto-dismiss
- [ ] Tutup modal dengan tombol Esc (`useEffect` → `window.addEventListener('keydown')`)
- [ ] Semua error via `formatErrorMessage(err, fallback, user)`
- [ ] Daftarkan 4 route di `App.jsx` dalam `ProtectedRoute`

---

## 13. Tabel Referensi Pola

| Pola | Sumber di Aplikasi | Berlaku Untuk |
|---|---|---|
| Modal CRUD + Esc key | `RolesPage.jsx`, `UsersPage.jsx` | Semua entitas admin |
| Checkbox multi-select | `RolesPage` (permissions) | Role–Permission, User–Role |
| Dropdown inline search | `UsersPage` (pegawai) | Pilih entitas terkait di form |
| Search bar + API param | `UsersPage` (username search) | Entitas dengan banyak data |
| Toggle switch | `UsersPage` (is_active), `SystemSettingsPage` (lock) | Boolean field apapun |
| `SectionCard` | `SystemSettingsPage` | Pengelompokan setting |
| Alert auto-dismiss | `SystemSettingsPage` | Konfirmasi save sukses/gagal |
| Pagination prev/next | `RolesPage`, `PermissionsPage` | Semua tabel paginasi |
| `require_super_admin` | `roles.py`, `permissions.py` | Mutasi data sensitif |
| `AppSetting` key–value | `app_settings.py` | Konfigurasi runtime (threshold, flag) |
| `getAll` publik | `app_settings.py` GET `/` | Setting yang dibaca frontend tanpa login |

---

## 14. Catatan Keamanan

| Risiko | Mitigasi |
|---|---|
| Password plain text | Selalu bcrypt hash sebelum simpan; **jangan** simpan plain text |
| Endpoint mutasi tanpa guard | Wajib `require_super_admin` / `require_permission(...)` |
| Brute force password | Tambah rate-limit di login endpoint (bukan di role/user CRUD) |
| IDOR — update user lain | Validasi id user milik request (atau hanya super admin) |
| Setting publik terbaca semua | `GET /app-settings/` aman untuk nilai non-sensitif; jangan simpan secret di sini |
| Permission escalation | Role–Permission assignment hanya oleh super admin |
