"""
Penilaian Shift Absensi Schemas
"""
from datetime import date, datetime
from typing import Optional, Any, Dict
from pydantic import BaseModel, ConfigDict


class PenilaianShiftAbsensiBase(BaseModel):
    roster_shift_id: int
    id_pegawai: str
    matched_absensi_id: Optional[int] = None
    checkin_aktual: Optional[datetime] = None
    checkout_aktual: Optional[datetime] = None
    menit_telat: int = 0
    menit_pulang_cepat: int = 0
    menit_lembur: int = 0
    status_final: str
    status_detail: Optional[Dict[str, Any]] = None
    evaluated_at: Optional[datetime] = None
    evaluation_version: int = 1
    is_manual_override: bool = False
    override_reason: Optional[str] = None
    approved_by_pegawai: Optional[str] = None
    approved_at: Optional[datetime] = None


class PenilaianShiftAbsensiCreate(PenilaianShiftAbsensiBase):
    pass


class PenilaianShiftAbsensiUpdate(BaseModel):
    roster_shift_id: Optional[int] = None
    id_pegawai: Optional[str] = None
    matched_absensi_id: Optional[int] = None
    checkin_aktual: Optional[datetime] = None
    checkout_aktual: Optional[datetime] = None
    menit_telat: Optional[int] = None
    menit_pulang_cepat: Optional[int] = None
    menit_lembur: Optional[int] = None
    status_final: Optional[str] = None
    status_detail: Optional[Dict[str, Any]] = None
    evaluated_at: Optional[datetime] = None
    evaluation_version: Optional[int] = None
    is_manual_override: Optional[bool] = None
    override_reason: Optional[str] = None
    approved_by_pegawai: Optional[str] = None
    approved_at: Optional[datetime] = None


class PenilaianShiftAbsensiResponse(PenilaianShiftAbsensiBase):
    id: int
    pegawai_nama: Optional[str] = None
    approved_by_nama: Optional[str] = None
    roster_tanggal_shift: Optional[date] = None
    roster_status: Optional[str] = None
    created_at: Optional[datetime] = None
    updated_at: Optional[datetime] = None

    model_config = ConfigDict(from_attributes=True)


class PenilaianShiftAbsensiEvaluateRequest(BaseModel):
    start_date: Optional[date] = None
    end_date: Optional[date] = None
    id_unit: Optional[int] = None
    id_pegawai: Optional[str] = None
    force_recalculate: bool = False


class PenilaianShiftAbsensiEvaluateResponse(BaseModel):
    total_roster: int
    evaluated_count: int
    created_count: int
    updated_count: int
    skipped_manual_override: int
    skipped_existing: int
    failed_count: int
    failures: list[dict]
