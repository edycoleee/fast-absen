"""
Unit Endpoints
CRUD master unit
"""
from fastapi import APIRouter, Depends, status
from sqlalchemy.orm import Session
from config.database import get_db
from schemas.unit import UnitCreate, UnitUpdate
from services.unit_service import UnitService
from utils.dependencies import require_permission
from utils.permission_registry import PermissionKeys
from utils.response import success_response


router = APIRouter(prefix="/unit", tags=["Unit"])


@router.get("/", response_model=dict, dependencies=[Depends(require_permission(PermissionKeys.UNIT_READ))])
def get_units(
    skip: int = 0,
    limit: int = 100,
    search: str = "",
    db: Session = Depends(get_db),
):
    service = UnitService(db)
    items = service.get_all(skip=skip, limit=limit, search=search)
    total = service.count_all(search=search)
    page = (skip // limit) + 1 if limit else 1
    return success_response(
        message="Unit retrieved successfully",
        data={"items": [item.model_dump() for item in items], "total": total, "page": page, "skip": skip, "limit": limit},
    )


@router.post("/", response_model=dict, status_code=status.HTTP_201_CREATED, dependencies=[Depends(require_permission(PermissionKeys.UNIT_CREATE))])
def create_unit(payload: UnitCreate, db: Session = Depends(get_db)):
    service = UnitService(db)
    created = service.create(payload)
    return success_response(message="Unit created successfully", data=created.model_dump())


@router.get("/{id_unit}", response_model=dict, dependencies=[Depends(require_permission(PermissionKeys.UNIT_READ))])
def get_unit(id_unit: int, db: Session = Depends(get_db)):
    service = UnitService(db)
    item = service.get_by_id(id_unit)
    return success_response(message="Unit retrieved successfully", data=item.model_dump())


@router.put("/{id_unit}", response_model=dict, dependencies=[Depends(require_permission(PermissionKeys.UNIT_UPDATE))])
def update_unit(id_unit: int, payload: UnitUpdate, db: Session = Depends(get_db)):
    service = UnitService(db)
    updated = service.update(id_unit, payload)
    return success_response(message="Unit updated successfully", data=updated.model_dump())


@router.delete("/{id_unit}", response_model=dict, dependencies=[Depends(require_permission(PermissionKeys.UNIT_DELETE))])
def delete_unit(id_unit: int, db: Session = Depends(get_db)):
    service = UnitService(db)
    service.delete(id_unit)
    return success_response(message="Unit deleted successfully")
