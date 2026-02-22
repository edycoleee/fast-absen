"""
Endpoint tests for Penilaian Shift Absensi evaluate API
"""
import pytest
from fastapi.testclient import TestClient


API_PREFIX = "/api/v1/penilaian-shift-absensi"


@pytest.mark.integration
class TestPenilaianShiftAbsensiEvaluateEndpoint:
    def test_evaluate_without_auth_forbidden(self, client: TestClient, db_with_data):
        response = client.post(f"{API_PREFIX}/evaluate", json={})
        assert response.status_code == 403

    def test_evaluate_as_user_forbidden(self, client: TestClient, db_with_data, auth_headers_user: dict):
        response = client.post(f"{API_PREFIX}/evaluate", json={}, headers=auth_headers_user)
        assert response.status_code == 403

    def test_evaluate_as_admin_success(self, client: TestClient, db_with_data, auth_headers_admin: dict):
        response = client.post(
            f"{API_PREFIX}/evaluate",
            json={"id_pegawai": "PGW001", "force_recalculate": False},
            headers=auth_headers_admin,
        )

        assert response.status_code == 200
        payload = response.json()
        assert payload["success"] is True
        assert payload["message"] == "Penilaian shift absensi evaluate berhasil dijalankan"
        assert "data" in payload
        assert "total_roster" in payload["data"]
        assert "evaluated_count" in payload["data"]
        assert {"created_count", "updated_count", "skipped_manual_override", "skipped_existing", "failed_count"}.issubset(payload["data"].keys())
