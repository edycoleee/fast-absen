"""
Roster Shift Model
"""
from sqlalchemy import Column, BigInteger, Integer, String, SmallInteger, Date, DateTime, Text, ForeignKey
from sqlalchemy.sql import func
from sqlalchemy.orm import relationship
from models.base import Base
from models.types import GUID


class RosterShift(Base):
    __tablename__ = "roster_shift"

    id = Column(BigInteger, primary_key=True, index=True)
    upload_batch_id = Column(GUID(), ForeignKey("roster_upload_batch.id", ondelete="SET NULL"), nullable=True)
    id_pegawai = Column(String(20), ForeignKey("pegawai.id_pegawai", ondelete="CASCADE"), nullable=False)
    shift_kelompok_id = Column(Integer, ForeignKey("shift_kelompok.id"), nullable=True)
    id_unit = Column(Integer, ForeignKey("unit.id_unit"), nullable=True)
    tanggal_shift = Column(Date, nullable=False)
    jam_mulai = Column(DateTime(timezone=True), nullable=False)
    jam_selesai = Column(DateTime(timezone=True), nullable=False)
    nomor_sesi = Column(SmallInteger, nullable=False, default=1)
    grace_telat_override_menit = Column(Integer, nullable=True)
    toleransi_pulang_cepat_override_menit = Column(Integer, nullable=True)
    status_roster = Column(String(20), nullable=False, default="AKTIF")
    catatan = Column(Text, nullable=True)
    source_row_number = Column(Integer, nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())

    upload_batch = relationship("RosterUploadBatch", back_populates="roster_shifts")
    pegawai = relationship("Pegawai", back_populates="roster_shifts")
    shift_kelompok = relationship("ShiftKelompok", back_populates="roster_shifts")
    unit = relationship("Unit", back_populates="roster_shifts")
    penilaian = relationship("PenilaianShiftAbsensi", back_populates="roster_shift", uselist=False)
