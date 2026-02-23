"""
Roster Shift Repository
"""
from datetime import date
from typing import Optional
from sqlalchemy.orm import Session, joinedload
from models.roster_shift import RosterShift
from repositories.base import BaseRepository


class RosterShiftRepository(BaseRepository[RosterShift]):
    def __init__(self, db: Session):
        super().__init__(RosterShift, db)

    def _base_query(
        self,
        id_pegawai: Optional[str] = None,
        tanggal_mulai: Optional[date] = None,
        tanggal_selesai: Optional[date] = None,
        jenis_shift: Optional[str] = None,
        status_roster: Optional[str] = None,
        shift_kelompok_id: Optional[int] = None,
        id_unit: Optional[int] = None,
    ):
        q = self.db.query(RosterShift)
        if id_pegawai:
            q = q.filter(RosterShift.id_pegawai.ilike(f"%{id_pegawai}%"))
        if tanggal_mulai:
            q = q.filter(RosterShift.tanggal_shift >= tanggal_mulai)
        if tanggal_selesai:
            q = q.filter(RosterShift.tanggal_shift <= tanggal_selesai)
        if jenis_shift:
            q = q.filter(RosterShift.jenis_shift == jenis_shift)
        if status_roster:
            q = q.filter(RosterShift.status_roster == status_roster)
        if shift_kelompok_id:
            q = q.filter(RosterShift.shift_kelompok_id == shift_kelompok_id)
        if id_unit:
            q = q.filter(RosterShift.id_unit == id_unit)
        return q

    def get_all_with_relations(
        self,
        skip: int = 0,
        limit: int = 100,
        id_pegawai: Optional[str] = None,
        tanggal_mulai: Optional[date] = None,
        tanggal_selesai: Optional[date] = None,
        jenis_shift: Optional[str] = None,
        status_roster: Optional[str] = None,
        shift_kelompok_id: Optional[int] = None,
        id_unit: Optional[int] = None,
    ) -> list[RosterShift]:
        return (
            self._base_query(id_pegawai, tanggal_mulai, tanggal_selesai, jenis_shift, status_roster, shift_kelompok_id, id_unit)
            .options(
                joinedload(RosterShift.pegawai),
                joinedload(RosterShift.shift_kelompok),
                joinedload(RosterShift.unit),
            )
            .order_by(RosterShift.tanggal_shift.desc(), RosterShift.id.desc())
            .offset(skip)
            .limit(limit)
            .all()
        )

    def count_filtered(
        self,
        id_pegawai: Optional[str] = None,
        tanggal_mulai: Optional[date] = None,
        tanggal_selesai: Optional[date] = None,
        jenis_shift: Optional[str] = None,
        status_roster: Optional[str] = None,
        shift_kelompok_id: Optional[int] = None,
        id_unit: Optional[int] = None,
    ) -> int:
        return self._base_query(id_pegawai, tanggal_mulai, tanggal_selesai, jenis_shift, status_roster, shift_kelompok_id, id_unit).count()

    def get_by_id_with_relations(self, roster_id: int) -> RosterShift | None:
        return (
            self.db.query(RosterShift)
            .options(
                joinedload(RosterShift.upload_batch),
                joinedload(RosterShift.pegawai),
                joinedload(RosterShift.shift_kelompok),
                joinedload(RosterShift.unit),
            )
            .filter(RosterShift.id == roster_id)
            .first()
        )
