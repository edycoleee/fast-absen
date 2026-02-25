"""
Test Absensi Endpoints
Updated for check-in/check-out flow + multi-shift same day
"""
from datetime import date, datetime

from fastapi.testclient import TestClient
from sqlalchemy.orm import Session

from models.unit import Unit
from models.pegawai import Pegawai
from models.roster_shift import RosterShift
from models.penilaian_shift_absensi import PenilaianShiftAbsensi


API_PREFIX = "/api/v1/absensi"


class TestAbsensiUserFlow:
    """User check-in/check-out flow tests"""

    def test_check_in_success(self, client: TestClient, auth_headers_user: dict):
        response = client.post(
            f"{API_PREFIX}/check-in",
            json={"status": "HADIR"},
            headers=auth_headers_user,
        )

        assert response.status_code == 201
        payload = response.json()
        assert payload["success"] is True
        assert payload["message"] == "Check-in berhasil!"
        assert payload["data"]["status"] == "HADIR"
        assert payload["data"]["jam_masuk"] is not None
        assert payload["data"]["jam_keluar"] is None

    def test_check_in_while_active_session_fails(self, client: TestClient, auth_headers_user: dict):
        first = client.post(
            f"{API_PREFIX}/check-in",
            json={"status": "HADIR"},
            headers=auth_headers_user,
        )
        assert first.status_code == 201

        second = client.post(
            f"{API_PREFIX}/check-in",
            json={"status": "HADIR"},
            headers=auth_headers_user,
        )

        assert second.status_code == 400
        payload = second.json()
        assert payload["success"] is False
        assert "sesi absensi aktif" in payload["message"]

    def test_check_out_without_active_session_fails(self, client: TestClient, auth_headers_user: dict):
        response = client.post(f"{API_PREFIX}/check-out", headers=auth_headers_user)

        assert response.status_code == 404
        payload = response.json()
        assert payload["success"] is False
        assert "Tidak ada sesi check-in aktif" in payload["message"]

    def test_multi_shift_same_day_allowed_after_checkout(self, client: TestClient, auth_headers_user: dict):
        check_in_1 = client.post(
            f"{API_PREFIX}/check-in",
            json={"status": "HADIR"},
            headers=auth_headers_user,
        )
        assert check_in_1.status_code == 201

        check_out_1 = client.post(f"{API_PREFIX}/check-out", headers=auth_headers_user)
        assert check_out_1.status_code == 200

        check_in_2 = client.post(
            f"{API_PREFIX}/check-in",
            json={"status": "HADIR"},
            headers=auth_headers_user,
        )
        assert check_in_2.status_code == 201

        history = client.get(f"{API_PREFIX}/history", headers=auth_headers_user)
        assert history.status_code == 200
        history_payload = history.json()
        assert history_payload["success"] is True
        assert len(history_payload["data"]["items"]) >= 2

        today = client.get(f"{API_PREFIX}/today", headers=auth_headers_user)
        assert today.status_code == 200
        today_payload = today.json()["data"]
        assert today_payload["has_checked_in"] is True
        assert today_payload["can_check_out"] is True
        assert today_payload["can_check_in"] is False
        assert today_payload["completed_today"] is False

    def test_today_completed_state_allows_check_in_again(self, client: TestClient, auth_headers_user: dict):
        check_in = client.post(
            f"{API_PREFIX}/check-in",
            json={"status": "HADIR"},
            headers=auth_headers_user,
        )
        assert check_in.status_code == 201

        check_out = client.post(f"{API_PREFIX}/check-out", headers=auth_headers_user)
        assert check_out.status_code == 200

        today = client.get(f"{API_PREFIX}/today", headers=auth_headers_user)
        assert today.status_code == 200

        data = today.json()["data"]
        assert data["has_checked_in"] is True
        assert data["can_check_out"] is False
        assert data["can_check_in"] is True
        assert data["completed_today"] is True
        assert data["absensi"]["jam_keluar"] is not None

    def test_check_in_status_izin_requires_keterangan(self, client: TestClient, auth_headers_user: dict):
        response = client.post(
            f"{API_PREFIX}/check-in",
            json={"status": "IZIN"},
            headers=auth_headers_user,
        )

        assert response.status_code == 422
        payload = response.json()
        assert payload["success"] is False
        assert payload["message"] == "Validation error"

    def test_check_in_requires_auth(self, client: TestClient):
        response = client.post(f"{API_PREFIX}/check-in", json={"status": "HADIR"})
        assert response.status_code == 403


class TestAbsensiAdminFlow:
    """Admin CRUD tests for absensi"""

    def test_admin_get_all_absensi(self, client: TestClient, auth_headers_admin: dict, auth_headers_user: dict):
        create = client.post(
            f"{API_PREFIX}/check-in",
            json={"status": "HADIR"},
            headers=auth_headers_user,
        )
        assert create.status_code == 201

        response = client.get(f"{API_PREFIX}/", headers=auth_headers_admin)
        assert response.status_code == 200
        payload = response.json()
        assert payload["success"] is True
        assert "items" in payload["data"]
        assert payload["data"]["total"] >= 1

    def test_admin_get_all_absensi_with_production_filters_and_pagination(
        self,
        client: TestClient,
        db_with_data: Session,
        auth_headers_admin: dict,
        auth_headers_user: dict,
    ):
        db_with_data.add_all([
            Unit(id_unit=10, nama_unit="Rawat Inap"),
            Unit(id_unit=20, nama_unit="IGD"),
        ])
        pgw1 = db_with_data.query(Pegawai).filter(Pegawai.id_pegawai == "PGW001").first()
        pgw2 = db_with_data.query(Pegawai).filter(Pegawai.id_pegawai == "PGW002").first()
        pgw1.id_unit = 10
        pgw2.id_unit = 20
        db_with_data.commit()

        admin_checkin = client.post(
            f"{API_PREFIX}/check-in",
            json={"status": "HADIR"},
            headers=auth_headers_admin,
        )
        user_checkin = client.post(
            f"{API_PREFIX}/check-in",
            json={"status": "TERLAMBAT", "keterangan": "Terlambat jaga"},
            headers=auth_headers_user,
        )

        assert admin_checkin.status_code == 201
        assert user_checkin.status_code == 201

        absensi_admin_id = admin_checkin.json()["data"]["id"]
        absensi_user_id = user_checkin.json()["data"]["id"]
        today = date.today()

        db_with_data.add_all([
            RosterShift(
                id=9101,
                id_pegawai="PGW001",
                id_unit=10,
                tanggal_shift=today,
                jam_mulai=datetime(today.year, today.month, today.day, 7, 0, 0),
                jam_selesai=datetime(today.year, today.month, today.day, 14, 0, 0),
                nomor_sesi=1,
                status_roster="AKTIF",
            ),
            RosterShift(
                id=9102,
                id_pegawai="PGW002",
                id_unit=20,
                tanggal_shift=today,
                jam_mulai=datetime(today.year, today.month, today.day, 19, 0, 0),
                jam_selesai=datetime(today.year, today.month, today.day, 23, 0, 0),
                nomor_sesi=1,
                status_roster="AKTIF",
            ),
        ])
        db_with_data.add_all([
            PenilaianShiftAbsensi(
                id=9201,
                roster_shift_id=9101,
                id_pegawai="PGW001",
                matched_absensi_id=absensi_admin_id,
                status_final="TEPAT_WAKTU",
                menit_telat=0,
                menit_pulang_cepat=0,
                menit_lembur=0,
            ),
            PenilaianShiftAbsensi(
                id=9202,
                roster_shift_id=9102,
                id_pegawai="PGW002",
                matched_absensi_id=absensi_user_id,
                status_final="TERLAMBAT",
                menit_telat=10,
                menit_pulang_cepat=0,
                menit_lembur=0,
            ),
        ])
        db_with_data.commit()

        response = client.get(
            f"{API_PREFIX}/?start_date={today.isoformat()}&end_date={today.isoformat()}&id_unit=10&status=HADIR&skip=0&limit=1",
            headers=auth_headers_admin,
        )

        assert response.status_code == 200
        payload = response.json()
        assert payload["success"] is True
        assert payload["data"]["skip"] == 0
        assert payload["data"]["limit"] == 1
        assert payload["data"]["total"] == 1
        assert len(payload["data"]["items"]) == 1

        item = payload["data"]["items"][0]
        assert item["id_pegawai"] == "PGW001"
        assert item["id_unit"] == 10
        assert item["nama_unit"] == "Rawat Inap"
        assert item["status"] == "HADIR"

    def test_admin_get_all_absensi_shift_filter_with_no_match_returns_empty_items(
        self,
        client: TestClient,
        auth_headers_admin: dict,
        auth_headers_user: dict,
    ):
        checkin = client.post(
            f"{API_PREFIX}/check-in",
            json={"status": "HADIR"},
            headers=auth_headers_user,
        )
        assert checkin.status_code == 201

        response = client.get(
            f"{API_PREFIX}/?status=IZIN&skip=0&limit=10",
            headers=auth_headers_admin,
        )

        assert response.status_code == 200
        payload = response.json()
        assert payload["success"] is True
        assert payload["data"]["items"] == []
        assert payload["data"]["total"] == 0
        assert payload["data"]["skip"] == 0
        assert payload["data"]["limit"] == 10

    def test_admin_get_absensi_by_id(self, client: TestClient, auth_headers_admin: dict, auth_headers_user: dict):
        create = client.post(
            f"{API_PREFIX}/check-in",
            json={"status": "HADIR"},
            headers=auth_headers_user,
        )
        assert create.status_code == 201
        absensi_id = create.json()["data"]["id"]

        response = client.get(f"{API_PREFIX}/{absensi_id}", headers=auth_headers_admin)
        assert response.status_code == 200
        payload = response.json()
        assert payload["success"] is True
        assert payload["data"]["id"] == absensi_id

    def test_admin_update_absensi(self, client: TestClient, auth_headers_admin: dict, auth_headers_user: dict):
        create = client.post(
            f"{API_PREFIX}/check-in",
            json={"status": "HADIR"},
            headers=auth_headers_user,
        )
        assert create.status_code == 201
        absensi_id = create.json()["data"]["id"]

        response = client.put(
            f"{API_PREFIX}/{absensi_id}",
            json={"keterangan": "Updated by admin"},
            headers=auth_headers_admin,
        )
        assert response.status_code == 200
        payload = response.json()
        assert payload["success"] is True
        assert payload["data"]["keterangan"] == "Updated by admin"

    def test_admin_delete_absensi(self, client: TestClient, auth_headers_admin: dict, auth_headers_user: dict):
        create = client.post(
            f"{API_PREFIX}/check-in",
            json={"status": "HADIR"},
            headers=auth_headers_user,
        )
        assert create.status_code == 201
        absensi_id = create.json()["data"]["id"]

        response = client.delete(f"{API_PREFIX}/{absensi_id}", headers=auth_headers_admin)
        assert response.status_code == 200
        payload = response.json()
        assert payload["success"] is True
        assert payload["message"] == "Absensi deleted successfully"
