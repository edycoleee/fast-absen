"""
Kamus Pola Shift Repository
"""
from typing import List, Optional
from sqlalchemy.orm import Session
from models.kamus_pola_shift import KamusPolaShift
from repositories.base import BaseRepository


class KamusPolaShiftRepository(BaseRepository[KamusPolaShift]):
    def __init__(self, db: Session):
        super().__init__(KamusPolaShift, db)

    def get_by_nama(self, nama: str) -> Optional[KamusPolaShift]:
        return self.db.query(KamusPolaShift).filter(KamusPolaShift.nama == nama).first()

    def get_all_active(self) -> List[KamusPolaShift]:
        return (
            self.db.query(KamusPolaShift)
            .filter(KamusPolaShift.is_active == True)
            .order_by(KamusPolaShift.id.asc())
            .all()
        )
