"""
Stats Endpoints
Dashboard summary counts
"""
from datetime import date
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from sqlalchemy import func

from config.database import get_db
from models.user import User
from models.pegawai import Pegawai
from models.role import Role
from models.absensi import Absensi
from utils.dependencies import get_current_user
from utils.permission_registry import PermissionKeys
from utils.response import success_response


router = APIRouter(prefix="/stats", tags=["Stats"])


@router.get("/", response_model=dict)
def get_dashboard_stats(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    permissions = {
        perm.name
        for role in current_user.roles
        for perm in role.permissions
    }

    allowed = {
        PermissionKeys.USERS_READ,
        PermissionKeys.PEGAWAI_READ,
        PermissionKeys.ROLES_READ,
        PermissionKeys.ABSENSI_READ
    }

    if not permissions.intersection(allowed):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Insufficient permissions for stats"
        )

    today = date.today()

    users_total = None
    if PermissionKeys.USERS_READ in permissions:
        users_total = db.query(func.count(User.id)).scalar() or 0

    pegawai_total = None
    if PermissionKeys.PEGAWAI_READ in permissions:
        pegawai_total = db.query(func.count(Pegawai.id_pegawai)).scalar() or 0

    roles_total = None
    if PermissionKeys.ROLES_READ in permissions:
        roles_total = db.query(func.count(Role.id)).scalar() or 0

    absensi_today = None
    if PermissionKeys.ABSENSI_READ in permissions:
        absensi_today = (
            db.query(func.count(Absensi.id))
            .filter(func.date(Absensi.tanggal) == today)
            .scalar()
            or 0
        )

    return success_response(
        message="Stats retrieved successfully",
        data={
            "users_total": users_total,
            "pegawai_total": pegawai_total,
            "roles_total": roles_total,
            "absensi_today": absensi_today,
            "as_of": today.isoformat()
        }
    )
