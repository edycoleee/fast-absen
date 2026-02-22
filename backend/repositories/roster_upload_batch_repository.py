"""
Roster Upload Batch Repository
"""
from typing import Optional
from uuid import UUID
from sqlalchemy.orm import Session, joinedload
from models.roster_upload_batch import RosterUploadBatch
from repositories.base import BaseRepository


class RosterUploadBatchRepository(BaseRepository[RosterUploadBatch]):
    def __init__(self, db: Session):
        super().__init__(RosterUploadBatch, db)

    def get_by_uuid(self, batch_id: UUID) -> Optional[RosterUploadBatch]:
        return self.db.query(RosterUploadBatch).filter(RosterUploadBatch.id == batch_id).first()

    def get_all_with_relations(self, skip: int = 0, limit: int = 100) -> list[RosterUploadBatch]:
        return (
            self.db.query(RosterUploadBatch)
            .options(joinedload(RosterUploadBatch.uploader))
            .order_by(RosterUploadBatch.created_at.desc())
            .offset(skip)
            .limit(limit)
            .all()
        )

    def get_by_uuid_with_relations(self, batch_id: UUID) -> Optional[RosterUploadBatch]:
        return (
            self.db.query(RosterUploadBatch)
            .options(joinedload(RosterUploadBatch.uploader))
            .filter(RosterUploadBatch.id == batch_id)
            .first()
        )
