"""
Approval Pengajuan Absensi Repository
"""
from typing import List, Optional
from sqlalchemy import func
from sqlalchemy.orm import Session
from models.approval_pengajuan_absensi import ApprovalPengajuanAbsensi


class ApprovalPengajuanAbsensiRepository:
    def __init__(self, db: Session):
        self.db = db

    def create(self, payload: dict) -> ApprovalPengajuanAbsensi:
        item = ApprovalPengajuanAbsensi(**payload)
        if self.db.bind and self.db.bind.dialect.name == "sqlite":
            item.id = self._next_id()
        self.db.add(item)
        self.db.commit()
        self.db.refresh(item)
        return item

    def _next_id(self) -> int:
        current_max = self.db.query(func.max(ApprovalPengajuanAbsensi.id)).scalar()
        return int(current_max or 0) + 1

    def get(self, pengajuan_id: int) -> Optional[ApprovalPengajuanAbsensi]:
        return self.db.query(ApprovalPengajuanAbsensi).filter(ApprovalPengajuanAbsensi.id == pengajuan_id).first()

    def list_for_user(self, id_pegawai: str, skip: int = 0, limit: int = 100) -> List[ApprovalPengajuanAbsensi]:
        return (
            self.db.query(ApprovalPengajuanAbsensi)
            .filter(ApprovalPengajuanAbsensi.id_pegawai == id_pegawai)
            .order_by(ApprovalPengajuanAbsensi.created_at.desc())
            .offset(skip)
            .limit(limit)
            .all()
        )

    def count_for_user(self, id_pegawai: str) -> int:
        return (
            self.db.query(ApprovalPengajuanAbsensi)
            .filter(ApprovalPengajuanAbsensi.id_pegawai == id_pegawai)
            .count()
        )

    def list_for_approver(self, approver_id: str, skip: int = 0, limit: int = 100) -> List[ApprovalPengajuanAbsensi]:
        return (
            self.db.query(ApprovalPengajuanAbsensi)
            .filter(ApprovalPengajuanAbsensi.assigned_approver_id_pegawai == approver_id)
            .order_by(ApprovalPengajuanAbsensi.created_at.desc())
            .offset(skip)
            .limit(limit)
            .all()
        )

    def count_for_approver(self, approver_id: str) -> int:
        return (
            self.db.query(ApprovalPengajuanAbsensi)
            .filter(ApprovalPengajuanAbsensi.assigned_approver_id_pegawai == approver_id)
            .count()
        )

    def update(self, item: ApprovalPengajuanAbsensi) -> ApprovalPengajuanAbsensi:
        self.db.commit()
        self.db.refresh(item)
        return item
