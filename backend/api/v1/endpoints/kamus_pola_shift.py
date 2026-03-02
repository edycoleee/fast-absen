"""
Kamus Pola Shift Endpoints
CRUD master pola shift berulang (P1,S1,M1,L1,L1 dst.)
digunakan oleh RosterAdapterPage untuk fitur "Isi Pola Berulang".
"""
from fastapi import APIRouter, Depends, status
from sqlalchemy.orm import Session
from config.database import get_db
from schemas.kamus_pola_shift import KamusPolaShiftCreate, KamusPolaShiftUpdate
from services.kamus_pola_shift_service import KamusPolaShiftService
from utils.dependencies import require_permission
from utils.permission_registry import PermissionKeys
from utils.response import success_response


router = APIRouter(prefix="/kamus-pola-shift", tags=["Kamus Pola Shift"])


@router.get(
    "/",
    response_model=dict,
    dependencies=[Depends(require_permission(PermissionKeys.KAMUS_POLA_SHIFT_READ))],
)
def get_kamus_pola_shift(
    skip: int = 0,
    limit: int = 200,
    only_active: bool = False,
    db: Session = Depends(get_db),
):
    """Ambil semua pola shift. Gunakan only_active=true untuk filter aktif saja."""
    service = KamusPolaShiftService(db)
    items = service.get_all(skip=skip, limit=limit, only_active=only_active)
    total = service.count_all()
    return success_response(
        message="Kamus pola shift retrieved successfully",
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
    dependencies=[Depends(require_permission(PermissionKeys.KAMUS_POLA_SHIFT_CREATE))],
)
def create_kamus_pola_shift(payload: KamusPolaShiftCreate, db: Session = Depends(get_db)):
    service = KamusPolaShiftService(db)
    created = service.create(payload)
    return success_response(message="Pola shift created successfully", data=created.model_dump())


@router.get(
    "/{pola_id}",
    response_model=dict,
    dependencies=[Depends(require_permission(PermissionKeys.KAMUS_POLA_SHIFT_READ))],
)
def get_kamus_pola_shift_by_id(pola_id: int, db: Session = Depends(get_db)):
    service = KamusPolaShiftService(db)
    item = service.get_by_id(pola_id)
    return success_response(message="Pola shift retrieved successfully", data=item.model_dump())


@router.put(
    "/{pola_id}",
    response_model=dict,
    dependencies=[Depends(require_permission(PermissionKeys.KAMUS_POLA_SHIFT_UPDATE))],
)
def update_kamus_pola_shift(pola_id: int, payload: KamusPolaShiftUpdate, db: Session = Depends(get_db)):
    service = KamusPolaShiftService(db)
    updated = service.update(pola_id, payload)
    return success_response(message="Pola shift updated successfully", data=updated.model_dump())


@router.delete(
    "/{pola_id}",
    response_model=dict,
    dependencies=[Depends(require_permission(PermissionKeys.KAMUS_POLA_SHIFT_DELETE))],
)
def delete_kamus_pola_shift(pola_id: int, db: Session = Depends(get_db)):
    service = KamusPolaShiftService(db)
    service.delete(pola_id)
    return success_response(message="Pola shift deleted successfully")
