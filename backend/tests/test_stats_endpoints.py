"""
Endpoint tests for stats KPI unit-role recap
"""
from datetime import date, datetime

import pytest
from fastapi.testclient import TestClient
from sqlalchemy.orm import Session
from sqlalchemy import text

from models.unit import Unit
from models.pegawai import Pegawai
from models.roster_shift import RosterShift
from models.penilaian_shift_absensi import PenilaianShiftAbsensi
from models.user import User
from models.role import Role
from models.permission import Permission
from utils.auth import get_password_hash


API_PREFIX = "/api/v1/stats"


@pytest.mark.integration
class TestStatsKpiUnitRole:
    def _create_kepala_unit_headers(
        self,
        client: TestClient,
        db_with_data: Session,
        *,
        user_id: int,
        username: str,
        password: str,
        pegawai_id: str,
        kepala_id_unit: int,
    ) -> dict:
        kepala_role = Role(id=50 + user_id, name=f"kepala-unit-{user_id}", description="Kepala Unit")
        db_with_data.add(kepala_role)
        db_with_data.commit()

        penilaian_read_perm = (
            db_with_data.query(Permission)
            .filter(Permission.name == "penilaian_shift_absensi.read")
            .first()
        )
        assert penilaian_read_perm is not None

        db_with_data.execute(
            text("INSERT INTO role_permissions (role_id, permission_id) VALUES (:role_id, :permission_id)"),
            {"role_id": kepala_role.id, "permission_id": penilaian_read_perm.id},
        )

        db_with_data.add(
            Pegawai(
                id_pegawai=pegawai_id,
                nip=f"19800101{user_id:06d}",
                nama=f"Kepala Unit {user_id}",
                id_unit=kepala_id_unit,
                kepala_id_unit=kepala_id_unit,
            )
        )
        db_with_data.add(
            User(
                id=user_id,
                id_pegawai=pegawai_id,
                username=username,
                password_hash=get_password_hash(password),
                is_active=True,
            )
        )
        db_with_data.commit()

        db_with_data.execute(
            text("INSERT INTO user_roles (user_id, role_id) VALUES (:user_id, :role_id)"),
            {"user_id": user_id, "role_id": kepala_role.id},
        )
        db_with_data.commit()

        login_response = client.post(
            "/api/v1/auth/login",
            json={"username": username, "password": password},
        )
        assert login_response.status_code == 200
        token = login_response.json()["data"]["access_token"]
        return {"Authorization": f"Bearer {token}"}

    def test_kpi_unit_role_forbidden_for_regular_user(
        self,
        client: TestClient,
        db_with_data: Session,
        auth_headers_user: dict,
    ):
        response = client.get(f"{API_PREFIX}/kpi/unit-role", headers=auth_headers_user)
        assert response.status_code == 403

    def test_kpi_unit_role_admin_success_with_expected_metrics(
        self,
        client: TestClient,
        db_with_data: Session,
        auth_headers_admin: dict,
    ):
        db_with_data.add_all([
            Unit(id_unit=10, nama_unit="Rawat Inap"),
            Unit(id_unit=20, nama_unit="IGD"),
        ])

        pgw1 = db_with_data.query(Pegawai).filter(Pegawai.id_pegawai == "PGW001").first()
        pgw2 = db_with_data.query(Pegawai).filter(Pegawai.id_pegawai == "PGW002").first()
        pgw1.id_unit = 10
        pgw2.id_unit = 20
        db_with_data.add_all([
            Pegawai(id_pegawai="PGW003", nip="19800101000003", nama="Pegawai 3", id_unit=10),
            Pegawai(id_pegawai="PGW004", nip="19800101000004", nama="Pegawai 4", id_unit=20),
            Pegawai(id_pegawai="PGW005", nip="19800101000005", nama="Pegawai 5", id_unit=20),
        ])

        db_with_data.add_all([
            RosterShift(
                id=2001,
                id_pegawai="PGW001",
                id_unit=10,
                tanggal_shift=date(2026, 3, 1),
                jam_mulai=datetime(2026, 3, 1, 7, 0, 0),
                jam_selesai=datetime(2026, 3, 1, 14, 0, 0),
                nomor_sesi=1,
                status_roster="AKTIF",
            ),
            RosterShift(
                id=2002,
                id_pegawai="PGW002",
                id_unit=20,
                tanggal_shift=date(2026, 3, 1),
                jam_mulai=datetime(2026, 3, 1, 7, 0, 0),
                jam_selesai=datetime(2026, 3, 1, 14, 0, 0),
                nomor_sesi=1,
                status_roster="AKTIF",
            ),
            RosterShift(
                id=2003,
                id_pegawai="PGW003",
                id_unit=10,
                tanggal_shift=date(2026, 3, 1),
                jam_mulai=datetime(2026, 3, 1, 7, 0, 0),
                jam_selesai=datetime(2026, 3, 1, 14, 0, 0),
                nomor_sesi=1,
                status_roster="AKTIF",
            ),
            RosterShift(
                id=2004,
                id_pegawai="PGW004",
                id_unit=20,
                tanggal_shift=date(2026, 3, 1),
                jam_mulai=datetime(2026, 3, 1, 7, 0, 0),
                jam_selesai=datetime(2026, 3, 1, 14, 0, 0),
                nomor_sesi=1,
                status_roster="AKTIF",
            ),
        ])

        db_with_data.add_all([
            PenilaianShiftAbsensi(
                id=3001,
                roster_shift_id=2001,
                id_pegawai="PGW001",
                status_final="TERLAMBAT",
                menit_telat=10,
                menit_pulang_cepat=0,
                menit_lembur=0,
            ),
            PenilaianShiftAbsensi(
                id=3002,
                roster_shift_id=2002,
                id_pegawai="PGW002",
                status_final="PULANG_CEPAT",
                menit_telat=0,
                menit_pulang_cepat=20,
                menit_lembur=0,
            ),
            PenilaianShiftAbsensi(
                id=3003,
                roster_shift_id=2003,
                id_pegawai="PGW003",
                status_final="MANGKIR",
                menit_telat=0,
                menit_pulang_cepat=0,
                menit_lembur=0,
            ),
            PenilaianShiftAbsensi(
                id=3004,
                roster_shift_id=2004,
                id_pegawai="PGW004",
                status_final="TIDAK_ABSEN_PULANG",
                menit_telat=0,
                menit_pulang_cepat=0,
                menit_lembur=0,
            ),
        ])
        db_with_data.commit()

        response = client.get(f"{API_PREFIX}/kpi/unit-role", headers=auth_headers_admin)

        assert response.status_code == 200
        payload = response.json()
        assert payload["success"] is True

        summary = payload["data"]["summary"]
        assert summary["total_karyawan_unit"] == 5
        assert summary["terjadwal_total"] == 4
        assert summary["tidak_terjadwal_total"] == 1
        assert summary["late"] == 1
        assert summary["early_leave"] == 1
        assert summary["mangkir"] == 1
        assert summary["missing_checkout"] == 1
        assert summary["scheduled_unassessed_total"] == 0
        assert summary["pelanggaran_total"] == 4
        assert summary["non_pelanggaran_terjadwal_total"] == 0
        assert summary["formula_check"]["terjadwal_equals_status_plus_unassessed"] is True

        detail = payload["data"]["detail_karyawan"]
        assert len(detail["late"]) == 1
        assert len(detail["early_leave"]) == 1
        assert len(detail["mangkir"]) == 1
        assert len(detail["missing_checkout"]) == 1
        assert len(detail["tidak_terjadwal"]) == 1
        assert len(detail["scheduled_unassessed"]) == 0
        assert detail["late"][0]["last_evaluated_at"] is not None
        assert "is_manual_override" in detail["late"][0]

        by_unit_employee = payload["data"]["by_unit_employee"]
        unit10_emp = next(item for item in by_unit_employee if item["id_unit"] == 10)
        unit20_emp = next(item for item in by_unit_employee if item["id_unit"] == 20)
        assert unit10_emp["total_karyawan_unit"] == 2
        assert unit10_emp["terjadwal_total"] == 2
        assert unit10_emp["tidak_terjadwal_total"] == 0
        assert unit20_emp["total_karyawan_unit"] == 3
        assert unit20_emp["terjadwal_total"] == 2
        assert unit20_emp["tidak_terjadwal_total"] == 1

        shift_summary = payload["data"]["shift_summary"]
        assert shift_summary["total"] == 4
        assert shift_summary["late"] == 1
        assert shift_summary["early_leave"] == 1
        assert shift_summary["mangkir"] == 1
        assert shift_summary["missing_checkout"] == 1

        watermark = payload["data"]["watermark"]
        assert watermark["as_of"] is not None
        assert watermark["last_evaluated_at"] is not None
        assert isinstance(watermark["data_freshness_minutes"], int)
        assert watermark["data_freshness_minutes"] >= 0

        audit = payload["data"]["audit"]
        assert "manual_override_total" in audit
        assert "approved_total" in audit
        assert isinstance(audit["manual_override_details"], list)
        assert isinstance(audit["approved_details"], list)

        by_unit = payload["data"]["by_unit"]
        assert len(by_unit) >= 2

        unit10 = next(item for item in by_unit if item["id_unit"] == 10)
        assert unit10["late"] == 1
        assert unit10["mangkir"] == 1

        by_role = payload["data"]["by_role"]
        role_names = {item["role_name"] for item in by_role}
        assert "admin" in role_names
        assert "user" in role_names

    def test_kpi_unit_role_filter_by_unit(
        self,
        client: TestClient,
        db_with_data: Session,
        auth_headers_admin: dict,
    ):
        db_with_data.add(Unit(id_unit=30, nama_unit="Farmasi"))
        pgw1 = db_with_data.query(Pegawai).filter(Pegawai.id_pegawai == "PGW001").first()
        pgw1.id_unit = 30
        db_with_data.add(Pegawai(id_pegawai="PGW006", nip="19800101000006", nama="Pegawai 6", id_unit=30))

        db_with_data.add(
            RosterShift(
                id=2101,
                id_pegawai="PGW001",
                id_unit=30,
                tanggal_shift=date(2026, 3, 3),
                jam_mulai=datetime(2026, 3, 3, 7, 0, 0),
                jam_selesai=datetime(2026, 3, 3, 14, 0, 0),
                nomor_sesi=1,
                status_roster="AKTIF",
            )
        )
        db_with_data.add(
            PenilaianShiftAbsensi(
                id=3101,
                roster_shift_id=2101,
                id_pegawai="PGW001",
                status_final="MANGKIR",
                menit_telat=0,
                menit_pulang_cepat=0,
                menit_lembur=0,
            )
        )
        db_with_data.commit()

        response = client.get(f"{API_PREFIX}/kpi/unit-role?id_unit=30", headers=auth_headers_admin)

        assert response.status_code == 200
        payload = response.json()
        summary = payload["data"]["summary"]
        assert summary["total_karyawan_unit"] == 2
        assert summary["terjadwal_total"] == 1
        assert summary["tidak_terjadwal_total"] == 1
        assert summary["mangkir"] == 1
        assert summary["late"] == 0
        assert summary["missing_checkout"] == 0

        detail = payload["data"]["detail_karyawan"]
        assert len(detail["mangkir"]) == 1
        assert len(detail["tidak_terjadwal"]) == 1

    def test_kpi_unit_role_row_scope_for_kepala_unit(
        self,
        client: TestClient,
        db_with_data: Session,
    ):
        db_with_data.add_all([
            Unit(id_unit=10, nama_unit="Rawat Inap"),
            Unit(id_unit=20, nama_unit="IGD"),
            Pegawai(id_pegawai="PGW011", nip="19800101000011", nama="Unit10 Pegawai", id_unit=10),
            Pegawai(id_pegawai="PGW021", nip="19800101000021", nama="Unit20 Pegawai", id_unit=20),
        ])
        db_with_data.add_all([
            RosterShift(
                id=2201,
                id_pegawai="PGW011",
                id_unit=10,
                tanggal_shift=date(2026, 3, 4),
                jam_mulai=datetime(2026, 3, 4, 7, 0, 0),
                jam_selesai=datetime(2026, 3, 4, 14, 0, 0),
                nomor_sesi=1,
                status_roster="AKTIF",
            ),
            RosterShift(
                id=2202,
                id_pegawai="PGW021",
                id_unit=20,
                tanggal_shift=date(2026, 3, 4),
                jam_mulai=datetime(2026, 3, 4, 7, 0, 0),
                jam_selesai=datetime(2026, 3, 4, 14, 0, 0),
                nomor_sesi=1,
                status_roster="AKTIF",
            ),
        ])
        db_with_data.add_all([
            PenilaianShiftAbsensi(
                id=3201,
                roster_shift_id=2201,
                id_pegawai="PGW011",
                status_final="TERLAMBAT",
                menit_telat=5,
                menit_pulang_cepat=0,
                menit_lembur=0,
            ),
            PenilaianShiftAbsensi(
                id=3202,
                roster_shift_id=2202,
                id_pegawai="PGW021",
                status_final="MANGKIR",
                menit_telat=0,
                menit_pulang_cepat=0,
                menit_lembur=0,
            ),
        ])
        db_with_data.commit()

        kepala_headers = self._create_kepala_unit_headers(
            client,
            db_with_data,
            user_id=10,
            username="kepala10",
            password="kepala123",
            pegawai_id="PGW010",
            kepala_id_unit=10,
        )

        scoped_response = client.get(f"{API_PREFIX}/kpi/unit-role", headers=kepala_headers)
        assert scoped_response.status_code == 200
        payload = scoped_response.json()
        assert payload["data"]["filters"]["id_unit"] == 10
        assert payload["data"]["summary"]["late"] == 1
        assert payload["data"]["summary"]["mangkir"] == 0

        forbidden_cross_unit = client.get(f"{API_PREFIX}/kpi/unit-role?id_unit=20", headers=kepala_headers)
        assert forbidden_cross_unit.status_code == 403

    def test_kpi_unit_role_my_unit_endpoint_for_kepala_unit(
        self,
        client: TestClient,
        db_with_data: Session,
    ):
        db_with_data.add(Unit(id_unit=40, nama_unit="Laboratorium"))
        db_with_data.add(Pegawai(id_pegawai="PGW041", nip="19800101000041", nama="Lab Pegawai", id_unit=40))
        db_with_data.add(
            RosterShift(
                id=2301,
                id_pegawai="PGW041",
                id_unit=40,
                tanggal_shift=date(2026, 3, 5),
                jam_mulai=datetime(2026, 3, 5, 7, 0, 0),
                jam_selesai=datetime(2026, 3, 5, 14, 0, 0),
                nomor_sesi=1,
                status_roster="AKTIF",
            )
        )
        db_with_data.add(
            PenilaianShiftAbsensi(
                id=3301,
                roster_shift_id=2301,
                id_pegawai="PGW041",
                status_final="TIDAK_ABSEN_PULANG",
                menit_telat=0,
                menit_pulang_cepat=0,
                menit_lembur=0,
                is_manual_override=True,
                override_reason="Koreksi manual",
                approved_by_pegawai="PGW041",
                approved_at=datetime(2026, 3, 5, 15, 0, 0),
            )
        )
        db_with_data.commit()

        kepala_headers = self._create_kepala_unit_headers(
            client,
            db_with_data,
            user_id=11,
            username="kepala40",
            password="kepala123",
            pegawai_id="PGW040",
            kepala_id_unit=40,
        )

        response = client.get(f"{API_PREFIX}/kpi/unit-role/my-unit", headers=kepala_headers)
        assert response.status_code == 200
        payload = response.json()
        assert payload["data"]["filters"]["id_unit"] == 40
        assert payload["data"]["summary"]["missing_checkout"] == 1
        assert payload["data"]["audit"]["manual_override_total"] == 1
        assert payload["data"]["audit"]["approved_total"] == 1

        missing_checkout_detail = payload["data"]["detail_karyawan"]["missing_checkout"]
        assert len(missing_checkout_detail) == 1
        assert missing_checkout_detail[0]["is_manual_override"] is True
        assert missing_checkout_detail[0]["override_reason"] == "Koreksi manual"
