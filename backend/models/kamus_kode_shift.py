"""
Kamus Kode Shift Model
Master tabel kode shift (P1, S1, M1, L1, dst.) beserta jam dan jenisnya.
Digunakan oleh RosterAdapterPage sebagai kamus yang persisten.
"""
from sqlalchemy import Column, Integer, String, Boolean, Time, DateTime
from sqlalchemy.sql import func
from models.base import Base


class KamusKodeShift(Base):
    __tablename__ = "kamus_kode_shift"

    id = Column(Integer, primary_key=True, index=True)
    kode = Column(String(20), unique=True, nullable=False, index=True)
    label = Column(String(100), nullable=True)
    jam_mulai = Column(Time, nullable=True)      # NULL jika is_libur=True
    jam_selesai = Column(Time, nullable=True)    # NULL jika is_libur=True
    is_libur = Column(Boolean, nullable=False, default=False)
    is_active = Column(Boolean, nullable=False, default=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())
