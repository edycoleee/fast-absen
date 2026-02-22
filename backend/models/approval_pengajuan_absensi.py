"""
Approval Pengajuan Absensi Model
"""
from sqlalchemy import Column, BigInteger, String, Date, Text, DateTime, ForeignKey
from sqlalchemy.sql import func
from sqlalchemy.orm import relationship
from models.base import Base


class ApprovalPengajuanAbsensi(Base):
    __tablename__ = "approval_pengajuan_absensi"

    id = Column(BigInteger, primary_key=True, index=True)
    id_pegawai = Column(String(20), ForeignKey("pegawai.id_pegawai"), nullable=False)
    assigned_approver_id_pegawai = Column(String(20), ForeignKey("pegawai.id_pegawai"), nullable=True)
    roster_shift_id = Column(BigInteger, ForeignKey("roster_shift.id", ondelete="SET NULL"), nullable=True)
    tipe_pengajuan = Column(String(30), nullable=False)
    target_tanggal = Column(Date, nullable=False)
    alasan = Column(Text, nullable=False)
    status_pengajuan = Column(String(20), nullable=False, default="PENDING")
    approval_mode = Column(String(30), nullable=False, default="ATASAN_LANGSUNG")
    diajukan_pada = Column(DateTime(timezone=True), server_default=func.now())
    diputuskan_pada = Column(DateTime(timezone=True), nullable=True)
    approved_by_pegawai = Column(String(20), ForeignKey("pegawai.id_pegawai"), nullable=True)
    super_admin_override_by_pegawai = Column(String(20), ForeignKey("pegawai.id_pegawai"), nullable=True)
    super_admin_override_reason = Column(Text, nullable=True)
    catatan_approval = Column(Text, nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())

    pegawai = relationship("Pegawai", foreign_keys=[id_pegawai])
    assigned_approver = relationship("Pegawai", foreign_keys=[assigned_approver_id_pegawai])
    approved_by = relationship("Pegawai", foreign_keys=[approved_by_pegawai])
    roster_shift = relationship("RosterShift")
    logs = relationship("ApprovalPengajuanAbsensiLog", back_populates="pengajuan")
