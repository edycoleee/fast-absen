"""
Endpoint tests for Roster Upload Batch import scenarios
"""
from datetime import datetime
from io import BytesIO

import pytest
from fastapi.testclient import TestClient
from openpyxl import Workbook
from sqlalchemy.orm import Session

from models.roster_shift import RosterShift
from models.shift_kelompok import ShiftKelompok
from models.unit import Unit


API_PREFIX = "/api/v1/roster-upload-batch"


def _build_excel_bytes(headers: list[str], rows: list[list[object]]) -> bytes:
    workbook = Workbook()
    worksheet = workbook.active
    worksheet.append(headers)
    for row in rows:
        worksheet.append(row)

    output = BytesIO()
    workbook.save(output)
    output.seek(0)
    return output.getvalue()


@pytest.mark.integration
class TestRosterUploadBatchImportEndpoint:
    def test_import_invalid_header_returns_400(
        self,
        client: TestClient,
        db_with_data: Session,
        auth_headers_admin: dict,
    ):
        excel_bytes = _build_excel_bytes(
            headers=["id_pegawai", "id_unit", "tanggal_shift"],
            rows=[["PGW001", 10, "2026-03-01"]],
        )

        response = client.post(
            f"{API_PREFIX}/import",
            files={
                "file": (
                    "invalid_roster.xlsx",
                    excel_bytes,
                    "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
                )
            },
            headers=auth_headers_admin,
        )

        assert response.status_code == 400
        payload = response.json()
        error_text = payload.get("detail") or payload.get("message") or ""
        assert "Header wajib tidak lengkap" in error_text

    def test_import_overlap_with_existing_roster_marked_invalid(
        self,
        client: TestClient,
        db_with_data: Session,
        auth_headers_admin: dict,
    ):
        db_with_data.add(Unit(id_unit=10, nama_unit="Rawat Inap"))
        db_with_data.add(ShiftKelompok(id=10, kode="PERAWAT_SHIFT", nama="Perawat Shift"))
        db_with_data.add(
            RosterShift(
                id=1,
                id_pegawai="PGW001",
                shift_kelompok_id=10,
                id_unit=10,
                tanggal_shift=datetime(2026, 3, 1).date(),
                jam_mulai=datetime(2026, 3, 1, 7, 0),
                jam_selesai=datetime(2026, 3, 1, 14, 0),
                nomor_sesi=1,
            )
        )
        db_with_data.commit()

        excel_bytes = _build_excel_bytes(
            headers=[
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
            ],
            rows=[
                [
                    "PGW001",
                    10,
                    "PERAWAT_SHIFT",
                    "2026-03-01",
                    "08:00",
                    "15:00",
                    2,
                    10,
                    0,
                    "Shift overlap",
                ]
            ],
        )

        response = client.post(
            f"{API_PREFIX}/import",
            files={
                "file": (
                    "roster_overlap.xlsx",
                    excel_bytes,
                    "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
                )
            },
            data={"uploaded_by_pegawai": "PGW001"},
            headers=auth_headers_admin,
        )

        assert response.status_code == 201
        payload = response.json()
        assert payload["success"] is True
        assert payload["data"]["result"]["valid_rows"] == 0
        assert payload["data"]["result"]["invalid_rows"] == 1
        assert "Overlap shift" in payload["data"]["result"]["errors"][0]["error"]
