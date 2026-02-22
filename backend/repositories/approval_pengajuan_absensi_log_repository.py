"""
Approval Pengajuan Absensi Log Repository
"""
from datetime import date, timedelta
from typing import List
from sqlalchemy import func
from sqlalchemy.orm import Session, joinedload
from models.approval_pengajuan_absensi_log import ApprovalPengajuanAbsensiLog


class ApprovalPengajuanAbsensiLogRepository:
    def __init__(self, db: Session):
        self.db = db

    def get_by_id(self, log_id: int) -> ApprovalPengajuanAbsensiLog | None:
        return (
            self.db.query(ApprovalPengajuanAbsensiLog)
            .options(joinedload(ApprovalPengajuanAbsensiLog.action_by))
            .filter(ApprovalPengajuanAbsensiLog.id == log_id)
            .first()
        )

    def create(self, payload: dict) -> ApprovalPengajuanAbsensiLog:
        item = ApprovalPengajuanAbsensiLog(**payload)
        if self.db.bind and self.db.bind.dialect.name == "sqlite":
            item.id = self._next_id()
        self.db.add(item)
        self.db.commit()
        self.db.refresh(item)
        return item

    def _next_id(self) -> int:
        current_max = self.db.query(func.max(ApprovalPengajuanAbsensiLog.id)).scalar()
        return int(current_max or 0) + 1

    def list_by_pengajuan(self, pengajuan_id: int, skip: int = 0, limit: int = 100) -> List[ApprovalPengajuanAbsensiLog]:
        return (
            self.db.query(ApprovalPengajuanAbsensiLog)
            .options(joinedload(ApprovalPengajuanAbsensiLog.action_by))
            .filter(ApprovalPengajuanAbsensiLog.pengajuan_id == pengajuan_id)
            .order_by(ApprovalPengajuanAbsensiLog.created_at.asc(), ApprovalPengajuanAbsensiLog.id.asc())
            .offset(skip)
            .limit(limit)
            .all()
        )

    def count_by_pengajuan(self, pengajuan_id: int) -> int:
        return (
            self.db.query(ApprovalPengajuanAbsensiLog)
            .filter(ApprovalPengajuanAbsensiLog.pengajuan_id == pengajuan_id)
            .count()
        )

    def list_filtered(
        self,
        start_date: date | None = None,
        end_date: date | None = None,
        action_type: str | None = None,
        pengajuan_id: int | None = None,
        skip: int = 0,
        limit: int = 100,
    ) -> List[ApprovalPengajuanAbsensiLog]:
        query = self.db.query(ApprovalPengajuanAbsensiLog)
        query = query.options(joinedload(ApprovalPengajuanAbsensiLog.action_by))

        if pengajuan_id is not None:
            query = query.filter(ApprovalPengajuanAbsensiLog.pengajuan_id == pengajuan_id)

        if action_type:
            query = query.filter(ApprovalPengajuanAbsensiLog.action_type == action_type)

        if start_date:
            query = query.filter(ApprovalPengajuanAbsensiLog.created_at >= start_date)

        if end_date:
            end_exclusive = end_date + timedelta(days=1)
            query = query.filter(ApprovalPengajuanAbsensiLog.created_at < end_exclusive)

        return (
            query
            .order_by(ApprovalPengajuanAbsensiLog.created_at.desc(), ApprovalPengajuanAbsensiLog.id.desc())
            .offset(skip)
            .limit(limit)
            .all()
        )

    def count_filtered(
        self,
        start_date: date | None = None,
        end_date: date | None = None,
        action_type: str | None = None,
        pengajuan_id: int | None = None,
    ) -> int:
        query = self.db.query(ApprovalPengajuanAbsensiLog)

        if pengajuan_id is not None:
            query = query.filter(ApprovalPengajuanAbsensiLog.pengajuan_id == pengajuan_id)

        if action_type:
            query = query.filter(ApprovalPengajuanAbsensiLog.action_type == action_type)

        if start_date:
            query = query.filter(ApprovalPengajuanAbsensiLog.created_at >= start_date)

        if end_date:
            end_exclusive = end_date + timedelta(days=1)
            query = query.filter(ApprovalPengajuanAbsensiLog.created_at < end_exclusive)

        return query.count()
