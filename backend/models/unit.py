"""
Unit Model
"""
from sqlalchemy import Column, Integer, String, DateTime
from sqlalchemy.sql import func
from sqlalchemy.orm import relationship
from models.base import Base


class Unit(Base):
    __tablename__ = "unit"

    id_unit = Column(Integer, primary_key=True, index=True)
    nama_unit = Column(String(150), unique=True, nullable=False)
    status = Column(String(20), nullable=False, default="Aktif")
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())

    pegawai = relationship("Pegawai", back_populates="unit", foreign_keys="Pegawai.id_unit")
    shift_kelompok_aturan = relationship("ShiftKelompokAturan", back_populates="unit")
    roster_shifts = relationship("RosterShift", back_populates="unit")
