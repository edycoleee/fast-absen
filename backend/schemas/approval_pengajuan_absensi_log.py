"""
Approval Pengajuan Absensi Log Schemas
"""
from datetime import datetime
from typing import Optional
from pydantic import BaseModel, ConfigDict


class ApprovalPengajuanAbsensiLogResponse(BaseModel):
    id: int
    pengajuan_id: int
    action_by_pegawai: Optional[str] = None
    action_by_nama: Optional[str] = None
    action_type: str
    catatan: Optional[str] = None
    created_at: Optional[datetime] = None

    model_config = ConfigDict(from_attributes=True)
