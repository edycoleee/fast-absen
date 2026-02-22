"""
Approval Pengajuan Absensi Schemas
"""
from datetime import date, datetime
from typing import Optional
from pydantic import BaseModel, ConfigDict, Field


class ApprovalPengajuanAbsensiCreate(BaseModel):
    tipe_pengajuan: str = Field(
        ...,
        pattern="^(KOREKSI_MASUK|KOREKSI_KELUAR|MISSING_CHECKIN|MISSING_CHECKOUT|ALASAN_TERLAMBAT|ALASAN_PULANG_CEPAT)$"
    )
    target_tanggal: date
    alasan: str = Field(..., min_length=1)
    roster_shift_id: Optional[int] = None


class ApprovalPengajuanAbsensiDecision(BaseModel):
    action: str = Field(..., pattern="^(APPROVED|REJECTED|CANCELLED)$")
    catatan_approval: Optional[str] = None


class ApprovalPengajuanAbsensiResponse(BaseModel):
    id: int
    id_pegawai: str
    assigned_approver_id_pegawai: Optional[str] = None
    roster_shift_id: Optional[int] = None
    tipe_pengajuan: str
    target_tanggal: date
    alasan: str
    status_pengajuan: str
    approval_mode: str
    diajukan_pada: Optional[datetime] = None
    diputuskan_pada: Optional[datetime] = None
    approved_by_pegawai: Optional[str] = None
    catatan_approval: Optional[str] = None
    created_at: Optional[datetime] = None
    updated_at: Optional[datetime] = None

    model_config = ConfigDict(from_attributes=True)


class ApprovalPengajuanAbsensiLogResponse(BaseModel):
    id: int
    pengajuan_id: int
    action_by_pegawai: Optional[str] = None
    action_by_nama: Optional[str] = None
    action_type: str
    catatan: Optional[str] = None
    created_at: Optional[datetime] = None

    model_config = ConfigDict(from_attributes=True)
