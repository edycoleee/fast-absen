"""
Face Embedding Repository
Data access layer untuk tabel face_embeddings.
"""
from typing import List, Optional
from sqlalchemy.orm import Session
from sqlalchemy import func
from models.face_embedding import FaceEmbedding


class FaceRepository:
    """Repository untuk operasi CRUD tabel face_embeddings."""

    def __init__(self, db: Session):
        self.db = db

    # ──────────────────────────────────────────────
    # Read
    # ──────────────────────────────────────────────

    def get_by_pegawai(self, id_pegawai: str) -> List[FaceEmbedding]:
        """Ambil semua embedding milik pegawai (individual + average)."""
        return (
            self.db.query(FaceEmbedding)
            .filter(FaceEmbedding.id_pegawai == id_pegawai)
            .all()
        )

    def get_average_embedding(self, id_pegawai: str) -> Optional[FaceEmbedding]:
        """Ambil hanya embedding rata-rata (is_average=True)."""
        return (
            self.db.query(FaceEmbedding)
            .filter(
                FaceEmbedding.id_pegawai == id_pegawai,
                FaceEmbedding.is_average == True
            )
            .first()
        )

    def count_by_pegawai(self, id_pegawai: str) -> int:
        """Hitung jumlah embedding milik pegawai."""
        return (
            self.db.query(func.count(FaceEmbedding.id))
            .filter(FaceEmbedding.id_pegawai == id_pegawai)
            .scalar() or 0
        )

    def has_face_registered(self, id_pegawai: str) -> bool:
        """Cek apakah pegawai sudah punya embedding."""
        return self.count_by_pegawai(id_pegawai) > 0

    # ──────────────────────────────────────────────
    # Write
    # ──────────────────────────────────────────────

    def create(
        self,
        id_pegawai: str,
        embedding: List[float],
        is_average: bool = False,
        quality_score: Optional[float] = None,
        model_version: str = "buffalo_l"
    ) -> FaceEmbedding:
        """Simpan satu embedding baru."""
        record = FaceEmbedding(
            id_pegawai=id_pegawai,
            embedding=embedding,
            is_average=is_average,
            quality_score=quality_score,
            model_version=model_version,
        )
        self.db.add(record)
        self.db.flush()  # populate .id tanpa commit
        return record

    def create_bulk(
        self,
        id_pegawai: str,
        embeddings_data: List[dict],
        model_version: str = "buffalo_l"
    ) -> List[FaceEmbedding]:
        """
        Simpan banyak embedding sekaligus.
        embeddings_data: list of dict dengan keys:
            - embedding: List[float]
            - is_average: bool
            - quality_score: Optional[float]
        """
        records = []
        for item in embeddings_data:
            record = FaceEmbedding(
                id_pegawai=id_pegawai,
                embedding=item["embedding"],
                is_average=item.get("is_average", False),
                quality_score=item.get("quality_score"),
                model_version=model_version,
            )
            self.db.add(record)
            records.append(record)
        self.db.flush()
        return records

    # ──────────────────────────────────────────────
    # Delete
    # ──────────────────────────────────────────────

    def delete_by_pegawai(self, id_pegawai: str) -> int:
        """Hapus semua embedding milik pegawai. Kembalikan jumlah yang dihapus."""
        count = (
            self.db.query(FaceEmbedding)
            .filter(FaceEmbedding.id_pegawai == id_pegawai)
            .delete(synchronize_session=False)
        )
        return count

    def delete_average_only(self, id_pegawai: str) -> int:
        """Hapus hanya embedding rata-rata (untuk update average)."""
        count = (
            self.db.query(FaceEmbedding)
            .filter(
                FaceEmbedding.id_pegawai == id_pegawai,
                FaceEmbedding.is_average == True
            )
            .delete(synchronize_session=False)
        )
        return count
