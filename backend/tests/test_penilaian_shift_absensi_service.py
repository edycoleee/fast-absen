"""
Unit tests for PenilaianShiftAbsensiService evaluate engine
"""
from datetime import datetime, timedelta

import pytest
from sqlalchemy.orm import Session

from models.absensi import Absensi
from models.penilaian_shift_absensi import PenilaianShiftAbsensi
from models.roster_shift import RosterShift
from services.penilaian_shift_absensi_service import PenilaianShiftAbsensiService


def _create_roster(
    db: Session,
    roster_id: int,
    id_pegawai: str,
    jam_mulai: datetime,
    jam_selesai: datetime,
) -> RosterShift:
    roster = RosterShift(
        id=roster_id,
        id_pegawai=id_pegawai,
        tanggal_shift=jam_mulai.date(),
        jam_mulai=jam_mulai,
        jam_selesai=jam_selesai,
        jenis_shift="CUSTOM",
        nomor_sesi=1,
        status_roster="AKTIF",
    )
    db.add(roster)
    db.commit()
    db.refresh(roster)
    return roster


def _create_absensi(
    db: Session,
    id_pegawai: str,
    jam_masuk: datetime | None,
    jam_keluar: datetime | None,
) -> Absensi:
    tanggal_ref = (jam_masuk or jam_keluar).date() if (jam_masuk or jam_keluar) else datetime.now().date()
    absensi = Absensi(
        id_pegawai=id_pegawai,
        tanggal=tanggal_ref,
        jam_masuk=jam_masuk,
        jam_keluar=jam_keluar,
        status="HADIR",
    )
    db.add(absensi)
    db.commit()
    db.refresh(absensi)
    return absensi


@pytest.mark.unit
class TestPenilaianShiftAbsensiServiceEvaluate:
    def test_evaluate_mangkir(self, db_with_data: Session):
        service = PenilaianShiftAbsensiService(db_with_data)
        mulai = datetime(2026, 2, 20, 8, 0, 0)
        selesai = datetime(2026, 2, 20, 16, 0, 0)
        roster = _create_roster(db_with_data, 1001, "PGW001", mulai, selesai)

        result = service.evaluate_roster_vs_absensi(id_pegawai="PGW001")
        penilaian = db_with_data.query(PenilaianShiftAbsensi).filter(PenilaianShiftAbsensi.roster_shift_id == roster.id).first()

        assert result.created_count == 1
        assert result.failed_count == 0
        assert penilaian is not None
        assert penilaian.status_final == "MANGKIR"

    def test_evaluate_terlambat(self, db_with_data: Session):
        service = PenilaianShiftAbsensiService(db_with_data)
        mulai = datetime(2026, 2, 20, 8, 0, 0)
        selesai = datetime(2026, 2, 20, 16, 0, 0)
        roster = _create_roster(db_with_data, 1002, "PGW001", mulai, selesai)
        _create_absensi(db_with_data, "PGW001", mulai + timedelta(minutes=20), selesai)

        service.evaluate_roster_vs_absensi(id_pegawai="PGW001")
        penilaian = db_with_data.query(PenilaianShiftAbsensi).filter(PenilaianShiftAbsensi.roster_shift_id == roster.id).first()

        assert penilaian is not None
        assert penilaian.status_final == "TERLAMBAT"
        assert penilaian.menit_telat == 10

    def test_evaluate_pulang_cepat(self, db_with_data: Session):
        service = PenilaianShiftAbsensiService(db_with_data)
        mulai = datetime(2026, 2, 21, 8, 0, 0)
        selesai = datetime(2026, 2, 21, 16, 0, 0)
        roster = _create_roster(db_with_data, 1003, "PGW001", mulai, selesai)
        _create_absensi(db_with_data, "PGW001", mulai, selesai - timedelta(minutes=15))

        service.evaluate_roster_vs_absensi(id_pegawai="PGW001")
        penilaian = db_with_data.query(PenilaianShiftAbsensi).filter(PenilaianShiftAbsensi.roster_shift_id == roster.id).first()

        assert penilaian is not None
        assert penilaian.status_final == "PULANG_CEPAT"
        assert penilaian.menit_pulang_cepat == 15

    def test_evaluate_lembur(self, db_with_data: Session):
        service = PenilaianShiftAbsensiService(db_with_data)
        mulai = datetime(2026, 2, 22, 8, 0, 0)
        selesai = datetime(2026, 2, 22, 16, 0, 0)
        roster = _create_roster(db_with_data, 1004, "PGW001", mulai, selesai)
        _create_absensi(db_with_data, "PGW001", mulai, selesai + timedelta(minutes=45))

        service.evaluate_roster_vs_absensi(id_pegawai="PGW001")
        penilaian = db_with_data.query(PenilaianShiftAbsensi).filter(PenilaianShiftAbsensi.roster_shift_id == roster.id).first()

        assert penilaian is not None
        assert penilaian.status_final == "TEPAT_WAKTU"
        assert penilaian.menit_lembur == 45

    def test_evaluate_skip_manual_override(self, db_with_data: Session):
        service = PenilaianShiftAbsensiService(db_with_data)
        mulai = datetime(2026, 2, 23, 8, 0, 0)
        selesai = datetime(2026, 2, 23, 16, 0, 0)
        roster = _create_roster(db_with_data, 1005, "PGW001", mulai, selesai)

        manual_penilaian = PenilaianShiftAbsensi(
            id=1,
            roster_shift_id=roster.id,
            id_pegawai="PGW001",
            status_final="TEPAT_WAKTU",
            menit_telat=0,
            menit_pulang_cepat=0,
            menit_lembur=0,
            evaluation_version=3,
            is_manual_override=True,
            override_reason="Koreksi manual",
        )
        db_with_data.add(manual_penilaian)
        db_with_data.commit()

        result = service.evaluate_roster_vs_absensi(id_pegawai="PGW001", force_recalculate=False)
        refreshed = db_with_data.query(PenilaianShiftAbsensi).filter(PenilaianShiftAbsensi.roster_shift_id == roster.id).first()

        assert result.skipped_manual_override == 1
        assert refreshed is not None
        assert refreshed.evaluation_version == 3
        assert refreshed.is_manual_override is True

    def test_evaluate_force_recalculate_updates_existing(self, db_with_data: Session):
        service = PenilaianShiftAbsensiService(db_with_data)
        mulai = datetime(2026, 2, 24, 8, 0, 0)
        selesai = datetime(2026, 2, 24, 16, 0, 0)
        roster = _create_roster(db_with_data, 1006, "PGW001", mulai, selesai)
        _create_absensi(db_with_data, "PGW001", mulai + timedelta(minutes=20), selesai)

        first_run = service.evaluate_roster_vs_absensi(id_pegawai="PGW001")
        assert first_run.created_count == 1

        db_with_data.add(
            Absensi(
                id_pegawai="PGW001",
                tanggal=mulai.date(),
                jam_masuk=mulai,
                jam_keluar=selesai,
                status="HADIR",
            )
        )
        db_with_data.commit()

        second_run = service.evaluate_roster_vs_absensi(id_pegawai="PGW001", force_recalculate=True)
        refreshed = db_with_data.query(PenilaianShiftAbsensi).filter(PenilaianShiftAbsensi.roster_shift_id == roster.id).first()

        assert second_run.updated_count == 1
        assert refreshed is not None
        assert refreshed.evaluation_version == 2
        assert refreshed.is_manual_override is False

    def test_evaluate_rerun_without_force_skips_existing(self, db_with_data: Session):
        service = PenilaianShiftAbsensiService(db_with_data)
        mulai = datetime(2026, 2, 25, 8, 0, 0)
        selesai = datetime(2026, 2, 25, 16, 0, 0)
        roster = _create_roster(db_with_data, 1007, "PGW001", mulai, selesai)
        _create_absensi(db_with_data, "PGW001", mulai + timedelta(minutes=5), selesai)

        first_run = service.evaluate_roster_vs_absensi(id_pegawai="PGW001", force_recalculate=False)
        second_run = service.evaluate_roster_vs_absensi(id_pegawai="PGW001", force_recalculate=False)

        penilaian_count = (
            db_with_data.query(PenilaianShiftAbsensi)
            .filter(PenilaianShiftAbsensi.roster_shift_id == roster.id)
            .count()
        )

        assert first_run.created_count == 1
        assert second_run.created_count == 0
        assert second_run.updated_count == 0
        assert second_run.skipped_existing == 1
        assert penilaian_count == 1