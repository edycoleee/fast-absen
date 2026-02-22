"""
W2 e2e endpoint flow tests
"""
from io import BytesIO

import pytest
from fastapi.testclient import TestClient
from openpyxl import Workbook
from sqlalchemy.orm import Session

from models.pegawai import Pegawai
from models.shift_kelompok import ShiftKelompok
from models.unit import Unit


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
        "jenis_shift",
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
        "PAGI",
        1,
        10,
        0,
        "Shift pagi",
    ])

    output = BytesIO()
    workbook.save(output)
    output.seek(0)
    return output.getvalue()


@pytest.mark.integration
class TestW2E2EFlow:
    def test_import_evaluate_approval_decision_flow(
        self,
        client: TestClient,
        db_with_data: Session,
        auth_headers_admin: dict,
    ):
        db_with_data.add(Unit(id_unit=10, nama_unit="Rawat Inap"))
        db_with_data.add(ShiftKelompok(id=10, kode="PERAWAT_SHIFT", nama="Perawat Shift"))

        pemohon = db_with_data.query(Pegawai).filter(Pegawai.id_pegawai == "PGW001").first()
        pemohon.kepala_id_unit = 10

        approver = Pegawai(
            id_pegawai="PGW010",
            nip="19800101000010",
            nama="Atasan Langsung",
            id_unit=10,
        )
        db_with_data.add(approver)
        db_with_data.commit()

        import_response = client.post(
            "/api/v1/roster-upload-batch/import",
            files={
                "file": (
                    "roster_maret.xlsx",
                    _build_roster_excel_bytes(),
                    "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
                )
            },
            data={"uploaded_by_pegawai": "PGW001"},
            headers=auth_headers_admin,
        )
        assert import_response.status_code == 201
        import_payload = import_response.json()
        assert import_payload["success"] is True
        assert import_payload["data"]["result"]["valid_rows"] == 1

        evaluate_response = client.post(
            "/api/v1/penilaian-shift-absensi/evaluate",
            json={"id_pegawai": "PGW001", "force_recalculate": False},
            headers=auth_headers_admin,
        )
        assert evaluate_response.status_code == 200
        evaluate_payload = evaluate_response.json()
        assert evaluate_payload["success"] is True
        assert evaluate_payload["data"]["total_roster"] >= 1

        create_pengajuan_response = client.post(
            "/api/v1/approval-pengajuan-absensi/",
            json={
                "tipe_pengajuan": "MISSING_CHECKIN",
                "target_tanggal": "2026-03-01",
                "alasan": "E2E test pengajuan",
            },
            headers=auth_headers_admin,
        )
        assert create_pengajuan_response.status_code == 201
        create_payload = create_pengajuan_response.json()
        pengajuan_id = create_payload["data"]["id"]
        assert create_payload["data"]["assigned_approver_id_pegawai"] == "PGW010"

        decision_response = client.post(
            f"/api/v1/approval-pengajuan-absensi/{pengajuan_id}/decision",
            json={"action": "APPROVED", "catatan_approval": "Approved by super-admin override"},
            headers=auth_headers_admin,
        )
        assert decision_response.status_code == 200
        decision_payload = decision_response.json()
        assert decision_payload["success"] is True
        assert decision_payload["data"]["status_pengajuan"] == "APPROVED"
        assert decision_payload["data"]["approval_mode"] == "SUPER_ADMIN_OVERRIDE"
