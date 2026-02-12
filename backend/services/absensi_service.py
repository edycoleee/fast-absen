"""
Absensi Service
Business logic for attendance management with dual access (admin + user)
"""
from typing import List, Optional
from datetime import datetime
from sqlalchemy.orm import Session
from fastapi import HTTPException, status, Request
from schemas.absensi import (
    AbsensiCreate, AbsensiUpdate, AbsensiResponse, 
    AbsensiDetail, AbsensiAdminCreate
)
from repositories.absensi_repository import AbsensiRepository
from repositories.pegawai_repository import PegawaiRepository
from models.absensi import Absensi


class AbsensiService:
    """Absensi service with admin and user access patterns"""
    
    def __init__(self, db: Session):
        self.db = db
        self.absensi_repo = AbsensiRepository(db)
        self.pegawai_repo = PegawaiRepository(db)
    
    # ===== Admin Methods =====
    
    def get_all_admin(self, skip: int = 0, limit: int = 100) -> List[AbsensiDetail]:
        """Get all absensi (admin only)"""
        absensi_list = self.absensi_repo.get_all_with_pegawai(skip=skip, limit=limit)
        
        result = []
        for absensi in absensi_list:
            absensi_dict = AbsensiDetail.model_validate(absensi).model_dump()
            absensi_dict["pegawai_nama"] = absensi.pegawai.nama if absensi.pegawai else None
            absensi_dict["pegawai_nip"] = absensi.pegawai.nip if absensi.pegawai else None
            result.append(AbsensiDetail(**absensi_dict))
        
        return result
    
    def get_by_id_admin(self, absensi_id: int) -> AbsensiDetail:
        """Get absensi by ID (admin only)"""
        absensi = self.absensi_repo.get_with_pegawai(absensi_id)
        
        if not absensi:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Absensi with id {absensi_id} not found"
            )
        
        absensi_dict = AbsensiDetail.model_validate(absensi).model_dump()
        absensi_dict["pegawai_nama"] = absensi.pegawai.nama if absensi.pegawai else None
        absensi_dict["pegawai_nip"] = absensi.pegawai.nip if absensi.pegawai else None
        
        return AbsensiDetail(**absensi_dict)
    
    def update_admin(self, absensi_id: int, absensi_data: AbsensiUpdate) -> AbsensiResponse:
        """Update absensi (admin only)"""
        absensi = self.absensi_repo.get(absensi_id)
        
        if not absensi:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Absensi with id {absensi_id} not found"
            )
        
        # Update fields
        update_data = absensi_data.model_dump(exclude_unset=True)
        
        for field, value in update_data.items():
            setattr(absensi, field, value)
        
        # Save to database
        updated_absensi = self.absensi_repo.update(absensi)
        
        return AbsensiResponse.model_validate(updated_absensi)
    
    def delete_admin(self, absensi_id: int) -> None:
        """Delete absensi (admin only)"""
        absensi = self.absensi_repo.get(absensi_id)
        
        if not absensi:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Absensi with id {absensi_id} not found"
            )
        
        self.absensi_repo.delete(absensi_id)
    
    # ===== User Methods =====
    
    async def create_user_absensi(
        self,
        id_pegawai: str,
        absensi_data: AbsensiCreate,
        request: Request
    ) -> AbsensiResponse:
        """Create absensi for current user (captures IP address)"""
        # Verify pegawai exists
        pegawai = self.pegawai_repo.get(id_pegawai)
        if not pegawai:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Pegawai with id {id_pegawai} not found"
            )
        
        # Capture IP address from request
        client_ip = request.client.host if request.client else None
        
        # Create absensi
        absensi = Absensi(
            id_pegawai=id_pegawai,
            id_lokasi=absensi_data.id_lokasi,
            uid=absensi_data.uid,
            keterangan=absensi_data.keterangan,
            ip_address=client_ip
        )
        
        # Save to database
        created_absensi = self.absensi_repo.create(absensi)
        
        return AbsensiResponse.model_validate(created_absensi)
    
    def get_user_absensi(
        self, 
        id_pegawai: str, 
        skip: int = 0, 
        limit: int = 100
    ) -> List[AbsensiResponse]:
        """Get absensi for current user"""
        absensi_list = self.absensi_repo.get_by_pegawai(id_pegawai, skip=skip, limit=limit)
        return [AbsensiResponse.model_validate(a) for a in absensi_list]
    
    def get_user_absensi_by_id(self, id_pegawai: str, absensi_id: int) -> AbsensiResponse:
        """Get specific absensi for current user"""
        absensi = self.absensi_repo.get_by_pegawai_and_id(id_pegawai, absensi_id)
        
        if not absensi:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Absensi with id {absensi_id} not found for your account"
            )
        
        return AbsensiResponse.model_validate(absensi)
