"""
Roster Shift Endpoints
CRUD jadwal resmi hasil upload/import
"""
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
    db: Session = Depends(get_db),
):
    service = RosterShiftService(db)
    items = service.get_all(skip=skip, limit=limit)
    total = service.count_all()
    return success_response(
        message="Roster shift retrieved successfully",
        data={"items": [item.model_dump(mode='json') for item in items], "total": total, "skip": skip, "limit": limit},
    )


@router.post("/", response_model=dict, status_code=status.HTTP_201_CREATED, dependencies=[Depends(require_permission(PermissionKeys.ROSTER_SHIFT_CREATE))])
def create_roster_shift(payload: RosterShiftCreate, db: Session = Depends(get_db)):
    service = RosterShiftService(db)
    created = service.create(payload)
    return success_response(message="Roster shift created successfully", data=created.model_dump(mode='json'))


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
