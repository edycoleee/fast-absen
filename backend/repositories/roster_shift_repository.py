"""
Roster Shift Repository
"""
from sqlalchemy.orm import Session, joinedload
from models.roster_shift import RosterShift
from repositories.base import BaseRepository


class RosterShiftRepository(BaseRepository[RosterShift]):
    def __init__(self, db: Session):
        super().__init__(RosterShift, db)

    def get_all_with_relations(self, skip: int = 0, limit: int = 100) -> list[RosterShift]:
        return (
            self.db.query(RosterShift)
            .options(
                joinedload(RosterShift.upload_batch),
                joinedload(RosterShift.pegawai),
                joinedload(RosterShift.shift_kelompok),
                joinedload(RosterShift.unit),
            )
            .order_by(RosterShift.id.desc())
            .offset(skip)
            .limit(limit)
            .all()
        )

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
