"""
Unit Repository
"""
from typing import Optional, List
from sqlalchemy.orm import Session
from sqlalchemy import or_, String
from sqlalchemy import cast
from models.unit import Unit
from repositories.base import BaseRepository


class UnitRepository(BaseRepository[Unit]):
    def __init__(self, db: Session):
        super().__init__(Unit, db)

    def get(self, id_unit: int) -> Optional[Unit]:
        return self.db.query(Unit).filter(Unit.id_unit == id_unit).first()

    def get_by_nama(self, nama_unit: str) -> Optional[Unit]:
        return self.db.query(Unit).filter(Unit.nama_unit == nama_unit).first()

    def get_all_with_search(self, skip: int = 0, limit: int = 100, search: str = '') -> List[Unit]:
        query = self.db.query(Unit)
        if search:
            like = f"%{search}%"
            query = query.filter(
                or_(
                    Unit.nama_unit.ilike(like),
                    cast(Unit.id_unit, String).ilike(like),
                )
            )
        return query.order_by(Unit.id_unit).offset(skip).limit(limit).all()

    def count_with_search(self, search: str = '') -> int:
        query = self.db.query(Unit)
        if search:
            like = f"%{search}%"
            query = query.filter(
                or_(
                    Unit.nama_unit.ilike(like),
                    cast(Unit.id_unit, String).ilike(like),
                )
            )
        return query.count()
