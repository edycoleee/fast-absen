"""
Pegawai Model
"""
from sqlalchemy import Column, String, Integer, Date, Text, DateTime
from sqlalchemy.sql import func
from sqlalchemy.orm import relationship
from models.base import Base


class Pegawai(Base):
    __tablename__ = "pegawai"

    id_pegawai = Column(String(20), primary_key=True, index=True)
    nip = Column(String(50), nullable=True)
    nama = Column(String(255), nullable=True)
    jenis_kelamin = Column(String(10), nullable=True)
    tempat_lahir = Column(String(100), nullable=True)
    tanggal_lahir = Column(Date, nullable=True)
    alamat = Column(Text, nullable=True)
    id_ruang = Column(Integer, nullable=True)
    status = Column(String(20), nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    foto = Column(String(255), nullable=True)

    # Relationships
    users = relationship("User", back_populates="pegawai")
    absensi = relationship("Absensi", back_populates="pegawai")
    login_absensi = relationship("LoginAbsensi", back_populates="pegawai")
