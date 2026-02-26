# Sistem Absensi RSUD Sulfat

Sistem manajemen absensi pegawai berbasis web — terdiri dari **backend API (FastAPI)** dan **frontend admin dashboard (React)**.

- **Backend API**: `http://192.168.30.21:8000`
- **Admin Dashboard**: `http://192.168.30.21:3000`
- **Swagger Docs**: `http://192.168.30.21:8000/docs`

---

## Struktur Repositori

```
fast-absen/
├── backend/        # FastAPI — REST API, business logic, database
├── frontend/       # React — Admin dashboard SPA
├── database/       # Docker Compose + init SQL
└── README.md       # (file ini)
```

---

## Quick Start

### 1. Database (PostgreSQL via Docker)

```bash
cd database
docker-compose up -d
```

### 2. Backend

```bash
cd backend
python -m venv venv
source venv/bin/activate
pip install -r requirements.txt

# Salin dan sesuaikan .env
cp .env.example .env
# Port Already in Use
lsof -ti:8000 | xargs kill -9  # Kill process
# Jalankan server
python run.py
# → http://192.168.30.21:8000


```

### 3. Frontend

```bash
cd frontend
npm install
npm run dev
# → http://192.168.30.21:3000
```

### Default Credentials

```
Username: admin
Password: admin123
```

---

## Backend

### Tech Stack

| Komponen | Teknologi | Versi |
|---|---|---|
| Framework | FastAPI | 0.109.0 |
| ORM | SQLAlchemy | 2.0.25 |
| Validasi | Pydantic | 2.5.3 |
| Database | PostgreSQL | 16 |
| Server | Uvicorn | 0.27.0 |
| Python | Python | 3.11+ |

### Arsitektur (Clean Architecture)

```
Client Request
    ↓
Middleware (RequestID, Logging)
    ↓
Endpoint  (api/v1/endpoints/*.py)
    ↓
Service   (services/*_service.py)      ← Business logic
    ↓
Repository (repositories/*_repository.py) ← Data access
    ↓
Database  (PostgreSQL)
```

### Struktur Folder Backend

```
backend/
├── api/v1/
│   ├── endpoints/          # Satu file per resource
│   └── router.py
├── models/                 # SQLAlchemy models
├── schemas/                # Pydantic schemas (request/response)
├── repositories/           # Data access layer
├── services/               # Business logic layer
├── utils/
│   ├── dependencies.py     # require_permission, get_current_user
│   ├── permission_registry.py  # Sumber kebenaran permission keys
│   ├── response.py         # success_response wrapper
│   └── errorHandler / middleware / logger
├── config/
│   ├── settings.py
│   └── database.py
├── docs/                   # Dokumentasi teknis & operasional
├── scripts/                # sync_permissions.py, dll
├── tests/
├── main.py
├── run.py
└── requirements.txt
```

### Fitur Backend

- **RBAC** — Role-based access control via `require_permission` dependency
- **Auth contract** — Login/refresh mengembalikan `roles`, `permissions`, `menu_guard`
- **menu_guard** — Sumber kebenaran tunggal untuk visibilitas menu frontend
- **Roster import pipeline** — Excel upload → validate → idempotent import
- **Shift evaluation engine** — Evaluasi roster vs absensi (late/early/mangkir/missing-checkout)
- **Approval workflow** — Pengajuan koreksi + assigned approver + audit log
- **KPI unit/role** — Scope-aware: admin lintas unit, ka-unit scope unit sendiri
- **Excel template + import** — Download template & bulk import untuk Pegawai, Users, Shift Pegawai
- **Session management** — Heartbeat tracking, force-logout, cleanup expired
- **Auto bootstrap super-admin** — Buat/update admin dari `.env` saat startup

### Endpoint Utama

| Prefix | Resource |
|---|---|
| `/auth` | Login, refresh token, logout |
| `/users` | Manajemen user + Excel import |
| `/roles` | Manajemen role (super-admin) |
| `/permissions` | Manajemen permission (super-admin) |
| `/pegawai` | Data pegawai + Excel import |
| `/unit` | Manajemen unit |
| `/shift-kelompok` | Master kelompok shift |
| `/shift-kelompok-aturan` | Aturan jam shift per kelompok |
| `/pegawai-shift-kelompok` | Assignment shift pegawai + Excel import |
| `/roster-upload-batch` | Upload roster bulanan dari Excel |
| `/roster-shift` | Data roster shift |
| `/penilaian-shift-absensi` | Evaluasi shift vs absensi |
| `/approval-pengajuan-absensi` | Workflow koreksi absensi |
| `/absensi` | Data absensi (monitoring + admin) |
| `/user-sessions` | Monitor sesi aktif |
| `/stats` | Statistik & KPI unit/role |

### Format Response

```json
{
  "success": true,
  "message": "Operation successful",
  "data": { "items": [], "total": 0, "skip": 0, "limit": 10 }
}
```

### Permission Registry

```bash
# 1. Tambah key di utils/permission_registry.py
# 2. Sync ke database
python scripts/sync_permissions.py
# 3. Gunakan di endpoint
@router.get("/...", dependencies=[Depends(require_permission(PermissionKeys.KEY))])
```

---

## Frontend

### Tech Stack

| Paket | Versi |
|---|---|
| React | 18.3.1 |
| Vite | 6.4.1 |
| React Router DOM | 6.22.0 |
| Axios | 1.6.7 |
| Tailwind CSS | 3.4.1 |

### Arsitektur (Clean Architecture — 4 Layer)

```
src/
├── core/           # Layer 1 — Entities & konstanta (User, Pegawai, routes, config)
├── data/           # Layer 2 — API client + Repositories (satu file per resource)
├── domain/         # Layer 3 — AuthContext, custom hooks per resource
└── presentation/   # Layer 4 — Pages, Layout, komponen UI
```

### Routing

| Path | Halaman |
|---|---|
| `/` | Landing — pilih portal |
| `/login-admin` | Login admin / ka-unit |
| `/login-absensi` | Login pegawai |
| `/absensi-dashboard` | Dashboard pegawai |
| `/dashboard` | Admin dashboard |
| `/users` | Manajemen user |
| `/roles` | Manajemen role |
| `/permissions` | Manajemen permission |
| `/unit` | Manajemen unit |
| `/pegawai` | Data pegawai |
| `/shift-kelompok` | Master kelompok shift |
| `/shift-aturan` | Aturan shift |
| `/shift-pegawai` | Assignment shift pegawai |
| `/roster-upload` | Upload roster Excel |
| `/roster-shift` | Data roster |
| `/penilaian-shift` | Evaluasi penilaian shift |
| `/absensi` | Monitoring absensi |
| `/sessions-monitor` | Monitor sesi aktif |
| `/approval` | Approval koreksi absensi |
| `/rekap-unit-role` | KPI unit/role |

### Auth & menu_guard

1. Login → `access_token` disimpan di `localStorage`, `refresh_token` di HTTP-only cookie
2. Interceptor 401 → auto-refresh token → sync state via event `auth:user-refreshed`
3. `menu_guard` dari backend menentukan:
   - `is_admin` — tampilkan menu manajemen data
   - `is_kepala_unit` — tampilkan panel ka-unit di dashboard
   - `menus.*.visible` — visibilitas setiap item sidebar
   - `menus.kpi_unit_role.endpoint` — endpoint KPI yang dipakai

### Dashboard 3-Varian

- **Admin** (`is_admin = true`) — statistik sistem + quick links
- **Ka-unit** (`is_kepala_unit = true`) — KPI unit + daftar approval pending
- **User biasa** — info user login

### Fitur Excel Import

| Halaman | Template | Import |
|---|---|---|
| Pegawai | `GET /pegawai/template/download` | `POST /pegawai/import` |
| Users | `GET /users/template/download` | `POST /users/import` |
| Shift Pegawai | `GET /pegawai-shift-kelompok/template/download` | `POST /pegawai-shift-kelompok/import` |

Modal import: step guide → file picker → kartu hasil (success/fail/total) + tabel error per baris.

---

## Konfigurasi Environment

### Backend (`.env`)

```bash
ENVIRONMENT=development
DEBUG=true
SECRET_KEY=your-secret-key

HOST=0.0.0.0
PORT=8000

POSTGRES_HOST=192.168.30.21
POSTGRES_PORT=5432
POSTGRES_DB=attendance_db
POSTGRES_USER=sultan
POSTGRES_PASSWORD=your-password

CORS_ORIGINS=http://localhost:3000,http://192.168.30.21:3000

# Bootstrap super-admin
ADMIN_USERNAME=admin
ADMIN_PASSWORD=admin123
ADMIN_NAMA=Admin Super
```

### Frontend (`.env`)

```bash
VITE_API_BASE_URL=http://192.168.30.21:8000/api/v1
VITE_APP_TITLE=Admin Dashboard - Sistem Absensi RSUD Sulfat
```

---

## Dokumentasi Teknis

| File | Isi |
|---|---|
| [backend/docs/API_ENDPOINTS.md](backend/docs/API_ENDPOINTS.md) | Kontrak lengkap semua endpoint |
| [backend/docs/ADMIN_GUIDE.md](backend/docs/ADMIN_GUIDE.md) | Panduan operasional administrator |
| [backend/docs/CLEAN_ARCHITECTURE_GUIDE.md](backend/docs/CLEAN_ARCHITECTURE_GUIDE.md) | Tutorial tambah entity baru |
| [backend/docs/PERMISSIONS_GUIDE.md](backend/docs/PERMISSIONS_GUIDE.md) | Panduan RBAC & role permissions |
| [backend/docs/JWT_AUTHENTICATION.md](backend/docs/JWT_AUTHENTICATION.md) | Detail implementasi JWT |
| [backend/docs/RESPONSE_FORMAT.md](backend/docs/RESPONSE_FORMAT.md) | Standar format response |
| [backend/README.md](backend/README.md) | README backend lengkap |
| [frontend/README.md](frontend/README.md) | README frontend lengkap |

---

## Troubleshooting

| Gejala | Solusi |
|---|---|
| Backend tidak bisa connect DB | `docker ps` — pastikan container DB running |
| Port 8000 sudah terpakai | `lsof -ti:8000 \| xargs kill -9` |
| 401 terus-menerus di frontend | `localStorage.clear()` lalu login ulang |
| Menu sidebar tidak muncul | Cek `menu_guard` di response login (DevTools → Network) |
| 403 KPI dashboard | Tambahkan permission `penilaian_shift_absensi.read` ke role |
| Import Excel gagal | Pastikan kolom sesuai template; kode shift/role harus ada di master data |
| Foto pegawai tidak muncul | Cek CORS setting + `foto_url` di Network tab |

---

*Last updated: 22 Februari 2026*
