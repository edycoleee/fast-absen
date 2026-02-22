"""
Test User Sessions Endpoints
Tests for user session tracking
"""
import pytest
from fastapi.testclient import TestClient


class TestCreateUserSession:
    """Test POST /user-sessions/ - User creates session"""

    def test_create_login_as_user(self, client: TestClient, auth_headers_user: dict, db_with_data):
        login_data = {
            "uid": "DEVICE123",
            "player_id": "PLAYER456",
            "model": "Samsung Galaxy A52"
        }

        response = client.post(
            "/api/v1/user-sessions/",
            json=login_data,
            headers=auth_headers_user
        )

        assert response.status_code == 201
        data = response.json()
        assert data["success"] is True
        assert data["message"] == "User session created successfully"
        assert data["data"]["uid"] == "DEVICE123"
        assert data["data"]["player_id"] == "PLAYER456"
        assert data["data"]["model"] == "Samsung Galaxy A52"
        assert "created_at" in data["data"]

    def test_create_login_different_devices(self, client: TestClient, auth_headers_user: dict, db_with_data):
        devices = [
            {"uid": "DEVICE1", "player_id": "PLAYER1", "model": "iPhone 12"},
            {"uid": "DEVICE2", "player_id": "PLAYER2", "model": "Samsung S21"}
        ]

        for device in devices:
            response = client.post("/api/v1/user-sessions/", json=device, headers=auth_headers_user)
            assert response.status_code == 201

    def test_create_login_without_auth(self, client: TestClient):
        login_data = {
            "uid": "DEVICE123",
            "player_id": "PLAYER456",
            "model": "Test Device"
        }

        response = client.post("/api/v1/user-sessions/", json=login_data)
        assert response.status_code == 403

    def test_create_login_invalid_data(self, client: TestClient, auth_headers_user: dict, db_with_data):
        login_data = {"uid": "DEVICE123"}

        response = client.post("/api/v1/user-sessions/", json=login_data, headers=auth_headers_user)
        assert response.status_code == 201


class TestGetAllUserSessionsAdmin:
    """Test GET /user-sessions/ - Admin views all sessions"""

    def test_get_all_login_as_admin(self, client: TestClient, auth_headers_admin: dict, db_with_data):
        response = client.get("/api/v1/user-sessions/", headers=auth_headers_admin)

        assert response.status_code == 200
        data = response.json()
        assert data["success"] is True
        assert "items" in data["data"]
        assert "total" in data["data"]
        assert "skip" in data["data"]
        assert "limit" in data["data"]
        assert isinstance(data["data"]["items"], list)

    def test_get_all_login_pagination(self, client: TestClient, auth_headers_admin: dict, db_with_data):
        response = client.get("/api/v1/user-sessions/?skip=0&limit=10", headers=auth_headers_admin)

        assert response.status_code == 200
        data = response.json()
        assert data["data"]["skip"] == 0
        assert data["data"]["limit"] == 10
        assert isinstance(data["data"]["items"], list)

    def test_get_all_login_requires_admin(self, client: TestClient, auth_headers_user: dict, db_with_data):
        response = client.get("/api/v1/user-sessions/", headers=auth_headers_user)
        assert response.status_code == 403

    def test_get_all_login_includes_pegawai_info(
        self,
        client: TestClient,
        auth_headers_admin: dict,
        auth_headers_user: dict,
        db_with_data,
    ):
        login_data = {
            "uid": "DEVICE123",
            "player_id": "PLAYER456",
            "model": "Test Device"
        }
        client.post("/api/v1/user-sessions/", json=login_data, headers=auth_headers_user)

        response = client.get("/api/v1/user-sessions/", headers=auth_headers_admin)
        assert response.status_code == 200
        data = response.json()

        if len(data["data"]["items"]) > 0:
            assert "pegawai_nama" in data["data"]["items"][0] or "id_pegawai" in data["data"]["items"][0]


class TestGetUserSessionByIdAdmin:
    """Test GET /user-sessions/records/{id} - Admin views specific session"""

    def test_get_login_by_id_as_admin(
        self,
        client: TestClient,
        auth_headers_admin: dict,
        auth_headers_user: dict,
        db_with_data,
    ):
        login_data = {
            "uid": "DEVICE123",
            "player_id": "PLAYER456",
            "model": "Test Device"
        }
        create_response = client.post("/api/v1/user-sessions/", json=login_data, headers=auth_headers_user)
        created_id = create_response.json()["data"]["id"]

        response = client.get(f"/api/v1/user-sessions/records/{created_id}", headers=auth_headers_admin)

        assert response.status_code == 200
        data = response.json()
        assert data["success"] is True
        assert data["data"]["id"] == created_id
        assert data["data"]["uid"] == "DEVICE123"

    def test_get_login_by_id_nonexistent(self, client: TestClient, auth_headers_admin: dict, db_with_data):
        response = client.get("/api/v1/user-sessions/records/99999", headers=auth_headers_admin)
        assert response.status_code == 404

    def test_get_login_by_id_requires_admin(self, client: TestClient, auth_headers_user: dict, db_with_data):
        response = client.get("/api/v1/user-sessions/records/1", headers=auth_headers_user)
        assert response.status_code == 403

    def test_get_login_by_id_includes_pegawai_info(
        self,
        client: TestClient,
        auth_headers_admin: dict,
        auth_headers_user: dict,
        db_with_data,
    ):
        login_data = {
            "uid": "DEVICE123",
            "player_id": "PLAYER456",
            "model": "Test Device"
        }
        create_response = client.post("/api/v1/user-sessions/", json=login_data, headers=auth_headers_user)
        created_id = create_response.json()["data"]["id"]

        response = client.get(f"/api/v1/user-sessions/records/{created_id}", headers=auth_headers_admin)

        assert response.status_code == 200
        data = response.json()
        assert "pegawai_nama" in data["data"] or "id_pegawai" in data["data"]


class TestUserSessionWorkflow:
    """Test complete workflow for user session tracking"""

    def test_complete_login_tracking_workflow(
        self,
        client: TestClient,
        auth_headers_admin: dict,
        auth_headers_user: dict,
        db_with_data,
    ):
        login_data = {
            "uid": "WORKFLOW_DEVICE",
            "player_id": "WORKFLOW_PLAYER",
            "model": "Workflow Test Device"
        }
        create_response = client.post("/api/v1/user-sessions/", json=login_data, headers=auth_headers_user)
        assert create_response.status_code == 201
        created_id = create_response.json()["data"]["id"]

        all_response = client.get("/api/v1/user-sessions/", headers=auth_headers_admin)
        assert all_response.status_code == 200

        detail_response = client.get(f"/api/v1/user-sessions/records/{created_id}", headers=auth_headers_admin)
        assert detail_response.status_code == 200
        assert detail_response.json()["data"]["uid"] == "WORKFLOW_DEVICE"

    def test_multiple_users_multiple_devices(
        self,
        client: TestClient,
        auth_headers_admin: dict,
        auth_headers_user: dict,
        db_with_data,
    ):
        devices = [
            {"uid": "USER1_DEVICE1", "player_id": "P1", "model": "Phone 1"},
            {"uid": "USER1_DEVICE2", "player_id": "P2", "model": "Phone 2"}
        ]

        for device in devices:
            response = client.post("/api/v1/user-sessions/", json=device, headers=auth_headers_user)
            assert response.status_code == 201

        response = client.get("/api/v1/user-sessions/", headers=auth_headers_admin)
        assert response.status_code == 200
        assert len(response.json()["data"]["items"]) >= 2
