"""
Absensi Endpoints
Dual access: Admin CRUD + User Dashboard
"""
from typing import List
from fastapi import APIRouter, Depends, status, Request
from sqlalchemy.orm import Session
from config.database import get_db
from schemas.absensi import AbsensiCreate, AbsensiUpdate, AbsensiResponse, AbsensiDetail
from services.absensi_service import AbsensiService
from utils.dependencies import get_current_user, require_admin
from models.user import User
from utils.response import success_response


router = APIRouter()


# ===== Admin Endpoints =====

@router.get("/", response_model=dict)
async def get_all_absensi(
    skip: int = 0,
    limit: int = 100,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_admin)
):
    """Get all absensi (admin only)"""
    service = AbsensiService(db)
    absensi_list = service.get_all_admin(skip=skip, limit=limit)
    
    return success_response(
        message="Absensi retrieved successfully",
        data=[a.model_dump() for a in absensi_list]
    )


@router.get("/{absensi_id}", response_model=dict)
async def get_absensi_by_id(
    absensi_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_admin)
):
    """Get absensi by ID (admin only)"""
    service = AbsensiService(db)
    absensi = service.get_by_id_admin(absensi_id)
    
    return success_response(
        message="Absensi retrieved successfully",
        data=absensi.model_dump()
    )


@router.put("/{absensi_id}", response_model=dict)
async def update_absensi(
    absensi_id: int,
    absensi_data: AbsensiUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_admin)
):
    """Update absensi (admin only)"""
    service = AbsensiService(db)
    updated_absensi = service.update_admin(absensi_id, absensi_data)
    
    return success_response(
        message="Absensi updated successfully",
        data=updated_absensi.model_dump()
    )


@router.delete("/{absensi_id}", response_model=dict, status_code=status.HTTP_200_OK)
async def delete_absensi(
    absensi_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_admin)
):
    """Delete absensi (admin only)"""
    service = AbsensiService(db)
    service.delete_admin(absensi_id)
    
    return success_response(
        message="Absensi deleted successfully"
    )


# ===== User Endpoints =====

@router.post("/create", response_model=dict, status_code=status.HTTP_201_CREATED)
async def create_user_absensi(
    absensi_data: AbsensiCreate,
    request: Request,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Create absensi for current user (captures IP address)"""
    service = AbsensiService(db)
    
    # Get id_pegawai from current user token
    id_pegawai = current_user.id_pegawai
    
    new_absensi = await service.create_user_absensi(id_pegawai, absensi_data, request)
    
    return success_response(
        message="Absensi created successfully",
        data=new_absensi.model_dump()
    )


@router.get("/me", response_model=dict)
async def get_my_absensi(
    skip: int = 0,
    limit: int = 100,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Get absensi for current user"""
    service = AbsensiService(db)
    
    # Get id_pegawai from current user token
    id_pegawai = current_user.id_pegawai
    
    absensi_list = service.get_user_absensi(id_pegawai, skip=skip, limit=limit)
    
    return success_response(
        message="Your absensi retrieved successfully",
        data=[a.model_dump() for a in absensi_list]
    )


@router.get("/me/{absensi_id}", response_model=dict)
async def get_my_absensi_by_id(
    absensi_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Get specific absensi for current user"""
    service = AbsensiService(db)
    
    # Get id_pegawai from current user token
    id_pegawai = current_user.id_pegawai
    
    absensi = service.get_user_absensi_by_id(id_pegawai, absensi_id)
    
    return success_response(
        message="Your absensi retrieved successfully",
        data=absensi.model_dump()
    )
