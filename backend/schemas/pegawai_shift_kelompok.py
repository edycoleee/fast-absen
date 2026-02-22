"""
Pegawai Shift Kelompok Schemas
"""
from datetime import date, datetime
from typing import Optional
from pydantic import BaseModel, ConfigDict


class PegawaiShiftKelompokBase(BaseModel):
    id_pegawai: str
    shift_kelompok_id: int
    effective_start_date: date
    effective_end_date: Optional[date] = None
    is_default: bool = True
    catatan: Optional[str] = None


class PegawaiShiftKelompokCreate(PegawaiShiftKelompokBase):
    pass


class PegawaiShiftKelompokUpdate(BaseModel):
    id_pegawai: Optional[str] = None
    shift_kelompok_id: Optional[int] = None
    effective_start_date: Optional[date] = None
    effective_end_date: Optional[date] = None
    is_default: Optional[bool] = None
    catatan: Optional[str] = None


class PegawaiShiftKelompokResponse(PegawaiShiftKelompokBase):
    id: int
    pegawai_nama: Optional[str] = None
    shift_kelompok_nama: Optional[str] = None
    created_at: Optional[datetime] = None
    updated_at: Optional[datetime] = None

    model_config = ConfigDict(from_attributes=True)
