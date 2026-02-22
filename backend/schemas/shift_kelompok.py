"""
Shift Kelompok Schemas
"""
from datetime import datetime
from typing import Optional
from pydantic import BaseModel, ConfigDict, Field


class ShiftKelompokBase(BaseModel):
    kode: str = Field(..., min_length=1, max_length=50)
    nama: str = Field(..., min_length=1, max_length=100)
    deskripsi: Optional[str] = None
    is_shift_based: bool = True
    is_active: bool = True


class ShiftKelompokCreate(ShiftKelompokBase):
    pass


class ShiftKelompokUpdate(BaseModel):
    kode: Optional[str] = Field(default=None, min_length=1, max_length=50)
    nama: Optional[str] = Field(default=None, min_length=1, max_length=100)
    deskripsi: Optional[str] = None
    is_shift_based: Optional[bool] = None
    is_active: Optional[bool] = None


class ShiftKelompokResponse(ShiftKelompokBase):
    id: int
    created_at: Optional[datetime] = None
    updated_at: Optional[datetime] = None

    model_config = ConfigDict(from_attributes=True)
