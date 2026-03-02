"""
IpWhitelist Model
Menyimpan daftar IP/CIDR yang diizinkan untuk melakukan absensi
"""
from datetime import datetime
from sqlalchemy import Column, String, Boolean, DateTime, Integer, ForeignKey
from config.database import Base


class IpWhitelist(Base):
    """
    Tabel whitelist IP untuk pembatasan lokasi absensi.

    ip_address bisa berupa:
      - IP tunggal  : "192.168.1.10"
      - CIDR range  : "192.168.1.0/24"
      - Public IP   : "103.12.34.56"
    """
    __tablename__ = "ip_whitelist"

    id         = Column(Integer, primary_key=True, index=True)
    ip_address = Column(String(50), unique=True, nullable=False, index=True)
    label      = Column(String(100), nullable=False)
    is_active  = Column(Boolean, default=True, nullable=False)
    created_at = Column(DateTime, default=datetime.now, nullable=False)
    updated_at = Column(DateTime, default=datetime.now, onupdate=datetime.now, nullable=False)
    created_by = Column(Integer, ForeignKey("users.id", ondelete="SET NULL"), nullable=True)

    def __repr__(self):
        return f"<IpWhitelist id={self.id} ip={self.ip_address!r} label={self.label!r} active={self.is_active}>"
