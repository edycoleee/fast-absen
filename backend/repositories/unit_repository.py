"""
Unit Repository
"""
from typing import Optional
from sqlalchemy.orm import Session
from models.unit import Unit
from repositories.base import BaseRepository


class UnitRepository(BaseRepository[Unit]):
    def __init__(self, db: Session):
        super().__init__(Unit, db)

    def get(self, id_unit: int) -> Optional[Unit]:
        return self.db.query(Unit).filter(Unit.id_unit == id_unit).first()

    def get_by_nama(self, nama_unit: str) -> Optional[Unit]:
        return self.db.query(Unit).filter(Unit.nama_unit == nama_unit).first()
