"""
Roster Upload Batch Model
"""
from sqlalchemy import Column, String, Integer, Date, DateTime, ForeignKey
from sqlalchemy.sql import func
from sqlalchemy.orm import relationship
from models.base import Base
from models.types import GUID, JSONBCompat


class RosterUploadBatch(Base):
    __tablename__ = "roster_upload_batch"

    id = Column(GUID(), primary_key=True, server_default=func.uuid_generate_v4())
    file_name = Column(String(255), nullable=False)
    file_checksum = Column(String(128), nullable=True)
    period_start = Column(Date, nullable=True)
    period_end = Column(Date, nullable=True)
    uploaded_by_pegawai = Column(String(20), ForeignKey("pegawai.id_pegawai", ondelete="SET NULL"), nullable=True)
    upload_status = Column(String(20), nullable=False, default="UPLOADED")
    total_rows = Column(Integer, default=0)
    valid_rows = Column(Integer, default=0)
    invalid_rows = Column(Integer, default=0)
    error_summary = Column(JSONBCompat(), nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())

    uploader = relationship("Pegawai", back_populates="uploaded_roster_batches")
    roster_shifts = relationship("RosterShift", back_populates="upload_batch")
