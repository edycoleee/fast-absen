"""
Approval Pengajuan Absensi Log Model
"""
from sqlalchemy import Column, BigInteger, String, Text, DateTime, ForeignKey
from sqlalchemy.sql import func
from sqlalchemy.orm import relationship
from models.base import Base


class ApprovalPengajuanAbsensiLog(Base):
    __tablename__ = "approval_pengajuan_absensi_log"

    id = Column(BigInteger, primary_key=True, index=True)
    pengajuan_id = Column(BigInteger, ForeignKey("approval_pengajuan_absensi.id"), nullable=False, index=True)
    action_by_pegawai = Column(String(20), ForeignKey("pegawai.id_pegawai"), nullable=True)
    action_type = Column(String(30), nullable=False)
    catatan = Column(Text, nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    pengajuan = relationship("ApprovalPengajuanAbsensi", back_populates="logs")
    action_by = relationship("Pegawai", back_populates="approval_pengajuan_logs")
