"""
Pegawai Schemas
"""
from pydantic import BaseModel, Field, ConfigDict
from typing import Optional
from datetime import date, datetime


class PegawaiBase(BaseModel):
    """Base pegawai schema"""
    nip: Optional[str] = None
    nama: Optional[str] = None
    jenis_kelamin: Optional[str] = Field(None, pattern="^(L|P)$")
    tempat_lahir: Optional[str] = None
    tanggal_lahir: Optional[date] = None
    alamat: Optional[str] = None
    id_ruang: Optional[int] = None
    status: Optional[str] = None
    foto: Optional[str] = None


class PegawaiCreate(PegawaiBase):
    """Pegawai create schema"""
    id_pegawai: str = Field(..., min_length=1, max_length=20)


class PegawaiUpdate(PegawaiBase):
    """Pegawai update schema"""
    pass


class PegawaiResponse(PegawaiBase):
    """Pegawai response schema"""
    id_pegawai: str
    created_at: Optional[datetime] = None
    
    model_config = ConfigDict(from_attributes=True)
