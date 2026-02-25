"""
Unit tests for RosterUploadBatchService idempotency and retry safety
"""
from datetime import date
from io import BytesIO

import pytest
from openpyxl import Workbook
from sqlalchemy.orm import Session

from models.shift_kelompok import ShiftKelompok
from models.unit import Unit
from models.roster_shift import RosterShift
from services.roster_upload_batch_service import RosterUploadBatchService


def _build_roster_excel_bytes() -> bytes:
    workbook = Workbook()
    worksheet = workbook.active
    worksheet.append([
        "id_pegawai",
        "id_unit",
        "shift_kelompok_kode",
        "tanggal_shift",
        "jam_mulai",
        "jam_selesai",
        "nomor_sesi",
        "grace_telat_override_menit",
        "toleransi_pulang_cepat_override_menit",
        "catatan",
    ])
    worksheet.append([
        "PGW001",
        10,
        "PERAWAT_SHIFT",
        "2026-03-01",
        "07:00",
        "14:00",
        1,
        10,
        0,
        "Shift pagi",
    ])

    output = BytesIO()
    workbook.save(output)
    output.seek(0)
    return output.getvalue()


@pytest.mark.unit
class TestRosterUploadBatchServiceIdempotency:
    def test_import_retry_same_file_reuses_existing_batch(self, db_with_data: Session):
        db_with_data.add(Unit(id_unit=10, nama_unit="Rawat Inap"))
        db_with_data.add(ShiftKelompok(id=10, kode="PERAWAT_SHIFT", nama="Perawat Shift"))
        db_with_data.commit()

        service = RosterUploadBatchService(db_with_data)
        excel_bytes = _build_roster_excel_bytes()

        first = service.import_from_excel(
            file_name="roster_maret.xlsx",
            file_content=excel_bytes,
            uploaded_by_pegawai="PGW001",
        )
        second = service.import_from_excel(
            file_name="roster_maret.xlsx",
            file_content=excel_bytes,
            uploaded_by_pegawai="PGW001",
        )

        roster_count = db_with_data.query(RosterShift).count()

        assert first["result"]["idempotent_reused"] is False
        assert second["result"]["idempotent_reused"] is True
        assert first["batch"].id == second["batch"].id
        assert roster_count == 1
