"""
Face Recognition Schemas
Pydantic schemas untuk request/response face recognition endpoints.
"""
from typing import List, Optional
from pydantic import BaseModel, Field, field_validator
import base64


# ──────────────────────────────────────────────
# Request schemas
# ──────────────────────────────────────────────

class FaceRegisterRequest(BaseModel):
    """Request body untuk registrasi wajah (multi-photo)."""
    model_config = {"protected_namespaces": ()}

    images: List[str] = Field(
        ...,
        min_length=1,
        max_length=10,
        description="List of base64-encoded images (1–10 foto)"
    )
    model_version: Optional[str] = Field(
        default="buffalo_l",
        description="Versi model InsightFace yang digunakan"
    )

    @field_validator("images")
    @classmethod
    def validate_base64(cls, images: List[str]) -> List[str]:
        for i, img in enumerate(images):
            # Strip data URI prefix jika ada (data:image/jpeg;base64,...)
            if "," in img:
                img = img.split(",", 1)[1]
                images[i] = img
            try:
                base64.b64decode(img, validate=True)
            except Exception:
                raise ValueError(f"Image index {i} bukan base64 yang valid")
        return images


class FaceValidateRequest(BaseModel):
    """Request body untuk validasi kualitas gambar tanpa menyimpan embedding."""
    image: str = Field(..., description="Single base64-encoded image")

    @field_validator("image")
    @classmethod
    def strip_prefix(cls, v: str) -> str:
        if "," in v:
            return v.split(",", 1)[1]
        return v


class FaceVerifyRequest(BaseModel):
    """Request body untuk verifikasi wajah 1:1."""
    id_pegawai: str = Field(..., description="ID pegawai yang akan diverifikasi")
    image: str = Field(..., description="Single base64-encoded image dari kamera")
    threshold: Optional[float] = Field(
        default=0.6,
        ge=0.0,
        le=1.0,
        description="Cosine similarity threshold (default: 0.6)"
    )

    @field_validator("image")
    @classmethod
    def strip_prefix(cls, v: str) -> str:
        if "," in v:
            return v.split(",", 1)[1]
        return v


class FaceLoginRequest(BaseModel):
    """Request body untuk face login (1:1 verification via username/id_pegawai)."""
    username: str = Field(..., description="Username akun yang akan login")
    image: str = Field(..., description="Single base64-encoded image dari kamera")
    threshold: Optional[float] = Field(
        default=0.6,
        ge=0.0,
        le=1.0,
        description="Cosine similarity threshold (default: 0.6)"
    )

    @field_validator("image")
    @classmethod
    def strip_prefix(cls, v: str) -> str:
        if "," in v:
            return v.split(",", 1)[1]
        return v


# ──────────────────────────────────────────────
# Response schemas
# ──────────────────────────────────────────────

class EmbeddingInfo(BaseModel):
    """Info satu embedding (tanpa raw vector data)."""
    id: int
    is_average: bool
    quality_score: Optional[float]
    model_version: str
    created_at: str

    model_config = {"from_attributes": True, "protected_namespaces": ()}


class FaceRegisterResponse(BaseModel):
    """Response setelah registrasi wajah berhasil."""
    id_pegawai: str
    total_embeddings: int       # jumlah embedding individual
    has_average: bool           # apakah rata-rata sudah tersimpan
    embeddings: List[EmbeddingInfo]
    message: str


class FaceEmbeddingsStatusResponse(BaseModel):
    """Status registrasi wajah untuk satu pegawai."""
    id_pegawai: str
    face_registered: bool
    total_embeddings: int
    has_average: bool
    embeddings: List[EmbeddingInfo]


class FaceValidateResponse(BaseModel):
    """Hasil validasi kualitas gambar."""
    face_detected: bool
    face_count: int
    quality_score: Optional[float]
    is_acceptable: bool
    details: dict


class FaceVerifyResponse(BaseModel):
    """Hasil verifikasi wajah 1:1."""
    verified: bool
    similarity: Optional[float]
    threshold: float
    id_pegawai: str
    message: str
