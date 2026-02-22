"""
Approval Pengajuan Absensi Log Service
Read-only access for audit trail
"""
from datetime import date
from fastapi import HTTPException, status
from sqlalchemy.orm import Session
from repositories.approval_pengajuan_absensi_log_repository import ApprovalPengajuanAbsensiLogRepository
from repositories.approval_pengajuan_absensi_repository import ApprovalPengajuanAbsensiRepository
from schemas.approval_pengajuan_absensi_log import ApprovalPengajuanAbsensiLogResponse


class ApprovalPengajuanAbsensiLogService:
    def __init__(self, db: Session):
        self.db = db
        self.log_repo = ApprovalPengajuanAbsensiLogRepository(db)
        self.pengajuan_repo = ApprovalPengajuanAbsensiRepository(db)

    def list_filtered(
        self,
        requester_role_names: set[str],
        start_date: date | None = None,
        end_date: date | None = None,
        action_type: str | None = None,
        pengajuan_id: int | None = None,
        skip: int = 0,
        limit: int = 100,
    ) -> list[ApprovalPengajuanAbsensiLogResponse]:
        self._ensure_admin(requester_role_names)
        logs = self.log_repo.list_filtered(
            start_date=start_date,
            end_date=end_date,
            action_type=action_type,
            pengajuan_id=pengajuan_id,
            skip=skip,
            limit=limit,
        )
        return [self._to_response(log) for log in logs]

    def count_filtered(
        self,
        requester_role_names: set[str],
        start_date: date | None = None,
        end_date: date | None = None,
        action_type: str | None = None,
        pengajuan_id: int | None = None,
    ) -> int:
        self._ensure_admin(requester_role_names)
        return self.log_repo.count_filtered(
            start_date=start_date,
            end_date=end_date,
            action_type=action_type,
            pengajuan_id=pengajuan_id,
        )

    def get_by_id(self, log_id: int, requester_role_names: set[str]) -> ApprovalPengajuanAbsensiLogResponse:
        self._ensure_admin(requester_role_names)
        log = self.log_repo.get_by_id(log_id)
        if not log:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=f"Approval log {log_id} tidak ditemukan")
        return self._to_response(log)

    def list_by_pengajuan(
        self,
        pengajuan_id: int,
        requester_id_pegawai: str,
        requester_role_names: set[str],
        skip: int = 0,
        limit: int = 100,
    ) -> list[ApprovalPengajuanAbsensiLogResponse]:
        item = self.pengajuan_repo.get(pengajuan_id)
        if not item:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Pengajuan tidak ditemukan")

        is_admin_role = bool(requester_role_names.intersection({"admin", "super-admin", "super_admin", "superadmin"}))
        if not is_admin_role:
            allowed_ids = {
                str(item.id_pegawai) if item.id_pegawai is not None else None,
                str(item.assigned_approver_id_pegawai) if item.assigned_approver_id_pegawai is not None else None,
                str(item.approved_by_pegawai) if item.approved_by_pegawai is not None else None,
            }
            if requester_id_pegawai not in allowed_ids:
                raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Tidak berhak melihat log pengajuan ini")

        logs = self.log_repo.list_by_pengajuan(pengajuan_id, skip=skip, limit=limit)
        return [self._to_response(log) for log in logs]

    def count_by_pengajuan(
        self,
        pengajuan_id: int,
        requester_id_pegawai: str,
        requester_role_names: set[str],
    ) -> int:
        item = self.pengajuan_repo.get(pengajuan_id)
        if not item:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Pengajuan tidak ditemukan")

        is_admin_role = bool(requester_role_names.intersection({"admin", "super-admin", "super_admin", "superadmin"}))
        if not is_admin_role:
            allowed_ids = {
                str(item.id_pegawai) if item.id_pegawai is not None else None,
                str(item.assigned_approver_id_pegawai) if item.assigned_approver_id_pegawai is not None else None,
                str(item.approved_by_pegawai) if item.approved_by_pegawai is not None else None,
            }
            if requester_id_pegawai not in allowed_ids:
                raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Tidak berhak melihat log pengajuan ini")

        return self.log_repo.count_by_pengajuan(pengajuan_id)

    @staticmethod
    def _ensure_admin(requester_role_names: set[str]) -> None:
        is_admin_role = bool(requester_role_names.intersection({"admin", "super-admin", "super_admin", "superadmin"}))
        if not is_admin_role:
            raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Hanya admin/super-admin yang dapat mengakses audit log global")

    @staticmethod
    def _to_response(log) -> ApprovalPengajuanAbsensiLogResponse:
        data = ApprovalPengajuanAbsensiLogResponse.model_validate(log).model_dump()
        data["action_by_nama"] = log.action_by.nama if getattr(log, "action_by", None) else None
        return ApprovalPengajuanAbsensiLogResponse(**data)
