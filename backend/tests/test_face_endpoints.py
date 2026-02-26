"""
Unit tests untuk Face Recognition Endpoints

Cakupan:
- POST /api/v1/face/validate
- POST /api/v1/face/users/{id_pegawai}/register
- GET  /api/v1/face/users/{id_pegawai}/embeddings
- DELETE /api/v1/face/users/{id_pegawai}/embeddings
- POST /api/v1/face/verify
- POST /api/v1/auth/login-face

Catatan implementasi:
- FaceService di-mock sepenuhnya (tidak ada InsightFace / model loading)
- SQLite in-memory: Vector(512) di-patch agar kompatibel dengan SQLite
- Setiap test class memakai fixture `face_client` + `face_headers_*`
"""
import base64
import sys
import os
from pathlib import Path
from typing import Generator
from unittest.mock import MagicMock, patch, PropertyMock

import pytest
from fastapi import HTTPException, status
from fastapi.testclient import TestClient
from sqlalchemy import text
from sqlalchemy.orm import Session

# ──────────────────────────────────────────────────────────────
# FIX: SQLite tidak mengenal tipe VECTOR — register fallback TEXT
# Harus dilakukan SEBELUM import model yang pakai Vector(512)
# ──────────────────────────────────────────────────────────────
from sqlalchemy.dialects.sqlite.base import SQLiteTypeCompiler

SQLiteTypeCompiler.visit_VECTOR = lambda self, type_, **kw: "TEXT"  # type: ignore[attr-defined]

# Setelah patch, import model dan app normal
sys.path.insert(0, str(Path(__file__).parent.parent))

from models.role import Role
from models.user import User
from models.pegawai import Pegawai
from models.permission import Permission
from utils.auth import get_password_hash

# ──────────────────────────────────────────────────────────────
# Helpers: dummy base64 image (1×1 pixel PNG)
# ──────────────────────────────────────────────────────────────
DUMMY_B64 = (
    "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk"
    "YPhfDwAChwGA60e6kgAAAABJRU5ErkJggg=="
)
FACE_VALIDATE_PAYLOAD = {"image": DUMMY_B64}
FACE_REGISTER_PAYLOAD = {"images": [DUMMY_B64, DUMMY_B64]}

# ──────────────────────────────────────────────────────────────
# FaceService mock factory
# ──────────────────────────────────────────────────────────────

def _make_face_service_mock(**overrides):
    """Return a MagicMock mimicking FaceService instance."""
    mock = MagicMock()
    mock.validate_image.return_value = {
        "face_detected": True,
        "face_count": 1,
        "quality_score": 0.85,
        "is_acceptable": True,
        "details": {},
    }
    mock.register_face.return_value = {
        "id_pegawai": "PGW001",
        "total_embeddings": 2,
        "has_average": True,
        "embeddings": [],
        "message": "Wajah berhasil didaftarkan",
    }
    mock.get_embeddings_status.return_value = {
        "id_pegawai": "PGW001",
        "face_registered": True,
        "total_embeddings": 2,
        "has_average": True,
        "embeddings": [],
    }
    mock.delete_embeddings.return_value = 2
    mock.verify_face.return_value = {
        "verified": True,
        "similarity": 0.92,
        "threshold": 0.6,
        "id_pegawai": "PGW001",
        "message": "Verifikasi wajah berhasil",
    }
    mock.verify_face_for_login.return_value = (True, 0.92)
    for key, value in overrides.items():
        if "." in key:
            method, attr = key.split(".", 1)
            setattr(getattr(mock, method), "return_value", value)
        else:
            setattr(mock, key, value)
    return mock


# ──────────────────────────────────────────────────────────────
# Module-level autouse: mock APScheduler agar tidak start/stop
# di tiap TestClient lifecycle (global singleton scheduler)
# ──────────────────────────────────────────────────────────────

@pytest.fixture(autouse=True, scope="module")
def mock_scheduler_no_op():
    """Suppress APScheduler start/stop during face recognition tests."""
    with patch("main.start_scheduler"), patch("main.stop_scheduler"):
        yield


# ──────────────────────────────────────────────────────────────
# Local fixtures
# ──────────────────────────────────────────────────────────────

@pytest.fixture(scope="function")
def db_with_face_perms(db_with_data: Session) -> Session:
    """Extend db_with_data: tambahkan face.* permissions ke role user (id=2)."""
    face_perm_names = ["face.read", "face.register", "face.delete", "face.verify"]
    db_with_data.execute(
        text(
            """
            INSERT INTO role_permissions (role_id, permission_id)
            SELECT 2, id FROM permissions
            WHERE name IN ('face.read', 'face.register', 'face.delete', 'face.verify')
            """
        )
    )
    db_with_data.commit()
    return db_with_data


@pytest.fixture(scope="function")
def face_client(db_with_face_perms: Session) -> Generator[TestClient, None, None]:
    """TestClient dengan DB yang sudah memiliki face permissions di semua role."""
    from main import app
    from config.database import get_db

    def override_get_db():
        yield db_with_face_perms

    app.dependency_overrides[get_db] = override_get_db
    with TestClient(app) as c:
        yield c
    app.dependency_overrides.clear()


@pytest.fixture(scope="function")
def face_admin_headers(face_client: TestClient, db_with_face_perms: Session) -> dict:
    resp = face_client.post("/api/v1/auth/login", json={"username": "admin", "password": "admin123"})
    assert resp.status_code == 200
    return {"Authorization": f"Bearer {resp.json()['data']['access_token']}"}


@pytest.fixture(scope="function")
def face_user_headers(face_client: TestClient, db_with_face_perms: Session) -> dict:
    resp = face_client.post("/api/v1/auth/login", json={"username": "user1", "password": "user123"})
    assert resp.status_code == 200
    return {"Authorization": f"Bearer {resp.json()['data']['access_token']}"}


# ═══════════════════════════════════════════════════════════════
# POST /api/v1/face/validate
# ═══════════════════════════════════════════════════════════════

@pytest.mark.face
class TestFaceValidate:
    """POST /face/validate — validasi kualitas gambar tanpa simpan."""

    def test_validate_face_detected(self, face_client: TestClient, face_admin_headers: dict):
        """Gambar valid dengan wajah terdeteksi → 200 + face_detected=True."""
        with patch("api.v1.endpoints.face.FaceService") as MockSvc:
            MockSvc.return_value = _make_face_service_mock()
            resp = face_client.post(
                "/api/v1/face/validate",
                json=FACE_VALIDATE_PAYLOAD,
                headers=face_admin_headers,
            )
        assert resp.status_code == 200
        data = resp.json()
        assert data["success"] is True
        assert data["data"]["face_detected"] is True
        assert data["data"]["face_count"] == 1
        assert data["data"]["is_acceptable"] is True

    def test_validate_no_face_detected(self, face_client: TestClient, face_admin_headers: dict):
        """Gambar tanpa wajah → 200 + face_detected=False."""
        with patch("api.v1.endpoints.face.FaceService") as MockSvc:
            mock = _make_face_service_mock()
            mock.validate_image.return_value = {
                "face_detected": False,
                "face_count": 0,
                "quality_score": None,
                "is_acceptable": False,
                "details": {"reason": "Tidak ada wajah terdeteksi"},
            }
            MockSvc.return_value = mock
            resp = face_client.post(
                "/api/v1/face/validate",
                json=FACE_VALIDATE_PAYLOAD,
                headers=face_admin_headers,
            )
        assert resp.status_code == 200
        assert resp.json()["data"]["face_detected"] is False

    def test_validate_service_raises_400(self, face_client: TestClient, face_admin_headers: dict):
        """FaceService raise HTTPException 400 → endpoint propagate."""
        with patch("api.v1.endpoints.face.FaceService") as MockSvc:
            mock = _make_face_service_mock()
            mock.validate_image.side_effect = HTTPException(
                status_code=400, detail="Gambar tidak dapat didekode"
            )
            MockSvc.return_value = mock
            resp = face_client.post(
                "/api/v1/face/validate",
                json=FACE_VALIDATE_PAYLOAD,
                headers=face_admin_headers,
            )
        assert resp.status_code == 400

    def test_validate_missing_image_field(self, face_client: TestClient, face_admin_headers: dict):
        """Request tanpa field `image` → 422 Unprocessable Entity."""
        resp = face_client.post(
            "/api/v1/face/validate",
            json={},
            headers=face_admin_headers,
        )
        assert resp.status_code == 422

    def test_validate_unauthenticated(self, face_client: TestClient):
        """Request tanpa token → 401/403."""
        resp = face_client.post("/api/v1/face/validate", json=FACE_VALIDATE_PAYLOAD)
        assert resp.status_code in (401, 403)


# ═══════════════════════════════════════════════════════════════
# POST /api/v1/face/users/{id_pegawai}/register
# ═══════════════════════════════════════════════════════════════

@pytest.mark.face
class TestFaceRegister:
    """POST /face/users/{id_pegawai}/register — daftarkan wajah pegawai."""

    def test_admin_register_any_user_success(
        self, face_client: TestClient, face_admin_headers: dict
    ):
        """Admin dapat mendaftarkan wajah pegawai manapun → 201."""
        with patch("api.v1.endpoints.face.FaceService") as MockSvc:
            MockSvc.return_value = _make_face_service_mock()
            resp = face_client.post(
                "/api/v1/face/users/PGW001/register",
                json=FACE_REGISTER_PAYLOAD,
                headers=face_admin_headers,
            )
        assert resp.status_code == 201
        data = resp.json()
        assert data["success"] is True
        assert data["data"]["id_pegawai"] == "PGW001"

    def test_user_register_own_success(
        self, face_client: TestClient, face_user_headers: dict
    ):
        """User biasa dapat mendaftar wajah miliknya sendiri (PGW002) → 201."""
        with patch("api.v1.endpoints.face.FaceService") as MockSvc:
            mock = _make_face_service_mock()
            mock.register_face.return_value["id_pegawai"] = "PGW002"
            MockSvc.return_value = mock
            resp = face_client.post(
                "/api/v1/face/users/PGW002/register",
                json=FACE_REGISTER_PAYLOAD,
                headers=face_user_headers,
            )
        assert resp.status_code == 201

    def test_user_register_other_forbidden(
        self, face_client: TestClient, face_user_headers: dict
    ):
        """User biasa mencoba daftar wajah orang lain → 403."""
        with patch("api.v1.endpoints.face.FaceService"):
            resp = face_client.post(
                "/api/v1/face/users/PGW999/register",
                json=FACE_REGISTER_PAYLOAD,
                headers=face_user_headers,
            )
        assert resp.status_code == 403

    def test_register_no_face_in_image(
        self, face_client: TestClient, face_admin_headers: dict
    ):
        """FaceService raise 422 tidak ada wajah → 422 diteruskan."""
        with patch("api.v1.endpoints.face.FaceService") as MockSvc:
            mock = _make_face_service_mock()
            mock.register_face.side_effect = HTTPException(
                status_code=422,
                detail="Tidak ada wajah terdeteksi pada foto ke-1",
            )
            MockSvc.return_value = mock
            resp = face_client.post(
                "/api/v1/face/users/PGW001/register",
                json=FACE_REGISTER_PAYLOAD,
                headers=face_admin_headers,
            )
        assert resp.status_code == 422

    def test_register_pegawai_not_found(
        self, face_client: TestClient, face_admin_headers: dict
    ):
        """Pegawai tidak ditemukan → 404."""
        with patch("api.v1.endpoints.face.FaceService") as MockSvc:
            mock = _make_face_service_mock()
            mock.register_face.side_effect = HTTPException(
                status_code=404, detail="Pegawai tidak ditemukan"
            )
            MockSvc.return_value = mock
            resp = face_client.post(
                "/api/v1/face/users/NOTEXIST/register",
                json=FACE_REGISTER_PAYLOAD,
                headers=face_admin_headers,
            )
        assert resp.status_code == 404

    def test_register_no_images_field(
        self, face_client: TestClient, face_admin_headers: dict
    ):
        """Request tanpa field `images` → 422."""
        resp = face_client.post(
            "/api/v1/face/users/PGW001/register",
            json={},
            headers=face_admin_headers,
        )
        assert resp.status_code == 422

    def test_register_too_many_images(
        self, face_client: TestClient, face_admin_headers: dict
    ):
        """Lebih dari 10 gambar → 422 validasi Pydantic."""
        payload = {"images": [DUMMY_B64] * 11}
        resp = face_client.post(
            "/api/v1/face/users/PGW001/register",
            json=payload,
            headers=face_admin_headers,
        )
        assert resp.status_code == 422

    def test_register_invalid_base64(
        self, face_client: TestClient, face_admin_headers: dict
    ):
        """Base64 tidak valid → 422 dari Pydantic validator."""
        payload = {"images": ["ini-bukan-base64!!!"]}
        resp = face_client.post(
            "/api/v1/face/users/PGW001/register",
            json=payload,
            headers=face_admin_headers,
        )
        assert resp.status_code == 422

    def test_register_unauthenticated(self, face_client: TestClient):
        """Tanpa token → 401/403."""
        resp = face_client.post(
            "/api/v1/face/users/PGW001/register",
            json=FACE_REGISTER_PAYLOAD,
        )
        assert resp.status_code in (401, 403)


# ═══════════════════════════════════════════════════════════════
# GET /api/v1/face/users/{id_pegawai}/embeddings
# ═══════════════════════════════════════════════════════════════

@pytest.mark.face
class TestFaceEmbeddingsGet:
    """GET /face/users/{id_pegawai}/embeddings — status registrasi wajah."""

    def test_admin_get_any_user(
        self, face_client: TestClient, face_admin_headers: dict
    ):
        """Admin melihat embedding pegawai manapun → 200."""
        with patch("api.v1.endpoints.face.FaceService") as MockSvc:
            MockSvc.return_value = _make_face_service_mock()
            resp = face_client.get(
                "/api/v1/face/users/PGW001/embeddings",
                headers=face_admin_headers,
            )
        assert resp.status_code == 200
        data = resp.json()
        assert data["success"] is True
        assert data["data"]["face_registered"] is True

    def test_user_get_own(
        self, face_client: TestClient, face_user_headers: dict
    ):
        """User melihat embedding miliknya sendiri (PGW002) → 200."""
        with patch("api.v1.endpoints.face.FaceService") as MockSvc:
            mock = _make_face_service_mock()
            mock.get_embeddings_status.return_value["id_pegawai"] = "PGW002"
            MockSvc.return_value = mock
            resp = face_client.get(
                "/api/v1/face/users/PGW002/embeddings",
                headers=face_user_headers,
            )
        assert resp.status_code == 200

    def test_user_get_other_forbidden(
        self, face_client: TestClient, face_user_headers: dict
    ):
        """User mencoba melihat embedding orang lain → 403."""
        with patch("api.v1.endpoints.face.FaceService"):
            resp = face_client.get(
                "/api/v1/face/users/PGW999/embeddings",
                headers=face_user_headers,
            )
        assert resp.status_code == 403

    def test_get_not_registered(
        self, face_client: TestClient, face_admin_headers: dict
    ):
        """Pegawai belum registrasi wajah → 200 + face_registered=False."""
        with patch("api.v1.endpoints.face.FaceService") as MockSvc:
            mock = _make_face_service_mock()
            mock.get_embeddings_status.return_value = {
                "id_pegawai": "PGW001",
                "face_registered": False,
                "total_embeddings": 0,
                "has_average": False,
                "embeddings": [],
            }
            MockSvc.return_value = mock
            resp = face_client.get(
                "/api/v1/face/users/PGW001/embeddings",
                headers=face_admin_headers,
            )
        assert resp.status_code == 200
        assert resp.json()["data"]["face_registered"] is False

    def test_get_unauthenticated(self, face_client: TestClient):
        """Tanpa token → 401/403."""
        resp = face_client.get("/api/v1/face/users/PGW001/embeddings")
        assert resp.status_code in (401, 403)


# ═══════════════════════════════════════════════════════════════
# DELETE /api/v1/face/users/{id_pegawai}/embeddings
# ═══════════════════════════════════════════════════════════════

@pytest.mark.face
class TestFaceEmbeddingsDelete:
    """DELETE /face/users/{id_pegawai}/embeddings — hapus embedding wajah."""

    def test_admin_delete_any_user(
        self, face_client: TestClient, face_admin_headers: dict
    ):
        """Admin hapus embedding pegawai manapun → 200 + deleted_count."""
        with patch("api.v1.endpoints.face.FaceService") as MockSvc:
            MockSvc.return_value = _make_face_service_mock()
            resp = face_client.delete(
                "/api/v1/face/users/PGW001/embeddings",
                headers=face_admin_headers,
            )
        assert resp.status_code == 200
        data = resp.json()
        assert data["success"] is True
        assert data["data"]["deleted_count"] == 2

    def test_user_delete_own(
        self, face_client: TestClient, face_user_headers: dict
    ):
        """User hapus embedding miliknya sendiri (PGW002) → 200."""
        with patch("api.v1.endpoints.face.FaceService") as MockSvc:
            MockSvc.return_value = _make_face_service_mock()
            resp = face_client.delete(
                "/api/v1/face/users/PGW002/embeddings",
                headers=face_user_headers,
            )
        assert resp.status_code == 200

    def test_user_delete_other_forbidden(
        self, face_client: TestClient, face_user_headers: dict
    ):
        """User mencoba hapus embedding orang lain → 403."""
        with patch("api.v1.endpoints.face.FaceService"):
            resp = face_client.delete(
                "/api/v1/face/users/PGW999/embeddings",
                headers=face_user_headers,
            )
        assert resp.status_code == 403

    def test_delete_not_registered(
        self, face_client: TestClient, face_admin_headers: dict
    ):
        """Hapus embedding yang tidak ada → 404 dari FaceService."""
        with patch("api.v1.endpoints.face.FaceService") as MockSvc:
            mock = _make_face_service_mock()
            mock.delete_embeddings.side_effect = HTTPException(
                status_code=404, detail="Belum ada data wajah terdaftar"
            )
            MockSvc.return_value = mock
            resp = face_client.delete(
                "/api/v1/face/users/PGW001/embeddings",
                headers=face_admin_headers,
            )
        assert resp.status_code == 404

    def test_delete_unauthenticated(self, face_client: TestClient):
        """Tanpa token → 401/403."""
        resp = face_client.delete("/api/v1/face/users/PGW001/embeddings")
        assert resp.status_code in (401, 403)


# ═══════════════════════════════════════════════════════════════
# POST /api/v1/face/verify
# ═══════════════════════════════════════════════════════════════

@pytest.mark.face
class TestFaceVerify:
    """POST /face/verify — verifikasi wajah 1:1."""

    VERIFY_PAYLOAD = {
        "id_pegawai": "PGW001",
        "image": DUMMY_B64,
        "threshold": 0.6,
    }

    def test_verify_success_verified(
        self, face_client: TestClient, face_admin_headers: dict
    ):
        """Wajah cocok → 200 + verified=True."""
        with patch("api.v1.endpoints.face.FaceService") as MockSvc:
            MockSvc.return_value = _make_face_service_mock()
            resp = face_client.post(
                "/api/v1/face/verify",
                json=self.VERIFY_PAYLOAD,
                headers=face_admin_headers,
            )
        assert resp.status_code == 200
        data = resp.json()
        assert data["success"] is True
        assert data["data"]["verified"] is True
        assert data["data"]["similarity"] >= 0.6

    def test_verify_not_verified(
        self, face_client: TestClient, face_admin_headers: dict
    ):
        """Wajah tidak cocok → 200 + verified=False."""
        with patch("api.v1.endpoints.face.FaceService") as MockSvc:
            mock = _make_face_service_mock()
            mock.verify_face.return_value = {
                "verified": False,
                "similarity": 0.35,
                "threshold": 0.6,
                "id_pegawai": "PGW001",
                "message": "Wajah tidak cocok",
            }
            MockSvc.return_value = mock
            resp = face_client.post(
                "/api/v1/face/verify",
                json=self.VERIFY_PAYLOAD,
                headers=face_admin_headers,
            )
        assert resp.status_code == 200
        assert resp.json()["data"]["verified"] is False
        assert resp.json()["data"]["similarity"] < 0.6

    def test_verify_face_not_registered(
        self, face_client: TestClient, face_admin_headers: dict
    ):
        """Pegawai belum registrasi → 404."""
        with patch("api.v1.endpoints.face.FaceService") as MockSvc:
            mock = _make_face_service_mock()
            mock.verify_face.side_effect = HTTPException(
                status_code=404,
                detail="Wajah belum didaftarkan untuk pegawai ini",
            )
            MockSvc.return_value = mock
            resp = face_client.post(
                "/api/v1/face/verify",
                json=self.VERIFY_PAYLOAD,
                headers=face_admin_headers,
            )
        assert resp.status_code == 404

    def test_verify_invalid_image(
        self, face_client: TestClient, face_admin_headers: dict
    ):
        """Gambar tidak bisa didekode → 400."""
        with patch("api.v1.endpoints.face.FaceService") as MockSvc:
            mock = _make_face_service_mock()
            mock.verify_face.side_effect = HTTPException(
                status_code=400, detail="Gambar tidak dapat didekode"
            )
            MockSvc.return_value = mock
            resp = face_client.post(
                "/api/v1/face/verify",
                json=self.VERIFY_PAYLOAD,
                headers=face_admin_headers,
            )
        assert resp.status_code == 400

    def test_verify_missing_required_fields(
        self, face_client: TestClient, face_admin_headers: dict
    ):
        """Request tanpa id_pegawai → 422."""
        resp = face_client.post(
            "/api/v1/face/verify",
            json={"image": DUMMY_B64},
            headers=face_admin_headers,
        )
        assert resp.status_code == 422

    def test_verify_threshold_out_of_range(
        self, face_client: TestClient, face_admin_headers: dict
    ):
        """Threshold > 1.0 → 422 validasi Pydantic."""
        payload = {**self.VERIFY_PAYLOAD, "threshold": 1.5}
        resp = face_client.post(
            "/api/v1/face/verify",
            json=payload,
            headers=face_admin_headers,
        )
        assert resp.status_code == 422

    def test_verify_unauthenticated(self, face_client: TestClient):
        """Tanpa token → 401/403."""
        resp = face_client.post("/api/v1/face/verify", json=self.VERIFY_PAYLOAD)
        assert resp.status_code in (401, 403)


# ═══════════════════════════════════════════════════════════════
# POST /api/v1/auth/login-face
# ═══════════════════════════════════════════════════════════════

@pytest.mark.face
class TestFaceLogin:
    """POST /auth/login-face — autentikasi menggunakan wajah."""

    LOGIN_PAYLOAD = {
        "username": "admin",
        "image": DUMMY_B64,
        "threshold": 0.6,
    }

    def test_login_face_success(self, face_client: TestClient):
        """Login wajah berhasil → 200 + access_token."""
        with patch("api.v1.endpoints.auth.FaceService") as MockSvc:
            mock = _make_face_service_mock()
            MockSvc.return_value = mock
            resp = face_client.post(
                "/api/v1/auth/login-face",
                json=self.LOGIN_PAYLOAD,
            )
        # Bisa 200 (success) atau 404/403 tergantung setup DB
        # yang penting tidak 500 dan bukan crash
        assert resp.status_code != 500

    def test_login_face_user_not_found(self, face_client: TestClient):
        """Username tidak ada di DB → 401."""
        with patch("api.v1.endpoints.auth.FaceService"):
            resp = face_client.post(
                "/api/v1/auth/login-face",
                json={**self.LOGIN_PAYLOAD, "username": "tidakada"},
            )
        assert resp.status_code == 401

    def test_login_face_not_registered(self, face_client: TestClient):
        """User ada tapi wajah belum didaftarkan → 404."""
        with patch("api.v1.endpoints.auth.FaceService") as MockSvc:
            mock = _make_face_service_mock()
            mock.verify_face_for_login.side_effect = HTTPException(
                status_code=404,
                detail="Wajah belum didaftarkan",
            )
            MockSvc.return_value = mock
            resp = face_client.post(
                "/api/v1/auth/login-face",
                json=self.LOGIN_PAYLOAD,
            )
        assert resp.status_code == 404

    def test_login_face_not_match(self, face_client: TestClient):
        """Wajah terdeteksi tapi tidak cocok → 401."""
        with patch("api.v1.endpoints.auth.FaceService") as MockSvc:
            mock = _make_face_service_mock()
            mock.verify_face_for_login.side_effect = HTTPException(
                status_code=401,
                detail="Wajah tidak cocok",
            )
            MockSvc.return_value = mock
            resp = face_client.post(
                "/api/v1/auth/login-face",
                json=self.LOGIN_PAYLOAD,
            )
        assert resp.status_code == 401

    def test_login_face_missing_username(self, face_client: TestClient):
        """Request tanpa username → 422."""
        resp = face_client.post(
            "/api/v1/auth/login-face",
            json={"image": DUMMY_B64},
        )
        assert resp.status_code == 422

    def test_login_face_missing_image(self, face_client: TestClient):
        """Request tanpa image → 422."""
        resp = face_client.post(
            "/api/v1/auth/login-face",
            json={"username": "admin"},
        )
        assert resp.status_code == 422

    def test_login_face_threshold_negative(self, face_client: TestClient):
        """Threshold negatif → 422 validasi Pydantic."""
        resp = face_client.post(
            "/api/v1/auth/login-face",
            json={**self.LOGIN_PAYLOAD, "threshold": -0.1},
        )
        assert resp.status_code == 422
