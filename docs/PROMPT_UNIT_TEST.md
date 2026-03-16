# Prompt: Buat Unit Test Lengkap untuk Aplikasi FastAPI

Gunakan prompt ini sebagai instruksi ke AI untuk membuat unit test lengkap pada aplikasi FastAPI baru (misalnya aplikasi klinik). Salin seluruh bagian **"PROMPT"** ke AI, lalu sesuaikan nama model/endpoint sesuai aplikasi target.

---

## PROMPT

Kamu adalah software engineer senior yang ahli dalam pengujian (testing) aplikasi Python FastAPI dengan pytest. Tugasmu adalah membuat **unit test lengkap** untuk aplikasi FastAPI yang saya miliki.

### Konteks Teknologi

- **Framework**: FastAPI
- **Database ORM**: SQLAlchemy (dengan SQLite in-memory untuk testing)
- **Auth**: JWT Access Token (Bearer) + HTTP-only cookie Refresh Token
- **Permission system**: RBAC (Role-Based Access Control) dengan tabel `role_permissions`
- **Test framework**: pytest + pytest-cov
- **HTTP test client**: `fastapi.testclient.TestClient`

---

### Struktur File yang Harus Dibuat

```
tests/
├── conftest.py                              # Fixtures global
├── test_auth_utils.py                       # Unit test utilitas JWT & password
├── test_auth_endpoints.py                   # Endpoint login/logout/refresh/me
├── test_{entitas}_endpoints.py              # Satu file per resource/modul
├── test_{entitas}_repository.py             # Repository layer (opsional)
├── test_{service_kunci}_service.py          # Business logic / aturan domain
└── test_e2e_{alur_utama}_flow.py            # End-to-end alur bisnis penting
```

---

### Aturan Wajib untuk Semua Test

#### 1. `conftest.py` — Template Fixture

```python
"""Pytest fixtures global"""
import sys, os
from pathlib import Path
sys.path.insert(0, str(Path(__file__).parent.parent))

import pytest
from fastapi.testclient import TestClient
from sqlalchemy import create_engine, text
from sqlalchemy.orm import sessionmaker, Session
from sqlalchemy.pool import StaticPool

from main import app
from models.base import Base
from models import Role, Permission, User  # sesuaikan import model
from config.database import get_db
from utils.auth import get_password_hash
from utils.permission_registry import PERMISSIONS  # dict {name: description}

SQLALCHEMY_DATABASE_URL = "sqlite:///:memory:"

engine = create_engine(
    SQLALCHEMY_DATABASE_URL,
    connect_args={"check_same_thread": False},
    poolclass=StaticPool,
)
TestingSessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)


@pytest.fixture(scope="function")
def db():
    Base.metadata.create_all(bind=engine)
    session = TestingSessionLocal()
    try:
        yield session
    finally:
        session.close()
        Base.metadata.drop_all(bind=engine)


@pytest.fixture(scope="function")
def client(db):
    def override_get_db():
        yield db
    app.dependency_overrides[get_db] = override_get_db
    with TestClient(app) as c:
        yield c
    app.dependency_overrides.clear()


@pytest.fixture(scope="function")
def db_with_data(db):
    """Seed: roles, permissions, 2 user (admin + user biasa)."""
    admin_role = Role(id=1, name="admin", description="Administrator")
    user_role  = Role(id=2, name="user",  description="Regular user")
    db.add_all([admin_role, user_role])

    permissions = [
        Permission(id=i, name=name, description=desc)
        for i, (name, desc) in enumerate(PERMISSIONS.items(), start=1)
    ]
    db.add_all(permissions)
    db.commit()

    # Admin dapat semua permission
    db.execute(text(
        "INSERT INTO role_permissions (role_id, permission_id) SELECT 1, id FROM permissions"
    ))
    # User hanya permission minimal (sesuaikan dengan kebutuhan aplikasi)
    db.execute(text(
        """
        INSERT INTO role_permissions (role_id, permission_id)
        SELECT 2, id FROM permissions
        WHERE name IN ('user.login', 'resource.read')
        """
    ))
    db.commit()

    admin_user = User(
        id=1, username="admin",
        password_hash=get_password_hash("admin123"),
        is_active=True
    )
    regular_user = User(
        id=2, username="user1",
        password_hash=get_password_hash("user123"),
        is_active=True
    )
    db.add_all([admin_user, regular_user])
    db.commit()

    db.execute(text("INSERT INTO user_roles (user_id, role_id) VALUES (1, 1)"))
    db.execute(text("INSERT INTO user_roles (user_id, role_id) VALUES (2, 2)"))
    db.commit()

    return db


@pytest.fixture(scope="function")
def admin_token(client, db_with_data):
    r = client.post("/api/v1/auth/login", json={"username": "admin", "password": "admin123"})
    return r.json()["data"]["access_token"]


@pytest.fixture(scope="function")
def user_token(client, db_with_data):
    r = client.post("/api/v1/auth/login", json={"username": "user1", "password": "user123"})
    return r.json()["data"]["access_token"]


@pytest.fixture(scope="function")
def auth_headers_admin(admin_token):
    return {"Authorization": f"Bearer {admin_token}"}


@pytest.fixture(scope="function")
def auth_headers_user(user_token):
    return {"Authorization": f"Bearer {user_token}"}
```

---

#### 2. `pytest.ini` — Konfigurasi Wajib

```ini
[pytest]
testpaths = tests
python_files = test_*.py
python_classes = Test*
python_functions = test_*
addopts =
    -v
    --strict-markers
    --tb=short
    --cov=.
    --cov-report=term-missing
    --disable-warnings

markers =
    unit: Unit tests (isolated)
    integration: Integration tests (multi-step flow)
    auth: Authentication tests
    user: User management
    {tambahkan marker per modul aplikasi}

filterwarnings =
    ignore::ResourceWarning

[coverage:run]
source = .
omit =
    */tests/*
    */venv/*
    */__pycache__/*
    */config/*

[coverage:report]
exclude_lines =
    pragma: no cover
    raise NotImplementedError
    if __name__ == .__main__.:
```

---

### Pola Test yang Harus Diikuti Per Lapisan

#### A. Utilitas (Utils) — `test_auth_utils.py`

Uji fungsi murni tanpa database. Contoh yang wajib ada:

```python
class TestPasswordHashing:
    def test_hash_password()             # hash tidak sama dengan plain text
    def test_verify_password_correct()   # verifikasi benar
    def test_verify_password_incorrect() # verifikasi salah → False

class TestJWTToken:
    def test_create_access_token()                  # token terbuat, berupa string
    def test_create_access_token_with_expiration()  # custom expiry
    def test_decode_access_token_valid()             # payload terdecode benar
    def test_decode_expired_token()                  # expired → None/raise
    def test_decode_invalid_token()                  # garbage string → None/raise
```

---

#### B. Auth Endpoints — `test_auth_endpoints.py`

**Wajib** mencakup semua skenario berikut:

```python
@pytest.mark.auth
class TestAuthLogin:
    def test_login_success_admin()        # 200, ada access_token, roles, permissions, menu_guard
    def test_login_success_user()         # 200, role = user
    def test_login_invalid_username()     # 401
    def test_login_wrong_password()       # 401
    def test_login_inactive_user()        # 401

class TestAuthRefresh:
    def test_refresh_with_valid_cookie()  # 200, new access_token
    def test_refresh_without_cookie()     # 401

class TestAuthLogout:
    def test_logout_clears_cookie()       # 200, Set-Cookie dihapus

class TestAuthMe:
    def test_get_me_authenticated()       # 200, username cocok
    def test_get_me_unauthenticated()     # 403/401
```

**Kontrak respons login yang wajib diverifikasi:**
```python
assert data["success"] is True
assert "access_token" in data["data"]
assert data["data"]["token_type"] == "bearer"
assert "roles" in data["data"]
assert "permissions" in data["data"]
assert "menu_guard" in data["data"]
# Verifikasi struktur menu_guard sesuai role
```

---

#### C. Resource CRUD Endpoints — `test_{resource}_endpoints.py`

Buat satu file per resource (misal: `test_pasien_endpoints.py`, `test_dokter_endpoints.py`).

**Template kelas yang harus ada untuk setiap resource:**

```python
@pytest.mark.{resource}
class TestGet{Resource}:             # GET list
    def test_get_as_admin_200()
    def test_get_with_pagination()
    def test_get_with_search()
    def test_get_as_user_forbidden_403()   # jika user tidak punya izin
    def test_get_without_auth_403()

class TestGet{Resource}ById:         # GET single
    def test_get_existing_id_200()
    def test_get_nonexistent_id_404()
    def test_get_without_auth_403()

class TestCreate{Resource}:          # POST
    def test_create_success_201()
    def test_create_duplicate_400()          # jika ada constraint unique
    def test_create_missing_required_422()   # Pydantic validation
    def test_create_as_user_forbidden_403()
    def test_create_without_auth_403()

class TestUpdate{Resource}:          # PUT / PATCH
    def test_update_existing_200()
    def test_update_nonexistent_404()
    def test_update_as_user_forbidden_403()
    def test_update_without_auth_403()

class TestDelete{Resource}:          # DELETE
    def test_delete_existing_200()
    def test_delete_nonexistent_404()
    def test_delete_as_user_forbidden_403()
    def test_delete_with_dependent_data_409()  # jika ada FK constraint
    def test_delete_without_auth_403()
```

**Pola assert standar:**
```python
# Sukses
assert response.status_code == 200  # atau 201 untuk create
data = response.json()
assert data["success"] is True
assert data["data"] is not None
assert "id" in data["data"]          # sesuaikan field key

# Gagal / Forbidden
assert response.status_code == 403
data = response.json()
assert data["success"] is False

# Not Found
assert response.status_code == 404
assert data["success"] is False
```

---

#### D. Service / Business Logic — `test_{service}_service.py`

Uji aturan bisnis domain secara terisolasi (tidak lewat HTTP).

```python
@pytest.mark.unit
class TestNamaServiceRule:
    """
    Setiap metode test satu aturan bisnis spesifik.
    Gunakan helper function _create_{entitas}() untuk setup data minimal.
    """
    def test_kondisi_normal_hasilkan_X()
    def test_kondisi_batas_hasilkan_Y()
    def test_kondisi_error_raise_exception()
    def test_override_manual_tidak_ditimpa()
    def test_recalculate_force_update_existing()
    def test_data_tidak_lengkap_skip_tanpa_error()
```

**Contoh helper setup data:**
```python
def _create_entitas(db, id, field_a, field_b):
    obj = ModelEntitas(id=id, field_a=field_a, field_b=field_b)
    db.add(obj)
    db.commit()
    db.refresh(obj)
    return obj
```

---

#### E. Repository — `test_{resource}_repository.py` (opsional)

```python
@pytest.mark.unit
class TestNamaRepository:
    def test_get_existing_returns_object()
    def test_get_nonexistent_returns_none()
    def test_create_persists_to_db()
    def test_update_changes_field()
    def test_delete_removes_record()
    def test_get_all_returns_list()
    def test_search_by_keyword()
    def test_count_returns_integer()
```

---

#### F. End-to-End Flow — `test_e2e_{alur}_flow.py`

Uji alur bisnis lengkap dari awal sampai akhir dalam satu test function.

**Pola yang harus diikuti:**
```python
@pytest.mark.integration
class TestAlurUtamaFlow:
    def test_alur_lengkap_{nama_proses}(
        self, client, db_with_data, auth_headers_admin
    ):
        # Step 1: Persiapan data
        db_with_data.add(ModelTerkait(...))
        db_with_data.commit()

        # Step 2: Aksi pertama
        r1 = client.post("/api/v1/resource/aksi-1", json={...}, headers=...)
        assert r1.status_code == 201
        assert r1.json()["success"] is True
        resource_id = r1.json()["data"]["id"]

        # Step 3: Aksi kedua yang bergantung pada step 1
        r2 = client.post(f"/api/v1/resource/{resource_id}/aksi-2", ...)
        assert r2.status_code == 200

        # Step 4: Verifikasi state akhir
        r_cek = client.get(f"/api/v1/resource/{resource_id}", headers=...)
        assert r_cek.json()["data"]["status"] == "STATUS_AKHIR"

        # Step 5: Verifikasi efek samping (log, record terkait, dll)
        r_log = client.get("/api/v1/logs/", headers=...)
        assert r_log.json()["data"]["total"] >= 1
```

---

### Checklist Kelengkapan Test per Endpoint

Untuk setiap endpoint, pastikan test mencakup:

| Skenario | HTTP Code |
|----------|-----------|
| Berhasil (data valid, auth benar) | `200` / `201` |
| Tidak terautentikasi (tanpa token) | `403` |
| Token valid tapi tidak punya permission | `403` |
| Data tidak valid / format salah | `422` |
| Resource tidak ditemukan | `404` |
| Duplikat / constraint unik dilanggar | `400` |
| Konflik dependensi (hapus data yang direferensi) | `409` |
| Pagination bekerja (skip, limit, total) | `200` |

---

### Konvensi Penamaan

```
test_[aksi]_[kondisi_atau_aktor]()

Contoh:
test_login_success_admin()
test_login_invalid_password()
test_create_pasien_success()
test_create_pasien_duplicate_nik_400()
test_delete_dokter_with_jadwal_dependency_409()
test_get_pasien_without_auth_403()
test_check_in_while_active_session_fails_400()
```

---

### Pola Upload File (Multipart Form)

Untuk endpoint dengan upload file (foto, Excel import):

```python
# Upload gambar
import io
from PIL import Image

def _make_test_jpeg():
    buf = io.BytesIO()
    Image.new("RGB", (10, 10), color=(255, 0, 0)).save(buf, format="JPEG")
    buf.seek(0)
    return buf

response = client.post(
    "/api/v1/resource/",
    data={"field1": "value1", "field2": "value2"},
    files={"foto": ("test.jpg", _make_test_jpeg(), "image/jpeg")},
    headers=auth_headers_admin,
)

# Upload Excel
from io import BytesIO
from openpyxl import Workbook

def _build_excel_bytes(rows: list[list]) -> bytes:
    wb = Workbook()
    ws = wb.active
    for row in rows:
        ws.append(row)
    buf = BytesIO()
    wb.save(buf)
    buf.seek(0)
    return buf.getvalue()

response = client.post(
    "/api/v1/resource/import",
    files={
        "file": (
            "data.xlsx",
            _build_excel_bytes([["header1", "header2"], ["val1", "val2"]]),
            "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        )
    },
    headers=auth_headers_admin,
)
assert response.json()["data"]["success"] >= 1
assert response.json()["data"]["errors"] == []
```

---

### Pola Test Berbasis Role Khusus (misal: Dokter, Kepala, dll)

Untuk role dengan scope terbatas (hanya bisa akses data miliknya sendiri):

```python
def test_role_khusus_hanya_lihat_data_sendiri(
    self, client, db_with_data, auth_headers_admin
):
    # Buat role khusus
    role_khusus = Role(name="dokter", description="Dokter spesialis")
    db_with_data.add(role_khusus)
    db_with_data.commit()

    # Assign permissions minimal
    db_with_data.execute(text(
        "INSERT INTO role_permissions (role_id, permission_id) "
        "SELECT :rid, id FROM permissions WHERE name IN ('resource.read')"
    ), {"rid": role_khusus.id})

    # Buat user dengan role tersebut
    user_role_khusus = User(
        id=99, username="dokter1",
        password_hash=get_password_hash("dokter123"),
        is_active=True
    )
    db_with_data.add(user_role_khusus)
    db_with_data.commit()
    db_with_data.execute(text(
        "INSERT INTO user_roles (user_id, role_id) VALUES (99, :rid)"
    ), {"rid": role_khusus.id})
    db_with_data.commit()

    # Login sebagai role khusus
    r = client.post("/api/v1/auth/login", json={"username": "dokter1", "password": "dokter123"})
    token = r.json()["data"]["access_token"]
    headers = {"Authorization": f"Bearer {token}"}

    # Verifikasi akses/batasan
    response = client.get("/api/v1/resource/", headers=headers)
    assert response.status_code == 200  # atau 403 tergantung permission
    # Verifikasi menu_guard
    assert r.json()["data"]["menu_guard"]["menus"]["dashboard"]["visible"] is True
```

---

### `requirements-test.txt`

```
pytest==7.4.4
pytest-asyncio==0.23.3
httpx==0.26.0
pytest-cov==4.1.0
faker==22.0.0
openpyxl==3.1.2
Pillow==10.2.0
```

---

### Cara Menjalankan

```bash
cd /path/to/backend
source venv/bin/activate
pip install -r requirements-test.txt

# Jalankan semua test
pytest

# Verbose
pytest -v

# Per modul
pytest tests/test_auth_endpoints.py -v
pytest tests/test_{resource}_endpoints.py -v

# Per marker
pytest -m auth -v
pytest -m unit -v
pytest -m integration -v

# Fast path (sebelum full suite)
pytest tests/test_auth_utils.py tests/test_{resource}_repository.py -q
pytest tests/test_{service}_service.py -q
pytest tests/test_{resource}_endpoints.py -q

# Dengan coverage report
pytest --cov=. --cov-report=html --cov-report=term-missing
```

---

### Target Coverage

| Layer | Target |
|-------|--------|
| Utils (auth, helper) | > 90% |
| Repositories | > 85% |
| Services (business logic) | > 85% |
| Endpoints | > 80% |
| **Overall** | **> 80%** |

---

## Instruksi Penggunaan Prompt Ini

1. **Salin seluruh prompt di atas** dan kirim ke AI
2. **Lampirkan file-file aplikasi klinik** yang relevan:
   - `main.py`
   - `models/*.py` (semua model)
   - `schemas/*.py`
   - `api/v1/endpoints/*.py`
   - `services/*.py`
   - `utils/permission_registry.py`
   - `config/database.py`
3. **Minta AI** untuk:
   ```
   Berdasarkan template dan pola di atas, buatkan:
   1. conftest.py dengan seed data sesuai model aplikasi klinik ini
   2. pytest.ini dengan marker sesuai modul yang ada
   3. test_auth_endpoints.py lengkap
   4. test_{resource}_endpoints.py untuk setiap resource/modul
   5. test_{service}_service.py untuk business logic utama
   6. test_e2e_{alur}_flow.py untuk alur bisnis utama (misal: alur kunjungan pasien)
   ```
4. **Validasi** bahwa semua skenario dalam tabel checklist tercakup
5. **Jalankan** `pytest -q` dan pastikan semua test hijau sebelum commit
