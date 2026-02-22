"""
Penilaian Shift Absensi Model
"""
from sqlalchemy import Column, BigInteger, Integer, String, DateTime, Text, Boolean, ForeignKey, JSON
from sqlalchemy.sql import func
from sqlalchemy.orm import relationship
from models.base import Base


class PenilaianShiftAbsensi(Base):
    __tablename__ = "penilaian_shift_absensi"

    id = Column(BigInteger, primary_key=True, index=True)
    roster_shift_id = Column(BigInteger, ForeignKey("roster_shift.id", ondelete="CASCADE"), nullable=False, unique=True)
    id_pegawai = Column(String(20), ForeignKey("pegawai.id_pegawai", ondelete="CASCADE"), nullable=False)
    matched_absensi_id = Column(Integer, ForeignKey("absensi.id", ondelete="SET NULL"), nullable=True)
    checkin_aktual = Column(DateTime(timezone=True), nullable=True)
    checkout_aktual = Column(DateTime(timezone=True), nullable=True)
    menit_telat = Column(Integer, nullable=False, default=0)
    menit_pulang_cepat = Column(Integer, nullable=False, default=0)
    menit_lembur = Column(Integer, nullable=False, default=0)
    status_final = Column(String(30), nullable=False)
    status_detail = Column(JSON, nullable=True)
    evaluated_at = Column(DateTime(timezone=True), server_default=func.now())
    evaluation_version = Column(Integer, nullable=False, default=1)
    is_manual_override = Column(Boolean, default=False)
    override_reason = Column(Text, nullable=True)
    approved_by_pegawai = Column(String(20), ForeignKey("pegawai.id_pegawai", ondelete="SET NULL"), nullable=True)
    approved_at = Column(DateTime(timezone=True), nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())

    roster_shift = relationship("RosterShift", back_populates="penilaian")
    pegawai = relationship("Pegawai", foreign_keys=[id_pegawai], back_populates="penilaian_shift_absensi")
    matched_absensi = relationship("Absensi", back_populates="penilaian_shift_absensi")
    approved_by = relationship("Pegawai", foreign_keys=[approved_by_pegawai], back_populates="approved_penilaian_shift_absensi")
