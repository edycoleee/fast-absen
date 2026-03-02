"""
Kamus Kode Shift Repository
"""
from typing import List, Optional
from sqlalchemy.orm import Session
from models.kamus_kode_shift import KamusKodeShift
from repositories.base import BaseRepository


class KamusKodeShiftRepository(BaseRepository[KamusKodeShift]):
    def __init__(self, db: Session):
        super().__init__(KamusKodeShift, db)

    def get_by_kode(self, kode: str) -> Optional[KamusKodeShift]:
        return self.db.query(KamusKodeShift).filter(KamusKodeShift.kode == kode).first()

    def get_all_active(self) -> List[KamusKodeShift]:
        return (
            self.db.query(KamusKodeShift)
            .filter(KamusKodeShift.is_active == True)
            .order_by(KamusKodeShift.id.asc())
            .all()
        )
