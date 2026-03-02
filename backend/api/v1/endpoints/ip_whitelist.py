"""
IP Whitelist Endpoints
Admin CRUD untuk manajemen daftar IP yang diizinkan melakukan absensi
"""
from fastapi import APIRouter, Depends, status
from sqlalchemy.orm import Session

from config.database import get_db
from schemas.ip_whitelist import IpWhitelistCreate, IpWhitelistUpdate
from services.ip_whitelist_service import IpWhitelistService
from utils.dependencies import require_permission
from utils.permission_registry import PermissionKeys
from utils.response import success_response
from models.user import User

router = APIRouter(prefix="/ip-whitelist", tags=["IP Whitelist"])


@router.get("/", response_model=dict)
def get_all(
    skip: int = 0,
    limit: int = 100,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_permission(PermissionKeys.IP_WHITELIST_READ)),
):
    """Ambil semua IP whitelist (Admin only)"""
    service = IpWhitelistService(db)
    items = service.get_all(skip=skip, limit=limit)
    total = service.count_all()
    return success_response(
        message="IP whitelist berhasil diambil",
        data={
            "items": [item.model_dump() for item in items],
            "total": total,
            "skip": skip,
            "limit": limit,
        },
    )


@router.post("/", response_model=dict, status_code=status.HTTP_201_CREATED)
def create(
    payload: IpWhitelistCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_permission(PermissionKeys.IP_WHITELIST_CREATE)),
):
    """Tambahkan IP baru ke whitelist (Admin only)"""
    service = IpWhitelistService(db)
    item = service.create(payload, created_by=current_user.id)
    return success_response(
        message=f"IP '{payload.ip_address}' berhasil ditambahkan ke whitelist",
        data=item.model_dump(),
    )


@router.get("/{id}", response_model=dict)
def get_by_id(
    id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_permission(PermissionKeys.IP_WHITELIST_READ)),
):
    """Ambil detail satu IP whitelist (Admin only)"""
    service = IpWhitelistService(db)
    item = service.get_by_id(id)
    return success_response(message="IP whitelist ditemukan", data=item.model_dump())


@router.put("/{id}", response_model=dict)
def update(
    id: int,
    payload: IpWhitelistUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_permission(PermissionKeys.IP_WHITELIST_UPDATE)),
):
    """Update data IP whitelist (Admin only)"""
    service = IpWhitelistService(db)
    item = service.update(id, payload)
    return success_response(message="IP whitelist berhasil diperbarui", data=item.model_dump())


@router.delete("/{id}", response_model=dict)
def delete(
    id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_permission(PermissionKeys.IP_WHITELIST_DELETE)),
):
    """Hapus IP dari whitelist (Admin only)"""
    service = IpWhitelistService(db)
    service.delete(id)
    return success_response(message=f"IP whitelist id={id} berhasil dihapus", data=None)
