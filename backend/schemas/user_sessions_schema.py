"""
User Sessions Schemas
"""
from pydantic import BaseModel, Field, ConfigDict
from typing import Optional
from datetime import datetime


class UserSessionsBase(BaseModel):
    """Base user sessions schema"""
    uid: Optional[str] = None
    player_id: Optional[str] = None
    model: Optional[str] = Field(None, max_length=250)


class UserSessionsCreate(UserSessionsBase):
    """User sessions create schema"""
    pass


class UserSessionsAdminCreate(UserSessionsBase):
    """User sessions create schema (for admin)"""
    id_pegawai: str


class UserSessionsResponse(UserSessionsBase):
    """User sessions response schema"""
    id: int
    id_pegawai: Optional[str] = None
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)


class UserSessionsDetail(UserSessionsResponse):
    """User sessions detail with pegawai info"""
    pegawai_nama: Optional[str] = None
