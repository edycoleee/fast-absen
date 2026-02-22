"""
Shift Kelompok Aturan Model
"""
from sqlalchemy import Column, Integer, Date, Time, Boolean, DateTime, ForeignKey
from sqlalchemy.sql import func
from sqlalchemy.orm import relationship
from models.base import Base


class ShiftKelompokAturan(Base):
    __tablename__ = "shift_kelompok_aturan"

    id = Column(Integer, primary_key=True, index=True)
    shift_kelompok_id = Column(Integer, ForeignKey("shift_kelompok.id", ondelete="CASCADE"), nullable=False)
    id_unit = Column(Integer, ForeignKey("unit.id_unit"), nullable=True)
    grace_telat_menit = Column(Integer, nullable=False, default=10)
    toleransi_pulang_cepat_menit = Column(Integer, nullable=False, default=0)
    batas_lembur_menit = Column(Integer, nullable=False, default=0)
    window_mulai_minus_menit = Column(Integer, nullable=False, default=120)
    window_selesai_plus_menit = Column(Integer, nullable=False, default=240)
    maks_sesi_per_hari = Column(Integer, nullable=False, default=1)
    fleksibel_masuk_mulai = Column(Time, nullable=True)
    fleksibel_masuk_sampai = Column(Time, nullable=True)
    is_lintas_tanggal = Column(Boolean, default=False)
    is_active = Column(Boolean, default=True)
    effective_start_date = Column(Date, nullable=False, server_default=func.current_date())
    effective_end_date = Column(Date, nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())

    shift_kelompok = relationship("ShiftKelompok", back_populates="aturan")
    unit = relationship("Unit", back_populates="shift_kelompok_aturan")
