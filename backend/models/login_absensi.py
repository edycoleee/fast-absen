"""
Login Absensi Model
"""
from sqlalchemy import Column, Integer, String, ForeignKey, DateTime
from sqlalchemy.sql import func
from sqlalchemy.orm import relationship
from models.base import Base


class LoginAbsensi(Base):
    __tablename__ = "login_absensi"

    id = Column(Integer, primary_key=True, index=True)
    id_pegawai = Column(String(20), ForeignKey("pegawai.id_pegawai"), nullable=True, index=True)
    uid = Column(String(50), nullable=True)
    player_id = Column(String(50), nullable=True)
    model = Column(String(250), nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    # Relationships
    pegawai = relationship("Pegawai", back_populates="login_absensi")
