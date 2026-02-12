"""
Login Absensi Endpoints
User creates device login, Admin views all
"""
from typing import List
from fastapi import APIRouter, Depends, status
from sqlalchemy.orm import Session
from config.database import get_db
from schemas.login_absensi import LoginAbsensiCreate, LoginAbsensiResponse, LoginAbsensiDetail
from services.login_absensi_service import LoginAbsensiService
from utils.dependencies import get_current_user, require_admin
from models.user import User
from utils.response import success_response


router = APIRouter(prefix="/login-absensi", tags=["Login Absensi"])


# ===== User Endpoint =====

@router.post("/", response_model=dict, status_code=status.HTTP_201_CREATED)
async def create_login_absensi(
    login_data: LoginAbsensiCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Create device login record for current user"""
    service = LoginAbsensiService(db)
    
    # Get id_pegawai from current user token
    id_pegawai = current_user.id_pegawai
    
    new_login = service.create_user_login(id_pegawai, login_data)
    
    return success_response(
        message="Login absensi created successfully",
        data=new_login.model_dump()
    )


# ===== Admin Endpoints =====

@router.get("/", response_model=dict)
async def get_all_login_absensi(
    skip: int = 0,
    limit: int = 100,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_admin)
):
    """Get all login absensi (admin only)"""
    service = LoginAbsensiService(db)
    login_list = service.get_all_admin(skip=skip, limit=limit)
    
    return success_response(
        message="Login absensi retrieved successfully",
        data=[login.model_dump() for login in login_list]
    )


@router.get("/{login_id}", response_model=dict)
async def get_login_absensi_by_id(
    login_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_admin)
):
    """Get login absensi by ID (admin only)"""
    service = LoginAbsensiService(db)
    login = service.get_by_id_admin(login_id)
    
    return success_response(
        message="Login absensi retrieved successfully",
        data=login.model_dump()
    )
