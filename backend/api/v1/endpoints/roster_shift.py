"""
Roster Shift Endpoints
CRUD jadwal resmi hasil upload/import
"""
from typing import List
from fastapi import APIRouter, Depends, status
from sqlalchemy.orm import Session
from config.database import get_db
from schemas.roster_shift import RosterShiftCreate, RosterShiftUpdate
from services.roster_shift_service import RosterShiftService
from utils.dependencies import require_permission
from utils.permission_registry import PermissionKeys
from utils.response import success_response


router = APIRouter(prefix="/roster-shift", tags=["Roster Shift"])


@router.get("/", response_model=dict, dependencies=[Depends(require_permission(PermissionKeys.ROSTER_SHIFT_READ))])
def get_roster_shifts(
    skip: int = 0,
    limit: int = 100,
    id_pegawai: str = None,
    tanggal_mulai: str = None,
    tanggal_selesai: str = None,
    jenis_shift: str = None,
    status_roster: str = None,
    shift_kelompok_id: int = None,
    id_unit: int = None,
    db: Session = Depends(get_db),
):
    from datetime import date as date_type
    def parse_date(s):
        try: return date_type.fromisoformat(s)
        except: return None

    tgl_mulai = parse_date(tanggal_mulai) if tanggal_mulai else None
    tgl_selesai = parse_date(tanggal_selesai) if tanggal_selesai else None

    service = RosterShiftService(db)
    items = service.get_all(
        skip=skip, limit=limit,
        id_pegawai=id_pegawai or None,
        tanggal_mulai=tgl_mulai, tanggal_selesai=tgl_selesai,
        jenis_shift=jenis_shift or None, status_roster=status_roster or None,
        shift_kelompok_id=shift_kelompok_id, id_unit=id_unit,
    )
    total = service.count_all(
        id_pegawai=id_pegawai or None,
        tanggal_mulai=tgl_mulai, tanggal_selesai=tgl_selesai,
        jenis_shift=jenis_shift or None, status_roster=status_roster or None,
        shift_kelompok_id=shift_kelompok_id, id_unit=id_unit,
    )
    return success_response(
        message="Roster shift retrieved successfully",
        data={"items": [item.model_dump(mode='json') for item in items], "total": total, "skip": skip, "limit": limit},
    )


@router.post("/", response_model=dict, status_code=status.HTTP_201_CREATED, dependencies=[Depends(require_permission(PermissionKeys.ROSTER_SHIFT_CREATE))])
def create_roster_shift(payload: RosterShiftCreate, db: Session = Depends(get_db)):
    service = RosterShiftService(db)
    created = service.create(payload)
    return success_response(message="Roster shift created successfully", data=created.model_dump(mode='json'))


@router.post("/batch", response_model=dict, status_code=status.HTTP_201_CREATED, dependencies=[Depends(require_permission(PermissionKeys.ROSTER_SHIFT_CREATE))])
def batch_create_roster_shifts(payloads: List[RosterShiftCreate], db: Session = Depends(get_db)):
    """
    Batch create roster shifts dari Roster Adapter.
    Menerima list RosterShiftCreate, melakukan insert satu per satu,
    mengembalikan ringkasan berhasil/gagal per baris.
    """
    service = RosterShiftService(db)
    created = []
    errors = []
    for idx, payload in enumerate(payloads):
        try:
            item = service.create(payload)
            created.append(item.model_dump(mode='json'))
        except Exception as e:
            errors.append({"row": idx + 1, "id_pegawai": payload.id_pegawai,
                           "tanggal_shift": str(payload.tanggal_shift), "error": str(e)})
    return success_response(
        message=f"Batch selesai: {len(created)} berhasil, {len(errors)} gagal",
        data={
            "created": created,
            "errors": errors,
            "total_created": len(created),
            "total_errors": len(errors),
        }
    )


@router.get("/{roster_id}", response_model=dict, dependencies=[Depends(require_permission(PermissionKeys.ROSTER_SHIFT_READ))])
def get_roster_shift_by_id(roster_id: int, db: Session = Depends(get_db)):
    service = RosterShiftService(db)
    item = service.get_by_id(roster_id)
    return success_response(message="Roster shift retrieved successfully", data=item.model_dump(mode='json'))


@router.put("/{roster_id}", response_model=dict, dependencies=[Depends(require_permission(PermissionKeys.ROSTER_SHIFT_UPDATE))])
def update_roster_shift(roster_id: int, payload: RosterShiftUpdate, db: Session = Depends(get_db)):
    service = RosterShiftService(db)
    updated = service.update(roster_id, payload)
    return success_response(message="Roster shift updated successfully", data=updated.model_dump(mode='json'))


@router.delete("/{roster_id}", response_model=dict, dependencies=[Depends(require_permission(PermissionKeys.ROSTER_SHIFT_DELETE))])
def delete_roster_shift(roster_id: int, db: Session = Depends(get_db)):
    service = RosterShiftService(db)
    service.delete(roster_id)
    return success_response(message="Roster shift deleted successfully")
