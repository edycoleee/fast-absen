"""
Shift Kelompok Aturan Repository
"""
from sqlalchemy.orm import Session
from models.shift_kelompok_aturan import ShiftKelompokAturan
from repositories.base import BaseRepository


class ShiftKelompokAturanRepository(BaseRepository[ShiftKelompokAturan]):
    def __init__(self, db: Session):
        super().__init__(ShiftKelompokAturan, db)
