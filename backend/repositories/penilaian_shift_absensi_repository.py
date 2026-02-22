"""
Penilaian Shift Absensi Repository
"""
from sqlalchemy.orm import Session, joinedload
from models.penilaian_shift_absensi import PenilaianShiftAbsensi
from repositories.base import BaseRepository


class PenilaianShiftAbsensiRepository(BaseRepository[PenilaianShiftAbsensi]):
    def __init__(self, db: Session):
        super().__init__(PenilaianShiftAbsensi, db)

    def get_all_with_relations(self, skip: int = 0, limit: int = 100) -> list[PenilaianShiftAbsensi]:
        return (
            self.db.query(PenilaianShiftAbsensi)
            .options(
                joinedload(PenilaianShiftAbsensi.pegawai),
                joinedload(PenilaianShiftAbsensi.roster_shift),
                joinedload(PenilaianShiftAbsensi.approved_by),
            )
            .order_by(PenilaianShiftAbsensi.evaluated_at.desc())
            .offset(skip)
            .limit(limit)
            .all()
        )

    def get_by_id_with_relations(self, penilaian_id: int) -> PenilaianShiftAbsensi | None:
        return (
            self.db.query(PenilaianShiftAbsensi)
            .options(
                joinedload(PenilaianShiftAbsensi.pegawai),
                joinedload(PenilaianShiftAbsensi.roster_shift),
                joinedload(PenilaianShiftAbsensi.approved_by),
            )
            .filter(PenilaianShiftAbsensi.id == penilaian_id)
            .first()
        )
