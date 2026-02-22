"""
Penilaian Shift Absensi Endpoints
CRUD hasil compare roster vs absensi
"""
from fastapi import APIRouter, Depends, status
from sqlalchemy.orm import Session
from config.database import get_db
from schemas.penilaian_shift_absensi import (
    PenilaianShiftAbsensiCreate,
    PenilaianShiftAbsensiUpdate,
    PenilaianShiftAbsensiEvaluateRequest,
)
from services.penilaian_shift_absensi_service import PenilaianShiftAbsensiService
from utils.dependencies import require_permission
from utils.permission_registry import PermissionKeys
from utils.response import success_response


router = APIRouter(prefix="/penilaian-shift-absensi", tags=["Penilaian Shift Absensi"])


@router.get("/", response_model=dict, dependencies=[Depends(require_permission(PermissionKeys.PENILAIAN_SHIFT_ABSENSI_READ))])
def get_penilaian_shift_absensi(
    skip: int = 0,
    limit: int = 100,
    db: Session = Depends(get_db),
):
    service = PenilaianShiftAbsensiService(db)
    items = service.get_all(skip=skip, limit=limit)
    total = service.count_all()
    return success_response(
        message="Penilaian shift absensi retrieved successfully",
        data={"items": [item.model_dump(mode='json') for item in items], "total": total, "skip": skip, "limit": limit},
    )


@router.post("/", response_model=dict, status_code=status.HTTP_201_CREATED, dependencies=[Depends(require_permission(PermissionKeys.PENILAIAN_SHIFT_ABSENSI_CREATE))])
def create_penilaian_shift_absensi(payload: PenilaianShiftAbsensiCreate, db: Session = Depends(get_db)):
    service = PenilaianShiftAbsensiService(db)
    created = service.create(payload)
    return success_response(message="Penilaian shift absensi created successfully", data=created.model_dump(mode='json'))


@router.post("/evaluate", response_model=dict, dependencies=[Depends(require_permission(PermissionKeys.PENILAIAN_SHIFT_ABSENSI_CREATE))])
def evaluate_penilaian_shift_absensi(payload: PenilaianShiftAbsensiEvaluateRequest, db: Session = Depends(get_db)):
    service = PenilaianShiftAbsensiService(db)
    result = service.evaluate_roster_vs_absensi(
        start_date=payload.start_date,
        end_date=payload.end_date,
        id_unit=payload.id_unit,
        id_pegawai=payload.id_pegawai,
        force_recalculate=payload.force_recalculate,
    )
    return success_response(message="Penilaian shift absensi evaluate berhasil dijalankan", data=result.model_dump(mode='json'))


@router.get("/{penilaian_id}", response_model=dict, dependencies=[Depends(require_permission(PermissionKeys.PENILAIAN_SHIFT_ABSENSI_READ))])
def get_penilaian_shift_absensi_by_id(penilaian_id: int, db: Session = Depends(get_db)):
    service = PenilaianShiftAbsensiService(db)
    item = service.get_by_id(penilaian_id)
    return success_response(message="Penilaian shift absensi retrieved successfully", data=item.model_dump(mode='json'))


@router.put("/{penilaian_id}", response_model=dict, dependencies=[Depends(require_permission(PermissionKeys.PENILAIAN_SHIFT_ABSENSI_UPDATE))])
def update_penilaian_shift_absensi(penilaian_id: int, payload: PenilaianShiftAbsensiUpdate, db: Session = Depends(get_db)):
    service = PenilaianShiftAbsensiService(db)
    updated = service.update(penilaian_id, payload)
    return success_response(message="Penilaian shift absensi updated successfully", data=updated.model_dump(mode='json'))


@router.delete("/{penilaian_id}", response_model=dict, dependencies=[Depends(require_permission(PermissionKeys.PENILAIAN_SHIFT_ABSENSI_DELETE))])
def delete_penilaian_shift_absensi(penilaian_id: int, db: Session = Depends(get_db)):
    service = PenilaianShiftAbsensiService(db)
    service.delete(penilaian_id)
    return success_response(message="Penilaian shift absensi deleted successfully")


