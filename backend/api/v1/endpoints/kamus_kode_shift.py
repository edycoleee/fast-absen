"""
Kamus Kode Shift Endpoints
CRUD master kamus kode shift (P1, S1, M1, L1, ...)
digunakan oleh RosterAdapterPage untuk mendefinisikan jadwal bulanan.
"""
from fastapi import APIRouter, Depends, status
from sqlalchemy.orm import Session
from config.database import get_db
from schemas.kamus_kode_shift import KamusKodeShiftCreate, KamusKodeShiftUpdate
from services.kamus_kode_shift_service import KamusKodeShiftService
from utils.dependencies import require_permission
from utils.permission_registry import PermissionKeys
from utils.response import success_response


router = APIRouter(prefix="/kamus-kode-shift", tags=["Kamus Kode Shift"])


@router.get(
    "/",
    response_model=dict,
    dependencies=[Depends(require_permission(PermissionKeys.KAMUS_KODE_SHIFT_READ))],
)
def get_kamus_kode_shift(
    skip: int = 0,
    limit: int = 200,
    only_active: bool = False,
    db: Session = Depends(get_db),
):
    """Ambil semua kode shift. Gunakan only_active=true untuk filter aktif saja."""
    service = KamusKodeShiftService(db)
    items = service.get_all(skip=skip, limit=limit, only_active=only_active)
    total = service.count_all()
    return success_response(
        message="Kamus kode shift retrieved successfully",
        data={
            "items": [item.model_dump() for item in items],
            "total": total,
            "skip": skip,
            "limit": limit,
        },
    )


@router.post(
    "/",
    response_model=dict,
    status_code=status.HTTP_201_CREATED,
    dependencies=[Depends(require_permission(PermissionKeys.KAMUS_KODE_SHIFT_CREATE))],
)
def create_kamus_kode_shift(payload: KamusKodeShiftCreate, db: Session = Depends(get_db)):
    service = KamusKodeShiftService(db)
    created = service.create(payload)
    return success_response(message="Kode shift created successfully", data=created.model_dump())


@router.get(
    "/by-kode/{kode}",
    response_model=dict,
    dependencies=[Depends(require_permission(PermissionKeys.KAMUS_KODE_SHIFT_READ))],
)
def get_kamus_kode_shift_by_kode(kode: str, db: Session = Depends(get_db)):
    service = KamusKodeShiftService(db)
    item = service.get_by_kode(kode.upper())
    return success_response(message="Kode shift retrieved successfully", data=item.model_dump())


@router.get(
    "/{kamus_id}",
    response_model=dict,
    dependencies=[Depends(require_permission(PermissionKeys.KAMUS_KODE_SHIFT_READ))],
)
def get_kamus_kode_shift_by_id(kamus_id: int, db: Session = Depends(get_db)):
    service = KamusKodeShiftService(db)
    item = service.get_by_id(kamus_id)
    return success_response(message="Kode shift retrieved successfully", data=item.model_dump())


@router.put(
    "/{kamus_id}",
    response_model=dict,
    dependencies=[Depends(require_permission(PermissionKeys.KAMUS_KODE_SHIFT_UPDATE))],
)
def update_kamus_kode_shift(kamus_id: int, payload: KamusKodeShiftUpdate, db: Session = Depends(get_db)):
    service = KamusKodeShiftService(db)
    updated = service.update(kamus_id, payload)
    return success_response(message="Kode shift updated successfully", data=updated.model_dump())


@router.delete(
    "/{kamus_id}",
    response_model=dict,
    dependencies=[Depends(require_permission(PermissionKeys.KAMUS_KODE_SHIFT_DELETE))],
)
def delete_kamus_kode_shift(kamus_id: int, db: Session = Depends(get_db)):
    service = KamusKodeShiftService(db)
    service.delete(kamus_id)
    return success_response(message="Kode shift deleted successfully")
