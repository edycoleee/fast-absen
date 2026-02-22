"""
Penilaian Shift Absensi Service
"""
from datetime import date, datetime, timedelta
from typing import Any, List, Optional
from fastapi import HTTPException, status
from sqlalchemy.orm import Session
from sqlalchemy import and_, or_, func
from models.penilaian_shift_absensi import PenilaianShiftAbsensi
from models.roster_shift import RosterShift
from models.absensi import Absensi
from models.shift_kelompok_aturan import ShiftKelompokAturan
from repositories.penilaian_shift_absensi_repository import PenilaianShiftAbsensiRepository
from schemas.penilaian_shift_absensi import (
    PenilaianShiftAbsensiCreate,
    PenilaianShiftAbsensiUpdate,
    PenilaianShiftAbsensiResponse,
    PenilaianShiftAbsensiEvaluateResponse,
)


VALID_STATUS_FINAL = {
    "TEPAT_WAKTU",
    "TERLAMBAT",
    "PULANG_CEPAT",
    "TIDAK_ABSEN_MASUK",
    "TIDAK_ABSEN_PULANG",
    "MANGKIR",
    "TIDAK_DIHITUNG",
}


class PenilaianShiftAbsensiService:
    def __init__(self, db: Session):
        self.db = db
        self.repo = PenilaianShiftAbsensiRepository(db)

    def get_all(self, skip: int = 0, limit: int = 100) -> List[PenilaianShiftAbsensiResponse]:
        items = self.repo.get_all_with_relations(skip=skip, limit=limit)
        return [self._to_response(item) for item in items]

    def count_all(self) -> int:
        return self.repo.count()

    def get_by_id(self, penilaian_id: int) -> PenilaianShiftAbsensiResponse:
        item = self.repo.get_by_id_with_relations(penilaian_id)
        if not item:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=f"Penilaian shift absensi {penilaian_id} tidak ditemukan")
        return self._to_response(item)

    def create(self, payload: PenilaianShiftAbsensiCreate) -> PenilaianShiftAbsensiResponse:
        data = payload.model_dump()
        self._validate_payload(data)

        item = PenilaianShiftAbsensi(**data)
        self.db.add(item)
        self.db.commit()
        self.db.refresh(item)
        return self._to_response(item)

    def update(self, penilaian_id: int, payload: PenilaianShiftAbsensiUpdate) -> PenilaianShiftAbsensiResponse:
        item = self.repo.get_by_id_with_relations(penilaian_id)
        if not item:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=f"Penilaian shift absensi {penilaian_id} tidak ditemukan")

        data = payload.model_dump(exclude_unset=True)

        merged = {
            "checkin_aktual": data.get("checkin_aktual", item.checkin_aktual),
            "checkout_aktual": data.get("checkout_aktual", item.checkout_aktual),
            "status_final": data.get("status_final", item.status_final),
            "menit_telat": data.get("menit_telat", item.menit_telat),
            "menit_pulang_cepat": data.get("menit_pulang_cepat", item.menit_pulang_cepat),
            "menit_lembur": data.get("menit_lembur", item.menit_lembur),
            "evaluation_version": data.get("evaluation_version", item.evaluation_version),
        }
        self._validate_payload(merged)

        for key, value in data.items():
            setattr(item, key, value)

        self.db.commit()
        self.db.refresh(item)
        return self._to_response(item)

    def delete(self, penilaian_id: int) -> None:
        item = self.repo.get_by_id(penilaian_id)
        if not item:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=f"Penilaian shift absensi {penilaian_id} tidak ditemukan")

        self.db.delete(item)
        self.db.commit()

    def evaluate_roster_vs_absensi(
        self,
        start_date: Optional[date] = None,
        end_date: Optional[date] = None,
        id_unit: Optional[int] = None,
        id_pegawai: Optional[str] = None,
        force_recalculate: bool = False,
    ) -> PenilaianShiftAbsensiEvaluateResponse:
        roster_query = self.db.query(RosterShift).filter(RosterShift.status_roster == "AKTIF")

        if start_date:
            roster_query = roster_query.filter(RosterShift.tanggal_shift >= start_date)
        if end_date:
            roster_query = roster_query.filter(RosterShift.tanggal_shift <= end_date)
        if id_unit is not None:
            roster_query = roster_query.filter(RosterShift.id_unit == id_unit)
        if id_pegawai:
            roster_query = roster_query.filter(RosterShift.id_pegawai == id_pegawai)

        roster_items = roster_query.order_by(RosterShift.tanggal_shift.asc(), RosterShift.jam_mulai.asc()).all()

        total_roster = len(roster_items)
        evaluated_count = 0
        created_count = 0
        updated_count = 0
        skipped_manual_override = 0
        skipped_existing = 0
        failed_count = 0
        failures: list[dict[str, Any]] = []

        for roster in roster_items:
            try:
                existing = (
                    self.db.query(PenilaianShiftAbsensi)
                    .filter(PenilaianShiftAbsensi.roster_shift_id == roster.id)
                    .first()
                )

                if existing and existing.is_manual_override and not force_recalculate:
                    skipped_manual_override += 1
                    continue

                if existing and not force_recalculate:
                    skipped_existing += 1
                    continue

                evaluated_data = self._evaluate_single_roster(roster)

                if existing:
                    current_version = existing.evaluation_version or 1
                    for key, value in evaluated_data.items():
                        setattr(existing, key, value)
                    existing.evaluation_version = current_version + 1
                    existing.evaluated_at = datetime.now()
                    updated_count += 1
                else:
                    new_item = PenilaianShiftAbsensi(
                        **evaluated_data,
                        evaluation_version=1,
                        evaluated_at=datetime.now(),
                    )
                    if self.db.bind and self.db.bind.dialect.name == "sqlite":
                        new_item.id = self._next_penilaian_id()
                    self.db.add(new_item)
                    created_count += 1

                evaluated_count += 1

            except Exception as exc:
                failed_count += 1
                failures.append(
                    {
                        "roster_shift_id": roster.id,
                        "id_pegawai": roster.id_pegawai,
                        "tanggal_shift": roster.tanggal_shift.isoformat() if roster.tanggal_shift else None,
                        "error": str(exc),
                    }
                )

        self.db.commit()

        return PenilaianShiftAbsensiEvaluateResponse(
            total_roster=total_roster,
            evaluated_count=evaluated_count,
            created_count=created_count,
            updated_count=updated_count,
            skipped_manual_override=skipped_manual_override,
            skipped_existing=skipped_existing,
            failed_count=failed_count,
            failures=failures,
        )

    def _evaluate_single_roster(self, roster: RosterShift) -> dict[str, Any]:
        aturan = self._resolve_aturan(roster)

        grace_telat = aturan.grace_telat_menit if aturan else 10
        toleransi_pulang_cepat = aturan.toleransi_pulang_cepat_menit if aturan else 0
        batas_lembur = aturan.batas_lembur_menit if aturan else 0
        window_minus = aturan.window_mulai_minus_menit if aturan else 120
        window_plus = aturan.window_selesai_plus_menit if aturan else 240

        if roster.grace_telat_override_menit is not None:
            grace_telat = roster.grace_telat_override_menit
        if roster.toleransi_pulang_cepat_override_menit is not None:
            toleransi_pulang_cepat = roster.toleransi_pulang_cepat_override_menit

        window_start = roster.jam_mulai - timedelta(minutes=window_minus)
        window_end = roster.jam_selesai + timedelta(minutes=window_plus)

        matched_absensi = self._find_best_absensi(roster.id_pegawai, window_start, window_end, roster.jam_mulai)

        checkin_aktual = matched_absensi.jam_masuk if matched_absensi and matched_absensi.jam_masuk else None
        checkout_aktual = matched_absensi.jam_keluar if matched_absensi and matched_absensi.jam_keluar else None

        menit_telat = 0
        menit_pulang_cepat = 0
        menit_lembur = 0
        status_final = "TEPAT_WAKTU"

        if checkin_aktual is None and checkout_aktual is None:
            status_final = "MANGKIR"
        elif checkin_aktual is None and checkout_aktual is not None:
            status_final = "TIDAK_ABSEN_MASUK"
        elif checkin_aktual is not None and checkout_aktual is None:
            status_final = "TIDAK_ABSEN_PULANG"
        else:
            late_minutes_raw = self._minutes_diff(checkin_aktual, roster.jam_mulai)
            early_leave_minutes_raw = self._minutes_diff(roster.jam_selesai, checkout_aktual)
            overtime_minutes_raw = self._minutes_diff(checkout_aktual, roster.jam_selesai)

            menit_telat = max(0, late_minutes_raw - grace_telat)
            menit_pulang_cepat = max(0, early_leave_minutes_raw - toleransi_pulang_cepat)
            menit_lembur = overtime_minutes_raw if overtime_minutes_raw >= batas_lembur else 0

            if menit_telat > 0:
                status_final = "TERLAMBAT"
            elif menit_pulang_cepat > 0:
                status_final = "PULANG_CEPAT"
            else:
                status_final = "TEPAT_WAKTU"

        return {
            "roster_shift_id": roster.id,
            "id_pegawai": roster.id_pegawai,
            "matched_absensi_id": matched_absensi.id if matched_absensi else None,
            "checkin_aktual": checkin_aktual,
            "checkout_aktual": checkout_aktual,
            "menit_telat": menit_telat,
            "menit_pulang_cepat": menit_pulang_cepat,
            "menit_lembur": menit_lembur,
            "status_final": status_final,
            "status_detail": {
                "window_start": window_start.isoformat(),
                "window_end": window_end.isoformat(),
                "grace_telat_menit": grace_telat,
                "toleransi_pulang_cepat_menit": toleransi_pulang_cepat,
                "batas_lembur_menit": batas_lembur,
                "matched_absensi_id": matched_absensi.id if matched_absensi else None,
            },
            "is_manual_override": False,
            "override_reason": None,
            "approved_by_pegawai": None,
            "approved_at": None,
        }

    def _resolve_aturan(self, roster: RosterShift) -> Optional[ShiftKelompokAturan]:
        if not roster.shift_kelompok_id:
            return None

        aturan_query = self.db.query(ShiftKelompokAturan).filter(
            ShiftKelompokAturan.shift_kelompok_id == roster.shift_kelompok_id,
            ShiftKelompokAturan.is_active.is_(True),
            ShiftKelompokAturan.effective_start_date <= roster.tanggal_shift,
            or_(
                ShiftKelompokAturan.effective_end_date.is_(None),
                ShiftKelompokAturan.effective_end_date >= roster.tanggal_shift,
            ),
        )

        aturan_unit = None
        if roster.id_unit is not None:
            aturan_unit = (
                aturan_query
                .filter(ShiftKelompokAturan.id_unit == roster.id_unit)
                .order_by(ShiftKelompokAturan.effective_start_date.desc())
                .first()
            )
            if aturan_unit:
                return aturan_unit

        return (
            aturan_query
            .filter(ShiftKelompokAturan.id_unit.is_(None))
            .order_by(ShiftKelompokAturan.effective_start_date.desc())
            .first()
        )

    def _find_best_absensi(
        self,
        id_pegawai: str,
        window_start: datetime,
        window_end: datetime,
        jam_mulai: datetime,
    ) -> Optional[Absensi]:
        candidates = (
            self.db.query(Absensi)
            .filter(
                Absensi.id_pegawai == id_pegawai,
                or_(
                    and_(Absensi.jam_masuk.isnot(None), Absensi.jam_masuk >= window_start, Absensi.jam_masuk <= window_end),
                    and_(Absensi.jam_keluar.isnot(None), Absensi.jam_keluar >= window_start, Absensi.jam_keluar <= window_end),
                ),
            )
            .all()
        )

        if not candidates:
            return None

        candidates.sort(
            key=lambda item: (
                abs(self._minutes_diff(item.jam_masuk or item.jam_keluar or jam_mulai, jam_mulai)),
                item.jam_masuk or item.jam_keluar or jam_mulai,
            )
        )
        return candidates[0]

    @staticmethod
    def _minutes_diff(later: datetime, earlier: datetime) -> int:
        return int((later - earlier).total_seconds() // 60)

    def _next_penilaian_id(self) -> int:
        current_max = self.db.query(func.max(PenilaianShiftAbsensi.id)).scalar()
        return int(current_max or 0) + 1

    def _validate_payload(self, data: dict) -> None:
        status_final = data.get("status_final")
        if status_final and status_final not in VALID_STATUS_FINAL:
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=f"status_final tidak valid. Gunakan salah satu: {', '.join(sorted(VALID_STATUS_FINAL))}")

        checkin_aktual = data.get("checkin_aktual")
        checkout_aktual = data.get("checkout_aktual")
        if checkin_aktual and checkout_aktual and checkout_aktual < checkin_aktual:
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="checkout_aktual tidak boleh lebih kecil dari checkin_aktual")

        for field_name in ["menit_telat", "menit_pulang_cepat", "menit_lembur"]:
            value = data.get(field_name)
            if value is not None and value < 0:
                raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=f"{field_name} tidak boleh negatif")

        evaluation_version = data.get("evaluation_version")
        if evaluation_version is not None and evaluation_version <= 0:
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="evaluation_version harus lebih besar dari 0")

    @staticmethod
    def _to_response(item: PenilaianShiftAbsensi) -> PenilaianShiftAbsensiResponse:
        data = PenilaianShiftAbsensiResponse.model_validate(item).model_dump()
        data["pegawai_nama"] = item.pegawai.nama if item.pegawai else None
        data["approved_by_nama"] = item.approved_by.nama if item.approved_by else None
        data["roster_tanggal_shift"] = item.roster_shift.tanggal_shift if item.roster_shift else None
        data["roster_status"] = item.roster_shift.status_roster if item.roster_shift else None
        return PenilaianShiftAbsensiResponse(**data)
