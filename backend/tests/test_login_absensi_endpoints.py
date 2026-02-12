"""
Test Login Absensi Endpoints
Tests for device login tracking
"""
import pytest
from httpx import AsyncClient


class TestCreateLoginAbsensi:
    """Test POST /login-absensi/ - User creates device login"""
    
    @pytest.mark.asyncio
    async def test_create_login_as_user(self, client: AsyncClient, user_token: dict, db_with_data):
        """Test user can create device login record"""
        login_data = {
            "uid": "DEVICE123",
            "player_id": "PLAYER456",
            "model": "Samsung Galaxy A52"
        }
        
        response = await client.post(
            "/login-absensi/",
            json=login_data,
            headers=user_token
        )
        
        assert response.status_code == 201
        data = response.json()
        assert data["success"] is True
        assert data["message"] == "Login absensi created successfully"
        assert data["data"]["uid"] == "DEVICE123"
        assert data["data"]["player_id"] == "PLAYER456"
        assert data["data"]["model"] == "Samsung Galaxy A52"
        assert "created_at" in data["data"]
    
    @pytest.mark.asyncio
    async def test_create_login_different_devices(self, client: AsyncClient, user_token: dict, db_with_data):
        """Test user can log in from multiple devices"""
        devices = [
            {"uid": "DEVICE1", "player_id": "PLAYER1", "model": "iPhone 12"},
            {"uid": "DEVICE2", "player_id": "PLAYER2", "model": "Samsung S21"}
        ]
        
        for device in devices:
            response = await client.post("/login-absensi/", json=device, headers=user_token)
            assert response.status_code == 201
    
    @pytest.mark.asyncio
    async def test_create_login_without_auth(self, client: AsyncClient):
        """Test create login requires authentication"""
        login_data = {
            "uid": "DEVICE123",
            "player_id": "PLAYER456",
            "model": "Test Device"
        }
        
        response = await client.post("/login-absensi/", json=login_data)
        
        assert response.status_code == 401
    
    @pytest.mark.asyncio
    async def test_create_login_invalid_data(self, client: AsyncClient, user_token: dict):
        """Test create login with missing required fields"""
        login_data = {
            "uid": "DEVICE123"
            # Missing player_id and model
        }
        
        response = await client.post("/login-absensi/", json=login_data, headers=user_token)
        
        assert response.status_code == 422


class TestGetAllLoginAbsensiAdmin:
    """Test GET /login-absensi/ - Admin views all device logins"""
    
    @pytest.mark.asyncio
    async def test_get_all_login_as_admin(self, client: AsyncClient, admin_token: dict, db_with_data):
        """Test admin can view all login records"""
        response = await client.get("/login-absensi/", headers=admin_token)
        
        assert response.status_code == 200
        data = response.json()
        assert data["success"] is True
        assert isinstance(data["data"], list)
    
    @pytest.mark.asyncio
    async def test_get_all_login_pagination(self, client: AsyncClient, admin_token: dict, db_with_data):
        """Test pagination for login records"""
        response = await client.get("/login-absensi/?skip=0&limit=10", headers=admin_token)
        
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data["data"], list)
    
    @pytest.mark.asyncio
    async def test_get_all_login_requires_admin(self, client: AsyncClient, user_token: dict):
        """Test regular user cannot view all login records"""
        response = await client.get("/login-absensi/", headers=user_token)
        
        assert response.status_code == 403
    
    @pytest.mark.asyncio
    async def test_get_all_login_includes_pegawai_info(self, client: AsyncClient, admin_token: dict, user_token: dict, db_with_data):
        """Test admin can see which employee logged in from which device"""
        # Create login as user
        login_data = {
            "uid": "DEVICE123",
            "player_id": "PLAYER456",
            "model": "Test Device"
        }
        await client.post("/login-absensi/", json=login_data, headers=user_token)
        
        # Admin gets all with pegawai info
        response = await client.get("/login-absensi/", headers=admin_token)
        
        assert response.status_code == 200
        data = response.json()
        if len(data["data"]) > 0:
            # Check if pegawai_nama is included
            assert "pegawai_nama" in data["data"][0] or "id_pegawai" in data["data"][0]


class TestGetLoginAbsensiByIdAdmin:
    """Test GET /login-absensi/{id} - Admin views specific login"""
    
    @pytest.mark.asyncio
    async def test_get_login_by_id_as_admin(self, client: AsyncClient, admin_token: dict, user_token: dict, db_with_data):
        """Test admin can view specific login record"""
        # Create login as user
        login_data = {
            "uid": "DEVICE123",
            "player_id": "PLAYER456",
            "model": "Test Device"
        }
        create_response = await client.post("/login-absensi/", json=login_data, headers=user_token)
        created_id = create_response.json()["data"]["id"]
        
        # Admin gets it by ID
        response = await client.get(f"/login-absensi/{created_id}", headers=admin_token)
        
        assert response.status_code == 200
        data = response.json()
        assert data["success"] is True
        assert data["data"]["id"] == created_id
        assert data["data"]["uid"] == "DEVICE123"
    
    @pytest.mark.asyncio
    async def test_get_login_by_id_nonexistent(self, client: AsyncClient, admin_token: dict, db_with_data):
        """Test get nonexistent login returns 404"""
        response = await client.get("/login-absensi/99999", headers=admin_token)
        
        assert response.status_code == 404
    
    @pytest.mark.asyncio
    async def test_get_login_by_id_requires_admin(self, client: AsyncClient, user_token: dict, db_with_data):
        """Test regular user cannot view login by ID"""
        response = await client.get("/login-absensi/1", headers=user_token)
        
        assert response.status_code == 403
    
    @pytest.mark.asyncio
    async def test_get_login_by_id_includes_pegawai_info(self, client: AsyncClient, admin_token: dict, user_token: dict, db_with_data):
        """Test login detail includes employee information"""
        # Create login as user
        login_data = {
            "uid": "DEVICE123",
            "player_id": "PLAYER456",
            "model": "Test Device"
        }
        create_response = await client.post("/login-absensi/", json=login_data, headers=user_token)
        created_id = create_response.json()["data"]["id"]
        
        # Admin gets detail
        response = await client.get(f"/login-absensi/{created_id}", headers=admin_token)
        
        assert response.status_code == 200
        data = response.json()
        assert "pegawai_nama" in data["data"] or "id_pegawai" in data["data"]


class TestLoginAbsensiWorkflow:
    """Test complete workflow for device login tracking"""
    
    @pytest.mark.asyncio
    async def test_complete_login_tracking_workflow(self, client: AsyncClient, admin_token: dict, user_token: dict, db_with_data):
        """Test complete workflow: user logs in, admin monitors"""
        # Step 1: User logs in from device
        login_data = {
            "uid": "WORKFLOW_DEVICE",
            "player_id": "WORKFLOW_PLAYER",
            "model": "Workflow Test Device"
        }
        create_response = await client.post("/login-absensi/", json=login_data, headers=user_token)
        assert create_response.status_code == 201
        created_id = create_response.json()["data"]["id"]
        
        # Step 2: Admin views all logins
        all_response = await client.get("/login-absensi/", headers=admin_token)
        assert all_response.status_code == 200
        
        # Step 3: Admin views specific login
        detail_response = await client.get(f"/login-absensi/{created_id}", headers=admin_token)
        assert detail_response.status_code == 200
        assert detail_response.json()["data"]["uid"] == "WORKFLOW_DEVICE"
    
    @pytest.mark.asyncio
    async def test_multiple_users_multiple_devices(self, client: AsyncClient, admin_token: dict, user_token: dict, db_with_data):
        """Test tracking logins from multiple users and devices"""
        # User logs in from 2 devices
        devices = [
            {"uid": "USER1_DEVICE1", "player_id": "P1", "model": "Phone 1"},
            {"uid": "USER1_DEVICE2", "player_id": "P2", "model": "Phone 2"}
        ]
        
        for device in devices:
            response = await client.post("/login-absensi/", json=device, headers=user_token)
            assert response.status_code == 201
        
        # Admin can see all
        response = await client.get("/login-absensi/", headers=admin_token)
        assert response.status_code == 200
        assert len(response.json()["data"]) >= 2
