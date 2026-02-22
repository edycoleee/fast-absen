"""
Shift Kelompok Aturan Schemas
"""
from datetime import date, datetime, time
from typing import Optional
from pydantic import BaseModel, ConfigDict


class ShiftKelompokAturanBase(BaseModel):
    shift_kelompok_id: int
    id_unit: Optional[int] = None
    grace_telat_menit: int = 10
    toleransi_pulang_cepat_menit: int = 0
    batas_lembur_menit: int = 0
    window_mulai_minus_menit: int = 120
    window_selesai_plus_menit: int = 240
    maks_sesi_per_hari: int = 1
    fleksibel_masuk_mulai: Optional[time] = None
    fleksibel_masuk_sampai: Optional[time] = None
    is_lintas_tanggal: bool = False
    is_active: bool = True
    effective_start_date: date
    effective_end_date: Optional[date] = None


class ShiftKelompokAturanCreate(ShiftKelompokAturanBase):
    pass


class ShiftKelompokAturanUpdate(BaseModel):
    shift_kelompok_id: Optional[int] = None
    id_unit: Optional[int] = None
    grace_telat_menit: Optional[int] = None
    toleransi_pulang_cepat_menit: Optional[int] = None
    batas_lembur_menit: Optional[int] = None
    window_mulai_minus_menit: Optional[int] = None
    window_selesai_plus_menit: Optional[int] = None
    maks_sesi_per_hari: Optional[int] = None
    fleksibel_masuk_mulai: Optional[time] = None
    fleksibel_masuk_sampai: Optional[time] = None
    is_lintas_tanggal: Optional[bool] = None
    is_active: Optional[bool] = None
    effective_start_date: Optional[date] = None
    effective_end_date: Optional[date] = None


class ShiftKelompokAturanResponse(ShiftKelompokAturanBase):
    id: int
    created_at: Optional[datetime] = None
    updated_at: Optional[datetime] = None

    model_config = ConfigDict(from_attributes=True)
