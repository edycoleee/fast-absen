"""
Approval Pengajuan Absensi Log Endpoints
Read-only audit trail endpoints
"""
from datetime import date
from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from config.database import get_db
from models.user import User
from services.approval_pengajuan_absensi_log_service import ApprovalPengajuanAbsensiLogService
from utils.dependencies import require_permission, get_current_user
from utils.permission_registry import PermissionKeys
from utils.response import success_response


router = APIRouter(prefix="/approval-pengajuan-absensi-log", tags=["Approval Pengajuan Absensi Log"])


@router.get("/", response_model=dict, dependencies=[Depends(require_permission(PermissionKeys.APPROVAL_PENGAJUAN_ABSENSI_LOG_READ))])
def get_logs_filtered(
    start_date: date | None = None,
    end_date: date | None = None,
    action_type: str | None = None,
    pengajuan_id: int | None = None,
    skip: int = 0,
    limit: int = 100,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    service = ApprovalPengajuanAbsensiLogService(db)
    role_names = {role.name for role in current_user.roles}

    items = service.list_filtered(
        requester_role_names=role_names,
        start_date=start_date,
        end_date=end_date,
        action_type=action_type,
        pengajuan_id=pengajuan_id,
        skip=skip,
        limit=limit,
    )
    total = service.count_filtered(
        requester_role_names=role_names,
        start_date=start_date,
        end_date=end_date,
        action_type=action_type,
        pengajuan_id=pengajuan_id,
    )
    return success_response(
        message="Audit log approval berhasil diambil",
        data={"items": [item.model_dump() for item in items], "total": total, "skip": skip, "limit": limit},
    )


@router.get("/pengajuan/{pengajuan_id}", response_model=dict, dependencies=[Depends(require_permission(PermissionKeys.APPROVAL_PENGAJUAN_ABSENSI_LOG_READ))])
def get_logs_by_pengajuan(
    pengajuan_id: int,
    skip: int = 0,
    limit: int = 100,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    service = ApprovalPengajuanAbsensiLogService(db)
    role_names = {role.name for role in current_user.roles}

    items = service.list_by_pengajuan(
        pengajuan_id=pengajuan_id,
        requester_id_pegawai=str(current_user.id_pegawai),
        requester_role_names=role_names,
        skip=skip,
        limit=limit,
    )
    total = service.count_by_pengajuan(
        pengajuan_id=pengajuan_id,
        requester_id_pegawai=str(current_user.id_pegawai),
        requester_role_names=role_names,
    )
    return success_response(
        message="Log pengajuan berhasil diambil",
        data={"items": [item.model_dump() for item in items], "total": total, "skip": skip, "limit": limit},
    )
