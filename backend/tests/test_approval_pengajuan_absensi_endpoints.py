"""
Endpoint tests for approval pengajuan absensi direct-supervisor resolver
"""
import pytest
from fastapi.testclient import TestClient
from sqlalchemy.orm import Session

from models.pegawai import Pegawai


API_PREFIX = "/api/v1/approval-pengajuan-absensi"


def _error_text(response) -> str:
    body = response.json()
    return (body.get("detail") or body.get("message") or "").lower()


@pytest.mark.integration
class TestApprovalPengajuanAbsensiDirectSupervisorResolver:
    def test_create_pengajuan_resolves_single_direct_supervisor_success(
        self,
        client: TestClient,
        db_with_data: Session,
        auth_headers_admin: dict,
    ):
        admin_pegawai = db_with_data.query(Pegawai).filter(Pegawai.id_pegawai == "PGW001").first()
        admin_pegawai.kepala_id_unit = 10

        approver = Pegawai(
            id_pegawai="PGW010",
            nip="19800101000010",
            nama="Atasan Langsung",
            id_unit=10,
        )
        db_with_data.add(approver)
        db_with_data.commit()

        response = client.post(
            f"{API_PREFIX}/",
            json={
                "tipe_pengajuan": "MISSING_CHECKIN",
                "target_tanggal": "2026-03-02",
                "alasan": "Lupa check-in saat visit pasien",
            },
            headers=auth_headers_admin,
        )

        assert response.status_code == 201
        payload = response.json()
        assert payload["success"] is True
        assert payload["data"]["id_pegawai"] == "PGW001"
        assert payload["data"]["assigned_approver_id_pegawai"] == "PGW010"
        assert payload["data"]["approval_mode"] == "ATASAN_LANGSUNG"

    def test_create_pengajuan_fails_when_direct_supervisor_mapping_missing(
        self,
        client: TestClient,
        db_with_data: Session,
        auth_headers_admin: dict,
    ):
        admin_pegawai = db_with_data.query(Pegawai).filter(Pegawai.id_pegawai == "PGW001").first()
        admin_pegawai.kepala_id_unit = None
        db_with_data.commit()

        response = client.post(
            f"{API_PREFIX}/",
            json={
                "tipe_pengajuan": "MISSING_CHECKOUT",
                "target_tanggal": "2026-03-02",
                "alasan": "Lupa check-out",
            },
            headers=auth_headers_admin,
        )

        assert response.status_code == 400
        assert "atasan langsung" in _error_text(response)

    def test_create_pengajuan_fails_when_only_self_found_in_supervisor_unit(
        self,
        client: TestClient,
        db_with_data: Session,
        auth_headers_admin: dict,
    ):
        admin_pegawai = db_with_data.query(Pegawai).filter(Pegawai.id_pegawai == "PGW001").first()
        admin_pegawai.kepala_id_unit = 20
        admin_pegawai.id_unit = 20
        db_with_data.commit()

        response = client.post(
            f"{API_PREFIX}/",
            json={
                "tipe_pengajuan": "ALASAN_TERLAMBAT",
                "target_tanggal": "2026-03-02",
                "alasan": "Terlambat karena ban bocor",
            },
            headers=auth_headers_admin,
        )

        assert response.status_code == 400
        assert "hanya ditemukan pemohon sendiri" in _error_text(response)
