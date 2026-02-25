"""
Roster Shift Schemas
"""
from datetime import date, datetime
from typing import Optional
from uuid import UUID
from pydantic import BaseModel, ConfigDict


class RosterShiftBase(BaseModel):
    upload_batch_id: Optional[UUID] = None
    id_pegawai: str
    shift_kelompok_id: Optional[int] = None
    id_unit: Optional[int] = None
    tanggal_shift: date
    jam_mulai: datetime
    jam_selesai: datetime
    nomor_sesi: int = 1
    grace_telat_override_menit: Optional[int] = None
    toleransi_pulang_cepat_override_menit: Optional[int] = None
    status_roster: str = "AKTIF"
    catatan: Optional[str] = None
    source_row_number: Optional[int] = None


class RosterShiftCreate(RosterShiftBase):
    pass


class RosterShiftUpdate(BaseModel):
    upload_batch_id: Optional[UUID] = None
    id_pegawai: Optional[str] = None
    shift_kelompok_id: Optional[int] = None
    id_unit: Optional[int] = None
    tanggal_shift: Optional[date] = None
    jam_mulai: Optional[datetime] = None
    jam_selesai: Optional[datetime] = None
    nomor_sesi: Optional[int] = None
    grace_telat_override_menit: Optional[int] = None
    toleransi_pulang_cepat_override_menit: Optional[int] = None
    status_roster: Optional[str] = None
    catatan: Optional[str] = None
    source_row_number: Optional[int] = None


class RosterShiftResponse(RosterShiftBase):
    id: int
    pegawai_nama: Optional[str] = None
    shift_kelompok_nama: Optional[str] = None
    unit_nama: Optional[str] = None
    upload_batch_file_name: Optional[str] = None
    created_at: Optional[datetime] = None
    updated_at: Optional[datetime] = None

    model_config = ConfigDict(from_attributes=True)
