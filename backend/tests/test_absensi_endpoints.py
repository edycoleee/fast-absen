"""
Test Absensi Endpoints
Tests for admin CRUD and user dashboard access
"""
import pytest
from httpx import AsyncClient
from datetime import datetime


class TestCreateUserAbsensi:
    """Test POST /absensi/create - User creates own absensi"""
    
    @pytest.mark.asyncio
    async def test_create_absensi_as_user(self, client: AsyncClient, user_token: dict, db_with_data):
        """Test user can create own absensi"""
        # User token has id_pegawai from fixture
        absensi_data = {
            "id_lokasi": "LOK001",
            "uid": "ABC123",
            "keterangan": "Hadir tepat waktu"
        }
        
        response = await client.post(
            "/absensi/create",
            json=absensi_data,
            headers=user_token
        )
        
        assert response.status_code == 201
        data = response.json()
        assert data["success"] is True
        assert data["message"] == "Absensi created successfully"
        assert data["data"]["id_lokasi"] == "LOK001"
        assert data["data"]["uid"] == "ABC123"
        assert data["data"]["keterangan"] == "Hadir tepat waktu"
        assert "ip_address" in data["data"]
        assert "tanggal" in data["data"]
    
    @pytest.mark.asyncio
    async def test_create_absensi_without_auth(self, client: AsyncClient):
        """Test create absensi requires authentication"""
        absensi_data = {
            "id_lokasi": "LOK001",
            "uid": "ABC123",
            "keterangan": "Hadir"
        }
        
        response = await client.post("/absensi/create", json=absensi_data)
        
        assert response.status_code == 401


class TestGetMyAbsensi:
    """Test GET /absensi/me - User views own absensi"""
    
    @pytest.mark.asyncio
    async def test_get_my_absensi_list(self, client: AsyncClient, user_token: dict, db_with_data):
        """Test user can view own absensi list"""
        # First create an absensi
        absensi_data = {
            "id_lokasi": "LOK001",
            "uid": "UID123",
            "keterangan": "Hadir"
        }
        await client.post("/absensi/create", json=absensi_data, headers=user_token)
        
        # Get list
        response = await client.get("/absensi/me", headers=user_token)
        
        assert response.status_code == 200
        data = response.json()
        assert data["success"] is True
        assert isinstance(data["data"], list)
        assert len(data["data"]) > 0
    
    @pytest.mark.asyncio
    async def test_get_my_absensi_pagination(self, client: AsyncClient, user_token: dict, db_with_data):
        """Test pagination for user absensi"""
        response = await client.get("/absensi/me?skip=0&limit=10", headers=user_token)
        
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data["data"], list)
    
    @pytest.mark.asyncio
    async def test_get_my_absensi_without_auth(self, client: AsyncClient):
        """Test get my absensi requires authentication"""
        response = await client.get("/absensi/me")
        
        assert response.status_code == 401


class TestGetMyAbsensiById:
    """Test GET /absensi/me/{id} - User views specific own absensi"""
    
    @pytest.mark.asyncio
    async def test_get_my_absensi_by_id(self, client: AsyncClient, user_token: dict, db_with_data):
        """Test user can view specific own absensi"""
        # Create absensi
        absensi_data = {
            "id_lokasi": "LOK001",
            "uid": "UID123",
            "keterangan": "Hadir"
        }
        create_response = await client.post("/absensi/create", json=absensi_data, headers=user_token)
        created_id = create_response.json()["data"]["id"]
        
        # Get by ID
        response = await client.get(f"/absensi/me/{created_id}", headers=user_token)
        
        assert response.status_code == 200
        data = response.json()
        assert data["success"] is True
        assert data["data"]["id"] == created_id
    
    @pytest.mark.asyncio
    async def test_get_my_absensi_nonexistent_id(self, client: AsyncClient, user_token: dict, db_with_data):
        """Test get nonexistent absensi returns 404"""
        response = await client.get("/absensi/me/99999", headers=user_token)
        
        assert response.status_code == 404


class TestGetAllAbsensiAdmin:
    """Test GET /absensi/ - Admin views all absensi"""
    
    @pytest.mark.asyncio
    async def test_get_all_absensi_as_admin(self, client: AsyncClient, admin_token: dict, db_with_data):
        """Test admin can view all absensi"""
        response = await client.get("/absensi/", headers=admin_token)
        
        assert response.status_code == 200
        data = response.json()
        assert data["success"] is True
        assert isinstance(data["data"], list)
    
    @pytest.mark.asyncio
    async def test_get_all_absensi_pagination(self, client: AsyncClient, admin_token: dict, db_with_data):
        """Test pagination for admin"""
        response = await client.get("/absensi/?skip=0&limit=10", headers=admin_token)
        
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data["data"], list)
    
    @pytest.mark.asyncio
    async def test_get_all_absensi_requires_admin(self, client: AsyncClient, user_token: dict):
        """Test regular user cannot access admin endpoint"""
        response = await client.get("/absensi/", headers=user_token)
        
        assert response.status_code == 403


class TestGetAbsensiByIdAdmin:
    """Test GET /absensi/{id} - Admin views absensi by ID"""
    
    @pytest.mark.asyncio
    async def test_get_absensi_by_id_as_admin(self, client: AsyncClient, admin_token: dict, user_token: dict, db_with_data):
        """Test admin can view any absensi by ID"""
        # Create absensi as user
        absensi_data = {
            "id_lokasi": "LOK001",
            "uid": "UID123",
            "keterangan": "Hadir"
        }
        create_response = await client.post("/absensi/create", json=absensi_data, headers=user_token)
        created_id = create_response.json()["data"]["id"]
        
        # Admin gets it
        response = await client.get(f"/absensi/{created_id}", headers=admin_token)
        
        assert response.status_code == 200
        data = response.json()
        assert data["success"] is True
        assert data["data"]["id"] == created_id
    
    @pytest.mark.asyncio
    async def test_get_absensi_by_id_requires_admin(self, client: AsyncClient, user_token: dict, db_with_data):
        """Test regular user cannot access admin endpoint"""
        response = await client.get("/absensi/1", headers=user_token)
        
        assert response.status_code == 403


class TestUpdateAbsensiAdmin:
    """Test PUT /absensi/{id} - Admin updates absensi"""
    
    @pytest.mark.asyncio
    async def test_update_absensi_as_admin(self, client: AsyncClient, admin_token: dict, user_token: dict, db_with_data):
        """Test admin can update any absensi"""
        # Create absensi as user
        absensi_data = {
            "id_lokasi": "LOK001",
            "uid": "UID123",
            "keterangan": "Hadir"
        }
        create_response = await client.post("/absensi/create", json=absensi_data, headers=user_token)
        created_id = create_response.json()["data"]["id"]
        
        # Admin updates it
        update_data = {
            "keterangan": "Hadir dengan izin terlambat"
        }
        response = await client.put(f"/absensi/{created_id}", json=update_data, headers=admin_token)
        
        assert response.status_code == 200
        data = response.json()
        assert data["success"] is True
        assert data["data"]["keterangan"] == "Hadir dengan izin terlambat"
    
    @pytest.mark.asyncio
    async def test_update_absensi_nonexistent(self, client: AsyncClient, admin_token: dict, db_with_data):
        """Test update nonexistent absensi returns 404"""
        update_data = {"keterangan": "Updated"}
        
        response = await client.put("/absensi/99999", json=update_data, headers=admin_token)
        
        assert response.status_code == 404
    
    @pytest.mark.asyncio
    async def test_update_absensi_requires_admin(self, client: AsyncClient, user_token: dict, db_with_data):
        """Test regular user cannot update absensi"""
        update_data = {"keterangan": "Updated"}
        
        response = await client.put("/absensi/1", json=update_data, headers=user_token)
        
        assert response.status_code == 403


class TestDeleteAbsensiAdmin:
    """Test DELETE /absensi/{id} - Admin deletes absensi"""
    
    @pytest.mark.asyncio
    async def test_delete_absensi_as_admin(self, client: AsyncClient, admin_token: dict, user_token: dict, db_with_data):
        """Test admin can delete any absensi"""
        # Create absensi as user
        absensi_data = {
            "id_lokasi": "LOK001",
            "uid": "UID123",
            "keterangan": "Hadir"
        }
        create_response = await client.post("/absensi/create", json=absensi_data, headers=user_token)
        created_id = create_response.json()["data"]["id"]
        
        # Admin deletes it
        response = await client.delete(f"/absensi/{created_id}", headers=admin_token)
        
        assert response.status_code == 200
        data = response.json()
        assert data["success"] is True
    
    @pytest.mark.asyncio
    async def test_delete_absensi_nonexistent(self, client: AsyncClient, admin_token: dict, db_with_data):
        """Test delete nonexistent absensi returns 404"""
        response = await client.delete("/absensi/99999", headers=admin_token)
        
        assert response.status_code == 404
    
    @pytest.mark.asyncio
    async def test_delete_absensi_requires_admin(self, client: AsyncClient, user_token: dict, db_with_data):
        """Test regular user cannot delete absensi"""
        response = await client.delete("/absensi/1", headers=user_token)
        
        assert response.status_code == 403
