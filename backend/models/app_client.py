"""
AppClient Model
Registry aplikasi yang diizinkan menggunakan SSO ini sebagai identity provider.
Setiap aplikasi (SIMRS, finance, surat-menyurat, dll) wajib terdaftar di sini.
"""
from sqlalchemy import Column, Integer, String, Text, DateTime, Boolean
from sqlalchemy.sql import func
from models.base import Base


class AppClient(Base):
    __tablename__ = "app_clients"

    id = Column(Integer, primary_key=True, index=True)

    # Identitas aplikasi
    client_id = Column(String(100), unique=True, nullable=False, index=True)
    # Contoh: "simrs-web", "signature-service", "finance-app"

    client_name = Column(String(255), nullable=False)
    # Nama tampilkan: "SIMRS Web RSU Sulfat", "Signature Service"

    client_secret_hash = Column(Text, nullable=True)
    # SHA-256 dari secret key. NULL = aplikasi publik (frontend-only / trusted internal)
    # Diisi untuk backend-to-backend (machine-to-machine) service

    # Deskripsi singkat tujuan aplikasi
    description = Column(Text, nullable=True)

    # Daftar allowed_origins untuk CORS cross-check (opsional, comma-separated)
    allowed_origins = Column(Text, nullable=True)
    # Contoh: "https://simrs.rsusulfat.id,https://192.10.10.154:3001"

    # Scopes yang diizinkan diklaim oleh aplikasi ini (comma-separated)
    # Saat ini deklaratif, bisa enforce di introspect endpoint nanti
    allowed_scopes = Column(Text, nullable=True, default="identity:read")
    # Contoh: "identity:read,signature:embed,audit:read"

    # Status
    is_active = Column(Boolean, default=True, nullable=False)

    # Metadata
    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now(), nullable=False)

    def __repr__(self):
        return f"<AppClient id={self.id} client_id={self.client_id} active={self.is_active}>"
