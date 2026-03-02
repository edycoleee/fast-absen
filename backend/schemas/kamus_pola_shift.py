"""
Kamus Pola Shift Schemas
"""
from datetime import datetime
from typing import List, Optional
from pydantic import BaseModel, ConfigDict, Field, field_validator, computed_field


class KamusPolaShiftBase(BaseModel):
    nama: str = Field(..., min_length=1, max_length=100, description="Nama pola, e.g. 'Shift 4-Hari IGD'")
    pola: str = Field(..., min_length=1, description="Kode shift CSV, e.g. 'P1,S1,M1,L1,L1'")
    offset_default: int = Field(default=0, ge=0, description="Offset posisi awal pola (0 = dari awal)")
    deskripsi: Optional[str] = None
    is_active: bool = True

    @field_validator("pola")
    @classmethod
    def validate_pola(cls, v: str) -> str:
        items = [k.strip() for k in v.split(",")]
        if not items or any(k == "" for k in items):
            raise ValueError("Pola harus berisi kode shift dipisah koma tanpa spasi kosong, e.g. 'P1,S1,M1,L1'")
        return ",".join(k.upper() for k in items)


class KamusPolaShiftCreate(KamusPolaShiftBase):
    pass


class KamusPolaShiftUpdate(BaseModel):
    nama: Optional[str] = Field(default=None, min_length=1, max_length=100)
    pola: Optional[str] = None
    offset_default: Optional[int] = Field(default=None, ge=0)
    deskripsi: Optional[str] = None
    is_active: Optional[bool] = None

    @field_validator("pola")
    @classmethod
    def validate_pola(cls, v: Optional[str]) -> Optional[str]:
        if v is None:
            return v
        items = [k.strip() for k in v.split(",")]
        if not items or any(k == "" for k in items):
            raise ValueError("Pola harus berisi kode shift dipisah koma tanpa spasi kosong")
        return ",".join(k.upper() for k in items)


class KamusPolaShiftResponse(KamusPolaShiftBase):
    id: int
    created_at: Optional[datetime] = None
    updated_at: Optional[datetime] = None

    model_config = ConfigDict(from_attributes=True)

    @computed_field
    @property
    def panjang_siklus(self) -> int:
        return len(self.pola.split(","))
