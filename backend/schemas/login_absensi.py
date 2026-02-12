"""
Login Absensi Schemas
"""
from pydantic import BaseModel, Field, ConfigDict
from typing import Optional
from datetime import datetime


class LoginAbsensiBase(BaseModel):
    """Base login absensi schema"""
    uid: Optional[str] = None
    player_id: Optional[str] = None
    model: Optional[str] = Field(None, max_length=250)


class LoginAbsensiCreate(LoginAbsensiBase):
    """Login absensi create schema"""
    # id_pegawai will be taken from JWT token if user role
    pass


class LoginAbsensiAdminCreate(LoginAbsensiBase):
    """Login absensi create schema (for admin)"""
    id_pegawai: str


class LoginAbsensiResponse(LoginAbsensiBase):
    """Login absensi response schema"""
    id: int
    id_pegawai: Optional[str] = None
    created_at: datetime
    
    model_config = ConfigDict(from_attributes=True)


class LoginAbsensiDetail(LoginAbsensiResponse):
    """Login absensi detail with pegawai info"""
    pegawai_nama: Optional[str] = None
