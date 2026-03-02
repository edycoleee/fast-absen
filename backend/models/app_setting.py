"""
AppSetting Model
Key-value store untuk konfigurasi sistem yang dapat diubah admin
"""
from datetime import datetime
from sqlalchemy import Column, String, Text, Boolean, DateTime, Integer, ForeignKey

from config.database import Base


class AppSetting(Base):
    """
    Tabel konfigurasi aplikasi yang dapat diubah oleh admin.
    
    Contoh key:
      face_threshold         : float string, default "0.60"
      face_threshold_locked  : bool string "true"/"false"
    """
    __tablename__ = "app_settings"

    key         = Column(String(100), primary_key=True, index=True)
    value       = Column(Text, nullable=False)
    description = Column(Text, nullable=True)
    locked      = Column(Boolean, default=False, nullable=False,
                         comment="Jika True, pengguna tidak bisa override nilai ini")
    updated_at  = Column(DateTime, default=datetime.now, onupdate=datetime.now, nullable=False)
    updated_by  = Column(Integer, ForeignKey("users.id"), nullable=True)

    def __repr__(self):
        return f"<AppSetting key={self.key!r} value={self.value!r} locked={self.locked}>"
