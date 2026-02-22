"""
Pegawai Endpoints
Admin-only CRUD operations for employees
"""
from typing import List, Optional
from fastapi import APIRouter, Depends, status, UploadFile, File, Form
from sqlalchemy.orm import Session
from config.database import get_db
from schemas.pegawai import PegawaiCreate, PegawaiUpdate, PegawaiResponse
from services.pegawai_service import PegawaiService
from utils.response import success_response
from utils.dependencies import require_permission
from utils.permission_registry import PermissionKeys
from datetime import date


router = APIRouter(prefix="/pegawai", tags=["Pegawai"])


@router.get("/", response_model=dict, dependencies=[Depends(require_permission(PermissionKeys.PEGAWAI_READ))])
async def get_pegawai(
    skip: int = 0,
    limit: int = 10,
    search: Optional[str] = None,
    db: Session = Depends(get_db)
):
    """
    Get all pegawai or search by name/NIP (Admin only)
    - **skip**: Number of items to skip (default: 0)
    - **limit**: Items per page (default: 10)
    - **search**: Search query for name or NIP (optional)
    """
    service = PegawaiService(db)

    
    if search:
        total = service.count_search(search)
        pegawai_list = service.search(search, skip=skip, limit=limit)
    else:
        total = service.count_all()
        pegawai_list = service.get_all(skip=skip, limit=limit)
    
    return success_response(
        message="Pegawai retrieved successfully",
        data={
            "items": [p.model_dump() for p in pegawai_list],
            "total": total,
            "skip": skip,
            "limit": limit,
            "search": search
        }
    )


@router.post("/", response_model=dict, status_code=status.HTTP_201_CREATED, dependencies=[Depends(require_permission(PermissionKeys.PEGAWAI_CREATE))])
async def create_pegawai(
    id_pegawai: str = Form(...),
    nip: Optional[str] = Form(None),
    nama: Optional[str] = Form(None),
    jenis_kelamin: Optional[str] = Form(None),
    tempat_lahir: Optional[str] = Form(None),
    tanggal_lahir: Optional[str] = Form(None),
    alamat: Optional[str] = Form(None),
    id_unit: Optional[int] = Form(None),
    kepala_id_unit: Optional[int] = Form(None),
    status: Optional[str] = Form(None),
    foto: UploadFile = File(None),
    db: Session = Depends(get_db)
):
    """
    Create new pegawai (Admin only)
    
    - **id_pegawai**: Employee ID (required)
    - **nip**: NIP number (optional)
    - **nama**: Name (optional)
    - **jenis_kelamin**: Gender - L/P (optional)
    - **tempat_lahir**: Place of birth (optional)
    - **tanggal_lahir**: Date of birth (YYYY-MM-DD) (optional)
    - **alamat**: Address (optional)
    - **id_unit**: Unit ID (optional)
    - **kepala_id_unit**: Head Unit ID for approval routing (optional)
    - **status**: Status (optional)
    - **foto**: Photo file (JPG/PNG) (optional)
    """
    service = PegawaiService(db)
    
    # Parse tanggal_lahir
    tgl_lahir = None
    if tanggal_lahir:
        try:
            tgl_lahir = date.fromisoformat(tanggal_lahir)
        except ValueError:
            from fastapi import HTTPException
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Invalid date format. Use YYYY-MM-DD"
            )
    
    # Create PegawaiCreate schema
    pegawai_data = PegawaiCreate(
        id_pegawai=id_pegawai,
        nip=nip,
        nama=nama,
        jenis_kelamin=jenis_kelamin,
        tempat_lahir=tempat_lahir,
        tanggal_lahir=tgl_lahir,
        alamat=alamat,
        id_unit=id_unit,
        kepala_id_unit=kepala_id_unit,
        status=status
    )
    
    pegawai = await service.create(pegawai_data, foto)
    
    return success_response(
        message="Pegawai created successfully",
        data=pegawai.model_dump()
    )


@router.get("/{pegawai_id}", response_model=dict, dependencies=[Depends(require_permission(PermissionKeys.PEGAWAI_READ))])
async def get_pegawai_by_id(
    pegawai_id: str,
    db: Session = Depends(get_db)
):
    """
    Get pegawai by ID (Admin only)
    
    - **pegawai_id**: Employee ID
    """
    service = PegawaiService(db)
    pegawai = service.get_by_id(pegawai_id)
    
    return success_response(
        message="Pegawai retrieved successfully",
        data=pegawai.model_dump()
    )


@router.put("/{pegawai_id}", response_model=dict, dependencies=[Depends(require_permission(PermissionKeys.PEGAWAI_UPDATE))])
async def update_pegawai(
    pegawai_id: str,
    nip: Optional[str] = Form(None),
    nama: Optional[str] = Form(None),
    jenis_kelamin: Optional[str] = Form(None),
    tempat_lahir: Optional[str] = Form(None),
    tanggal_lahir: Optional[str] = Form(None),
    alamat: Optional[str] = Form(None),
    id_unit: Optional[int] = Form(None),
    kepala_id_unit: Optional[int] = Form(None),
    status: Optional[str] = Form(None),
    foto: UploadFile = File(None),
    db: Session = Depends(get_db)
):
    """
    Update pegawai (Admin only)
    
    - **pegawai_id**: Employee ID
    - **nip**: NIP number (optional)
    - **nama**: Name (optional)
    - **jenis_kelamin**: Gender - L/P (optional)
    - **tempat_lahir**: Place of birth (optional)
    - **tanggal_lahir**: Date of birth (YYYY-MM-DD) (optional)
    - **alamat**: Address (optional)
    - **id_unit**: Unit ID (optional)
    - **kepala_id_unit**: Head Unit ID for approval routing (optional)
    - **status**: Status (optional)
    - **foto**: Photo file (JPG/PNG) (optional)
    """
    service = PegawaiService(db)
    
    # Parse tanggal_lahir
    tgl_lahir = None
    if tanggal_lahir:
        try:
            tgl_lahir = date.fromisoformat(tanggal_lahir)
        except ValueError:
            from fastapi import HTTPException
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Invalid date format. Use YYYY-MM-DD"
            )
    
    # Build update data (only include fields that were provided)
    update_dict = {}
    if nip is not None:
        update_dict["nip"] = nip
    if nama is not None:
        update_dict["nama"] = nama
    if jenis_kelamin is not None:
        update_dict["jenis_kelamin"] = jenis_kelamin
    if tempat_lahir is not None:
        update_dict["tempat_lahir"] = tempat_lahir
    if tgl_lahir is not None:
        update_dict["tanggal_lahir"] = tgl_lahir
    if alamat is not None:
        update_dict["alamat"] = alamat
    if id_unit is not None:
        update_dict["id_unit"] = id_unit
    if kepala_id_unit is not None:
        # 0 = sentinel dari frontend: "hapus kepala_id_unit (set NULL)"
        update_dict["kepala_id_unit"] = kepala_id_unit if kepala_id_unit != 0 else None
    if status is not None:
        update_dict["status"] = status
    
    pegawai_data = PegawaiUpdate(**update_dict)
    
    pegawai = await service.update(pegawai_id, pegawai_data, foto)
    
    return success_response(
        message="Pegawai updated successfully",
        data=pegawai.model_dump()
    )


@router.delete("/{pegawai_id}", response_model=dict, dependencies=[Depends(require_permission(PermissionKeys.PEGAWAI_DELETE))])
async def delete_pegawai(
    pegawai_id: str,
    db: Session = Depends(get_db)
):
    """
    Delete pegawai (Admin only)
    
    - **pegawai_id**: Employee ID
    """
    service = PegawaiService(db)
    service.delete(pegawai_id)
    
    return success_response(
        message=f"Pegawai with id {pegawai_id} deleted successfully",
        data=None
    )
