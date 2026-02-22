"""
Unit Schemas
"""
from datetime import datetime
from typing import Optional
from pydantic import BaseModel, ConfigDict, Field


class UnitBase(BaseModel):
    nama_unit: str = Field(..., min_length=1, max_length=150)
    status: str = Field(default="Aktif", pattern="^(Aktif|Tidak Aktif)$")


class UnitCreate(UnitBase):
    id_unit: int


class UnitUpdate(BaseModel):
    nama_unit: Optional[str] = Field(default=None, min_length=1, max_length=150)
    status: Optional[str] = Field(default=None, pattern="^(Aktif|Tidak Aktif)$")


class UnitResponse(UnitBase):
    id_unit: int
    created_at: Optional[datetime] = None
    updated_at: Optional[datetime] = None

    model_config = ConfigDict(from_attributes=True)
