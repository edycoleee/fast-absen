"""
Pegawai Shift Kelompok Endpoints
CRUD assignment pegawai ke kelompok shift
"""
from fastapi import APIRouter, Depends, status
from sqlalchemy.orm import Session
from config.database import get_db
from schemas.pegawai_shift_kelompok import PegawaiShiftKelompokCreate, PegawaiShiftKelompokUpdate
from services.pegawai_shift_kelompok_service import PegawaiShiftKelompokService
from utils.dependencies import require_permission
from utils.permission_registry import PermissionKeys
from utils.response import success_response


router = APIRouter(prefix="/pegawai-shift-kelompok", tags=["Pegawai Shift Kelompok"])


@router.get("/", response_model=dict, dependencies=[Depends(require_permission(PermissionKeys.PEGAWAI_SHIFT_KELOMPOK_READ))])
def get_pegawai_shift_kelompok(
    skip: int = 0,
    limit: int = 100,
    db: Session = Depends(get_db),
):
    service = PegawaiShiftKelompokService(db)
    items = service.get_all(skip=skip, limit=limit)
    total = service.count_all()
    return success_response(
        message="Pegawai shift kelompok retrieved successfully",
        data={"items": [item.model_dump() for item in items], "total": total, "skip": skip, "limit": limit},
    )


@router.post("/", response_model=dict, status_code=status.HTTP_201_CREATED, dependencies=[Depends(require_permission(PermissionKeys.PEGAWAI_SHIFT_KELOMPOK_CREATE))])
def create_pegawai_shift_kelompok(payload: PegawaiShiftKelompokCreate, db: Session = Depends(get_db)):
    service = PegawaiShiftKelompokService(db)
    created = service.create(payload)
    return success_response(message="Pegawai shift kelompok created successfully", data=created.model_dump())


@router.get("/{assignment_id}", response_model=dict, dependencies=[Depends(require_permission(PermissionKeys.PEGAWAI_SHIFT_KELOMPOK_READ))])
def get_pegawai_shift_kelompok_by_id(assignment_id: int, db: Session = Depends(get_db)):
    service = PegawaiShiftKelompokService(db)
    item = service.get_by_id(assignment_id)
    return success_response(message="Pegawai shift kelompok retrieved successfully", data=item.model_dump())


@router.put("/{assignment_id}", response_model=dict, dependencies=[Depends(require_permission(PermissionKeys.PEGAWAI_SHIFT_KELOMPOK_UPDATE))])
def update_pegawai_shift_kelompok(assignment_id: int, payload: PegawaiShiftKelompokUpdate, db: Session = Depends(get_db)):
    service = PegawaiShiftKelompokService(db)
    updated = service.update(assignment_id, payload)
    return success_response(message="Pegawai shift kelompok updated successfully", data=updated.model_dump())


@router.delete("/{assignment_id}", response_model=dict, dependencies=[Depends(require_permission(PermissionKeys.PEGAWAI_SHIFT_KELOMPOK_DELETE))])
def delete_pegawai_shift_kelompok(assignment_id: int, db: Session = Depends(get_db)):
    service = PegawaiShiftKelompokService(db)
    service.delete(assignment_id)
    return success_response(message="Pegawai shift kelompok deleted successfully")
