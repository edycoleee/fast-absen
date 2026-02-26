"""
Face Service
Business logic untuk face recognition menggunakan InsightFace Buffalo_L.

Pipeline:
  1. Decode base64 → numpy image (BGR)
  2. Detect & align face  (SCRFD, det_10g.onnx)
  3. Extract embedding     (ResNet-50 + ArcFace, w600k_r50.onnx → 512-dim)
  4. Quality assessment
  5. Save / Compare

Lazy loading: model InsightFace (~100MB) hanya di-load pertama kali digunakan,
sehingga tidak memperlambat startup API.
"""
from __future__ import annotations

import base64
import io
import logging
import threading
from typing import List, Optional, Tuple

import numpy as np
from fastapi import HTTPException, status
from sqlalchemy.orm import Session

from config.settings import settings
from repositories.face_repository import FaceRepository

logger = logging.getLogger(__name__)

# ──────────────────────────────────────────────────────────────
# Lazy global model (thread-safe singleton)
# ──────────────────────────────────────────────────────────────
_face_app = None
_face_app_lock = threading.Lock()


def _get_face_app():
    """Lazy-load InsightFace FaceAnalysis (thread-safe singleton)."""
    global _face_app
    if _face_app is not None:
        return _face_app

    with _face_app_lock:
        if _face_app is not None:  # double-check
            return _face_app
        try:
            import insightface
            from insightface.app import FaceAnalysis
        except ImportError:
            raise HTTPException(
                status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
                detail=(
                    "InsightFace library tidak terinstall. "
                    "Jalankan: pip install insightface onnxruntime opencv-python-headless"
                ),
            )

        model_dir = getattr(settings, "INSIGHTFACE_MODEL_DIR", None)
        logger.info("Loading InsightFace buffalo_l model (first request)...")

        app = FaceAnalysis(
            name="buffalo_l",
            root=str(model_dir) if model_dir else "./models",
            providers=["CPUExecutionProvider"],
            allowed_modules=["detection", "recognition"],
        )
        # det_size=(640,640) sesuai model det_10g.onnx
        app.prepare(ctx_id=0, det_size=(640, 640))
        _face_app = app
        logger.info("InsightFace model loaded successfully.")
        return _face_app


# ──────────────────────────────────────────────────────────────
# Helper utilities
# ──────────────────────────────────────────────────────────────

def _b64_to_bgr(b64_str: str) -> np.ndarray:
    """Decode base64 string → BGR numpy array (sesuai format OpenCV)."""
    try:
        import cv2
        raw = base64.b64decode(b64_str)
        arr = np.frombuffer(raw, dtype=np.uint8)
        img = cv2.imdecode(arr, cv2.IMREAD_COLOR)
        if img is None:
            raise ValueError("Gagal decode gambar")
        return img
    except ImportError:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="OpenCV (cv2) tidak terinstall. pip install opencv-python-headless",
        )


def _cosine_similarity(a: np.ndarray, b: np.ndarray) -> float:
    """Cosine similarity antara dua unit vector L2-normalized."""
    a = a / (np.linalg.norm(a) + 1e-10)
    b = b / (np.linalg.norm(b) + 1e-10)
    return float(np.dot(a, b))


def _assess_quality(face) -> float:
    """
    Hitung quality score sederhana [0.0 – 1.0] berdasarkan:
      - Ukuran bounding box relatif terhadap gambar (25% min)
      - Det score (confidence deteksi wajah)
    """
    det_score = float(getattr(face, "det_score", 0.5))

    # Bbox: [x1, y1, x2, y2]
    bbox = face.bbox
    w = bbox[2] - bbox[0]
    h = bbox[3] - bbox[1]
    face_area = w * h

    # Quality gabungan (sederhana; bisa diperluas dengan blur detection)
    quality = min(1.0, det_score * 0.7 + min(1.0, face_area / (112 * 112)) * 0.3)
    return round(quality, 4)


# ──────────────────────────────────────────────────────────────
# Service class
# ──────────────────────────────────────────────────────────────

class FaceService:
    """Face recognition service: register, verify, validate."""

    MIN_QUALITY = 0.30       # Threshold kualitas minimum
    DEFAULT_THRESHOLD = 0.60  # Cosine similarity default

    def __init__(self, db: Session):
        self.db = db
        self.repo = FaceRepository(db)

    # ──────────────────────────
    # Internal helpers
    # ──────────────────────────

    def _extract_single(self, b64: str) -> Tuple[np.ndarray, float]:
        """
        Extract embedding dari satu gambar base64.
        Returns: (embedding ndarray 512-dim, quality_score)
        Raises: HTTPException jika tidak ada wajah atau kualitas rendah.
        """
        app = _get_face_app()
        img = _b64_to_bgr(b64)
        faces = app.get(img)

        if not faces:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Tidak ada wajah terdeteksi pada gambar. "
                       "Pastikan wajah terlihat jelas minimal 25% frame.",
            )

        # Ambil wajah dengan confidence tertinggi
        face = max(faces, key=lambda f: f.det_score)
        quality = _assess_quality(face)

        if quality < self.MIN_QUALITY:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Kualitas gambar terlalu rendah (score={quality:.2f}, min={self.MIN_QUALITY}). "
                       "Gunakan pencahayaan lebih baik dan pastikan wajah tidak buram.",
            )

        emb = np.array(face.embedding, dtype=np.float32)
        # L2 normalize
        emb = emb / (np.linalg.norm(emb) + 1e-10)
        return emb, quality

    # ──────────────────────────
    # Public methods
    # ──────────────────────────

    def validate_image(self, b64: str) -> dict:
        """
        Validasi kualitas gambar tanpa menyimpan.
        Returns dict dengan detail kualitas.
        """
        app = _get_face_app()
        img = _b64_to_bgr(b64)
        faces = app.get(img)

        if not faces:
            return {
                "face_detected": False,
                "face_count": 0,
                "quality_score": None,
                "is_acceptable": False,
                "details": {"message": "Tidak ada wajah terdeteksi"},
            }

        face = max(faces, key=lambda f: f.det_score)
        quality = _assess_quality(face)
        bbox = face.bbox.tolist()

        return {
            "face_detected": True,
            "face_count": len(faces),
            "quality_score": quality,
            "is_acceptable": quality >= self.MIN_QUALITY,
            "details": {
                "det_score": round(float(face.det_score), 4),
                "bbox": [round(v, 1) for v in bbox],
                "face_width": round(bbox[2] - bbox[0], 1),
                "face_height": round(bbox[3] - bbox[1], 1),
                "multiple_faces_warning": len(faces) > 1,
            },
        }

    def register_face(
        self,
        id_pegawai: str,
        images_b64: List[str],
        model_version: str = "buffalo_l",
    ) -> dict:
        """
        Daftarkan wajah pegawai menggunakan 1–10 foto.

        Proses:
          1. Extract embedding tiap foto
          2. Simpan embedding individual (is_average=False)
          3. Hitung rata-rata embedding → simpan (is_average=True)
          4. Commit

        Returns: dict info registrasi.
        """
        # Hapus embedding lama jika ada (re-register)
        deleted = self.repo.delete_by_pegawai(id_pegawai)
        if deleted:
            logger.info(f"Re-register: dihapus {deleted} embedding lama untuk {id_pegawai}")

        extracted: List[Tuple[np.ndarray, float]] = []
        errors: List[str] = []

        for idx, b64 in enumerate(images_b64):
            try:
                emb, qual = self._extract_single(b64)
                extracted.append((emb, qual))
            except HTTPException as e:
                errors.append(f"Foto {idx + 1}: {e.detail}")

        if not extracted:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Tidak ada foto yang valid. Errors: {'; '.join(errors)}",
            )

        # Simpan embedding individual
        embeddings_data = [
            {
                "embedding": emb.tolist(),
                "is_average": False,
                "quality_score": qual,
            }
            for emb, qual in extracted
        ]
        individual_records = self.repo.create_bulk(
            id_pegawai, embeddings_data, model_version=model_version
        )

        # Hitung dan simpan rata-rata
        avg_emb = np.mean([e for e, _ in extracted], axis=0).astype(np.float32)
        avg_emb = avg_emb / (np.linalg.norm(avg_emb) + 1e-10)
        avg_qual = round(float(np.mean([q for _, q in extracted])), 4)

        avg_record = self.repo.create(
            id_pegawai=id_pegawai,
            embedding=avg_emb.tolist(),
            is_average=True,
            quality_score=avg_qual,
            model_version=model_version,
        )

        self.db.commit()
        self.db.refresh(avg_record)

        all_records = individual_records + [avg_record]

        return {
            "id_pegawai": id_pegawai,
            "total_embeddings": len(individual_records),
            "has_average": True,
            "embeddings": [
                {
                    "id": r.id,
                    "is_average": r.is_average,
                    "quality_score": r.quality_score,
                    "model_version": r.model_version,
                    "created_at": r.created_at.isoformat() if r.created_at is not None else None,  # type: ignore[union-attr]
                }
            for r in all_records
            ],
            "skipped_photos": len(images_b64) - len(extracted),
            "errors": errors,
            "message": (
                f"Berhasil mendaftarkan {len(extracted)} foto wajah "
                f"({'dengan' if errors else 'tanpa'} error)."
            ),
        }

    def get_embeddings_status(self, id_pegawai: str) -> dict:
        """Ambil status registrasi wajah tanpa mengembalikan raw vector."""
        records = self.repo.get_by_pegawai(id_pegawai)
        individual = [r for r in records if not r.is_average]  # type: ignore[truthy-bool]
        average = [r for r in records if r.is_average]  # type: ignore[truthy-bool]

        return {
            "id_pegawai": id_pegawai,
            "face_registered": len(records) > 0,
            "total_embeddings": len(individual),
            "has_average": len(average) > 0,
            "embeddings": [
                {
                    "id": r.id,
                    "is_average": r.is_average,
                    "quality_score": r.quality_score,
                    "model_version": r.model_version,
                    "created_at": r.created_at.isoformat() if r.created_at is not None else None,  # type: ignore[union-attr]
                }
                for r in records
            ],
        }

    def delete_embeddings(self, id_pegawai: str) -> int:
        """Hapus semua embedding pegawai. Returns jumlah yang dihapus."""
        count = self.repo.delete_by_pegawai(id_pegawai)
        self.db.commit()
        return count

    def verify_face(
        self,
        id_pegawai: str,
        b64: str,
        threshold: float = DEFAULT_THRESHOLD,
    ) -> dict:
        """
        Verifikasi wajah 1:1 untuk pegawai spesifik.
        Bandingkan embedding query dengan semua stored embedding (max similarity).
        """
        records = self.repo.get_by_pegawai(id_pegawai)
        if not records:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Pegawai {id_pegawai} belum mendaftarkan wajah. "
                       "Lakukan registrasi wajah terlebih dahulu.",
            )

        try:
            query_emb, _ = self._extract_single(b64)
        except HTTPException:
            raise

        stored_embeddings = [np.array(r.embedding, dtype=np.float32) for r in records]
        similarities = [_cosine_similarity(query_emb, s) for s in stored_embeddings]
        best = max(similarities)

        verified = best >= threshold
        return {
            "verified": verified,
            "similarity": round(best, 4),
            "threshold": threshold,
            "id_pegawai": id_pegawai,
            "message": (
                "Verifikasi wajah berhasil."
                if verified
                else f"Verifikasi gagal. Similarity {best:.4f} < threshold {threshold}."
            ),
        }

    def verify_face_for_login(
        self,
        id_pegawai: str,
        b64: str,
        threshold: float = DEFAULT_THRESHOLD,
    ) -> Tuple[bool, float]:
        """
        Verifikasi ringan untuk face login — hanya returns (verified, similarity).
        Dipanggil dari AuthService.
        """
        result = self.verify_face(id_pegawai, b64, threshold)
        return result["verified"], result["similarity"]
