"""
User Sessions Service
Business logic for device session tracking with dual access (admin + user)
"""
from typing import List
from sqlalchemy.orm import Session
from fastapi import HTTPException, status
from schemas.user_sessions_schema import (
    UserSessionsCreate, UserSessionsResponse,
    UserSessionsDetail,
)
from repositories.user_sessions_repository import UserSessionsRepository
from repositories.pegawai_repository import PegawaiRepository
from models.user_sessions_model import UserSessionsModel


class UserSessionsService:
    """User sessions service with admin and user access patterns"""

    def __init__(self, db: Session):
        self.db = db
        self.user_sessions_repo = UserSessionsRepository(db)
        self.pegawai_repo = PegawaiRepository(db)

    def create_user_session(
        self,
        id_pegawai: str,
        session_data: UserSessionsCreate,
    ) -> UserSessionsResponse:
        """Create session record for current user"""
        pegawai = self.pegawai_repo.get(id_pegawai)
        if not pegawai:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Pegawai with id {id_pegawai} not found"
            )

        user_session = UserSessionsModel(
            id_pegawai=id_pegawai,
            uid=session_data.uid,
            player_id=session_data.player_id,
            model=session_data.model,
        )

        created_session = self.user_sessions_repo.create(user_session)
        return UserSessionsResponse.model_validate(created_session)

    def get_all_sessions_admin(self, skip: int = 0, limit: int = 100) -> List[UserSessionsDetail]:
        """Get all user sessions (admin only)"""
        session_records = self.user_sessions_repo.get_all_with_pegawai(skip=skip, limit=limit)

        result = []
        for session_record in session_records:
            session_dict = UserSessionsDetail.model_validate(session_record).model_dump()
            session_dict["pegawai_nama"] = session_record.pegawai.nama if session_record.pegawai else None
            result.append(UserSessionsDetail(**session_dict))

        return result

    def count_all_admin(self) -> int:
        """Count all user sessions (admin only)"""
        return self.user_sessions_repo.count_all()

    def get_session_by_id_admin(self, session_record_id: int) -> UserSessionsDetail:
        """Get user sessions by ID (admin only)"""
        session_record = self.user_sessions_repo.get_session_with_pegawai(session_record_id)

        if not session_record:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"User session with id {session_record_id} not found"
            )

        session_dict = UserSessionsDetail.model_validate(session_record).model_dump()
        session_dict["pegawai_nama"] = session_record.pegawai.nama if session_record.pegawai else None

        return UserSessionsDetail(**session_dict)
