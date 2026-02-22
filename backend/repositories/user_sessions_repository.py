"""
User Sessions Repository
Database operations for UserSessionsModel
"""
from typing import List, Optional
from sqlalchemy.orm import Session, joinedload
from models.user_sessions_model import UserSessionsModel
from repositories.base import BaseRepository


class UserSessionsRepository(BaseRepository[UserSessionsModel]):
    """User sessions repository"""

    def __init__(self, db: Session):
        super().__init__(UserSessionsModel, db)

    def create(self, user_session: UserSessionsModel) -> UserSessionsModel:
        """Create new user sessions record from model instance"""
        self.db.add(user_session)
        self.db.commit()
        self.db.refresh(user_session)
        return user_session

    def get_by_pegawai(self, id_pegawai: str, skip: int = 0, limit: int = 100) -> List[UserSessionsModel]:
        """Get user sessions records by pegawai ID"""
        return (
            self.db.query(UserSessionsModel)
            .filter(UserSessionsModel.id_pegawai == id_pegawai)
            .order_by(UserSessionsModel.created_at.desc())
            .offset(skip)
            .limit(limit)
            .all()
        )

    def get_session_with_pegawai(self, session_record_id: int) -> Optional[UserSessionsModel]:
        """Get user sessions with pegawai info"""
        return (
            self.db.query(UserSessionsModel)
            .options(joinedload(UserSessionsModel.pegawai))
            .filter(UserSessionsModel.id == session_record_id)
            .first()
        )

    def get_all_with_pegawai(self, skip: int = 0, limit: int = 100) -> List[UserSessionsModel]:
        """Get all user sessions with pegawai info"""
        return (
            self.db.query(UserSessionsModel)
            .options(joinedload(UserSessionsModel.pegawai))
            .order_by(UserSessionsModel.created_at.desc())
            .offset(skip)
            .limit(limit)
            .all()
        )

    def count_all(self) -> int:
        """Count all user sessions"""
        return self.db.query(UserSessionsModel).count()
