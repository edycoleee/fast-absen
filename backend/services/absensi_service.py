"""
Absensi Service
Business logic for attendance management with check-in/check-out system
"""
from typing import List, Optional
from datetime import datetime, date
from sqlalchemy.orm import Session
from fastapi import HTTPException, status, Request
from schemas.absensi import (
    AbsensiCreate, AbsensiUpdate, AbsensiResponse, 
    AbsensiDetail, AbsensiAdminCreate, AbsensiCheckOut,
    AbsensiSummary, AbsensiTodayResponse
)
from repositories.absensi_repository import AbsensiRepository
from repositories.pegawai_repository import PegawaiRepository
from utils.device_detector import get_client_ip
from models.absensi import Absensi


class AbsensiService:
    """Absensi service with check-in/check-out functionality"""
    
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
        absensi = self.absensi_repo.get_by_id(absensi_id)
        
        if not absensi:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Absensi with id {absensi_id} not found"
            )
        
        # Update fields
        update_data = absensi_data.model_dump(exclude_unset=True)
        
        # Save to database
        updated_absensi = self.absensi_repo.update(absensi_id, update_data)
        
        return AbsensiResponse.model_validate(updated_absensi)
    
    def delete_admin(self, absensi_id: int) -> None:
        """Delete absensi (admin only)"""
        absensi = self.absensi_repo.get_by_id(absensi_id)
        
        if not absensi:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Absensi with id {absensi_id} not found"
            )
        
        self.absensi_repo.delete(absensi_id)
    
    # ===== User Methods (Check-in/Check-out) =====
    
    def check_in(
        self,
        id_pegawai: str,
        absensi_data: AbsensiCreate,
        request: Request
    ) -> AbsensiResponse:
        """
        Check-in for current user
        Validates pegawai, checks for duplicate, captures IP
        """
        # Verify pegawai exists
        pegawai = self.pegawai_repo.get_by_id(id_pegawai)
        if not pegawai:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Pegawai with id {id_pegawai} not found"
            )
        
        # Capture IP address from request
        client_ip = get_client_ip(request)
        
        # Create absensi data dict for repository
        absensi_dict = {
            "id_pegawai": id_pegawai,
            "tanggal": date.today(),
            "jam_masuk": datetime.now(),
            "status": absensi_data.status,
            "keterangan": absensi_data.keterangan,
            "dokumen_pendukung": absensi_data.dokumen_pendukung,
            "ip_address": client_ip
        }
        
        # Repository will validate no duplicate check-in
        try:
            created_absensi = self.absensi_repo.create_check_in(absensi_dict)
        except ValueError as e:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=str(e)
            )
        
        return AbsensiResponse.model_validate(created_absensi)
    
    def check_out(
        self,
        id_pegawai: str,
        request: Request
    ) -> AbsensiResponse:
        """
        Check-out for current user (today's absensi)
        """
        # Get today's active absensi
        today_absensi = self.absensi_repo.get_active_by_pegawai_and_date(id_pegawai, date.today())
        
        if not today_absensi:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Tidak ada sesi check-in aktif hari ini. Silakan check-in terlebih dahulu."
            )
        
        # Capture IP address
        client_ip = get_client_ip(request)
        
        # Update check-out
        try:
            updated_absensi = self.absensi_repo.update_check_out(
                today_absensi.id, 
                client_ip
            )
        except ValueError as e:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=str(e)
            )
        
        return AbsensiResponse.model_validate(updated_absensi)
    
    def get_today_status(self, id_pegawai: str) -> AbsensiTodayResponse:
        """
        Get today's absensi status for user
        Returns whether user has checked-in and can check-out
        """
        today_absensi = self.absensi_repo.get_today_absensi(id_pegawai)
        
        if not today_absensi:
            return AbsensiTodayResponse(
                has_checked_in=False,
                absensi=None,
                can_check_out=False,
                can_check_in=True,
                completed_today=False
            )
        
        can_check_out = today_absensi.jam_masuk is not None and today_absensi.jam_keluar is None
        can_check_in = not can_check_out
        completed_today = today_absensi.jam_masuk is not None and today_absensi.jam_keluar is not None
        
        return AbsensiTodayResponse(
            has_checked_in=True,
            absensi=AbsensiResponse.model_validate(today_absensi),
            can_check_out=can_check_out,
            can_check_in=can_check_in,
            completed_today=completed_today
        )
    
    def get_user_history(
        self, 
        id_pegawai: str, 
        skip: int = 0, 
        limit: int = 30
    ) -> List[AbsensiResponse]:
        """Get absensi history for current user"""
        absensi_list = self.absensi_repo.get_by_pegawai(id_pegawai, skip=skip, limit=limit)
        return [AbsensiResponse.model_validate(a) for a in absensi_list]
    
    def get_user_summary(
        self,
        id_pegawai: str,
        start_date: Optional[date] = None,
        end_date: Optional[date] = None
    ) -> AbsensiSummary:
        """Get summary statistics for user"""
        summary_dict = self.absensi_repo.get_summary_by_pegawai(
            id_pegawai,
            start_date,
            end_date
        )
        
        return AbsensiSummary(
            total_hadir=summary_dict.get('HADIR', 0),
            total_izin=summary_dict.get('IZIN', 0),
            total_sakit=summary_dict.get('SAKIT', 0),
            total_alpha=summary_dict.get('ALPHA', 0),
            total_terlambat=summary_dict.get('TERLAMBAT', 0),
            total_cuti=summary_dict.get('CUTI', 0)
        )
        if not pegawai:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Pegawai with id {id_pegawai} not found"
            )
        
        # Capture IP address from request
        client_ip = request.client.host if request.client else None
        
        # Create absensi data dict for repository
        absensi_dict = {
            "id_pegawai": id_pegawai,
            "id_lokasi": absensi_data.id_lokasi,
            "uid": absensi_data.uid,
            "keterangan": absensi_data.keterangan,
            "ip_address": client_ip
        }
        
        # Save to database
        created_absensi = self.absensi_repo.create(absensi_dict)
        
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
