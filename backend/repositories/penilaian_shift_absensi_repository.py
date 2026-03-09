"""
Penilaian Shift Absensi Repository
"""
from datetime import date
from typing import Optional
from sqlalchemy.orm import Session, joinedload
from models.penilaian_shift_absensi import PenilaianShiftAbsensi
from models.roster_shift import RosterShift
from models.pegawai import Pegawai
from repositories.base import BaseRepository


class PenilaianShiftAbsensiRepository(BaseRepository[PenilaianShiftAbsensi]):
    def __init__(self, db: Session):
        super().__init__(PenilaianShiftAbsensi, db)

    def _base_query(
        self,
        start_date: Optional[date] = None,
        end_date: Optional[date] = None,
        id_unit: Optional[int] = None,
        id_pegawai: Optional[str] = None,
        status_final: Optional[str] = None,
    ):
        q = (
            self.db.query(PenilaianShiftAbsensi)
            .join(RosterShift, RosterShift.id == PenilaianShiftAbsensi.roster_shift_id, isouter=True)
        )
        if start_date:
            q = q.filter(RosterShift.tanggal_shift >= start_date)
        if end_date:
            q = q.filter(RosterShift.tanggal_shift <= end_date)
        if id_pegawai:
            q = q.filter(PenilaianShiftAbsensi.id_pegawai == id_pegawai)
        if status_final:
            q = q.filter(PenilaianShiftAbsensi.status_final == status_final.upper())
        if id_unit is not None:
            q = q.join(Pegawai, Pegawai.id_pegawai == PenilaianShiftAbsensi.id_pegawai, isouter=True)
            q = q.filter(Pegawai.id_unit == id_unit)
        return q

    def get_all_with_relations(
        self,
        skip: int = 0,
        limit: int = 100,
        start_date: Optional[date] = None,
        end_date: Optional[date] = None,
        id_unit: Optional[int] = None,
        id_pegawai: Optional[str] = None,
        status_final: Optional[str] = None,
    ) -> list[PenilaianShiftAbsensi]:
        return (
            self._base_query(start_date, end_date, id_unit, id_pegawai, status_final)
            .options(
                joinedload(PenilaianShiftAbsensi.pegawai),
                joinedload(PenilaianShiftAbsensi.roster_shift),
                joinedload(PenilaianShiftAbsensi.approved_by),
            )
            .order_by(RosterShift.tanggal_shift.desc(), PenilaianShiftAbsensi.id.desc())
            .offset(skip)
            .limit(limit)
            .all()
        )

    def count_filtered(
        self,
        start_date: Optional[date] = None,
        end_date: Optional[date] = None,
        id_unit: Optional[int] = None,
        id_pegawai: Optional[str] = None,
        status_final: Optional[str] = None,
    ) -> int:
        return self._base_query(start_date, end_date, id_unit, id_pegawai, status_final).count()

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
