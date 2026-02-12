"""
Login Absensi Service
Business logic for device login tracking with dual access (admin + user)
"""
from typing import List
from sqlalchemy.orm import Session
from fastapi import HTTPException, status
from schemas.login_absensi import (
    LoginAbsensiCreate, LoginAbsensiResponse, 
    LoginAbsensiDetail, LoginAbsensiAdminCreate
)
from repositories.login_absensi_repository import LoginAbsensiRepository
from repositories.pegawai_repository import PegawaiRepository
from models.login_absensi import LoginAbsensi


class LoginAbsensiService:
    """Login Absensi service with admin and user access patterns"""
    
    def __init__(self, db: Session):
        self.db = db
        self.login_absensi_repo = LoginAbsensiRepository(db)
        self.pegawai_repo = PegawaiRepository(db)
    
    # ===== User Method =====
    
    def create_user_login(
        self,
        id_pegawai: str,
        login_data: LoginAbsensiCreate
    ) -> LoginAbsensiResponse:
        """Create login record for current user"""
        # Verify pegawai exists
        pegawai = self.pegawai_repo.get(id_pegawai)
        if not pegawai:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Pegawai with id {id_pegawai} not found"
            )
        
        # Create login absensi
        login_absensi = LoginAbsensi(
            id_pegawai=id_pegawai,
            uid=login_data.uid,
            player_id=login_data.player_id,
            model=login_data.model
        )
        
        # Save to database
        created_login = self.login_absensi_repo.create(login_absensi)
        
        return LoginAbsensiResponse.model_validate(created_login)
    
    # ===== Admin Methods =====
    
    def get_all_admin(self, skip: int = 0, limit: int = 100) -> List[LoginAbsensiDetail]:
        """Get all login absensi (admin only)"""
        login_list = self.login_absensi_repo.get_all_with_pegawai(skip=skip, limit=limit)
        
        result = []
        for login in login_list:
            login_dict = LoginAbsensiDetail.model_validate(login).model_dump()
            login_dict["pegawai_nama"] = login.pegawai.nama if login.pegawai else None
            result.append(LoginAbsensiDetail(**login_dict))
        
        return result
    
    def get_by_id_admin(self, login_id: int) -> LoginAbsensiDetail:
        """Get login absensi by ID (admin only)"""
        login = self.login_absensi_repo.get_with_pegawai(login_id)
        
        if not login:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Login Absensi with id {login_id} not found"
            )
        
        login_dict = LoginAbsensiDetail.model_validate(login).model_dump()
        login_dict["pegawai_nama"] = login.pegawai.nama if login.pegawai else None
        
        return LoginAbsensiDetail(**login_dict)
