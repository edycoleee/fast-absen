# FastAPI Clean Architecture - Absensi System

Modern attendance system backend built with FastAPI using Clean Architecture principles.

---

## 📋 Table of Contents
- [Features](#features)
- [Tech Stack](#tech-stack)
- [Quick Start](#quick-start)
- [Project Structure](#project-structure)
- [Configuration](#configuration)
- [Development](#development)
- [API Documentation](#api-documentation)
- [Architecture](#architecture)
- [Permission Registry](#permission-registry)
- [Response Format](#response-format)
- [Logging](#logging)
- [Testing](#testing)

---

## 🚀 Features

### Core Features
- ✅ **Clean Architecture** - Separation of concerns (Controller → Service → Repository → Model)
- ✅ **RBAC (Role-Based Access Control)** - Comprehensive role & permission system
- ✅ **Attendance Management** - Check-in/out with GPS validation
- ✅ **Roster Import Pipeline** - Excel import with validation, idempotency, and conflict detection
- ✅ **Shift Evaluation Engine** - Evaluate roster vs absensi for late/early/mangkir/missing-checkout
- ✅ **Approval Workflow** - Pengajuan koreksi dengan assigned approver + audit log
- ✅ **KPI Unit/Role** - Rekap unit-role with scope-aware access (`all-unit` / `my-unit`)
- ✅ **Soft Delete** - Safe data deletion with restore capability
- ✅ **Pagination & Search** - Efficient data retrieval
- ✅ **Request Tracking** - Unique request ID for distributed tracing

### Production-Ready Features
- 🔒 **Environment-Based Config** - Development/Staging/Production modes
- 📊 **Health Checks** - Database connectivity monitoring
- 📝 **Rotating Logs** - Prevent disk space issues (10MB max, 5 backups)
- 🔍 **Request Logging** - Automatic HTTP request/response logging
- 📌 **Auth Guard Contract** - Login/refresh returns `roles`, `permissions`, and `menu_guard`
- 🧭 **Scope Guarding** - `admin/super-admin` cross-unit, `ka-unit` own-unit scope
- 🛡️ **Error Handling** - Production-safe error messages
- ⚡ **Database Pooling** - Connection pool optimization
- 🌐 **CORS Configuration** - Environment-based origin whitelist
- 📖 **Auto API Docs** - OpenAPI (Swagger) documentation

---

## 📌 Current Delivery Status (Feb 2026)

- ✅ **P0 complete**: import roster end-to-end, evaluate engine, approval resolver, idempotent re-run safety
- ✅ **P1-1 complete**: KPI endpoint `/stats/kpi/unit-role` + `/stats/kpi/unit-role/my-unit`
- ✅ **P1-2 complete**: monitoring filters production-ready (`start_date,end_date,id_pegawai,id_unit,shift,status`)
- ✅ **P1-3 complete**: stronger auditability (`watermark`, approval/audit details, override metadata)
- ✅ **P1-4 complete (API freeze & docs freeze)**: contract stabilized for frontend
- ✅ **W2 test gate pass**: endpoint E2E import → evaluate → approval + negative tests (invalid header/overlap)
- ✅ **Endpoint regression**: `133 passed`

---

## 🛠️ Tech Stack

| Component | Technology | Version |
|-----------|------------|---------|
| **Framework** | FastAPI | 0.109.0 |
| **ORM** | SQLAlchemy | 2.0.25 |
| **Validation** | Pydantic | 2.5.3 |
| **Database** | PostgreSQL | 16 |
| **Server** | Uvicorn | 0.27.0 |
| **Python** | Python | 3.11+ |

---

## 🏁 Quick Start

### 1. Install Dependencies
```bash
cd backend
python -m venv venv
source venv/bin/activate  # Linux/Mac
# or
venv\Scripts\activate     # Windows

pip install -r requirements.txt
```

### 2. Setup Environment
```bash
cp .env.example .env
# Edit .env dengan konfigurasi Anda
```

### 3. Start Database (Docker)
```bash
cd ../database
docker-compose up -d
```

### 4. Run Application
```bash
# Method 1: Using run.py (recommended)
python run.py

# Method 2: Direct uvicorn
uvicorn main:app --reload --host 0.0.0.0 --port 8000
```

### 5. Access API
- **Swagger Docs**: http://localhost:8000/docs
- **ReDoc**: http://localhost:8000/redoc
- **Health Check**: http://localhost:8000/health

---

## 📁 Project Structure

```
backend/
├── api/
│   └── v1/
│       ├── endpoints/          # API endpoints
│       │   └── halo.py         # Contoh endpoint
│       └── router.py           # Main API router
├── config/
│   ├── database.py             # Database configuration
│   └── settings.py             # Application settings
├── models/
│   └── base.py                 # Base models + mixins
├── schemas/
│   ├── base.py                 # Base schemas
│   └── halo.py                 # Example schemas
├── repositories/
│   └── base.py                 # Generic repository (CRUD)
├── services/
│   ├── base.py                 # Generic service
│   └── halo_service.py         # Example service
├── utils/
│   ├── constants.py            # Constants & enums
│   ├── dependencies.py         # FastAPI dependencies
│   ├── exception_handlers.py   # Exception handlers
│   ├── logger.py               # Logging config
│   ├── middleware.py           # Custom middleware
│   └── response.py             # Response utilities
├── docs/
│   ├── CLEAN_ARCHITECTURE_GUIDE.md  # Implementation guide
│   ├── IMPROVEMENTS.md              # Architecture improvements
│   └── RESPONSE_FORMAT.md           # API response standards
├── logs/                       # Auto-generated logs
├── .env                        # Environment variables
├── .env.example                # Environment template
├── main.py                     # Application entry
├── run.py                      # Dev server
└── requirements.txt            # Dependencies
```

---

## ⚙️ Configuration

### Environment Variables

```bash
# Application
APP_NAME="Fast Absen API"
ENVIRONMENT=development  # development, staging, production
DEBUG=true
SECRET_KEY=your-secret-key

# Server
HOST=0.0.0.0
PORT=8000

# Database
DATABASE_HOST=localhost
DATABASE_PORT=5432
DATABASE_NAME=fast_absen
DATABASE_USER=postgres
DATABASE_PASSWORD=yourpassword

# CORS
CORS_ORIGINS=http://localhost:3000,http://localhost:5173

# Logging
LOG_LEVEL=DEBUG
LOG_DIR=logs
```

### IP, Database, and CORS Settings

Gunakan acuan berikut supaya IP server, database, dan frontend konsisten.

**Backend (.env)**

```bash
# Server API
HOST=0.0.0.0
PORT=8000

# Database (PostgreSQL)
POSTGRES_HOST=192.168.30.21
POSTGRES_PORT=5432
POSTGRES_DB=attendance_db
POSTGRES_USER=sultan
POSTGRES_PASSWORD=your-password

# CORS (Frontend origins yang diizinkan)
CORS_ORIGINS=http://localhost:3000,http://localhost:5173,http://localhost:8080,http://192.168.30.21:3000
```

**Frontend (.env)**

```bash
# Base URL API (wajib sesuai IP server backend)
VITE_API_BASE_URL=http://192.168.30.21:8000/api/v1
```

**Frontend Vite Proxy (vite.config.js)**

```js
server: {
  proxy: {
    '/api': {
      target: 'http://192.168.30.21:8000',
      changeOrigin: true,
      rewrite: (path) => path.replace(/^\/api/, '/api/v1')
    }
  }
}
```

**Catatan penting**

- `CORS_ORIGINS` harus memuat origin frontend yang dipakai (IP:PORT).
- Jika IP backend berubah, sesuaikan `VITE_API_BASE_URL` dan target proxy.
- Endpoint health berada di root backend: `GET http://<server-ip>:8000/health/detail`.

### Environment Modes

| Mode | Debug | Docs | Log Level | CORS |
|------|-------|------|-----------|------|
| **development** | ✅ | ✅ | DEBUG | Permissive |
| **staging** | ✅ | ✅ | INFO | Restricted |
| **production** | ❌ | ❌ | WARNING | Restricted |

---

## 💻 Development

### Create New Entity (CRUD)

Lihat [Clean Architecture Guide](docs/CLEAN_ARCHITECTURE_GUIDE.md) untuk tutorial lengkap.

**Quick Steps:**
1. Create Model (`models/lokasi.py`) - Inherit dari `BaseModelWithSoftDelete`
2. Create Schemas (`schemas/lokasi.py`) - Request/Response
3. Create Repository (`repositories/lokasi_repository.py`) - Inherit dari `BaseRepository`
4. Create Service (`services/lokasi_service.py`) - Inherit dari `BaseService`
5. Create Endpoint (`api/v1/endpoints/lokasi.py`) - Router
6. Register Router (`api/v1/router.py`)

✅ **Semua CRUD operations sudah otomatis dari base classes!**

---

## 📖 API Documentation

### Key Contracts (Frozen)

- **Auth contract**
  - `POST /api/v1/auth/login`
  - `POST /api/v1/auth/refresh`
  - response includes: `access_token`, `roles`, `permissions`, `menu_guard`
- **KPI contract**
  - `GET /api/v1/stats/kpi/unit-role`
  - `GET /api/v1/stats/kpi/unit-role/my-unit`
  - includes: `summary`, `detail_karyawan`, `by_unit_employee`, `watermark`, `audit`
- **Monitoring contract**
  - `GET /api/v1/absensi/` with filters and pagination envelope
  - response pagination: `items`, `total`, `skip`, `limit`
- **Roster import contract**
  - `POST /api/v1/roster-upload-batch/import`
  - validation: invalid header/file + duplicate/overlap detection
  - import summary in `data.result` (`valid_rows`, `invalid_rows`, `errors`)

### Health Check Endpoints

```bash
# Quick check
GET /health
# Response: {"status": "healthy"}

# Detailed (with DB check)
GET /health/detail
# Response:
# {
#   "status": "healthy",
#   "database": "connected",
#   "timestamp": "2026-02-12T10:00:00"
# }
```

---

## 🔐 Permission Registry

Aturan utama: **registry → sync → protect endpoint → assign role**.

### 1) Tambah permission di registry
Edit [backend/utils/permission_registry.py](utils/permission_registry.py) dan tambahkan key baru.

```python
PERMISSIONS = {
  "pegawai.export": "Export data pegawai",
  # ...
}

class PermissionKeys:
  PEGAWAI_EXPORT = "pegawai.export"
```

### 2) Sync ke database
Jalankan sync agar permission baru masuk DB dan otomatis diberikan ke super-admin.

```bash
python scripts/sync_permissions.py
```

### 3) Lindungi endpoint dengan permission
Gunakan dependency `require_permission` di endpoint.

```python
from fastapi import APIRouter, Depends
from utils.dependencies import require_permission
from utils.permission_registry import PermissionKeys

router = APIRouter(prefix="/pegawai", tags=["Pegawai"])

@router.get("/export", dependencies=[Depends(require_permission(PermissionKeys.PEGAWAI_EXPORT))])
def export_pegawai():
  # logic export
  return {"ok": True}
```

### 4) Assign permission ke role lain (opsional)
Jika role selain super-admin butuh akses, set lewat UI Roles atau update `role_permissions`.

### Catatan
- Tambah permission baru **selalu** di registry dulu.
- Jangan hapus permission dari DB sebelum endpoint yang pakai permission tersebut dihapus.

---

## 👤 Bootstrap Super Admin (First Run)

Saat backend pertama kali berjalan, sistem akan **membuat/menyetel user super-admin otomatis** dari `backend/.env`.

Tambahkan di [backend/.env](.env):

```bash
ADMIN_USERNAME=admin
ADMIN_PASSWORD=admin123
ADMIN_ID_PEGAWAI=P001
ADMIN_NIP=111
ADMIN_NAMA=Admin Super
ADMIN_JENIS_KELAMIN=L
ADMIN_TEMPAT_LAHIR=Makassar
ADMIN_TANGGAL_LAHIR=1990-01-01
ADMIN_ALAMAT=Alamat admin
ADMIN_STATUS=PNS
```

Catatan:
- `ADMIN_USERNAME` dan `ADMIN_PASSWORD` wajib diisi agar bootstrap berjalan.
- `ADMIN_TANGGAL_LAHIR` menerima format `YYYY-MM-DD` atau `YYYYMMDD`.
- Jika user sudah ada, password akan di-update sesuai env saat backend start.

### Example Endpoints

```bash
# Get all (with pagination)
GET /api/v1/halo?page=1&limit=10&search=query

# Get single
GET /api/v1/halo/1

# Create
POST /api/v1/halo
{"pesan": "Hello"}

# Update
PUT /api/v1/halo/1
{"pesan": "Updated"}

# Delete (soft)
DELETE /api/v1/halo/1?soft=true
```

---

## 🏗️ Architecture

### Clean Architecture Layers

```
┌─────────────────────────────────────┐
│    API Layer (Endpoints)            │  ← HTTP handling
├─────────────────────────────────────┤
│    Service Layer                    │  ← Business logic
├─────────────────────────────────────┤
│    Repository Layer                 │  ← Data access
├─────────────────────────────────────┤
│    Model Layer                      │  ← Database models
└─────────────────────────────────────┘
```

### Request Flow

```
Client Request
    ↓
Middleware (RequestID, Logging)
    ↓
Endpoint (api/v1/endpoints/*.py)
    ↓
Service (services/*_service.py) ← Business validation
    ↓
Repository (repositories/*_repository.py) ← Database
    ↓
Database (PostgreSQL)
```

---

## 📤 Response Format

All API responses follow consistent format:

### Success (Single Resource)
```json
{
  "success": true,
  "message": "Success",
  "data": {
    "id": 1,
    "name": "Item"
  }
}
```

### List (Non-Paginated)
```json
{
  "success": true,
  "message": "Success",
  "data": {
    "items": [...],
    "total": 10
  }
}
```

### Paginated
```json
{
  "success": true,
  "message": "Success",
  "data": {
    "items": [...],
    "total": 100,
    "skip": 0,
    "limit": 10
  }
}
```

**Key Rule:** ✅ `data` is always **object**, never array

See [RESPONSE_FORMAT.md](docs/RESPONSE_FORMAT.md) for details.

---

## 📝 Logging

### Configuration
- **Location**: `logs/` directory
- **Main**: `logs/app.log` (10MB max, 5 backups)
- **Error**: `logs/error.log` (ERROR + CRITICAL)
- **Rotation**: Auto at 10MB

### Request Logging
Every request logged with:
- Request ID (UUID)
- Method & path
- Client IP
- Processing time
- Status code

---

## 🧪 Testing

```bash
# Run all tests
pytest

# With coverage
pytest --cov=. --cov-report=html

# Specific test
pytest tests/test_halo.py
```

---

## 📚 Documentation

- [Clean Architecture Guide](docs/CLEAN_ARCHITECTURE_GUIDE.md) - Implementation tutorial
- [API Endpoints](docs/API_ENDPOINTS.md) - Full endpoint contract and scope notes
- [Admin Guide](docs/ADMIN_GUIDE.md) - Admin operational playbook
- [User Guide](docs/USER_GUIDE.md) - User/pegawai operational guide
- [KA-UNIT Guide](docs/KAUNIT_GUIDE.md) - Kepala unit flow and scope rules
- [Frontend Mapping](docs/DOC_MAPPING_FRONTEND.md) - Route/menu/API mapping contract for FE
- [Response Format](docs/RESPONSE_FORMAT.md) - API response standards
- [Improvements](docs/IMPROVEMENTS.md) - Architecture decisions

---

## 🔧 Troubleshooting

### Database Connection Error
```bash
docker ps  # Check database running
psql -h localhost -U postgres -d fast_absen  # Test connection
```

### Port Already in Use
```bash
lsof -ti:8000 | xargs kill -9  # Kill process
# Or use different port
uvicorn main:app --port 8000
```

---

**Built with ❤️ using FastAPI Clean Architecture**
