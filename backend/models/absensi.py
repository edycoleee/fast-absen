"""
Absensi Model
Updated schema with jam_masuk, jam_keluar, status, and validation
"""
from sqlalchemy import Column, Integer, String, ForeignKey, DateTime, Date, Text, CheckConstraint
from sqlalchemy.dialects.postgresql import INET
from sqlalchemy.sql import func
from sqlalchemy.orm import relationship
from sqlalchemy.types import TypeDecorator, String as SQLString
from models.base import Base


class IPAddress(TypeDecorator):
    """
    Custom SQLAlchemy type for IP addresses
    Uses INET for PostgreSQL, String for other databases (like SQLite)
    """
    impl = SQLString
    cache_ok = True
    
    def load_dialect_impl(self, dialect):
        if dialect.name == 'postgresql':
            return dialect.type_descriptor(INET())
        else:
            return dialect.type_descriptor(SQLString(45))  # Max length for IPv6
    

class Absensi(Base):
    __tablename__ = "absensi"

    id = Column(Integer, primary_key=True, index=True)
    id_pegawai = Column(String(20), ForeignKey("pegawai.id_pegawai"), nullable=False, index=True)
    tanggal = Column(Date, nullable=False, server_default=func.current_date())
    
    # Check-in and Check-out times
    jam_masuk = Column(DateTime(timezone=True), nullable=True)
    jam_keluar = Column(DateTime(timezone=True), nullable=True)
    
    # Status - structured data
    status = Column(String(20), default='HADIR', nullable=False)  # HADIR, IZIN, SAKIT, ALPHA, TERLAMBAT, CUTI
    
    # Keterangan - freetext for user explanation
    keterangan = Column(Text, nullable=True)
    
    # Dokumen pendukung (optional)
    dokumen_pendukung = Column(String(255), nullable=True)
    
    # Network info
    ip_address = Column(IPAddress, nullable=True)
    
    # Metadata
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())
    
    # Constraints
    __table_args__ = (
        CheckConstraint(
            "status IN ('HADIR', 'IZIN', 'SAKIT', 'ALPHA', 'TERLAMBAT', 'CUTI')", 
            name='check_absensi_status'
        ),
    )

    # Relationships
    pegawai = relationship("Pegawai", back_populates="absensi")
    penilaian_shift_absensi = relationship("PenilaianShiftAbsensi", back_populates="matched_absensi")
