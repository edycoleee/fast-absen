"""
Face Recognition Endpoints
Registrasi, pengelolaan, dan verifikasi wajah (InsightFace Buffalo_L).

Protected by permission: face.read / face.register / face.delete / face.verify
"""
import base64

from fastapi import APIRouter, Depends, File, Form, HTTPException, UploadFile, status, Request
from typing import List, Optional
from sqlalchemy.orm import Session

from config.database import get_db
from schemas.face import (
    FaceRegisterRequest,
    FaceValidateRequest,
    FaceVerifyRequest,
)
from services.face_service import FaceService
from utils.dependencies import get_current_user, require_permission
from utils.permission_registry import PermissionKeys
from utils.response import success_response
from models.user import User

router = APIRouter(prefix="/face", tags=["Face Recognition"])


# ──────────────────────────────────────────────────────────────
# POST /face/validate
# Validasi kualitas gambar tanpa menyimpan
# ──────────────────────────────────────────────────────────────
@router.post(
    "/validate",
    response_model=dict,
    dependencies=[Depends(require_permission(PermissionKeys.FACE_VERIFY))],
)
def validate_face_image(
    body: FaceValidateRequest,
    db: Session = Depends(get_db),
):
    """
    Validasi kualitas gambar wajah tanpa menyimpan embedding.
    Digunakan frontend untuk memberikan feedback sebelum registrasi/login.
    """
    svc = FaceService(db)
    result = svc.validate_image(body.image)
    return success_response(data=result, message="Validasi gambar selesai")


# ──────────────────────────────────────────────────────────────
# POST /face/users/{id_pegawai}/register
# Daftarkan wajah (1–10 foto)
# ──────────────────────────────────────────────────────────────
@router.post(
    "/users/{id_pegawai}/register",
    response_model=dict,
    status_code=status.HTTP_201_CREATED,
    dependencies=[Depends(require_permission(PermissionKeys.FACE_REGISTER))],
)
def register_face(
    id_pegawai: str,
    body: FaceRegisterRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """
    Daftarkan wajah pegawai menggunakan 1–10 foto.

    - Jika sudah ada embedding sebelumnya, **otomatis dihapus** (re-register).
    - Setiap foto diproses secara individual, kemudian dibuat rata-rata embedding.
    - Admin/super-admin dapat mendaftarkan wajah pegawai manapun.
    - Role `user` hanya dapat mendaftarkan wajah miliknya sendiri.
    """
    # User role hanya bisa register wajah sendiri
    user_roles = {r.name for r in current_user.roles}
    is_admin = bool(user_roles & {"admin", "super-admin"})
    if not is_admin and str(current_user.id_pegawai) != id_pegawai:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Role 'user' hanya dapat mendaftarkan wajah milik sendiri.",
        )

    svc = FaceService(db)
    result = svc.register_face(
        id_pegawai=id_pegawai,
        images_b64=body.images,
        model_version=body.model_version or "buffalo_l",
    )
    return success_response(data=result, message=result["message"])


# ──────────────────────────────────────────────────────────────
# POST /face/users/{id_pegawai}/register-upload
# Daftarkan wajah via upload file (multipart/form-data) – untuk Swagger UI
# ──────────────────────────────────────────────────────────────
@router.post(
    "/users/{id_pegawai}/register-upload",
    response_model=dict,
    status_code=status.HTTP_201_CREATED,
    dependencies=[Depends(require_permission(PermissionKeys.FACE_REGISTER))],
    summary="Register Face (File Upload)",
)
async def register_face_upload(
    id_pegawai: str,
    images: List[UploadFile] = File(..., description="1–10 file foto wajah (JPEG/PNG)"),
    model_version: Optional[str] = Form(default="buffalo_l", description="Versi model InsightFace"),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """
    Daftarkan wajah pegawai menggunakan **upload file** (multipart/form-data).

    Endpoint ini identik dengan `/register` namun menerima file gambar langsung
    sehingga dapat diuji melalui **Swagger UI** dengan tombol "Choose File".

    - Mendukung 1–10 file gambar (JPEG/PNG).
    - Admin/super-admin dapat mendaftarkan wajah pegawai manapun.
    - Role `user` hanya dapat mendaftarkan wajah miliknya sendiri.
    """
    # Validasi jumlah file
    if not images or len(images) < 1:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail="Minimal 1 foto harus diunggah.",
        )
    if len(images) > 10:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail="Maksimal 10 foto yang diperbolehkan.",
        )

    # User role hanya bisa register wajah sendiri
    user_roles = {r.name for r in current_user.roles}
    is_admin = bool(user_roles & {"admin", "super-admin"})
    if not is_admin and str(current_user.id_pegawai) != id_pegawai:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Role 'user' hanya dapat mendaftarkan wajah milik sendiri.",
        )

    # Baca file dan konversi ke base64
    images_b64: List[str] = []
    for i, upload in enumerate(images):
        content_type = upload.content_type or ""
        if content_type and not content_type.startswith("image/"):
            raise HTTPException(
                status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
                detail=f"File ke-{i + 1} bukan gambar (content-type: {content_type}).",
            )
        raw = await upload.read()
        if not raw:
            raise HTTPException(
                status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
                detail=f"File ke-{i + 1} kosong.",
            )
        images_b64.append(base64.b64encode(raw).decode("utf-8"))

    svc = FaceService(db)
    result = svc.register_face(
        id_pegawai=id_pegawai,
        images_b64=images_b64,
        model_version=model_version or "buffalo_l",
    )
    return success_response(data=result, message=result["message"])


# ──────────────────────────────────────────────────────────────
# GET /face/users/{id_pegawai}/embeddings
# Status registrasi wajah (tanpa raw vector)
# ──────────────────────────────────────────────────────────────
@router.get(
    "/users/{id_pegawai}/embeddings",
    response_model=dict,
    dependencies=[Depends(require_permission(PermissionKeys.FACE_READ))],
)
def get_face_embeddings(
    id_pegawai: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """
    Ambil status registrasi wajah pegawai.
    Raw embedding vector **tidak** dikembalikan untuk alasan keamanan.
    """
    user_roles = {r.name for r in current_user.roles}
    is_admin = bool(user_roles & {"admin", "super-admin"})
    if not is_admin and str(current_user.id_pegawai) != id_pegawai:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Role 'user' hanya dapat melihat data wajah milik sendiri.",
        )

    svc = FaceService(db)
    result = svc.get_embeddings_status(id_pegawai)
    return success_response(data=result, message="Data embedding wajah berhasil diambil")


# ──────────────────────────────────────────────────────────────
# DELETE /face/users/{id_pegawai}/embeddings
# Hapus semua embedding (untuk re-register)
# ──────────────────────────────────────────────────────────────
@router.delete(
    "/users/{id_pegawai}/embeddings",
    response_model=dict,
    dependencies=[Depends(require_permission(PermissionKeys.FACE_DELETE))],
)
def delete_face_embeddings(
    id_pegawai: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """
    Hapus semua embedding wajah pegawai.
    Setelah dihapus, pegawai perlu melakukan registrasi ulang.
    """
    user_roles = {r.name for r in current_user.roles}
    is_admin = bool(user_roles & {"admin", "super-admin"})
    if not is_admin and str(current_user.id_pegawai) != id_pegawai:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Role 'user' hanya dapat menghapus data wajah milik sendiri.",
        )

    svc = FaceService(db)
    count = svc.delete_embeddings(id_pegawai)
    return success_response(
        data={"id_pegawai": id_pegawai, "deleted_count": count},
        message=f"Berhasil menghapus {count} embedding wajah.",
    )


# ──────────────────────────────────────────────────────────────
# POST /face/verify
# Verifikasi wajah 1:1 (tanpa login, untuk absensi dll)
# ──────────────────────────────────────────────────────────────
@router.post(
    "/verify",
    response_model=dict,
    dependencies=[Depends(require_permission(PermissionKeys.FACE_VERIFY))],
)
def verify_face(
    body: FaceVerifyRequest,
    db: Session = Depends(get_db),
):
    """
    Verifikasi wajah 1:1 untuk pegawai tertentu.
    Cocok digunakan untuk absensi dengan face recognition.

    Returns confidence score dan hasil verified True/False.
    """
    svc = FaceService(db)
    result = svc.verify_face(
        id_pegawai=body.id_pegawai,
        b64=body.image,
        threshold=body.threshold or FaceService.DEFAULT_THRESHOLD,
    )
    return success_response(data=result, message=result["message"])
