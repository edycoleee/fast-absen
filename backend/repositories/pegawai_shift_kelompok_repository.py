"""
Pegawai Shift Kelompok Repository
"""
from sqlalchemy.orm import Session
from sqlalchemy.orm import joinedload
from models.pegawai_shift_kelompok import PegawaiShiftKelompok
from repositories.base import BaseRepository


class PegawaiShiftKelompokRepository(BaseRepository[PegawaiShiftKelompok]):
    def __init__(self, db: Session):
        super().__init__(PegawaiShiftKelompok, db)

    def get_all_with_relations(self, skip: int = 0, limit: int = 100) -> list[PegawaiShiftKelompok]:
        return (
            self.db.query(PegawaiShiftKelompok)
            .options(
                joinedload(PegawaiShiftKelompok.pegawai),
                joinedload(PegawaiShiftKelompok.shift_kelompok),
            )
            .order_by(PegawaiShiftKelompok.id.desc())
            .offset(skip)
            .limit(limit)
            .all()
        )

    def get_by_id_with_relations(self, assignment_id: int) -> PegawaiShiftKelompok | None:
        return (
            self.db.query(PegawaiShiftKelompok)
            .options(
                joinedload(PegawaiShiftKelompok.pegawai),
                joinedload(PegawaiShiftKelompok.shift_kelompok),
            )
            .filter(PegawaiShiftKelompok.id == assignment_id)
            .first()
        )
