"""
Approval Pengajuan Absensi Endpoints
"""
from datetime import date
from fastapi import APIRouter, Depends, status
from sqlalchemy.orm import Session
from config.database import get_db
from models.user import User
from schemas.approval_pengajuan_absensi import (
    ApprovalPengajuanAbsensiCreate,
    ApprovalPengajuanAbsensiDecision,
)
from services.approval_pengajuan_absensi_service import ApprovalPengajuanAbsensiService
from utils.dependencies import require_permission, get_current_user
from utils.permission_registry import PermissionKeys
from utils.response import success_response


router = APIRouter(prefix="/approval-pengajuan-absensi", tags=["Approval Pengajuan Absensi"])


@router.get("/logs", response_model=dict, dependencies=[Depends(require_permission(PermissionKeys.APPROVAL_PENGAJUAN_ABSENSI_READ))])
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
    service = ApprovalPengajuanAbsensiService(db)
    role_names = {role.name for role in current_user.roles}

    items = service.list_logs_filtered(
        requester_role_names=role_names,
        start_date=start_date,
        end_date=end_date,
        action_type=action_type,
        pengajuan_id=pengajuan_id,
        skip=skip,
        limit=limit,
    )
    total = service.count_logs_filtered(
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


@router.post("/", response_model=dict, status_code=status.HTTP_201_CREATED, dependencies=[Depends(require_permission(PermissionKeys.APPROVAL_PENGAJUAN_ABSENSI_CREATE))])
def create_pengajuan(
    payload: ApprovalPengajuanAbsensiCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    service = ApprovalPengajuanAbsensiService(db)
    created = service.create_pengajuan(str(current_user.id_pegawai), payload)
    return success_response(message="Pengajuan approval berhasil dibuat", data=created.model_dump())


@router.get("/mine", response_model=dict, dependencies=[Depends(require_permission(PermissionKeys.APPROVAL_PENGAJUAN_ABSENSI_READ))])
def list_my_pengajuan(
    skip: int = 0,
    limit: int = 100,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    service = ApprovalPengajuanAbsensiService(db)
    items = service.list_my_pengajuan(str(current_user.id_pegawai), skip=skip, limit=limit)
    total = service.count_my_pengajuan(str(current_user.id_pegawai))
    return success_response(
        message="Daftar pengajuan saya berhasil diambil",
        data={"items": [item.model_dump() for item in items], "total": total, "skip": skip, "limit": limit},
    )


@router.get("/assigned", response_model=dict, dependencies=[Depends(require_permission(PermissionKeys.APPROVAL_PENGAJUAN_ABSENSI_READ))])
def list_assigned_to_me(
    skip: int = 0,
    limit: int = 100,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    service = ApprovalPengajuanAbsensiService(db)
    items = service.list_assigned_to_me(str(current_user.id_pegawai), skip=skip, limit=limit)
    total = service.count_assigned_to_me(str(current_user.id_pegawai))
    return success_response(
        message="Daftar pengajuan assigned berhasil diambil",
        data={"items": [item.model_dump() for item in items], "total": total, "skip": skip, "limit": limit},
    )


@router.post("/{pengajuan_id}/decision", response_model=dict, dependencies=[Depends(require_permission(PermissionKeys.APPROVAL_PENGAJUAN_ABSENSI_UPDATE))])
def decide_pengajuan(
    pengajuan_id: int,
    payload: ApprovalPengajuanAbsensiDecision,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    service = ApprovalPengajuanAbsensiService(db)
    user_role_names = {role.name for role in current_user.roles}
    is_super_admin = bool(user_role_names.intersection({"super-admin", "super_admin", "superadmin"}))

    updated = service.decide_pengajuan(
        pengajuan_id=pengajuan_id,
        approver_id=str(current_user.id_pegawai),
        payload=payload,
        is_super_admin=is_super_admin,
    )
    return success_response(message="Pengajuan berhasil diputuskan", data=updated.model_dump())


@router.get("/{pengajuan_id}/logs", response_model=dict, dependencies=[Depends(require_permission(PermissionKeys.APPROVAL_PENGAJUAN_ABSENSI_READ))])
def get_pengajuan_logs(
    pengajuan_id: int,
    skip: int = 0,
    limit: int = 100,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    service = ApprovalPengajuanAbsensiService(db)
    role_names = {role.name for role in current_user.roles}

    items = service.list_logs(
        pengajuan_id=pengajuan_id,
        requester_id_pegawai=str(current_user.id_pegawai),
        requester_role_names=role_names,
        skip=skip,
        limit=limit,
    )
    total = service.count_logs(
        pengajuan_id=pengajuan_id,
        requester_id_pegawai=str(current_user.id_pegawai),
        requester_role_names=role_names,
    )
    return success_response(
        message="Log pengajuan berhasil diambil",
        data={"items": [item.model_dump() for item in items], "total": total, "skip": skip, "limit": limit},
    )
