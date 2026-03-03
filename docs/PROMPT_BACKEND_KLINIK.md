# Prompt Backend Sistem Klinik

> Dokumen ini menjelaskan narasi arsitektur, standar best practice, dan prompt lengkap
> untuk membangun sistem backend baru (contoh: sistem klinik) berdasarkan pola yang
> sudah terbukti baik di sistem absensi RSUD Sulfat ini.

---

## Narasi: Apa yang Sudah Baik di Sistem Ini?

Sistem absensi ini dibangun di atas **FastAPI + Clean Architecture** yang terstruktur
sangat baik. Ada tiga pilar utama yang menjadi kekuatannya:

### 1. Lapisan Arsitektur yang Bersih (Clean Architecture)

Setiap entitas domain memiliki empat lapisan yang terpisah dan independen:

```
Model (SQLAlchemy ORM)
  ↓
Repository (Data Access Layer)
  ↓
Service (Business Logic Layer)
  ↓
Endpoint (HTTP Handler / FastAPI Router)
```

Setiap lapisan hanya boleh berkomunikasi ke lapisan di bawahnya. Ini membuat kode
mudah ditest secara unit, mudah diextend tanpa breaking change, dan tidak ada
ketergantungan silang antar domain.

### 2. Generic Base Class yang Mengurangi Boilerplate

`BaseModel`, `BaseRepository`, `BaseService`, dan `BaseSchema` sudah menghandle
operasi CRUD generik, pagination, soft delete, dan timestamp. Untuk entitas baru,
cukup inherit dan tambahkan method spesifik — tidak perlu tulis ulang query pagination
atau soft delete dari nol.

### 3. Sistem Keamanan yang Matang

JWT Access + Refresh Token, session tracking per device, dan RBAC berbasis
`resource.action` (contoh: `pasien.read`, `resep.create`) sudah terpola rapi dan
tinggal disesuaikan nama domainnya.

### Standar Lain yang Sudah Solid

| Standar | Implementasi |
|---|---|
| Format response konsisten | `success_response()`, `paginated_response()`, `error_response()` |
| Centralized exception handler | `utils/exception_handlers.py` — 3 handler: HTTP, Validation, General |
| Request traceability | `RequestIDMiddleware` inject `X-Request-ID` UUID ke tiap request |
| Request logging | `RequestLoggingMiddleware` log method, path, status, durasi |
| Background task | APScheduler untuk cleanup session expired |
| Bootstrap admin | Auto-create super admin saat startup jika DB kosong |
| Config management | `pydantic-settings` dari `.env`, dengan `DATABASE_URL_SAFE` untuk logging |
| Docs security | `/docs` dan `/redoc` hanya aktif saat `DEBUG=true` |

---

## Prompt Backend Sistem Klinik

> Prompt ini siap digunakan langsung ke AI coding assistant untuk membangun sistem
> baru dengan standar yang sama.

---

### INSTRUKSI UTAMA

Kamu adalah senior backend engineer. Bangun REST API sistem klinik menggunakan
**FastAPI + PostgreSQL + SQLAlchemy** dengan mengikuti standar dan pola di bawah ini
secara konsisten dari awal hingga selesai.

---

### ARSITEKTUR WAJIB: Clean Architecture 4 Lapis

Setiap entitas domain (Pasien, Dokter, Antrian, Rekam Medis, Resep, dll) **harus**
memiliki file terpisah di masing-masing lapisan:

```
models/              → SQLAlchemy ORM model (tabel DB)
repositories/        → Data access layer (semua query ke DB ada di sini)
services/            → Business logic layer (validasi, kalkulasi, aturan bisnis)
api/v1/endpoints/    → HTTP handler (FastAPI router, hanya terima/kembalikan HTTP)
schemas/             → Pydantic request & response schema
```

**Aturan keras:**
- Endpoint **TIDAK BOLEH** query DB langsung (harus lewat service → repository)
- Service **TIDAK BOLEH** import Router atau apapun dari `api/`
- Repository **TIDAK BOLEH** berisi logika bisnis (hanya query)
- Model **TIDAK BOLEH** berisi logika bisnis atau validasi

---

### STANDAR BASE CLASS

Buat file-file base berikut sekali, lalu semua entitas inherit darinya.
**Jangan buat ulang untuk setiap entitas.**

#### `models/base.py`

```python
class TimestampMixin:
    created_at = Column(DateTime, default=datetime.now, nullable=False)
    updated_at = Column(DateTime, default=datetime.now, onupdate=datetime.now, nullable=False)

class SoftDeleteMixin:
    is_deleted  = Column(Boolean, default=False, nullable=False)
    deleted_at  = Column(DateTime, nullable=True)

    def soft_delete(self): ...
    def restore(self): ...

class BaseModel(Base, TimestampMixin):
    __abstract__ = True
    id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    def to_dict(self): ...
```

Entitas yang perlu soft delete cukup tambahkan `SoftDeleteMixin`:

```python
class Pasien(BaseModel, SoftDeleteMixin):
    __tablename__ = "pasien"
    ...
```

#### `repositories/base.py`

```python
class BaseRepository(Generic[ModelType]):
    def __init__(self, model: Type[ModelType], db: Session): ...
    def get_by_id(self, id: int) -> Optional[ModelType]: ...
    def get_all(self, skip, limit, order_by, order_dir) -> List[ModelType]: ...
    def create(self, data: dict) -> ModelType: ...
    def update(self, id: int, data: dict) -> Optional[ModelType]: ...
    def delete(self, id: int) -> bool: ...
    def count(self, **filters) -> int: ...
```

#### `services/base.py`

```python
class BaseService(Generic[ModelType, RepositoryType]):
    def __init__(self, repository: RepositoryType): ...
    def get_by_id(self, id: int): ...
    def get_all(self, page, limit, **filters): ...
    def create(self, data): ...
    def update(self, id, data): ...
    def delete(self, id): ...
```

#### `schemas/base.py`

```python
class BaseSchema(BaseModel):
    model_config = ConfigDict(
        from_attributes=True,
        populate_by_name=True,
        use_enum_values=True,
        validate_assignment=True,
        str_strip_whitespace=True,
    )

class TimestampSchema(BaseSchema):
    created_at: datetime
    updated_at: datetime

class BaseResponseSchema(TimestampSchema):
    id: int

class PaginationParams(BaseSchema):
    page: int = 1
    limit: int = 10

    @property
    def offset(self) -> int:
        return (self.page - 1) * self.limit
```

---

### STANDAR AUTENTIKASI & OTORISASI

#### JWT Token Strategy

```
Access Token  → expire pendek (15 menit), untuk akses resource
Refresh Token → expire panjang (7 hari), untuk perbarui access token
```

Simpan refresh token di tabel `user_sessions`:

```sql
user_sessions (
    id, user_id, refresh_token, device_info,
    ip_address, user_agent, is_active,
    created_at, expired_at, last_used_at
)
```

#### Role-Based Access Control (RBAC)

Tabel yang dibutuhkan:

```
users ←→ user_roles ←→ roles ←→ role_permissions ←→ permissions
```

Naming convention permission: `resource.action`

```python
# permission_registry.py
PERMISSIONS = {
    # Pasien
    "pasien.read":   "Melihat data pasien",
    "pasien.create": "Mendaftarkan pasien baru",
    "pasien.update": "Mengubah data pasien",
    "pasien.delete": "Menghapus data pasien",
    
    # Dokter
    "dokter.read":   "Melihat data dokter",
    "dokter.create": "Mendaftarkan dokter baru",
    "dokter.update": "Mengubah data dokter",
    "dokter.delete": "Menghapus data dokter",
    
    # Antrian
    "antrian.read":   "Melihat antrian",
    "antrian.create": "Membuat nomor antrian",
    "antrian.update": "Mengubah status antrian",
    "antrian.delete": "Membatalkan antrian",
    
    # Rekam Medis
    "rekam_medis.read":   "Melihat rekam medis",
    "rekam_medis.create": "Membuat rekam medis",
    "rekam_medis.update": "Mengubah rekam medis",
    
    # Resep
    "resep.read":   "Melihat resep",
    "resep.create": "Membuat resep",
    "resep.update": "Mengubah resep",
    
    # Obat / Farmasi
    "obat.read":   "Melihat stok obat",
    "obat.create": "Menambahkan obat",
    "obat.update": "Mengubah data/stok obat",
    "obat.delete": "Menghapus data obat",
}
```

Dependency untuk proteksi endpoint:

```python
# utils/dependencies.py
def require_permission(permission: str):
    def checker(current_user: User = Depends(get_current_user)):
        user_permissions = {p.name for r in current_user.roles for p in r.permissions}
        if permission not in user_permissions:
            raise HTTPException(status_code=403, detail="Akses ditolak")
        return current_user
    return checker

# Penggunaan di endpoint:
@router.get("/pasien")
def list_pasien(user = Depends(require_permission("pasien.read"))):
    ...
```

#### Bootstrap Admin

Saat startup, jika tabel `users` kosong, buat akun super admin dari env variable:

```env
SUPER_ADMIN_USERNAME=admin
SUPER_ADMIN_PASSWORD=<password_kuat>
SUPER_ADMIN_EMAIL=admin@klinik.id
```

---

### STANDAR RESPONSE FORMAT

Semua endpoint **wajib** menggunakan helper dari `utils/response.py`.
**TIDAK BOLEH** return dict arbitrary langsung dari endpoint.

```python
# Single resource
return success_response("Pasien ditemukan", data={"pasien": pasien.to_dict()})

# List dengan pagination
return paginated_response(
    message="Daftar pasien",
    items=[p.to_dict() for p in pasien_list],
    total=total_count,
    page=page,
    limit=limit
)

# Operasi berhasil tanpa data
return success_response("Pasien berhasil dihapus")
```

**Format response standar:**

```json
// Single resource
{
  "success": true,
  "message": "Pasien ditemukan",
  "data": { "pasien": { "id": 1, "nama": "Budi", ... } }
}

// Paginated list
{
  "success": true,
  "message": "Daftar pasien",
  "data": { "items": [...] },
  "meta": { "page": 1, "limit": 10, "total": 100, "total_pages": 10 }
}
```

Error response dihandle **otomatis** oleh exception handler — endpoint tidak perlu
return error secara manual, cukup `raise HTTPException(...)`.

---

### STANDAR MIDDLEWARE & EXCEPTION HANDLER

#### Middleware (urutan pemasangan di `main.py`)

```python
app.add_middleware(RequestIDMiddleware)    # 1. Inject X-Request-ID ke setiap request
app.add_middleware(RequestLoggingMiddleware)  # 2. Log request/response
app.add_middleware(CORSMiddleware, ...)    # 3. CORS
```

`RequestIDMiddleware` — generate UUID per request, attach ke header dan response.
Sangat berguna untuk tracing log di production.

`RequestLoggingMiddleware` — log: method, path, status code, duration (ms), request_id.

#### Exception Handler

```python
# main.py
app.add_exception_handler(StarletteHTTPException, http_exception_handler)
app.add_exception_handler(RequestValidationError, validation_exception_handler)
app.add_exception_handler(Exception, general_exception_handler)
```

`http_exception_handler` — format standar untuk semua 4xx/5xx HTTP error.  
`validation_exception_handler` — format field-level error dari Pydantic (request body invalid).  
`general_exception_handler` — tangkap semua Exception tak terduga, return 500 dengan pesan generik.

---

### STANDAR KONFIGURASI

File `.env`:

```env
# App
APP_NAME=Sistem Klinik
APP_VERSION=1.0.0
ENVIRONMENT=development   # development | production
DEBUG=true

# Database
DATABASE_URL=postgresql://user:password@localhost:5432/klinik_db

# JWT
SECRET_KEY=<random_string_panjang_minimal_32_karakter>
ALGORITHM=HS256
ACCESS_TOKEN_EXPIRE_MINUTES=15
REFRESH_TOKEN_EXPIRE_DAYS=7

# Admin Bootstrap
SUPER_ADMIN_USERNAME=admin
SUPER_ADMIN_PASSWORD=<password_kuat>
SUPER_ADMIN_EMAIL=admin@klinik.id

# CORS
CORS_ORIGINS=["http://localhost:3000","http://localhost:5173"]
```

`config/settings.py` menggunakan `pydantic-settings`:

```python
class Settings(BaseSettings):
    ...
    @property
    def DATABASE_URL_SAFE(self) -> str:
        """Sembunyikan password untuk logging"""
        return re.sub(r':([^:@]+)@', ':***@', self.DATABASE_URL)
```

---

### STANDAR STARTUP & SHUTDOWN

Gunakan `@asynccontextmanager` lifespan di `main.py`:

```python
@asynccontextmanager
async def lifespan(app: FastAPI):
    # === STARTUP ===
    logger.info(f"Starting {settings.APP_NAME} v{settings.APP_VERSION}")
    logger.info(f"Environment: {settings.ENVIRONMENT}")
    logger.info(f"Database: {settings.DATABASE_URL_SAFE}")

    if check_database_connection():
        bootstrap_super_admin()   # Buat admin jika belum ada
        start_scheduler()         # Mulai background task
    else:
        logger.warning("DB connection failed — app will start but may not work properly")

    yield

    # === SHUTDOWN ===
    stop_scheduler()
    engine.dispose()
    logger.info("Application shutdown complete")
```

Background task yang umum untuk sistem klinik (via APScheduler):
- Cleanup session expired setiap jam
- Notifikasi antrian (opsional)
- Backup data harian (opsional)

---

### STANDAR STRUKTUR DIREKTORI

```
backend/
├── main.py                      ← entry point, lifespan, middleware, router mount
├── run.py                       ← uvicorn runner untuk development
├── requirements.txt
├── requirements-test.txt
├── pytest.ini
├── Dockerfile
├── .env.example
│
├── api/
│   └── v1/
│       ├── router.py            ← include semua endpoint router di sini
│       └── endpoints/
│           ├── __init__.py
│           ├── auth.py
│           ├── pasien.py
│           ├── dokter.py
│           ├── poli.py
│           ├── antrian.py
│           ├── rekam_medis.py
│           ├── resep.py
│           └── obat.py
│
├── models/
│   ├── __init__.py
│   ├── base.py                  ← BaseModel, TimestampMixin, SoftDeleteMixin
│   ├── user.py
│   ├── role.py
│   ├── permission.py
│   ├── user_session.py
│   ├── pasien.py
│   ├── dokter.py
│   ├── poli.py
│   ├── antrian.py
│   ├── rekam_medis.py
│   ├── resep.py
│   └── obat.py
│
├── repositories/
│   ├── base.py                  ← BaseRepository[ModelType]
│   ├── user_repository.py
│   ├── user_session_repository.py
│   ├── pasien_repository.py
│   ├── dokter_repository.py
│   └── ... (satu file per domain)
│
├── services/
│   ├── base.py                  ← BaseService[ModelType, RepositoryType]
│   ├── auth_service.py
│   ├── pasien_service.py
│   ├── dokter_service.py
│   └── ... (satu file per domain)
│
├── schemas/
│   ├── base.py                  ← BaseSchema, BaseResponseSchema, PaginationParams
│   ├── auth.py
│   ├── pasien.py
│   ├── dokter.py
│   └── ... (satu file per domain)
│
├── config/
│   ├── settings.py              ← pydantic-settings dari .env
│   └── database.py              ← engine, SessionLocal, get_db(), check_connection()
│
├── utils/
│   ├── auth.py                  ← JWT helpers: create_token, decode_token, hash_password
│   ├── dependencies.py          ← get_current_user(), require_permission(), get_db()
│   ├── response.py              ← success_response(), paginated_response(), error_response()
│   ├── middleware.py            ← RequestIDMiddleware, RequestLoggingMiddleware
│   ├── exception_handlers.py   ← 3 handler: HTTP, Validation, General
│   ├── logger.py                ← structured logger (JSON format untuk production)
│   ├── permission_registry.py  ← dictionary semua permission valid
│   ├── bootstrap_admin.py      ← auto-create super admin saat startup
│   └── scheduler.py            ← APScheduler setup, start_scheduler(), stop_scheduler()
│
├── tests/
│   ├── conftest.py              ← fixtures: test DB, test client, test user
│   ├── test_auth.py
│   ├── test_pasien.py
│   └── ... (mirror struktur src)
│
└── alembic/                     ← database migration (UPGRADE dari sistem lama)
    ├── env.py
    ├── alembic.ini
    └── versions/
```

---

### DOMAIN ENTITAS KLINIK

Buat entitas berikut, masing-masing dengan 4 lapisan penuh:

| Entitas | Tabel | Deskripsi |
|---|---|---|
| `Pasien` | `pasien` | Data demografis pasien (nama, NIK, tgl lahir, alamat, no_hp) |
| `Dokter` | `dokter` | Data dokter (nama, SIP, spesialisasi, jadwal_praktik) |
| `Poli` | `poli` | Unit/poliklinik (nama, lantai, kapasitas_antrian) |
| `Antrian` | `antrian` | Nomor antrian per poli per hari (no_antrian, status, tgl_antrian) |
| `RekamMedis` | `rekam_medis` | Rekam medis per kunjungan (keluhan, diagnosa, catatan_dokter) |
| `Resep` | `resep` | Resep obat per rekam medis |
| `ResepItem` | `resep_item` | Detail item resep (obat, dosis, jumlah, aturan_pakai) |
| `Obat` | `obat` | Master data + stok obat (nama, satuan, stok, harga) |

---

### TEKNOLOGI & DEPENDENCY

```txt
# requirements.txt
fastapi>=0.110.0
uvicorn[standard]>=0.27.0
sqlalchemy>=2.0.0
psycopg2-binary>=2.9.9
pydantic>=2.6.0
pydantic-settings>=2.2.0
python-jose[cryptography]>=3.3.0
passlib[bcrypt]>=1.7.4
python-multipart>=0.0.9
apscheduler>=3.10.4
alembic>=1.13.0

# requirements-test.txt
pytest>=8.0.0
pytest-asyncio>=0.23.0
httpx>=0.27.0
```

---

### UPGRADE DARI SISTEM REFERENSI

Beberapa hal yang direkomendasikan sebagai perbaikan dibanding sistem absensi:

| Aspek | Sistem Absensi (Referensi) | Rekomendasi Sistem Klinik |
|---|---|---|
| DB Migration | Manual / `create_all` | **Alembic** — versioned, reversible migration |
| Testing | pytest dasar | pytest + fixtures + `TestClient` + coverage 80%+ |
| Validasi bisnis | Di service | Service + Pydantic `@field_validator` |
| Audit log | Tidak ada | Tabel `audit_log` — catat siapa ubah apa kapan |
| Rate limiting | Tidak ada | `slowapi` untuk endpoint login & publik |
| Logging format | Plain text | **Structured JSON logging** untuk production |
| DB query N+1 | Beberapa endpoint | Selalu gunakan `joinedload` / `selectinload` |

---

### CHECKLIST SEBELUM PRODUCTION

- [ ] `DEBUG=false` di `.env` production
- [ ] `SECRET_KEY` minimal 32 karakter random, disimpan di secret manager
- [ ] CORS `allow_origins` tidak menggunakan wildcard `*`
- [ ] Semua endpoint sensitif dilindungi `require_permission()`
- [ ] Database tidak menggunakan user `postgres` langsung (buat user khusus)
- [ ] Alembic migration sudah di-run, bukan `create_all`
- [ ] Health check endpoint `/health` aktif untuk load balancer
- [ ] Logging diarahkan ke file / log aggregator (bukan hanya stdout)
- [ ] Rate limiting aktif di endpoint `/auth/login`
- [ ] Dockerfile menggunakan non-root user

---

*Dokumen ini dibuat berdasarkan analisis arsitektur backend sistem absensi RSUD Sulfat.*  
*Tanggal: 2 Maret 2026*
