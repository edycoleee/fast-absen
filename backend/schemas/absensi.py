"""
Absensi Schemas
Updated with status validation and conditional keterangan requirement
"""
from pydantic import BaseModel, Field, ConfigDict, field_validator, model_validator
from typing import Optional
from datetime import datetime, date


class AbsensiBase(BaseModel):
    """Base absensi schema"""
    status: str = Field(default='HADIR', description="HADIR, IZIN, SAKIT, ALPHA, TERLAMBAT, CUTI")
    keterangan: Optional[str] = Field(None, description="Alasan/catatan (wajib untuk IZIN, SAKIT, TERLAMBAT, CUTI)")
    
    @field_validator('status')
    @classmethod
    def validate_status(cls, v):
        allowed_statuses = ['HADIR', 'IZIN', 'SAKIT', 'ALPHA', 'TERLAMBAT', 'CUTI']
        if v not in allowed_statuses:
            raise ValueError(f'status must be one of: {", ".join(allowed_statuses)}')
        return v


class AbsensiCreate(AbsensiBase):
    """Absensi create schema (check-in)"""
    # id_pegawai will be taken from JWT token
    # tanggal will default to today
    # jam_masuk will be set to current time
    dokumen_pendukung: Optional[str] = Field(None, description="Path ke file dokumen (surat dokter, dll)")
    
    @model_validator(mode='after')
    def validate_keterangan_required(self):
        """Keterangan wajib untuk status tertentu"""
        if self.status in ['IZIN', 'SAKIT', 'TERLAMBAT', 'CUTI'] and not self.keterangan:
            raise ValueError(f'Keterangan wajib diisi untuk status {self.status}')
        return self


class AbsensiCheckOut(BaseModel):
    """Check-out schema"""
    # jam_keluar will be set to current time
    pass


class AbsensiAdminCreate(AbsensiBase):
    """Absensi create schema (for admin)"""
    id_pegawai: str
    tanggal: Optional[date] = None
    jam_masuk: Optional[datetime] = None
    jam_keluar: Optional[datetime] = None
    dokumen_pendukung: Optional[str] = None
    
    @model_validator(mode='after')
    def validate_keterangan_required(self):
        """Keterangan wajib untuk status tertentu"""
        if self.status in ['IZIN', 'SAKIT', 'TERLAMBAT', 'CUTI'] and not self.keterangan:
            raise ValueError(f'Keterangan wajib diisi untuk status {self.status}')
        return self


class AbsensiUpdate(BaseModel):
    """Absensi update schema"""
    status: Optional[str] = None
    keterangan: Optional[str] = None
    jam_masuk: Optional[datetime] = None
    jam_keluar: Optional[datetime] = None
    dokumen_pendukung: Optional[str] = None
    
    @field_validator('status')
    @classmethod
    def validate_status(cls, v):
        if v:
            allowed_statuses = ['HADIR', 'IZIN', 'SAKIT', 'ALPHA', 'TERLAMBAT', 'CUTI']
            if v not in allowed_statuses:
                raise ValueError(f'status must be one of: {", ".join(allowed_statuses)}')
        return v


class AbsensiResponse(BaseModel):
    """Absensi response schema"""
    id: int
    id_pegawai: str
    tanggal: date
    jam_masuk: Optional[datetime] = None
    jam_keluar: Optional[datetime] = None
    status: str
    keterangan: Optional[str] = None
    dokumen_pendukung: Optional[str] = None
    ip_address: Optional[str] = None
    created_at: datetime
    updated_at: datetime
    
    model_config = ConfigDict(from_attributes=True)


class AbsensiDetail(AbsensiResponse):
    """Absensi detail with pegawai info"""
    pegawai_nama: Optional[str] = None
    pegawai_nip: Optional[str] = None


class AbsensiSummary(BaseModel):
    """Summary statistik absensi"""
    total_hadir: int = 0
    total_izin: int = 0
    total_sakit: int = 0
    total_alpha: int = 0
    total_terlambat: int = 0
    total_cuti: int = 0
    
    
class AbsensiTodayResponse(BaseModel):
    """Response untuk absensi hari ini"""
    has_checked_in: bool
    absensi: Optional[AbsensiResponse] = None
    can_check_out: bool = False
    can_check_in: bool = True
    completed_today: bool = False
