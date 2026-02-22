"""
Shift Kelompok Aturan Endpoints
CRUD aturan evaluasi per kelompok shift
"""
from fastapi import APIRouter, Depends, status
from sqlalchemy.orm import Session
from config.database import get_db
from schemas.shift_kelompok_aturan import ShiftKelompokAturanCreate, ShiftKelompokAturanUpdate
from services.shift_kelompok_aturan_service import ShiftKelompokAturanService
from utils.dependencies import require_permission
from utils.permission_registry import PermissionKeys
from utils.response import success_response


router = APIRouter(prefix="/shift-kelompok-aturan", tags=["Shift Kelompok Aturan"])


@router.get("/", response_model=dict, dependencies=[Depends(require_permission(PermissionKeys.SHIFT_KELOMPOK_ATURAN_READ))])
def get_shift_kelompok_aturan(
    skip: int = 0,
    limit: int = 100,
    db: Session = Depends(get_db),
):
    service = ShiftKelompokAturanService(db)
    items = service.get_all(skip=skip, limit=limit)
    total = service.count_all()
    return success_response(
        message="Shift kelompok aturan retrieved successfully",
        data={"items": [item.model_dump() for item in items], "total": total, "skip": skip, "limit": limit},
    )


@router.post("/", response_model=dict, status_code=status.HTTP_201_CREATED, dependencies=[Depends(require_permission(PermissionKeys.SHIFT_KELOMPOK_ATURAN_CREATE))])
def create_shift_kelompok_aturan(payload: ShiftKelompokAturanCreate, db: Session = Depends(get_db)):
    service = ShiftKelompokAturanService(db)
    created = service.create(payload)
    return success_response(message="Shift kelompok aturan created successfully", data=created.model_dump())


@router.get("/{aturan_id}", response_model=dict, dependencies=[Depends(require_permission(PermissionKeys.SHIFT_KELOMPOK_ATURAN_READ))])
def get_shift_kelompok_aturan_by_id(aturan_id: int, db: Session = Depends(get_db)):
    service = ShiftKelompokAturanService(db)
    item = service.get_by_id(aturan_id)
    return success_response(message="Shift kelompok aturan retrieved successfully", data=item.model_dump())


@router.put("/{aturan_id}", response_model=dict, dependencies=[Depends(require_permission(PermissionKeys.SHIFT_KELOMPOK_ATURAN_UPDATE))])
def update_shift_kelompok_aturan(aturan_id: int, payload: ShiftKelompokAturanUpdate, db: Session = Depends(get_db)):
    service = ShiftKelompokAturanService(db)
    updated = service.update(aturan_id, payload)
    return success_response(message="Shift kelompok aturan updated successfully", data=updated.model_dump())


@router.delete("/{aturan_id}", response_model=dict, dependencies=[Depends(require_permission(PermissionKeys.SHIFT_KELOMPOK_ATURAN_DELETE))])
def delete_shift_kelompok_aturan(aturan_id: int, db: Session = Depends(get_db)):
    service = ShiftKelompokAturanService(db)
    service.delete(aturan_id)
    return success_response(message="Shift kelompok aturan deleted successfully")
