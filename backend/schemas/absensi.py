"""
Absensi Schemas
"""
from pydantic import BaseModel, Field, ConfigDict
from typing import Optional
from datetime import datetime


class AbsensiBase(BaseModel):
    """Base absensi schema"""
    id_lokasi: Optional[int] = None
    uid: Optional[str] = None
    keterangan: Optional[str] = Field(None, max_length=100)


class AbsensiCreate(AbsensiBase):
    """Absensi create schema (for user)"""
    # id_pegawai will be taken from JWT token
    pass


class AbsensiAdminCreate(AbsensiBase):
    """Absensi create schema (for admin)"""
    id_pegawai: str


class AbsensiUpdate(BaseModel):
    """Absensi update schema"""
    id_lokasi: Optional[int] = None
    uid: Optional[str] = None
    keterangan: Optional[str] = Field(None, max_length=100)
    tanggal: Optional[datetime] = None


class AbsensiResponse(AbsensiBase):
    """Absensi response schema"""
    id: int
    id_pegawai: Optional[str] = None
    tanggal: datetime
    ip_address: Optional[str] = None
    
    model_config = ConfigDict(from_attributes=True)


class AbsensiDetail(AbsensiResponse):
    """Absensi detail with pegawai info"""
    pegawai_nama: Optional[str] = None
    pegawai_nip: Optional[str] = None
