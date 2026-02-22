"""
Shift Kelompok Model
"""
from sqlalchemy import Column, Integer, String, Text, Boolean, DateTime
from sqlalchemy.sql import func
from sqlalchemy.orm import relationship
from models.base import Base


class ShiftKelompok(Base):
    __tablename__ = "shift_kelompok"

    id = Column(Integer, primary_key=True, index=True)
    kode = Column(String(50), unique=True, nullable=False)
    nama = Column(String(100), unique=True, nullable=False)
    deskripsi = Column(Text, nullable=True)
    is_shift_based = Column(Boolean, default=True)
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())

    aturan = relationship("ShiftKelompokAturan", back_populates="shift_kelompok")
    pegawai_shift_kelompok = relationship("PegawaiShiftKelompok", back_populates="shift_kelompok")
    roster_shifts = relationship("RosterShift", back_populates="shift_kelompok")
