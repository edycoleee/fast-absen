"""
Pegawai Shift Kelompok Model
"""
from sqlalchemy import Column, Integer, String, Date, Text, Boolean, DateTime, ForeignKey
from sqlalchemy.sql import func
from sqlalchemy.orm import relationship
from models.base import Base


class PegawaiShiftKelompok(Base):
    __tablename__ = "pegawai_shift_kelompok"

    id = Column(Integer, primary_key=True, index=True)
    id_pegawai = Column(String(20), ForeignKey("pegawai.id_pegawai", ondelete="CASCADE"), nullable=False)
    shift_kelompok_id = Column(Integer, ForeignKey("shift_kelompok.id"), nullable=False)
    effective_start_date = Column(Date, nullable=False, server_default=func.current_date())
    effective_end_date = Column(Date, nullable=True)
    is_default = Column(Boolean, default=True)
    catatan = Column(Text, nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())

    pegawai = relationship("Pegawai", back_populates="pegawai_shift_kelompok")
    shift_kelompok = relationship("ShiftKelompok", back_populates="pegawai_shift_kelompok")
