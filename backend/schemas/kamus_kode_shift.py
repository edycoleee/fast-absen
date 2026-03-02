"""
Kamus Kode Shift Schemas
"""
from datetime import datetime, time
from typing import Optional
from pydantic import BaseModel, ConfigDict, Field, model_validator


class KamusKodeShiftBase(BaseModel):
    kode: str = Field(..., min_length=1, max_length=20, description="Kode shift, e.g. P1, S1, M1, L1")
    label: Optional[str] = Field(default=None, max_length=100)
    jam_mulai: Optional[time] = None
    jam_selesai: Optional[time] = None
    is_libur: bool = False
    is_active: bool = True

    @model_validator(mode="after")
    def validate_jam_required_if_not_libur(self):
        if not self.is_libur:
            if self.jam_mulai is None or self.jam_selesai is None:
                raise ValueError("jam_mulai dan jam_selesai wajib diisi jika bukan kode libur")
        return self


class KamusKodeShiftCreate(KamusKodeShiftBase):
    pass


class KamusKodeShiftUpdate(BaseModel):
    kode: Optional[str] = Field(default=None, min_length=1, max_length=20)
    label: Optional[str] = Field(default=None, max_length=100)
    jam_mulai: Optional[time] = None
    jam_selesai: Optional[time] = None
    is_libur: Optional[bool] = None
    is_active: Optional[bool] = None


class KamusKodeShiftResponse(KamusKodeShiftBase):
    id: int
    created_at: Optional[datetime] = None
    updated_at: Optional[datetime] = None

    model_config = ConfigDict(from_attributes=True)
