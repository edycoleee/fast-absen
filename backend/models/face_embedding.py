"""
FaceEmbedding Model
Stores InsightFace Buffalo_L ArcFace 512-dim embeddings per pegawai.
Requires pgvector PostgreSQL extension (CREATE EXTENSION vector;).
"""
from sqlalchemy import Column, Integer, String, Boolean, Float, DateTime, ForeignKey
from sqlalchemy.sql import func
from sqlalchemy.orm import relationship
from pgvector.sqlalchemy import Vector
from models.base import Base


class FaceEmbedding(Base):
    __tablename__ = "face_embeddings"

    id = Column(Integer, primary_key=True, index=True)
    id_pegawai = Column(
        String(20),
        ForeignKey("pegawai.id_pegawai", ondelete="CASCADE"),
        nullable=False,
        index=True
    )
    # 512-dim L2-normalized ArcFace embedding vector (InsightFace Buffalo_L)
    embedding = Column(Vector(512), nullable=False)
    # TRUE = rata-rata dari multi-photo; FALSE = embedding per-foto individual
    is_average = Column(Boolean, default=False, nullable=False)
    # Skor kualitas foto saat registrasi [0.0 – 1.0]
    quality_score = Column(Float, nullable=True)
    # Versi model untuk migrasi masa depan
    model_version = Column(String(50), default="buffalo_l", nullable=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    # Relationship
    pegawai = relationship("Pegawai", back_populates="face_embeddings")
