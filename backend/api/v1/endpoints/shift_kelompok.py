"""
Shift Kelompok Endpoints
CRUD master kelompok shift pegawai
"""
from fastapi import APIRouter, Depends, status
from sqlalchemy.orm import Session
from config.database import get_db
from schemas.shift_kelompok import ShiftKelompokCreate, ShiftKelompokUpdate
from services.shift_kelompok_service import ShiftKelompokService
from utils.dependencies import require_permission
from utils.permission_registry import PermissionKeys
from utils.response import success_response


router = APIRouter(prefix="/shift-kelompok", tags=["Shift Kelompok"])


@router.get("/", response_model=dict, dependencies=[Depends(require_permission(PermissionKeys.SHIFT_KELOMPOK_READ))])
def get_shift_kelompok(
    skip: int = 0,
    limit: int = 100,
    db: Session = Depends(get_db),
):
    service = ShiftKelompokService(db)
    items = service.get_all(skip=skip, limit=limit)
    total = service.count_all()
    return success_response(
        message="Shift kelompok retrieved successfully",
        data={"items": [item.model_dump() for item in items], "total": total, "skip": skip, "limit": limit},
    )


@router.post("/", response_model=dict, status_code=status.HTTP_201_CREATED, dependencies=[Depends(require_permission(PermissionKeys.SHIFT_KELOMPOK_CREATE))])
def create_shift_kelompok(payload: ShiftKelompokCreate, db: Session = Depends(get_db)):
    service = ShiftKelompokService(db)
    created = service.create(payload)
    return success_response(message="Shift kelompok created successfully", data=created.model_dump())


@router.get("/{shift_kelompok_id}", response_model=dict, dependencies=[Depends(require_permission(PermissionKeys.SHIFT_KELOMPOK_READ))])
def get_shift_kelompok_by_id(shift_kelompok_id: int, db: Session = Depends(get_db)):
    service = ShiftKelompokService(db)
    item = service.get_by_id(shift_kelompok_id)
    return success_response(message="Shift kelompok retrieved successfully", data=item.model_dump())


@router.put("/{shift_kelompok_id}", response_model=dict, dependencies=[Depends(require_permission(PermissionKeys.SHIFT_KELOMPOK_UPDATE))])
def update_shift_kelompok(shift_kelompok_id: int, payload: ShiftKelompokUpdate, db: Session = Depends(get_db)):
    service = ShiftKelompokService(db)
    updated = service.update(shift_kelompok_id, payload)
    return success_response(message="Shift kelompok updated successfully", data=updated.model_dump())


@router.delete("/{shift_kelompok_id}", response_model=dict, dependencies=[Depends(require_permission(PermissionKeys.SHIFT_KELOMPOK_DELETE))])
def delete_shift_kelompok(shift_kelompok_id: int, db: Session = Depends(get_db)):
    service = ShiftKelompokService(db)
    service.delete(shift_kelompok_id)
    return success_response(message="Shift kelompok deleted successfully")
