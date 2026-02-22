"""
Pegawai Model
"""
from sqlalchemy import Column, String, Integer, Date, Text, DateTime, ForeignKey
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
    id_unit = Column(Integer, ForeignKey("unit.id_unit"), nullable=True)
    kepala_id_unit = Column(Integer, ForeignKey("unit.id_unit"), nullable=True)
    status = Column(String(20), nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    foto = Column(String(255), nullable=True)

    # Relationships
    users = relationship("User", back_populates="pegawai")
    absensi = relationship("Absensi", back_populates="pegawai")
    user_sessions = relationship("UserSession", back_populates="pegawai")
    unit = relationship("Unit", foreign_keys=[id_unit], back_populates="pegawai")
    kepala_unit = relationship("Unit", foreign_keys=[kepala_id_unit])
    pegawai_shift_kelompok = relationship("PegawaiShiftKelompok", back_populates="pegawai")
    uploaded_roster_batches = relationship("RosterUploadBatch", back_populates="uploader")
    roster_shifts = relationship("RosterShift", back_populates="pegawai")
    penilaian_shift_absensi = relationship("PenilaianShiftAbsensi", foreign_keys="PenilaianShiftAbsensi.id_pegawai", back_populates="pegawai")
    approved_penilaian_shift_absensi = relationship("PenilaianShiftAbsensi", foreign_keys="PenilaianShiftAbsensi.approved_by_pegawai", back_populates="approved_by")
    approval_pengajuan_logs = relationship("ApprovalPengajuanAbsensiLog", back_populates="action_by")
