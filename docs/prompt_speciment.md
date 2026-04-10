# Prompt AI - Aplikasi Spesimen TTD (FastAPI + PostgreSQL + ReactJS)

Aplikasi pengelolaan tanda tangan elektronik (TTE) karyawan dengan fitur:
- Capture & simpan spesimen TTD karyawan via canvas browser
- Embed TTD ke PDF di koordinat yang ditentukan (mirip TTE Privy/PERURI)
- Audit trail lengkap dan immutable (siapa TTD, kapan, dokumen apa, dari IP mana)
- Auth: JWT (superadmin & user) + API Key (integrasi sistem eksternal)
- RBAC + MenuGuard di frontend
- Upload PDF + download hasil PDF bertanda tangan

> Template ini dibangun di atas pola clean architecture FastAPI + ReactJS yang sudah teruji produksi.

---

## 🏗️ ARSITEKTUR SISTEM

```
[React Frontend]                         [Sistem Eksternal / HRD / SIAD]
  JWT Auth + RBAC + MenuGuard              X-API-Key Header
  SignaturePad (Canvas → PNG)              └── POST /api/v1/pdf/embed
  PDF Preview + Drag-Drop Positioner       └── GET  /api/v1/pdf/download/{id}
  Upload PDF + Download Signed                      ↓
        ↓ Bearer Token                   [FastAPI Backend]
  [FastAPI Backend]                        ├── Auth Layer (JWT / API Key)
    ├── /auth        JWT + refresh         ├── RBAC Dependency
    ├── /users       CRUD + RBAC          ├── Specimen Service (PNG transparan)
    ├── /specimens   capture TTD           ├── PDF Service (PyMuPDF embed)
    ├── /pdf         upload/embed/dl       └── Audit Trail (immutable log)
    ├── /audit-logs  audit trail                    ↓
    └── /api-keys    manage API Key       [PostgreSQL Database]
              ↓                            ├── users
  [PostgreSQL + Alembic]                   ├── specimens
  [Filesystem]                             ├── api_keys
    storage/specimens/    ← PNG TTD        ├── pdf_documents
    storage/documents/                     └── embed_logs (audit trail)
      originals/  ← PDF asli
      signed/     ← PDF hasil TTD
```

---

## 🔐 RBAC ROLES

| Role | Akses |
|------|-------|
| `superadmin` | Semua: CRUD user, lihat semua audit log, manage API keys, lihat semua specimen, embed PDF siapapun |
| `user` | Specimen milik sendiri, upload PDF, embed TTD sendiri, download hasil, lihat audit log sendiri |
| `api_key` | Endpoint terbatas via `X-API-Key`: embed TTD, download hasil (tidak bisa login web) |

---

## 🤖 PROMPT UNTUK AI

```
Buatkan aplikasi pengelolaan spesimen tanda tangan elektronik (TTE) karyawan
dengan FastAPI + PostgreSQL + ReactJS, production-ready, clean architecture.

## Requirements:

### 1. Tech Stack Backend
- FastAPI 0.109.0
- SQLAlchemy 2.0.25 (ORM) + Alembic 1.13.1 (migrations)
- PostgreSQL (psycopg2-binary 2.9.9)
- Pydantic 2.5.3 + pydantic-settings 2.1.0
- python-jose[cryptography] 3.3.0 (JWT)
- passlib[bcrypt] 2.0.0a3 (password hashing)
- PyMuPDF 1.24.0 (PDF processing & embed)
- Pillow 10.2.0 (image processing PNG)
- python-multipart 0.0.9 (file upload)
- Uvicorn 0.27.0
- Python 3.11+

### 1b. Tech Stack Frontend
- React 18.3.1 + Vite 6.0+ + @vitejs/plugin-react-swc
- React Router DOM 6.22.0
- Axios 1.6.7 (dengan JWT interceptor + auto-refresh)
- Tailwind CSS 3.4.1
- react-signature-canvas 1.0.6 (signature pad canvas)
- JavaScript + JSDoc

### 2. Database Schema (PostgreSQL)

#### Tabel: users
```sql
id            SERIAL PRIMARY KEY
username      VARCHAR(100) UNIQUE NOT NULL
email         VARCHAR(255) UNIQUE NOT NULL
full_name     VARCHAR(255) NOT NULL
role          VARCHAR(50) NOT NULL DEFAULT 'user'   -- 'superadmin' | 'user'
department    VARCHAR(100)
position      VARCHAR(100)
password_hash TEXT NOT NULL
is_active     INTEGER NOT NULL DEFAULT 1
created_at    TIMESTAMPTZ DEFAULT NOW()             -- ← TIMESTAMPTZ bukan TIMESTAMP
updated_at    TIMESTAMPTZ DEFAULT NOW()
```

#### Tabel: specimens
```sql
id           SERIAL PRIMARY KEY
user_id      INTEGER NOT NULL REFERENCES users(id)
file_path    TEXT NOT NULL                          -- path file PNG di filesystem
file_size    INTEGER                                -- bytes
width_px     INTEGER                                -- lebar asli (pixels)
height_px    INTEGER                                -- tinggi asli (pixels)
is_active    INTEGER NOT NULL DEFAULT 1             -- soft delete; hanya 1 aktif per user
captured_at  TIMESTAMPTZ DEFAULT NOW()
created_at   TIMESTAMPTZ DEFAULT NOW()
updated_at   TIMESTAMPTZ DEFAULT NOW()
```

#### Tabel: api_keys
```sql
id           SERIAL PRIMARY KEY
name         VARCHAR(100) NOT NULL                  -- label: "Sistem HRD", "SIAD"
key_hash     TEXT NOT NULL                          -- SHA-256 dari raw key (tidak simpan raw)
key_prefix   VARCHAR(10) NOT NULL                   -- 8 karakter awal untuk identifikasi
permissions  TEXT NOT NULL DEFAULT 'pdf:embed'      -- comma-separated permissions
is_active    INTEGER NOT NULL DEFAULT 1
created_by   INTEGER REFERENCES users(id)
last_used_at TIMESTAMPTZ
expires_at   TIMESTAMPTZ                            -- NULL = tidak expired
created_at   TIMESTAMPTZ DEFAULT NOW()
updated_at   TIMESTAMPTZ DEFAULT NOW()
```

#### Tabel: pdf_documents
```sql
id              SERIAL PRIMARY KEY
original_path   TEXT NOT NULL                       -- PDF asli (tidak pernah dimodifikasi)
signed_path     TEXT                                -- PDF hasil TTD (NULL jika belum)
original_name   TEXT NOT NULL                       -- nama asli dari user upload
file_size       INTEGER
page_count      INTEGER
status          VARCHAR(50) DEFAULT 'uploaded'      -- 'uploaded' | 'signed' | 'failed'
uploaded_by     INTEGER REFERENCES users(id)
created_at      TIMESTAMPTZ DEFAULT NOW()
updated_at      TIMESTAMPTZ DEFAULT NOW()
```

#### Tabel: embed_logs (AUDIT TRAIL — IMMUTABLE)
```sql
id              SERIAL PRIMARY KEY
document_id     INTEGER NOT NULL REFERENCES pdf_documents(id)
specimen_id     INTEGER NOT NULL REFERENCES specimens(id)
signed_by_user  INTEGER REFERENCES users(id)        -- NULL jika via API Key
signed_by_api   INTEGER REFERENCES api_keys(id)     -- NULL jika via web JWT
page_number     INTEGER NOT NULL DEFAULT 0
x_percent       FLOAT NOT NULL                      -- posisi X (0.0–1.0 dari lebar halaman)
y_percent       FLOAT NOT NULL                      -- posisi Y (0.0–1.0 dari tinggi halaman)
width_percent   FLOAT NOT NULL                      -- lebar TTD (0.0–1.0)
height_percent  FLOAT NOT NULL                      -- tinggi TTD (0.0–1.0)
ip_address      VARCHAR(45)                         -- IPv4 atau IPv6
user_agent      TEXT
signed_at       TIMESTAMPTZ NOT NULL DEFAULT NOW()  -- ← TIMESTAMPTZ, bukan TIMESTAMP
created_at      TIMESTAMPTZ DEFAULT NOW()
```

> **Catatan TIMESTAMP vs TIMESTAMPTZ:**
> - `TIMESTAMP` — simpan nilai tanpa info timezone; PostgreSQL tidak tahu itu UTC atau lokal
> - `TIMESTAMPTZ` — simpan sebagai UTC di storage, otomatis konversi ke timezone session saat dibaca
> - Selalu gunakan `TIMESTAMPTZ` agar konsisten; backend baca sebagai UTC, frontend konversi ke WIB

### 3. Project Structure Backend

```
backend/
├── main.py
├── run.py
├── alembic.ini
├── alembic/
│   └── versions/
├── .env.example
├── requirements.txt
├── storage/
│   ├── specimens/              ← PNG TTD karyawan (UUID-named)
│   └── documents/
│       ├── originals/          ← PDF asli yang diupload
│       └── signed/             ← PDF hasil TTD
├── config/
│   ├── database.py             ← PostgreSQL engine, get_db, pool config
│   └── settings.py             ← pydantic-settings dari .env
├── models/
│   ├── base.py                 ← Base + BaseModel (id, timestamps, to_dict)
│   ├── user.py
│   ├── specimen.py
│   ├── api_key.py
│   ├── pdf_document.py
│   └── embed_log.py
├── schemas/
│   ├── base.py
│   ├── auth.py
│   ├── user.py
│   ├── specimen.py
│   ├── api_key.py
│   ├── pdf_document.py
│   └── embed_log.py
├── repositories/
│   ├── base.py
│   ├── user_repository.py
│   ├── specimen_repository.py
│   ├── api_key_repository.py
│   ├── pdf_document_repository.py
│   └── embed_log_repository.py
├── services/
│   ├── base.py
│   ├── auth_service.py
│   ├── user_service.py
│   ├── specimen_service.py
│   ├── api_key_service.py
│   ├── pdf_service.py          ← PyMuPDF: preview, embed, validate
│   └── audit_service.py
├── api/
│   └── v1/
│       ├── router.py
│       └── endpoints/
│           ├── auth.py         ← login, refresh, /me
│           ├── users.py        ← CRUD (superadmin)
│           ├── specimens.py    ← capture base64, get aktif, list
│           ├── pdf.py          ← upload, preview PNG, embed, download
│           ├── audit_logs.py   ← list dengan filter role-aware
│           └── api_keys.py     ← create, list, revoke (superadmin)
└── utils/
    ├── constants.py
    ├── dependencies.py         ← get_current_user, require_role, get_api_key_auth, get_hybrid_auth
    ├── exception_handlers.py   ← dengan CORS headers di semua error
    ├── logger.py
    ├── middleware.py
    ├── response.py
    └── security.py             ← JWT encode/decode, bcrypt, generate_api_key
```

### 4. Database Configuration (config/database.py)

```python
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker, Session
from config.settings import settings
from utils.logger import logger

DATABASE_URL = settings.DATABASE_URL

engine = create_engine(
    DATABASE_URL,
    pool_size=10,           # koneksi persistent di pool
    max_overflow=20,        # koneksi tambahan saat pool penuh
    pool_pre_ping=True,     # cek koneksi sebelum pakai (kritis untuk PostgreSQL idle)
    pool_recycle=3600,      # recycle koneksi setiap 1 jam
    echo=settings.SQLALCHEMY_ECHO,
)

SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)


def get_db() -> Session:
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


def check_database_connection() -> bool:
    try:
        with engine.connect():
            logger.info("Database connection successful")
            return True
    except Exception as e:
        logger.error(f"Database connection failed: {e}")
        return False


def get_database_info() -> dict:
    return {
        "database": DATABASE_URL.split("@")[-1],
        "type": "PostgreSQL",
    }

# CATATAN: Tidak ada create_all() di sini.
# Gunakan: alembic upgrade head
# Setiap perubahan schema = alembic revision --autogenerate
```

### 5. Security Utilities (utils/security.py)

```python
import hashlib
import secrets
from datetime import datetime, timedelta, timezone
from typing import Optional

from jose import JWTError, jwt
from passlib.context import CryptContext
from config.settings import settings

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")


def hash_password(password: str) -> str:
    return pwd_context.hash(password)


def verify_password(plain: str, hashed: str) -> bool:
    return pwd_context.verify(plain, hashed)


def create_access_token(data: dict, expires_delta: Optional[timedelta] = None) -> str:
    to_encode = data.copy()
    # Gunakan datetime.now(timezone.utc) — datetime.utcnow() deprecated di Python 3.12+
    now = datetime.now(timezone.utc)
    expire = now + (expires_delta or timedelta(minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES))
    to_encode.update({"exp": expire, "iat": now, "type": "access"})
    return jwt.encode(to_encode, settings.SECRET_KEY, algorithm=settings.JWT_ALGORITHM)


def create_refresh_token(data: dict) -> str:
    to_encode = data.copy()
    now = datetime.now(timezone.utc)
    expire = now + timedelta(days=settings.REFRESH_TOKEN_EXPIRE_DAYS)
    to_encode.update({"exp": expire, "iat": now, "type": "refresh"})
    return jwt.encode(to_encode, settings.SECRET_KEY, algorithm=settings.JWT_ALGORITHM)


def decode_token(token: str) -> Optional[dict]:
    try:
        return jwt.decode(token, settings.SECRET_KEY, algorithms=[settings.JWT_ALGORITHM])
    except JWTError:
        return None


def generate_api_key() -> tuple[str, str, str]:
    """
    Return: (raw_key, key_hash, key_prefix)
    - raw_key    → dikirim ke user SEKALI, tidak pernah disimpan
    - key_hash   → SHA-256 hash, disimpan di DB
    - key_prefix → 8 karakter awal untuk identifikasi visual
    """
    raw = f"spesimen_{secrets.token_urlsafe(32)}"
    key_hash = hashlib.sha256(raw.encode()).hexdigest()
    key_prefix = raw[:8]
    return raw, key_hash, key_prefix


def hash_api_key(raw_key: str) -> str:
    return hashlib.sha256(raw_key.encode()).hexdigest()
```

### 6. Auth Dependencies (utils/dependencies.py)

```python
from datetime import datetime, timezone
from typing import Optional

from fastapi import Depends, HTTPException, Header, Query, Request
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from sqlalchemy.orm import Session

from config.database import get_db
from utils.security import decode_token, hash_api_key
from repositories.user_repository import UserRepository
from repositories.api_key_repository import ApiKeyRepository
from models.user import User

security = HTTPBearer(auto_error=False)


def get_current_user(
    credentials: Optional[HTTPAuthorizationCredentials] = Depends(security),
    db: Session = Depends(get_db),
) -> User:
    """Dependency: ambil user dari JWT Bearer token."""
    if not credentials:
        raise HTTPException(status_code=401, detail="Token diperlukan")

    payload = decode_token(credentials.credentials)
    if not payload or payload.get("type") != "access":
        raise HTTPException(status_code=401, detail="Token tidak valid atau expired")

    user_id = payload.get("sub")
    if not user_id:
        raise HTTPException(status_code=401, detail="Token tidak valid")

    user = UserRepository(db).get_by_id(int(user_id))
    if not user or not user.is_active:
        raise HTTPException(status_code=401, detail="User tidak ditemukan atau nonaktif")

    return user


def require_role(*roles: str):
    """Factory dependency: pastikan user punya salah satu role yang diizinkan."""
    def _check(user: User = Depends(get_current_user)) -> User:
        if user.role not in roles:
            raise HTTPException(status_code=403, detail="Akses ditolak: role tidak memiliki izin")
        return user
    return _check


def get_api_key_auth(
    x_api_key: Optional[str] = Header(default=None, alias="X-API-Key"),
    db: Session = Depends(get_db),
):
    """Dependency: validasi API Key dari header X-API-Key."""
    if not x_api_key:
        raise HTTPException(status_code=401, detail="API Key diperlukan")

    key_hash = hash_api_key(x_api_key)
    api_key = ApiKeyRepository(db).get_by_hash(key_hash)

    if not api_key or not api_key.is_active:
        raise HTTPException(status_code=401, detail="API Key tidak valid atau nonaktif")

    if api_key.expires_at and api_key.expires_at < datetime.now(timezone.utc):
        raise HTTPException(status_code=401, detail="API Key sudah expired")

    # Catat last_used_at tanpa block request
    ApiKeyRepository(db).update(api_key.id, {"last_used_at": datetime.now(timezone.utc)})
    return api_key


def get_hybrid_auth(
    x_api_key: Optional[str] = Header(default=None, alias="X-API-Key"),
    credentials: Optional[HTTPAuthorizationCredentials] = Depends(security),
    db: Session = Depends(get_db),
) -> dict:
    """
    Endpoint bisa diakses via JWT (web) ATAU X-API-Key (sistem eksternal).
    Return: {"type": "jwt"|"api_key", "user": User|None, "api_key": ApiKey|None}
    """
    if x_api_key:
        api_key = get_api_key_auth(x_api_key, db)
        return {"type": "api_key", "user": None, "api_key": api_key}

    if credentials:
        user = get_current_user(credentials, db)
        return {"type": "jwt", "user": user, "api_key": None}

    raise HTTPException(status_code=401, detail="Autentikasi diperlukan (Bearer Token atau X-API-Key)")


class CommonQueryParams:
    def __init__(
        self,
        skip: int = Query(default=0, ge=0),
        limit: int = Query(default=50, ge=1, le=200),
        search: Optional[str] = Query(default=None),
    ):
        self.skip = skip
        self.limit = limit
        self.search = search
```

### 7. Auth Endpoints (api/v1/endpoints/auth.py)

```python
from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from config.database import get_db
from config.settings import settings
from utils.security import verify_password, create_access_token, create_refresh_token, decode_token
from utils.dependencies import get_current_user
from utils.response import success_response, error_response
from repositories.user_repository import UserRepository
from schemas.auth import LoginRequest, RefreshRequest

router = APIRouter(prefix="/auth", tags=["auth"])


@router.post("/login")
async def login(body: LoginRequest, db: Session = Depends(get_db)):
    user = UserRepository(db).get_by_username(body.username)

    if not user or not verify_password(body.password, user.password_hash):
        return error_response("Username atau password salah", "AUTH_FAILED", status_code=401)

    if not user.is_active:
        return error_response("Akun nonaktif, hubungi administrator", "ACCOUNT_INACTIVE", status_code=403)

    token_data = {"sub": str(user.id), "role": user.role}
    return success_response("Login berhasil", {
        "access_token": create_access_token(token_data),
        "refresh_token": create_refresh_token(token_data),
        "token_type": "bearer",
        "expires_in": settings.ACCESS_TOKEN_EXPIRE_MINUTES * 60,
        "user": {
            "id": user.id,
            "username": user.username,
            "full_name": user.full_name,
            "role": user.role,
            "department": user.department,
        },
    })


@router.post("/refresh")
async def refresh_token(body: RefreshRequest, db: Session = Depends(get_db)):
    payload = decode_token(body.refresh_token)
    if not payload or payload.get("type") != "refresh":
        return error_response("Refresh token tidak valid atau expired", "INVALID_TOKEN", status_code=401)

    user = UserRepository(db).get_by_id(int(payload["sub"]))
    if not user or not user.is_active:
        return error_response("User tidak valid", "USER_INVALID", status_code=401)

    token_data = {"sub": str(user.id), "role": user.role}
    return success_response("Token diperbarui", {
        "access_token": create_access_token(token_data),
        "token_type": "bearer",
        "expires_in": settings.ACCESS_TOKEN_EXPIRE_MINUTES * 60,
    })


@router.get("/me")
async def me(user=Depends(get_current_user)):
    return success_response("OK", user.to_dict())
```

### 8. PDF Service (services/pdf_service.py)

> **Kenapa PyMuPDF (fitz) dan bukan alternatif lain?**
>
> | Library | Render Quality | Kecepatan | Dependensi eksternal | Lisensi |
> |---|---|---|---|---|
> | **PyMuPDF (fitz)** ✅ | Sangat baik | Tercepat | Tidak ada | AGPL-3.0 |
> | pdf2image + poppler | Terbaik (Ghostscript-level) | Sedang | poppler-utils (apt install) | MIT + GPL |
> | pypdf | Tidak bisa render | — | Tidak ada | BSD |
> | Ghostscript | Terbaik | Lambat | GS binary | AGPL |
>
> **PyMuPDF dipilih** karena: zero external binary dependency, cukup untuk operasional
> tanda tangan (bukan print-quality render), dan paling mudah di-deploy di server tanpa
> akses `apt install`. Jika PDF kompleks dengan embedded CJK font yang tidak render
> dengan benar, upgrade ke `pdf2image + poppler` adalah fallback terbaik.

```python
import uuid
from pathlib import Path

import fitz  # PyMuPDF
# Pillow tidak dipakai di pdf_service — PyMuPDF handle semua render & embed
from config.settings import settings
from utils.logger import logger


class PdfService:
    STORAGE_DIR = Path(settings.STORAGE_DIR)
    ORIGINALS_DIR = STORAGE_DIR / "documents" / "originals"
    SIGNED_DIR = STORAGE_DIR / "documents" / "signed"

    # DPI render untuk preview:
    # - 72 DPI = 1x (terlalu kecil untuk drag-drop akurat)
    # - 108 DPI = 1.5x (minimum acceptable)
    # - 144 DPI = 2x ← DIPAKAI: cukup tajam untuk positioner akurat, ukuran JPEG ~80–150KB
    # - 216 DPI = 3x (terlalu besar, ~500KB+ per halaman)
    PREVIEW_ZOOM = 2.0  # 144 DPI

    def __init__(self):
        self.ORIGINALS_DIR.mkdir(parents=True, exist_ok=True)
        self.SIGNED_DIR.mkdir(parents=True, exist_ok=True)

    def validate_pdf(self, pdf_path: str) -> dict:
        """Validasi PDF: cek apakah bisa dibuka dan tidak terproteksi."""
        try:
            # PENTING: PyMuPDF tidak eksekusi JavaScript dalam PDF — aman dari PDF JS injection
            # fitz.open() adalah thread-safe; tapi fitz.Document OBJECT tidak thread-safe.
            # Setiap request WAJIB buka dokumen sendiri (jangan share Document antar thread).
            with fitz.open(pdf_path) as doc:
                return {
                    "valid": True,
                    "encrypted": doc.is_encrypted,
                    "needs_password": doc.needs_pass,
                    "page_count": len(doc),
                }
        except Exception as e:
            return {"valid": False, "error": str(e)}

    def get_page_info(self, pdf_path: str, page_number: int = 0) -> dict:
        """
        Return dimensi halaman PDF dalam points (72 pts = 1 inch).
        KRITIS untuk positioner: frontend perlu tahu rasio lebar/tinggi PDF asli
        agar koordinat drag-drop persen akurat terhadap PDF, bukan terhadap preview image.

        Contoh A4 portrait: width=595.28 pts, height=841.89 pts
        """
        with fitz.open(pdf_path) as doc:
            if page_number >= len(doc):
                raise ValueError(f"Halaman {page_number} tidak ada")
            page = doc[page_number]
            return {
                "width_pt": round(page.rect.width, 2),
                "height_pt": round(page.rect.height, 2),
                "width_mm": round(page.rect.width * 25.4 / 72, 1),
                "height_mm": round(page.rect.height * 25.4 / 72, 1),
            }

    def render_page_preview(self, pdf_path: str, page_number: int = 0) -> bytes:
        """
        Render halaman PDF menjadi JPEG untuk preview.

        Keputusan teknis:
        - JPEG bukan PNG: ukuran 3–5x lebih kecil, transfer lebih cepat.
          Preview tidak butuh transparency — JPEG cukup.
        - colorspace=fitz.csRGB: eksplisit RGB agar tidak tergantung default fitz.
          Beberapa PDF pakai CMYK (dokumen cetak) — tanpa ini preview bisa salah warna.
        - alpha=False: matikan alpha channel untuk JPEG-compatibility dan hemat RAM.
        - zoom=2.0 (144 DPI): akurat untuk drag-drop positioner, tapi tidak terlalu besar.
        - `with` statement: pastikan dokumen ditutup meski ada exception.
        """
        with fitz.open(pdf_path) as doc:
            if page_number >= len(doc):
                raise ValueError(f"Halaman {page_number} tidak ada (total: {len(doc)})")
            page = doc[page_number]
            mat = fitz.Matrix(self.PREVIEW_ZOOM, self.PREVIEW_ZOOM)
            pix = page.get_pixmap(
                matrix=mat,
                colorspace=fitz.csRGB,  # eksplisit RGB — handle PDF CMYK dengan benar
                alpha=False,            # tidak perlu alpha untuk preview JPEG
            )
            # JPEG quality=85: balance antara kualitas visual dan ukuran file
            return pix.tobytes("jpeg", jpg_quality=85)

    def embed_signature(
        self,
        pdf_path: str,
        specimen_path: str,
        output_path: str,
        page_number: int,
        x_percent: float,
        y_percent: float,
        width_percent: float,
        height_percent: float,
    ) -> str:
        """
        Embed TTD ke PDF di koordinat persentase.

        Sistem koordinat PyMuPDF:
        - Origin (0,0) = top-left halaman
        - Semua nilai 0.0–1.0 relatif terhadap ukuran halaman
        - Konversi: x_pt = x_pct * page_width_in_points

        keep_proportion=False: isi rect persis sesuai kotak yang ditentukan user.
        keep_proportion=True:  TTD tidak distorsi tapi bisa ada ruang kosong di sisi.
        → Gunakan False agar posisi WYSIWYG dengan drag-drop di frontend.

        Return: path output PDF
        """
        with fitz.open(pdf_path) as doc:
            page = doc[page_number]
            pw = page.rect.width    # lebar halaman dalam points (1 inch = 72 pts)
            ph = page.rect.height   # tinggi halaman dalam points

            x0 = x_percent * pw
            y0 = y_percent * ph
            x1 = x0 + (width_percent * pw)
            y1 = y0 + (height_percent * ph)
            rect = fitz.Rect(x0, y0, x1, y1)

            # Gunakan 'with' untuk pastikan file handle tertutup setelah baca
            with open(specimen_path, "rb") as f:
                img_data = f.read()

            # overlay=True: gambar di atas konten yang ada, tidak menimpa teks
            # keep_proportion=False: gambar mengisi rect persis (WYSIWYG)
            page.insert_image(rect, stream=img_data, keep_proportion=False, overlay=True)

            Path(output_path).parent.mkdir(parents=True, exist_ok=True)
            # garbage=4: kompres agresif + hapus objek tidak terpakai
            # deflate=True: kompres stream dengan zlib
            # clean=True: bersihkan syntax PDF yang tidak standar
            doc.save(output_path, garbage=4, deflate=True, clean=True)

            logger.info(f"TTD berhasil di-embed: {output_path}")
            return output_path
```

### 9. Specimen Service (services/specimen_service.py)

```python
import base64
import io
import uuid
from pathlib import Path

from PIL import Image
from config.settings import settings
from repositories.specimen_repository import SpecimenRepository
from models.specimen import Specimen

SPECIMENS_DIR = Path(settings.STORAGE_DIR) / "specimens"
SPECIMENS_DIR.mkdir(parents=True, exist_ok=True)


class SpecimenService:
    def __init__(self, repository: SpecimenRepository):
        self.repository = repository

    def save_from_base64(self, user_id: int, base64_data: str) -> Specimen:
        """
        Terima PNG dari canvas (base64 data URL), simpan sebagai file PNG transparan.
        Input: "data:image/png;base64,iVBORw0KGgo..." (dengan atau tanpa prefix)
        """
        # Strip prefix data URL jika ada
        if "," in base64_data:
            base64_data = base64_data.split(",", 1)[1]

        img_bytes = base64.b64decode(base64_data)
        img = Image.open(io.BytesIO(img_bytes))

        # Pastikan mode RGBA agar transparan saat di-overlay ke PDF
        if img.mode != "RGBA":
            img = img.convert("RGBA")

        # Trim border transparan/putih agar TTD lebih presisi
        bbox = img.getbbox()
        if bbox:
            img = img.crop(bbox)

        width, height = img.size

        filename = f"{uuid.uuid4().hex}.png"
        file_path = SPECIMENS_DIR / filename
        img.save(str(file_path), "PNG", optimize=True)

        # Soft-deactivate specimen lama — hanya 1 aktif per user
        self.repository.deactivate_user_specimens(user_id)

        return self.repository.create({
            "user_id": user_id,
            "file_path": str(file_path),
            "file_size": file_path.stat().st_size,
            "width_px": width,
            "height_px": height,
            "is_active": 1,
        })

    def get_active(self, user_id: int) -> Specimen | None:
        return self.repository.get_active_by_user(user_id)
```

### 10. PDF Endpoints (api/v1/endpoints/pdf.py)

```python
import uuid
from pathlib import Path

from fastapi import APIRouter, Depends, UploadFile, File, Form, Request
from fastapi.responses import FileResponse, Response
from sqlalchemy.orm import Session

from config.database import get_db
from config.settings import settings
from utils.dependencies import get_current_user, get_hybrid_auth
from utils.response import success_response, error_response
from services.pdf_service import PdfService
from repositories.pdf_document_repository import PdfDocumentRepository
from repositories.specimen_repository import SpecimenRepository
from repositories.embed_log_repository import EmbedLogRepository

router = APIRouter(prefix="/pdf", tags=["pdf"])
pdf_svc = PdfService()

ORIGINALS_DIR = Path(settings.STORAGE_DIR) / "documents" / "originals"
SIGNED_DIR = Path(settings.STORAGE_DIR) / "documents" / "signed"


@router.post("/upload")
async def upload_pdf(
    file: UploadFile = File(...),
    user=Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Upload PDF asli. Return document_id untuk dipakai di /embed."""
    if not file.filename.lower().endswith(".pdf"):
        return error_response("Hanya file PDF yang diterima", "INVALID_FILE_TYPE")

    content = await file.read()
    if len(content) > 50 * 1024 * 1024:  # 50MB
        return error_response("File terlalu besar (maks 50MB)", "FILE_TOO_LARGE")

    filename = f"{uuid.uuid4().hex}_original.pdf"
    save_path = ORIGINALS_DIR / filename
    save_path.write_bytes(content)

    validation = pdf_svc.validate_pdf(str(save_path))
    if not validation["valid"] or validation.get("needs_password"):
        save_path.unlink(missing_ok=True)
        return error_response("PDF tidak valid atau terproteksi password", "INVALID_PDF")

    doc = PdfDocumentRepository(db).create({
        "original_path": str(save_path),
        "original_name": file.filename,
        "file_size": len(content),
        "page_count": validation["page_count"],
        "status": "uploaded",
        "uploaded_by": user.id,
    })

    return success_response("PDF berhasil diupload", {
        "document_id": doc.id,
        "original_name": doc.original_name,
        "page_count": doc.page_count,
    }, status_code=201)


@router.get("/preview/{document_id}")
async def preview_page(
    document_id: int,
    page: int = 0,
    user=Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """
    Render halaman PDF menjadi JPEG untuk preview + drag-drop positioner.
    Response: gambar JPEG langsung (bukan JSON) agar bisa di-set sebagai src=... di img tag.
    """
    doc = PdfDocumentRepository(db).get_by_id(document_id)
    if not doc:
        return error_response("Dokumen tidak ditemukan", "NOT_FOUND", status_code=404)

    # User biasa hanya bisa preview dokumen milik sendiri
    if user.role != "superadmin" and doc.uploaded_by != user.id:
        return error_response("Akses ditolak", "FORBIDDEN", status_code=403)

    if page < 0 or page >= (doc.page_count or 1):
        return error_response(f"Halaman {page} tidak ada", "INVALID_PAGE", status_code=400)

    img_bytes = pdf_svc.render_page_preview(doc.original_path, page_number=page)
    return Response(content=img_bytes, media_type="image/jpeg")


@router.get("/page-info/{document_id}")
async def get_page_info(
    document_id: int,
    page: int = 0,
    user=Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """
    Return dimensi halaman PDF dalam points dan mm.
    DIPAKAI oleh frontend PdfPositioner untuk konversi koordinat yang akurat:
    - Drag-drop berjalan di atas image yang sudah di-scale (CSS pixel)
    - PDF asli punya dimensi points (bisa A4, F4, Letter, dll)
    - Frontend perlu tahu rasio width_pt/height_pt untuk verifikasi proporsi positioner
    """
    doc = PdfDocumentRepository(db).get_by_id(document_id)
    if not doc:
        return error_response("Dokumen tidak ditemukan", "NOT_FOUND", status_code=404)
    if user.role != "superadmin" and doc.uploaded_by != user.id:
        return error_response("Akses ditolak", "FORBIDDEN", status_code=403)

    info = pdf_svc.get_page_info(doc.original_path, page_number=page)
    return success_response("Page info", {
        **info,
        "page_count": doc.page_count,
        "preview_zoom": pdf_svc.PREVIEW_ZOOM,  # frontend bisa tahu DPI yang dipakai
    })


@router.post("/embed")
async def embed_signature(
    request: Request,
    document_id: int = Form(...),
    specimen_id: int = Form(None),
    page_number: int = Form(0),
    x_percent: float = Form(...),
    y_percent: float = Form(...),
    width_percent: float = Form(0.2),
    height_percent: float = Form(0.08),
    auth: dict = Depends(get_hybrid_auth),
    db: Session = Depends(get_db),
):
    """
    Embed TTD ke PDF. Bisa via JWT (web) atau X-API-Key (sistem eksternal).
    Koordinat: persentase (0.0–1.0) terhadap ukuran halaman — agnostik terhadap ukuran PDF.
    """
    current_user = auth.get("user")
    current_api_key = auth.get("api_key")

    # Validasi koordinat
    for val, name in [(x_percent, "x"), (y_percent, "y"), (width_percent, "width"), (height_percent, "height")]:
        if not (0.0 <= val <= 1.0):
            return error_response(f"Nilai {name}_percent harus antara 0.0 dan 1.0", "INVALID_COORDINATES")

    doc_repo = PdfDocumentRepository(db)
    doc = doc_repo.get_by_id(document_id)
    if not doc:
        return error_response("Dokumen tidak ditemukan", "NOT_FOUND", status_code=404)

    # JWT user biasa hanya bisa embed dokumen milik sendiri
    if current_user and current_user.role != "superadmin":
        if doc.uploaded_by != current_user.id:
            return error_response("Akses ditolak", "FORBIDDEN", status_code=403)

    # Ambil specimen
    specimen_repo = SpecimenRepository(db)
    if specimen_id:
        specimen = specimen_repo.get_by_id(specimen_id)
    elif current_user:
        specimen = specimen_repo.get_active_by_user(current_user.id)
    else:
        return error_response("specimen_id wajib untuk akses via API Key", "SPECIMEN_REQUIRED")

    if not specimen or not specimen.is_active:
        return error_response("Spesimen TTD tidak ditemukan", "SPECIMEN_NOT_FOUND", status_code=404)

    # Embed ke PDF
    out_filename = f"{uuid.uuid4().hex}_signed.pdf"
    out_path = str(SIGNED_DIR / out_filename)

    pdf_svc.embed_signature(
        pdf_path=doc.original_path,
        specimen_path=specimen.file_path,
        output_path=out_path,
        page_number=page_number,
        x_percent=x_percent,
        y_percent=y_percent,
        width_percent=width_percent,
        height_percent=height_percent,
    )

    doc_repo.update(document_id, {"signed_path": out_path, "status": "signed"})

    # AUDIT TRAIL — catat setiap TTD
    EmbedLogRepository(db).create({
        "document_id": document_id,
        "specimen_id": specimen.id,
        "signed_by_user": current_user.id if current_user else None,
        "signed_by_api": current_api_key.id if current_api_key else None,
        "page_number": page_number,
        "x_percent": x_percent,
        "y_percent": y_percent,
        "width_percent": width_percent,
        "height_percent": height_percent,
        "ip_address": request.client.host if request.client else None,
        "user_agent": request.headers.get("user-agent"),
    })

    return success_response("TTD berhasil di-embed", {
        "document_id": document_id,
        "download_url": f"/api/v1/pdf/download/{document_id}",
    })


@router.get("/download/{document_id}")
async def download_signed_pdf(
    document_id: int,
    auth: dict = Depends(get_hybrid_auth),
    db: Session = Depends(get_db),
):
    """Download PDF yang sudah di-TTD."""
    doc = PdfDocumentRepository(db).get_by_id(document_id)
    if not doc or not doc.signed_path:
        return error_response("Dokumen bertandatangan tidak ditemukan", "NOT_FOUND", status_code=404)

    current_user = auth.get("user")
    if current_user and current_user.role != "superadmin":
        if doc.uploaded_by != current_user.id:
            return error_response("Akses ditolak", "FORBIDDEN", status_code=403)

    return FileResponse(
        path=doc.signed_path,
        filename=f"signed_{doc.original_name}",
        media_type="application/pdf",
    )
```

### 11. Audit Log Endpoint (api/v1/endpoints/audit_logs.py)

```python
from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session
from config.database import get_db
from utils.dependencies import get_current_user
from utils.response import list_response
from repositories.embed_log_repository import EmbedLogRepository

router = APIRouter(prefix="/audit-logs", tags=["audit"])


@router.get("")
async def list_audit_logs(
    skip: int = Query(0, ge=0),
    limit: int = Query(50, ge=1, le=200),
    user_id: int = Query(None),
    document_id: int = Query(None),
    current_user=Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """
    Superadmin: lihat semua log dengan filter opsional.
    User biasa: hanya log TTD milik sendiri (user_id filter diabaikan).
    """
    repo = EmbedLogRepository(db)

    if current_user.role == "superadmin":
        items, total = repo.get_filtered(skip, limit, user_id=user_id, document_id=document_id)
    else:
        items, total = repo.get_filtered(skip, limit, user_id=current_user.id, document_id=document_id)

    return list_response("Audit log berhasil diambil", [i.to_dict() for i in items], total, skip, limit)
```

### 12. API Keys Endpoint (api/v1/endpoints/api_keys.py)

```python
from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from config.database import get_db
from utils.dependencies import require_role
from utils.security import generate_api_key
from utils.response import success_response, error_response, list_response
from repositories.api_key_repository import ApiKeyRepository
from schemas.api_key import ApiKeyCreate

router = APIRouter(prefix="/api-keys", tags=["api-keys"])


@router.post("")
async def create_api_key(
    body: ApiKeyCreate,
    current_user=Depends(require_role("superadmin")),
    db: Session = Depends(get_db),
):
    """
    Generate API Key baru.
    Raw key ditampilkan SEKALI di response — tidak pernah disimpan.
    Instruksikan user menyimpannya sebelum menutup halaman.
    """
    raw_key, key_hash, key_prefix = generate_api_key()

    api_key = ApiKeyRepository(db).create({
        "name": body.name,
        "key_hash": key_hash,
        "key_prefix": key_prefix,
        "permissions": body.permissions or "pdf:embed",
        "expires_at": body.expires_at,
        "created_by": current_user.id,
        "is_active": 1,
    })

    return success_response("API Key berhasil dibuat — simpan key ini, tidak akan ditampilkan lagi", {
        "id": api_key.id,
        "name": api_key.name,
        "key": raw_key,           # ← raw key, hanya muncul SEKALI
        "key_prefix": key_prefix,
        "permissions": api_key.permissions,
        "expires_at": str(api_key.expires_at) if api_key.expires_at else None,
    }, status_code=201)


@router.get("")
async def list_api_keys(
    current_user=Depends(require_role("superadmin")),
    db: Session = Depends(get_db),
):
    items = ApiKeyRepository(db).get_all()
    # Tidak expose key_hash, hanya prefix dan metadata
    data = [{
        "id": k.id, "name": k.name, "key_prefix": k.key_prefix,
        "permissions": k.permissions, "is_active": k.is_active,
        "last_used_at": str(k.last_used_at) if k.last_used_at else None,
        "expires_at": str(k.expires_at) if k.expires_at else None,
        "created_at": str(k.created_at),
    } for k in items]
    return list_response("API Keys", data, len(data))


@router.delete("/{id}")
async def revoke_api_key(
    id: int,
    current_user=Depends(require_role("superadmin")),
    db: Session = Depends(get_db),
):
    """Revoke API Key (soft delete: set is_active=0)."""
    ok = ApiKeyRepository(db).update(id, {"is_active": 0})
    if not ok:
        return error_response("API Key tidak ditemukan", "NOT_FOUND", status_code=404)
    return success_response("API Key di-revoke")
```

### 13. Settings (config/settings.py)

```python
from pydantic_settings import BaseSettings
from typing import Literal


class Settings(BaseSettings):
    APP_NAME: str = "Spesimen TTD"
    APP_VERSION: str = "1.0.0"
    ENVIRONMENT: Literal["development", "staging", "production"] = "development"
    DEBUG: bool = True

    # PostgreSQL
    DATABASE_URL: str = "postgresql://postgres:postgres@localhost:5432/spesimen_db"
    SQLALCHEMY_ECHO: bool = False

    # Server
    HOST: str = "0.0.0.0"
    PORT: int = 8000

    # JWT
    SECRET_KEY: str = "GANTI_DENGAN_SECRET_MINIMAL_32_KARAKTER_RANDOM"
    JWT_ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 60        # 1 jam
    REFRESH_TOKEN_EXPIRE_DAYS: int = 7           # 7 hari

    # Storage
    STORAGE_DIR: str = "storage"

    # Logging
    LOG_LEVEL: str = "INFO"
    LOG_FILE: str = "logs/app.log"

    class Config:
        env_file = ".env"
        case_sensitive = True


settings = Settings()
```

### 14. Requirements.txt

```
fastapi==0.109.0
uvicorn[standard]==0.27.0
sqlalchemy==2.0.25
alembic==1.13.1
psycopg2-binary==2.9.9
pydantic==2.5.3
pydantic-settings==2.1.0
python-jose[cryptography]==3.3.0
passlib[bcrypt]==2.0.0a3
PyMuPDF==1.24.0
Pillow==10.2.0
python-multipart==0.0.9
python-dotenv==1.0.0
```

### 15. .env.example

```
APP_NAME=Spesimen TTD
APP_VERSION=1.0.0
ENVIRONMENT=development
DEBUG=True

DATABASE_URL=postgresql://postgres:postgres@localhost:5432/spesimen_db
SQLALCHEMY_ECHO=False

HOST=0.0.0.0
PORT=8000

SECRET_KEY=GANTI_DENGAN_SECRET_MINIMAL_32_KARAKTER_RANDOM_GUNAKAN_openssl_rand_hex_32
JWT_ALGORITHM=HS256
ACCESS_TOKEN_EXPIRE_MINUTES=60
REFRESH_TOKEN_EXPIRE_DAYS=7

STORAGE_DIR=storage
LOG_LEVEL=INFO
LOG_FILE=logs/app.log
```

---

## 🎨 REACT FRONTEND

### 16. Project Structure Frontend

```
frontend/src/
├── App.jsx
├── main.jsx
├── index.css
│
├── core/
│   └── constants/
│       ├── config.js         # API_BASE_URL, TIMEOUT, STORAGE_KEYS
│       ├── routes.js         # ROUTES object
│       ├── roles.js          # ROLES, PERMISSIONS, MENU_ITEMS dengan role filter
│       └── index.js
│
├── data/
│   ├── api/
│   │   └── client.js         # Axios + JWT Bearer interceptor + auto-refresh
│   ├── repositories/
│   │   ├── BaseRepository.js
│   │   ├── AuthRepository.js
│   │   ├── UserRepository.js
│   │   ├── SpecimenRepository.js
│   │   ├── PdfRepository.js
│   │   ├── AuditLogRepository.js
│   │   ├── ApiKeyRepository.js
│   │   └── index.js
│   └── storage/
│       └── TokenStorage.js   # getAccessToken/getRefreshToken/setTokens/clearAuth
│
├── domain/
│   ├── contexts/
│   │   └── AuthContext.jsx   # JWT AuthProvider + restore session
│   └── hooks/
│       ├── useAuth.js
│       ├── useFetch.js
│       ├── useForm.js
│       └── useNotification.js
│
└── presentation/
    ├── components/
    │   ├── common/
    │   │   ├── Button.jsx
    │   │   ├── Input.jsx        # Input + Select + Textarea
    │   │   ├── Modal.jsx
    │   │   ├── Table.jsx
    │   │   ├── Pagination.jsx
    │   │   ├── Badge.jsx
    │   │   ├── Card.jsx         # Card + StatCard
    │   │   ├── Toast.jsx
    │   │   ├── ConfirmDialog.jsx
    │   │   ├── Loading.jsx
    │   │   ├── PrivateRoute.jsx  # JWT auth + optional role guard
    │   │   └── index.js
    │   ├── guards/
    │   │   └── RoleGuard.jsx    # render children hanya jika role match
    │   └── layout/
    │       ├── AdminLayout.jsx   # Sidebar + Header + ToastContainer + NotifContext
    │       ├── Header.jsx        # info user + logout
    │       └── Sidebar.jsx       # NavLink difilter MenuGuard berdasarkan role
    ├── hooks/
    │   └── useDebounce.js
    ├── utils/
    │   └── format.js
    └── pages/
        ├── auth/
        │   └── LoginPage.jsx
        ├── dashboard/
        │   └── DashboardPage.jsx
        ├── users/
        │   └── UsersPage.jsx         # superadmin only
        ├── specimens/
        │   ├── SpecimenPage.jsx      # capture + preview TTD sendiri
        │   └── SpecimenAdminPage.jsx # superadmin: lihat semua specimen
        ├── pdf/
        │   ├── PdfUploadPage.jsx     # upload PDF
        │   ├── PdfPositionerPage.jsx # drag-drop posisi TTD + embed
        │   └── PdfDocumentsPage.jsx  # daftar dokumen + download
        ├── audit/
        │   └── AuditLogPage.jsx      # superadmin: semua; user: milik sendiri
        ├── api-keys/
        │   └── ApiKeysPage.jsx       # superadmin only — generate, list, revoke
        └── NotFoundPage.jsx
```

### 17. RBAC Constants (core/constants/roles.js)

```javascript
export const ROLES = {
  SUPERADMIN: 'superadmin',
  USER: 'user',
}

export const PERMISSIONS = {
  superadmin: [
    'users:read', 'users:write',
    'specimens:read_all', 'specimens:write',
    'pdf:embed', 'pdf:read_all',
    'audit:read_all',
    'api_keys:manage',
  ],
  user: [
    'specimens:read_own', 'specimens:write_own',
    'pdf:embed', 'pdf:read_own',
    'audit:read_own',
  ],
}

// Menu items dengan role restriction — Sidebar pakai ini
export const MENU_ITEMS = [
  { to: '/dashboard',      label: 'Dashboard',        icon: '📊', roles: ['superadmin', 'user'] },
  { to: '/specimens',      label: 'Spesimen TTD',      icon: '✍️', roles: ['superadmin', 'user'] },
  { to: '/pdf',            label: 'Dokumen PDF',       icon: '📄', roles: ['superadmin', 'user'] },
  { to: '/audit-logs',     label: 'Riwayat TTD',       icon: '📋', roles: ['superadmin', 'user'] },
  { divider: true,         label: '— Admin —',                      roles: ['superadmin'] },
  { to: '/users',          label: 'Kelola User',       icon: '👥', roles: ['superadmin'] },
  { to: '/api-keys',       label: 'API Keys',          icon: '🔑', roles: ['superadmin'] },
  { to: '/specimens/all',  label: 'Semua Spesimen',    icon: '🗂️', roles: ['superadmin'] },
]

export function hasPermission(userRole, permission) {
  return PERMISSIONS[userRole]?.includes(permission) ?? false
}
```

### 18. Token Storage (data/storage/TokenStorage.js)

```javascript
// localStorage — acceptable untuk internal admin app di jaringan terbatas
// Untuk public-facing app: pertimbangkan httpOnly cookie via backend
const KEYS = {
  ACCESS:  'spesimen_access_token',
  REFRESH: 'spesimen_refresh_token',
  USER:    'spesimen_user',
}

export function getAccessToken()  { return localStorage.getItem(KEYS.ACCESS) }
export function getRefreshToken() { return localStorage.getItem(KEYS.REFRESH) }
export function getStoredUser() {
  try { return JSON.parse(localStorage.getItem(KEYS.USER)) } catch { return null }
}

export function setTokens({ access_token, refresh_token }) {
  localStorage.setItem(KEYS.ACCESS, access_token)
  if (refresh_token) localStorage.setItem(KEYS.REFRESH, refresh_token)
}

export function setStoredUser(user) {
  localStorage.setItem(KEYS.USER, JSON.stringify(user))
}

export function clearAuth() {
  Object.values(KEYS).forEach(k => localStorage.removeItem(k))
}
```

### 19. Axios Client + Auto-Refresh JWT (data/api/client.js)

```javascript
import axios from 'axios'
import { CONFIG } from '@/core/constants'
import { getAccessToken, getRefreshToken, setTokens, clearAuth } from '@/data/storage/TokenStorage'

const apiClient = axios.create({
  baseURL: CONFIG.API_BASE_URL,
  timeout: CONFIG.TIMEOUT,
  headers: { 'Content-Type': 'application/json' },
})

// REQUEST: attach JWT token ke setiap request
apiClient.interceptors.request.use((config) => {
  const token = getAccessToken()
  if (token) config.headers.Authorization = `Bearer ${token}`
  return config
})

// Mencegah infinite loop saat refresh berlangsung
let isRefreshing = false
let refreshQueue = []

// RESPONSE: handle 401 dengan auto-refresh token
apiClient.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config

    if (error.response?.status === 401 && !originalRequest._retry) {
      originalRequest._retry = true
      const refreshToken = getRefreshToken()

      if (!refreshToken) {
        clearAuth()
        window.location.href = '/login'
        return Promise.reject(error)
      }

      if (isRefreshing) {
        // Queue request lain menunggu refresh selesai
        return new Promise((resolve, reject) => {
          refreshQueue.push({ resolve, reject })
        }).then(token => {
          originalRequest.headers.Authorization = `Bearer ${token}`
          return apiClient(originalRequest)
        })
      }

      isRefreshing = true
      try {
        const { data } = await axios.post(`${CONFIG.API_BASE_URL}/auth/refresh`, {
          refresh_token: refreshToken,
        })
        const newToken = data.data.access_token
        setTokens({ access_token: newToken })
        refreshQueue.forEach(p => p.resolve(newToken))
        refreshQueue = []
        originalRequest.headers.Authorization = `Bearer ${newToken}`
        return apiClient(originalRequest)
      } catch {
        refreshQueue.forEach(p => p.reject(error))
        refreshQueue = []
        clearAuth()
        window.location.href = '/login'
        return Promise.reject(error)
      } finally {
        isRefreshing = false
      }
    }

    // Normalisasi pesan error dari berbagai format backend
    error.message = error.response?.data?.message || error.message || 'Terjadi kesalahan'
    return Promise.reject(error)
  }
)

export default apiClient
```

### 20. Auth Context JWT (domain/contexts/AuthContext.jsx)

```jsx
import { createContext, useState, useEffect, useCallback } from 'react'
import { AuthRepository } from '@/data/repositories'
import { getStoredUser, setStoredUser, setTokens, clearAuth } from '@/data/storage/TokenStorage'

export const AuthContext = createContext(null)

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null)
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    // Restore session dari localStorage — tidak perlu hit API
    const savedUser = getStoredUser()
    if (savedUser) setUser(savedUser)
    setIsLoading(false)
  }, [])

  const login = useCallback(async (username, password) => {
    const data = await AuthRepository.login(username, password)
    setTokens({ access_token: data.access_token, refresh_token: data.refresh_token })
    setStoredUser(data.user)
    setUser(data.user)
    return data.user
  }, [])

  const logout = useCallback(() => {
    clearAuth()
    setUser(null)
  }, [])

  return (
    <AuthContext.Provider value={{
      user,
      isAuthenticated: !!user,
      isLoading,
      role: user?.role ?? null,
      login,
      logout,
    }}>
      {children}
    </AuthContext.Provider>
  )
}
```

### 21. PrivateRoute + RoleGuard (presentation/components/)

```jsx
// PrivateRoute.jsx — redirect ke login jika belum auth, cek role jika dibutuhkan
import { Navigate, useLocation } from 'react-router-dom'
import { useAuth } from '@/domain/hooks'
import { Loading } from './Loading'

export function PrivateRoute({ children, roles = [] }) {
  const { isAuthenticated, isLoading, role } = useAuth()
  const location = useLocation()

  if (isLoading) return <Loading fullScreen />
  if (!isAuthenticated) return <Navigate to="/login" state={{ from: location }} replace />

  // RBAC: cek role jika disediakan
  if (roles.length > 0 && !roles.includes(role)) {
    return <Navigate to="/403" replace />
  }

  return children
}
```

```jsx
// guards/RoleGuard.jsx — render children hanya jika role match
import { useAuth } from '@/domain/hooks'

export function RoleGuard({ roles = [], fallback = null, children }) {
  const { role } = useAuth()
  if (!roles.includes(role)) return fallback
  return children
}

// Contoh:
// <RoleGuard roles={['superadmin']}><DeleteButton /></RoleGuard>
// <RoleGuard roles={['superadmin']} fallback={<p>Akses terbatas</p>}><AdminPanel /></RoleGuard>
```

```javascript
// MenuGuard — hook untuk filter menu berdasarkan role (dipakai di Sidebar)
import { useAuth } from '@/domain/hooks'
import { MENU_ITEMS } from '@/core/constants/roles'

export function useMenuItems() {
  const { role } = useAuth()
  return MENU_ITEMS.filter(item => item.roles?.includes(role))
}
```

### 22. SignaturePad Component

```jsx
// npm install react-signature-canvas
import { useRef, useState } from 'react'
import SignatureCanvas from 'react-signature-canvas'
import { Button } from '@/presentation/components/common'

export function SignaturePad({ onSave, isLoading }) {
  const sigPadRef = useRef(null)
  const [isEmpty, setIsEmpty] = useState(true)

  const handleClear = () => {
    sigPadRef.current?.clear()
    setIsEmpty(true)
  }

  const handleSave = () => {
    if (sigPadRef.current?.isEmpty()) return
    // Export PNG dengan background TRANSPARAN — wajib untuk overlay PDF
    const dataUrl = sigPadRef.current.getCanvas().toDataURL('image/png')
    onSave(dataUrl)
  }

  return (
    <div className="space-y-3">
      <p className="text-sm text-gray-500">Gambar tanda tangan Anda di kotak di bawah ini:</p>
      <div className="border-2 border-dashed border-gray-300 rounded-lg bg-gray-50 cursor-crosshair">
        <SignatureCanvas
          ref={sigPadRef}
          canvasProps={{ width: 600, height: 200, className: 'w-full h-48 rounded-lg' }}
          backgroundColor="rgba(0,0,0,0)"   // ← transparan, bukan putih
          penColor="black"
          onEnd={() => setIsEmpty(false)}
        />
      </div>
      <div className="flex gap-3">
        <Button variant="secondary" onClick={handleClear}>Hapus</Button>
        <Button onClick={handleSave} isLoading={isLoading} disabled={isEmpty}>
          Simpan Spesimen TTD
        </Button>
      </div>
    </div>
  )
}
```

### 23. PDF Positioner Component (PdfPositionerPage.jsx)

```jsx
// Drag-and-drop untuk menentukan posisi TTD di atas preview halaman PDF
import { useState, useRef, useCallback } from 'react'
import { Button, Select } from '@/presentation/components/common'

export function PdfPositioner({ documentId, pageCount, specimenImageUrl, onEmbed, isLoading }) {
  const containerRef = useRef(null)
  const [page, setPage] = useState(0)
  const [pos, setPos] = useState({ x: 0.55, y: 0.75, w: 0.25, h: 0.09 })
  const [isDragging, setIsDragging] = useState(false)
  const [dragStart, setDragStart] = useState(null)

  // URL preview halaman dari backend (PNG render)
  const previewUrl = `${import.meta.env.VITE_API_BASE_URL}/pdf/preview/${documentId}?page=${page}`

  const toPct = useCallback((clientX, clientY) => {
    const rect = containerRef.current.getBoundingClientRect()
    return {
      x: Math.max(0, Math.min(1, (clientX - rect.left) / rect.width)),
      y: Math.max(0, Math.min(1, (clientY - rect.top) / rect.height)),
    }
  }, [])

  const handleMouseDown = (e) => {
    e.preventDefault()
    setDragStart(toPct(e.clientX, e.clientY))
    setIsDragging(true)
  }

  const handleMouseMove = (e) => {
    if (!isDragging || !dragStart) return
    const cur = toPct(e.clientX, e.clientY)
    setPos({
      x: Math.min(dragStart.x, cur.x),
      y: Math.min(dragStart.y, cur.y),
      w: Math.abs(cur.x - dragStart.x),
      h: Math.abs(cur.y - dragStart.y),
    })
  }

  const handleMouseUp = () => setIsDragging(false)

  const handleSubmit = () => onEmbed({
    document_id: documentId,
    page_number: page,
    x_percent: pos.x,
    y_percent: pos.y,
    width_percent: pos.w,
    height_percent: pos.h,
  })

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-4">
        <Select
          label="Halaman"
          value={page}
          onChange={e => setPage(Number(e.target.value))}
          options={Array.from({ length: pageCount }, (_, i) => ({ value: i, label: `Halaman ${i + 1}` }))}
        />
        <p className="text-sm text-gray-500 mt-4">Klik + seret untuk menentukan area TTD</p>
      </div>

      {/* Preview PDF dengan overlay TTD */}
      <div
        ref={containerRef}
        className="relative border rounded-lg overflow-hidden cursor-crosshair select-none shadow"
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
      >
        <img src={previewUrl} alt="Preview PDF" className="w-full h-auto" draggable={false} />

        {/* Kotak posisi TTD */}
        {pos.w > 0.01 && (
          <div
            className="absolute border-2 border-blue-500 bg-blue-50/20 pointer-events-none"
            style={{
              left:   `${pos.x * 100}%`,
              top:    `${pos.y * 100}%`,
              width:  `${pos.w * 100}%`,
              height: `${pos.h * 100}%`,
            }}
          >
            {specimenImageUrl && (
              <img
                src={specimenImageUrl}
                alt="Spesimen TTD"
                className="w-full h-full object-contain opacity-60"
              />
            )}
          </div>
        )}
      </div>

      {/* Info koordinat */}
      <div className="grid grid-cols-4 gap-2 text-xs text-gray-500 bg-gray-50 p-3 rounded">
        <div>X: {(pos.x * 100).toFixed(1)}%</div>
        <div>Y: {(pos.y * 100).toFixed(1)}%</div>
        <div>Lebar: {(pos.w * 100).toFixed(1)}%</div>
        <div>Tinggi: {(pos.h * 100).toFixed(1)}%</div>
      </div>

      <Button
        onClick={handleSubmit}
        isLoading={isLoading}
        disabled={pos.w < 0.01}
        className="w-full"
      >
        Terapkan TTD & Download PDF
      </Button>
    </div>
  )
}
```

### 24. App.jsx — Routing dengan RBAC

```jsx
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { AuthProvider } from '@/domain/contexts/AuthContext'
import { AdminLayout } from '@/presentation/components/layout'
import { PrivateRoute } from '@/presentation/components/common'

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
        <Routes>
          <Route path="/login" element={<LoginPage />} />

          {/* Protected routes — semua role yang login */}
          <Route element={<PrivateRoute><AdminLayout /></PrivateRoute>}>
            <Route index element={<Navigate to="/dashboard" replace />} />
            <Route path="/dashboard"        element={<DashboardPage />} />
            <Route path="/specimens"        element={<SpecimenPage />} />
            <Route path="/pdf"              element={<PdfDocumentsPage />} />
            <Route path="/pdf/upload"       element={<PdfUploadPage />} />
            <Route path="/pdf/:id/embed"    element={<PdfPositionerPage />} />
            <Route path="/audit-logs"       element={<AuditLogPage />} />

            {/* Superadmin only */}
            <Route path="/users"            element={<PrivateRoute roles={['superadmin']}><UsersPage /></PrivateRoute>} />
            <Route path="/api-keys"         element={<PrivateRoute roles={['superadmin']}><ApiKeysPage /></PrivateRoute>} />
            <Route path="/specimens/all"    element={<PrivateRoute roles={['superadmin']}><SpecimenAdminPage /></PrivateRoute>} />
          </Route>

          <Route path="/403" element={<div className="p-10 text-center text-red-600 text-2xl font-bold">403 — Akses Ditolak</div>} />
          <Route path="*"    element={<NotFoundPage />} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  )
}
```

### 25. Package.json Frontend (tambahan)

```json
{
  "dependencies": {
    "react-signature-canvas": "^1.0.6"
  }
}
```

### 26. Format Utilities WIB (presentation/utils/format.js)

```javascript
// PENTING: Selalu sertakan timeZone: 'Asia/Jakarta' di semua formatter
// Backend kirim UTC ISO string (misal: "2026-04-07T03:00:00+00:00")
// Browser akan convert ke WIB (+07:00) secara otomatis jika timeZone di-set
// JANGAN pakai new Date().toString() atau toLocaleString() tanpa timeZone — hasilnya
// akan mengikuti timezone mesin user, bukan WIB

const WIB = 'Asia/Jakarta'

export function formatDate(dateStr) {
  if (!dateStr) return '—'
  return new Intl.DateTimeFormat('id-ID', {
    timeZone: WIB,
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  }).format(new Date(dateStr))
  // Input: "2026-04-07T03:00:00Z" → Output: "7 Apr 2026" (dalam WIB = 10:00 WIB)
}

export function formatDateTime(dateStr) {
  if (!dateStr) return '—'
  return new Intl.DateTimeFormat('id-ID', {
    timeZone: WIB,
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(new Date(dateStr))
  // Input: "2026-04-07T03:00:00Z" → Output: "7 Apr 2026, 10.00" (WIB)
}

export function formatDateTimeWithTZ(dateStr) {
  // Tampilkan lengkap dengan label WIB — cocok untuk audit trail
  if (!dateStr) return '—'
  return new Intl.DateTimeFormat('id-ID', {
    timeZone: WIB,
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    timeZoneName: 'short',   // → "WIB"
  }).format(new Date(dateStr))
  // Output: "7 Apr 2026, 10.00.00 WIB"
}

export function toInputDate(dateStr) {
  // Konversi ke YYYY-MM-DD dalam WIB untuk input[type=date]
  // JANGAN pakai .toISOString().slice(0,10) — itu UTC, bisa beda tanggal dengan WIB!
  if (!dateStr) return ''
  const d = new Date(dateStr)
  const parts = new Intl.DateTimeFormat('en-CA', {  // en-CA → format YYYY-MM-DD
    timeZone: WIB,
    year: 'numeric', month: '2-digit', day: '2-digit',
  }).format(d)
  return parts  // → "2026-04-07"
}

export function today() {
  // Tanggal hari ini dalam WIB (bukan UTC) — untuk default value input tanggal
  return new Intl.DateTimeFormat('en-CA', { timeZone: WIB }).format(new Date())
  // BUKAN: new Date().toISOString().slice(0,10) ← itu UTC, bisa H-1 saat tengah malam WIB
}

export function monthsFromToday(months) {
  const d = new Date()
  d.setMonth(d.getMonth() + months)
  return new Intl.DateTimeFormat('en-CA', { timeZone: WIB }).format(d)
}

export function formatRupiah(amount) {
  if (amount == null) return '—'
  return new Intl.NumberFormat('id-ID', {
    style: 'currency', currency: 'IDR', maximumFractionDigits: 0,
  }).format(amount)
}
```

### 27. Backend: Model BaseModel + Timezone-Aware to_dict()

```python
# models/base.py
from datetime import datetime, timezone
from sqlalchemy import Column, Integer, DateTime, func
from sqlalchemy.orm import declarative_base

Base = declarative_base()


class BaseModel(Base):
    __abstract__ = True

    id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    # timezone=True → map ke TIMESTAMPTZ di PostgreSQL
    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now(), nullable=False)

    def to_dict(self) -> dict:
        result = {}
        for c in self.__table__.columns:
            val = getattr(self, c.name)
            if isinstance(val, datetime):
                # Pastikan datetime timezone-aware sebelum isoformat()
                # PostgreSQL + SQLAlchemy kadang return naive datetime walau TIMESTAMPTZ
                if val.tzinfo is None:
                    val = val.replace(tzinfo=timezone.utc)  # asumsikan UTC
                # isoformat() → "2026-04-07T03:00:00+00:00"
                # Frontend new Date("2026-04-07T03:00:00+00:00") akan parse benar
                result[c.name] = val.isoformat()
            else:
                result[c.name] = val
        return result

    def update_from_dict(self, data: dict) -> None:
        for key, value in data.items():
            if hasattr(self, key) and key not in ["id", "created_at"]:
                setattr(self, key, value)
```

> **Kenapa `DateTime(timezone=True)`?**
> SQLAlchemy tanpa `timezone=True` map ke `TIMESTAMP` (naïve). Dengan `timezone=True` map ke `TIMESTAMPTZ`.
> Kedua tipe ini di-set via Alembic revision — jangan edit manual.

---

## 🔑 POLA INTEGRASI API KEY (Sistem Eksternal)

### Alur kerja sistem eksternal (HRD, SIAD, dll.):

```
1. Superadmin buat API Key via UI → tampil raw key SEKALI → copy & simpan
2. Sistem eksternal kirim request dengan header:
      X-API-Key: spesimen_xxxxxxxxxxxxxx
3. Backend: hash key → cari di DB → validasi is_active + expires_at
4. Catat last_used_at + embed_log (audit trail)
5. Return PDF signed atau download URL
```

### Contoh request dari sistem eksternal:

```bash
# 1. Upload PDF
curl -X POST https://app.example.com/api/v1/pdf/upload \
  -H "X-API-Key: spesimen_xxxxxxxxxxxxxxxxxxxx" \
  -F "file=@surat_keputusan.pdf"
# → {"data": {"document_id": 42, "page_count": 3}}

# 2. Embed TTD karyawan tertentu ke halaman 0
curl -X POST https://app.example.com/api/v1/pdf/embed \
  -H "X-API-Key: spesimen_xxxxxxxxxxxxxxxxxxxx" \
  -F "document_id=42" \
  -F "specimen_id=7" \
  -F "page_number=0" \
  -F "x_percent=0.6" \
  -F "y_percent=0.82" \
  -F "width_percent=0.22" \
  -F "height_percent=0.08"
# → {"data": {"download_url": "/api/v1/pdf/download/42"}}

# 3. Download PDF hasil TTD
curl -O -J https://app.example.com/api/v1/pdf/download/42 \
  -H "X-API-Key: spesimen_xxxxxxxxxxxxxxxxxxxx"
```

---

## ✅ IMPLEMENTATION CHECKLIST

### Backend
- [ ] Setup PostgreSQL + Alembic: `alembic init alembic`, konfigurasi `env.py`
- [ ] Model: User, Specimen, ApiKey, PdfDocument, EmbedLog + `to_dict()` dengan timezone-aware isoformat
- [ ] Pastikan semua kolom datetime pakai `DateTime(timezone=True)` → Alembic generate `TIMESTAMPTZ`
- [ ] Alembic initial revision + `alembic upgrade head`
- [ ] `utils/security.py` — JWT, bcrypt, generate_api_key (SHA-256)
- [ ] `utils/dependencies.py` — get_current_user, require_role, get_api_key_auth, get_hybrid_auth
- [ ] Endpoint auth: login, refresh, /me
- [ ] Endpoint users: CRUD (superadmin)
- [ ] Endpoint specimens: capture base64→PNG, get aktif, list per user
- [ ] Endpoint pdf: upload, preview (PNG), embed (hybrid auth), download
- [ ] Endpoint audit-logs: list dengan role-aware filter
- [ ] Endpoint api-keys: create (return raw key sekali), list, revoke
- [ ] `PdfService`: validate_pdf, render_page_preview, embed_signature
- [ ] `SpecimenService`: save_from_base64 (PNG transparan, trim, UUID filename)
- [ ] Storage directories auto-create di startup
- [ ] CORS + exception handlers dengan CORS headers di setiap error response
- [ ] Seed superadmin via `seed.py`

### Frontend
- [ ] Setup Vite + React SWC + Tailwind + path alias `@/`
- [ ] `core/constants/roles.js` — ROLES, PERMISSIONS, MENU_ITEMS
- [ ] `data/storage/TokenStorage.js` — access + refresh token
- [ ] `data/api/client.js` — Axios + JWT interceptor + auto-refresh dengan queue
- [ ] AuthContext JWT dengan restore session dari localStorage
- [ ] `PrivateRoute` dengan role check (redirect ke /403)
- [ ] `RoleGuard` component + `useMenuItems` hook
- [ ] Sidebar dengan menu difilter `useMenuItems()` berdasarkan role
- [ ] `presentation/utils/format.js` — semua formatter dengan `timeZone: 'Asia/Jakarta'` (WIB)
- [ ] `SignaturePad` — react-signature-canvas, background transparan
- [ ] `PdfPositioner` — drag-to-place overlay di atas preview PDF
- [ ] PDF upload page (validasi tipe + ukuran di frontend sebelum kirim)
- [ ] PDF documents list + status badge + tombol download
- [ ] Audit log page (tabel dengan info: dokumen, TTD oleh siapa, waktu, IP)
- [ ] API Keys page — generate (tampilkan raw key dengan warning copy sekali), list, revoke
- [ ] CRUD Users page (superadmin only)
- [ ] DashboardPage: statistik via `Promise.all` (total specimen, dokumen, TTD hari ini)

---

## 📚 BEST PRACTICES KHUSUS PROYEK INI

0. **Timezone: simpan UTC, tampil WIB** — Backend selalu simpan UTC (`datetime.now(timezone.utc)`), kolom PostgreSQL `TIMESTAMPTZ`, serialisasi `.isoformat()` dengan `+00:00`. Frontend selalu gunakan `timeZone: 'Asia/Jakarta'` di `Intl.DateTimeFormat`. **JANGAN** pakai `toISOString().slice(0,10)` untuk tanggal lokal (hasilnya UTC, bisa beda H-1 saat tengah malam WIB). **JANGAN** pakai `datetime.utcnow()` — deprecated Python 3.12+, gunakan `datetime.now(timezone.utc)`

1. **PNG transparan wajib** — canvas export `image/png` dengan `backgroundColor="rgba(0,0,0,0)"`; JANGAN JPEG karena background putih akan menutupi teks PDF

2. **Koordinat persentase bukan pixel** — simpan x/y/w/h sebagai 0.0–1.0 relatif ke ukuran halaman; agnostik terhadap ukuran PDF (A4, Letter, F4); konversi ke points hanya saat PyMuPDF embed

3. **PDF asli tidak pernah dimodifikasi** — selalu buat salinan ke `signed/`; PDF di `originals/` adalah audit chain dokumen asli

4. **API Key raw disimpan SHA-256** — raw key ditampilkan SEKALI di response; backend hanya simpan hash; jika hilang, harus generate ulang; tampilkan warning di UI "Simpan key ini sekarang!"

5. **Audit trail immutable** — tabel `embed_logs` TIDAK boleh ada endpoint DELETE atau UPDATE; hanya INSERT dan SELECT; catat IP + user_agent untuk non-repudiation

6. **Refresh token dengan queue** — saat token expire, jangan biarkan multiple request trigger refresh paralel; gunakan flag + queue seperti contoh di client.js

7. **Satu specimen aktif per user** — saat upload specimen baru, deactivate specimen lama (soft delete); sistem selalu ambil yang `is_active=1`

8. **RBAC di dua layer** — backend: `require_role()` dependency; frontend: `PrivateRoute` + `RoleGuard`; jangan andalkan frontend saja

9. **`pool_pre_ping=True` untuk PostgreSQL** — mencegah "connection already closed" setelah idle; penting untuk long-running aplikasi

10. **Alembic untuk semua perubahan schema** — setiap kolom baru = `alembic revision --autogenerate -m "add column xxx"`; jangan edit schema manual di production

11. **Validasi file upload di dua tempat** — frontend: cek ekstensi + ukuran sebelum kirim (UX cepat); backend: cek ulang + validasi isi PDF dengan PyMuPDF (keamanan)

12. **CORS headers di semua error handlers** — tanpa ini browser blokir error 4xx/5xx; wajib di `http_exception_handler`, `validation_exception_handler`, `general_exception_handler`

13. **`pool_size=10, max_overflow=20`** — sesuaikan dengan jumlah concurrent user; PostgreSQL default max_connections=100; alokasi dengan bijak jika ada multiple service

14. **Specimen preview di positioner** — tampilkan gambar TTD user sebagai overlay semi-transparan di atas kotak drag-drop; user bisa lihat perkiraan hasil sebelum embed

15. **Download via FileResponse bukan redirect** — gunakan FastAPI `FileResponse` agar authorization header tetap dikirim; redirect ke URL file statis akan bypass auth

---

## 🚀 Quick Start

```bash
# Backend
cd backend
python -m venv venv && venv\Scripts\activate   # Windows
pip install -r requirements.txt
cp .env.example .env                             # edit DATABASE_URL dan SECRET_KEY

# Setup database
createdb spesimen_db                             # buat DB di PostgreSQL
alembic upgrade head                             # jalankan migrations
python seed.py                                   # seed superadmin

python run.py
# http://localhost:8000/docs

# Frontend
cd frontend
npm install
cp .env.example .env                             # edit VITE_API_BASE_URL
npm run dev
# http://localhost:5173
```
