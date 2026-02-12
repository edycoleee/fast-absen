"""
Absensi Model
"""
from sqlalchemy import Column, Integer, String, ForeignKey, DateTime
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
    id_lokasi = Column(Integer, nullable=True)
    id_pegawai = Column(String(20), ForeignKey("pegawai.id_pegawai"), nullable=True, index=True)
    uid = Column(String(50), nullable=True)
    tanggal = Column(DateTime(timezone=True), server_default=func.now())
    keterangan = Column(String(100), nullable=True)
    ip_address = Column(IPAddress, nullable=True)

    # Relationships
    pegawai = relationship("Pegawai", back_populates="absensi")
