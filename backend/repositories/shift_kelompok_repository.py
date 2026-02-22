"""
Shift Kelompok Repository
"""
from typing import Optional
from sqlalchemy.orm import Session
from models.shift_kelompok import ShiftKelompok
from repositories.base import BaseRepository


class ShiftKelompokRepository(BaseRepository[ShiftKelompok]):
    def __init__(self, db: Session):
        super().__init__(ShiftKelompok, db)

    def get_by_kode(self, kode: str) -> Optional[ShiftKelompok]:
        return self.db.query(ShiftKelompok).filter(ShiftKelompok.kode == kode).first()

    def get_by_nama(self, nama: str) -> Optional[ShiftKelompok]:
        return self.db.query(ShiftKelompok).filter(ShiftKelompok.nama == nama).first()
