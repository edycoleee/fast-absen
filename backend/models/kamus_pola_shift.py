"""
Kamus Pola Shift Model
Master pola shift berulang, e.g. "P1,S1,M1,L1,L1" → siklus 5 hari.
Offset menentukan posisi awal pola pada hari pertama bulan.
"""
from sqlalchemy import Column, Integer, String, Text, Boolean, DateTime
from sqlalchemy.sql import func
from models.base import Base


class KamusPolaShift(Base):
    __tablename__ = "kamus_pola_shift"

    id = Column(Integer, primary_key=True, index=True)
    nama = Column(String(100), unique=True, nullable=False)
    pola = Column(Text, nullable=False)              # CSV: "P1,S1,M1,L1,L1"
    offset_default = Column(Integer, nullable=False, default=0)
    deskripsi = Column(Text, nullable=True)
    is_active = Column(Boolean, nullable=False, default=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())
