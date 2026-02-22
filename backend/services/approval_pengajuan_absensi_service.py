"""
Approval Pengajuan Absensi Service
"""
from datetime import date, datetime
from typing import Any, List
from fastapi import HTTPException, status
from sqlalchemy.orm import Session
from models.pegawai import Pegawai
from repositories.approval_pengajuan_absensi_repository import ApprovalPengajuanAbsensiRepository
from repositories.approval_pengajuan_absensi_log_repository import ApprovalPengajuanAbsensiLogRepository
from schemas.approval_pengajuan_absensi import (
    ApprovalPengajuanAbsensiCreate,
    ApprovalPengajuanAbsensiDecision,
    ApprovalPengajuanAbsensiResponse,
    ApprovalPengajuanAbsensiLogResponse,
)


class ApprovalPengajuanAbsensiService:
    def __init__(self, db: Session):
        self.db = db
        self.repo = ApprovalPengajuanAbsensiRepository(db)
        self.log_repo = ApprovalPengajuanAbsensiLogRepository(db)

    def _write_log(self, pengajuan_id: Any, action_by_pegawai: str | None, action_type: str, catatan: str | None = None) -> None:
        self.log_repo.create(
            {
                "pengajuan_id": pengajuan_id,
                "action_by_pegawai": action_by_pegawai,
                "action_type": action_type,
                "catatan": catatan,
            }
        )

    def _resolve_assigned_approver(self, pemohon: Pegawai) -> str:
        # P0-3 simplification (V1): gunakan 1 atasan langsung saja.
        # Mapping atasan langsung diambil dari kepala_id_unit pemohon.
        # Tidak ada eskalasi multi-level di tahap ini.
        kepala_id_unit = pemohon.kepala_id_unit
        if kepala_id_unit is None:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Pegawai belum memiliki mapping atasan langsung (kepala_id_unit)"
            )

        approver_candidates = (
            self.db.query(Pegawai)
            .filter(Pegawai.id_unit == kepala_id_unit)
            .order_by(Pegawai.id_pegawai.asc())
            .all()
        )

        if not approver_candidates:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Tidak ditemukan atasan langsung pada unit kepala_id_unit={kepala_id_unit}"
            )

        pemohon_id = str(pemohon.id_pegawai)
        approver = next(
            (candidate for candidate in approver_candidates if str(candidate.id_pegawai) != pemohon_id),
            None,
        )

        if not approver:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Atasan langsung tidak valid karena hanya ditemukan pemohon sendiri"
            )

        approver_id = str(approver.id_pegawai)

        return approver_id

    def create_pengajuan(self, current_user_id_pegawai: str, payload: ApprovalPengajuanAbsensiCreate) -> ApprovalPengajuanAbsensiResponse:
        pemohon = self.db.query(Pegawai).filter(Pegawai.id_pegawai == current_user_id_pegawai).first()
        if not pemohon:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Data pegawai pemohon tidak ditemukan")

        assigned_approver_id_pegawai = self._resolve_assigned_approver(pemohon)

        data = {
            "id_pegawai": current_user_id_pegawai,
            "assigned_approver_id_pegawai": assigned_approver_id_pegawai,
            "roster_shift_id": payload.roster_shift_id,
            "tipe_pengajuan": payload.tipe_pengajuan,
            "target_tanggal": payload.target_tanggal,
            "alasan": payload.alasan,
            "status_pengajuan": "PENDING",
            "approval_mode": "ATASAN_LANGSUNG",
        }

        created = self.repo.create(data)
        self._write_log(
            pengajuan_id=created.id,
            action_by_pegawai=current_user_id_pegawai,
            action_type="CREATED",
            catatan=f"Pengajuan {payload.tipe_pengajuan} untuk {payload.target_tanggal.isoformat()} dibuat",
        )
        return ApprovalPengajuanAbsensiResponse.model_validate(created)

    def list_my_pengajuan(self, id_pegawai: str, skip: int = 0, limit: int = 100) -> List[ApprovalPengajuanAbsensiResponse]:
        items = self.repo.list_for_user(id_pegawai, skip=skip, limit=limit)
        return [ApprovalPengajuanAbsensiResponse.model_validate(item) for item in items]

    def count_my_pengajuan(self, id_pegawai: str) -> int:
        return self.repo.count_for_user(id_pegawai)

    def list_assigned_to_me(self, approver_id: str, skip: int = 0, limit: int = 100) -> List[ApprovalPengajuanAbsensiResponse]:
        items = self.repo.list_for_approver(approver_id, skip=skip, limit=limit)
        return [ApprovalPengajuanAbsensiResponse.model_validate(item) for item in items]

    def count_assigned_to_me(self, approver_id: str) -> int:
        return self.repo.count_for_approver(approver_id)

    def list_logs(
        self,
        pengajuan_id: int,
        requester_id_pegawai: str,
        requester_role_names: set[str],
        skip: int = 0,
        limit: int = 100,
    ) -> List[ApprovalPengajuanAbsensiLogResponse]:
        item = self.repo.get(pengajuan_id)
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
        return [self._to_log_response(log) for log in logs]

    def count_logs(
        self,
        pengajuan_id: int,
        requester_id_pegawai: str,
        requester_role_names: set[str],
    ) -> int:
        item = self.repo.get(pengajuan_id)
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

    def list_logs_filtered(
        self,
        requester_role_names: set[str],
        start_date: date | None = None,
        end_date: date | None = None,
        action_type: str | None = None,
        pengajuan_id: int | None = None,
        skip: int = 0,
        limit: int = 100,
    ) -> List[ApprovalPengajuanAbsensiLogResponse]:
        is_admin_role = bool(requester_role_names.intersection({"admin", "super-admin", "super_admin", "superadmin"}))
        if not is_admin_role:
            raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Hanya admin/super-admin yang dapat mengakses audit log global")

        logs = self.log_repo.list_filtered(
            start_date=start_date,
            end_date=end_date,
            action_type=action_type,
            pengajuan_id=pengajuan_id,
            skip=skip,
            limit=limit,
        )
        return [self._to_log_response(log) for log in logs]

    def count_logs_filtered(
        self,
        requester_role_names: set[str],
        start_date: date | None = None,
        end_date: date | None = None,
        action_type: str | None = None,
        pengajuan_id: int | None = None,
    ) -> int:
        is_admin_role = bool(requester_role_names.intersection({"admin", "super-admin", "super_admin", "superadmin"}))
        if not is_admin_role:
            raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Hanya admin/super-admin yang dapat mengakses audit log global")

        return self.log_repo.count_filtered(
            start_date=start_date,
            end_date=end_date,
            action_type=action_type,
            pengajuan_id=pengajuan_id,
        )

    def decide_pengajuan(
        self,
        pengajuan_id: int,
        approver_id: str,
        payload: ApprovalPengajuanAbsensiDecision,
        is_super_admin: bool = False,
    ) -> ApprovalPengajuanAbsensiResponse:
        item = self.repo.get(pengajuan_id)
        if not item:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Pengajuan tidak ditemukan")

        if str(item.status_pengajuan) != "PENDING":
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Pengajuan sudah diputuskan")

        if not is_super_admin and str(item.assigned_approver_id_pegawai) != approver_id:
            raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Bukan approver yang ditugaskan")

        is_override = is_super_admin and str(item.assigned_approver_id_pegawai) != approver_id
        if is_override:
            override_reason = payload.catatan_approval or "Super admin override"
            setattr(item, "approval_mode", "SUPER_ADMIN_OVERRIDE")
            setattr(item, "super_admin_override_by_pegawai", approver_id)
            setattr(item, "super_admin_override_reason", override_reason)
            self._write_log(
                pengajuan_id=pengajuan_id,
                action_by_pegawai=approver_id,
                action_type="SUPER_ADMIN_OVERRIDDEN",
                catatan=override_reason,
            )

        setattr(item, "status_pengajuan", payload.action)
        setattr(item, "diputuskan_pada", datetime.now())
        setattr(item, "approved_by_pegawai", approver_id)
        setattr(item, "catatan_approval", payload.catatan_approval)

        updated = self.repo.update(item)

        self._write_log(
            pengajuan_id=pengajuan_id,
            action_by_pegawai=approver_id,
            action_type=payload.action,
            catatan=payload.catatan_approval,
        )
        return ApprovalPengajuanAbsensiResponse.model_validate(updated)

    @staticmethod
    def _to_log_response(log) -> ApprovalPengajuanAbsensiLogResponse:
        data = ApprovalPengajuanAbsensiLogResponse.model_validate(log).model_dump()
        data["action_by_nama"] = log.action_by.nama if getattr(log, "action_by", None) else None
        return ApprovalPengajuanAbsensiLogResponse(**data)
