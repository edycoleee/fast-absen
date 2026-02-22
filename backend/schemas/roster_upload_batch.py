"""
Roster Upload Batch Schemas
"""
from datetime import date, datetime
from typing import Optional, Any, Dict
from uuid import UUID
from pydantic import BaseModel, ConfigDict


class RosterUploadBatchBase(BaseModel):
    file_name: str
    file_checksum: Optional[str] = None
    period_start: Optional[date] = None
    period_end: Optional[date] = None
    uploaded_by_pegawai: Optional[str] = None
    upload_status: str = "UPLOADED"
    total_rows: int = 0
    valid_rows: int = 0
    invalid_rows: int = 0
    error_summary: Optional[Dict[str, Any]] = None


class RosterUploadBatchCreate(RosterUploadBatchBase):
    pass


class RosterUploadBatchUpdate(BaseModel):
    file_name: Optional[str] = None
    file_checksum: Optional[str] = None
    period_start: Optional[date] = None
    period_end: Optional[date] = None
    uploaded_by_pegawai: Optional[str] = None
    upload_status: Optional[str] = None
    total_rows: Optional[int] = None
    valid_rows: Optional[int] = None
    invalid_rows: Optional[int] = None
    error_summary: Optional[Dict[str, Any]] = None


class RosterUploadBatchResponse(RosterUploadBatchBase):
    id: UUID
    uploaded_by_nama: Optional[str] = None
    created_at: Optional[datetime] = None
    updated_at: Optional[datetime] = None

    model_config = ConfigDict(from_attributes=True)
