"""
Unit tests for permission endpoints
"""
import pytest
from fastapi.testclient import TestClient
from sqlalchemy.orm import Session


def _error_text(response) -> str:
    body = response.json()
    return (body.get("detail") or body.get("message") or "").lower()


@pytest.mark.permission
class TestGetPermissions:
    """Test GET /permissions/ endpoint"""
    
    def test_get_permissions_as_admin(
        self, 
        client: TestClient, 
        db_with_data: Session, 
        auth_headers_admin: dict
    ):
        """Test getting permissions list as admin"""
        response = client.get("/api/v1/permissions/", headers=auth_headers_admin)
        
        assert response.status_code == 200
        data = response.json()
        
        assert data["success"] is True
        assert "items" in data["data"]
        assert len(data["data"]["items"]) >= 5
        assert data["data"]["total"] >= 5
        assert data["data"]["skip"] == 0
    
    def test_get_permissions_with_pagination(
        self,
        client: TestClient,
        db_with_data: Session,
        auth_headers_admin: dict
    ):
        """Test getting permissions with pagination parameters"""
        response = client.get(
            "/api/v1/permissions/?skip=0&limit=3",
            headers=auth_headers_admin
        )
        
        assert response.status_code == 200
        data = response.json()
        assert data["data"]["skip"] == 0
        assert data["data"]["limit"] == 3
    
    def test_get_permissions_as_user_forbidden(
        self,
        client: TestClient,
        db_with_data: Session,
        auth_headers_user: dict
    ):
        """Test getting permissions list as regular user (should be forbidden)"""
        response = client.get("/api/v1/permissions/", headers=auth_headers_user)
        
        assert response.status_code == 403  # Forbidden
    
    def test_get_permissions_without_auth(self, client: TestClient, db_with_data: Session):
        """Test getting permissions without authentication"""
        response = client.get("/api/v1/permissions/")
        
        assert response.status_code == 403  # No auth token


@pytest.mark.permission
class TestCreatePermission:
    """Test POST /permissions/ endpoint"""
    
    def test_create_permission_as_admin(
        self,
        client: TestClient,
        db_with_data: Session,
        auth_headers_admin: dict
    ):
        """Test creating a new permission as admin"""
        new_permission = {
            "name": "custom.permission.create",
            "description": "Create custom permission"
        }
        
        response = client.post(
            "/api/v1/permissions/",
            json=new_permission,
            headers=auth_headers_admin
        )
        
        assert response.status_code == 201
        data = response.json()
        
        assert data["success"] is True
        assert data["data"]["name"] == "custom.permission.create"
        assert data["data"]["description"] == "Create custom permission"
        assert "id" in data["data"]
    
    def test_create_permission_duplicate_name(
        self,
        client: TestClient,
        db_with_data: Session,
        auth_headers_admin: dict
    ):
        """Test creating permission with duplicate name"""
        new_permission = {
            "name": "user.login",  # Already exists
            "description": "Duplicate login"
        }
        
        response = client.post(
            "/api/v1/permissions/",
            json=new_permission,
            headers=auth_headers_admin
        )
        
        assert response.status_code == 400
        assert "already exists" in _error_text(response)
    
    def test_create_permission_as_user_forbidden(
        self,
        client: TestClient,
        db_with_data: Session,
        auth_headers_user: dict
    ):
        """Test creating permission as regular user (should be forbidden)"""
        new_permission = {
            "name": "test.permission",
            "description": "Test Permission"
        }
        
        response = client.post(
            "/api/v1/permissions/",
            json=new_permission,
            headers=auth_headers_user
        )
        
        assert response.status_code == 403
    
    def test_create_permission_without_auth(
        self,
        client: TestClient,
        db_with_data: Session
    ):
        """Test creating permission without authentication"""
        new_permission = {
            "name": "test.permission",
            "description": "Test Permission"
        }
        
        response = client.post("/api/v1/permissions/", json=new_permission)
        
        assert response.status_code == 403


@pytest.mark.permission
class TestGetPermissionById:
    """Test GET /permissions/{permission_id} endpoint"""
    
    def test_get_permission_by_id_as_admin(
        self,
        client: TestClient,
        db_with_data: Session,
        auth_headers_admin: dict
    ):
        """Test getting permission by ID as admin"""
        # Get permission list first to get valid ID
        list_response = client.get("/api/v1/permissions/", headers=auth_headers_admin)
        permissions = list_response.json()["data"]["items"]
        permission_id = permissions[0]["id"]
        
        # Get specific permission
        response = client.get(f"/api/v1/permissions/{permission_id}", headers=auth_headers_admin)
        
        assert response.status_code == 200
        data = response.json()
        
        assert data["success"] is True
        assert data["data"]["id"] == permission_id
        assert "name" in data["data"]
    
    def test_get_permission_not_found(
        self,
        client: TestClient,
        db_with_data: Session,
        auth_headers_admin: dict
    ):
        """Test getting non-existent permission"""
        response = client.get("/api/v1/permissions/999", headers=auth_headers_admin)
        
        assert response.status_code == 404
    
    def test_get_permission_by_id_as_user_forbidden(
        self,
        client: TestClient,
        db_with_data: Session,
        auth_headers_user: dict
    ):
        """Test getting permission by ID as regular user (should be forbidden)"""
        response = client.get("/api/v1/permissions/1", headers=auth_headers_user)
        
        assert response.status_code == 403


@pytest.mark.permission
class TestUpdatePermission:
    """Test PUT /permissions/{permission_id} endpoint"""
    
    def test_update_permission_as_admin(
        self,
        client: TestClient,
        db_with_data: Session,
        auth_headers_admin: dict
    ):
        """Test updating permission as admin"""
        # Create a test permission first
        new_permission = {
            "name": "test.permission",
            "description": "Test permission"
        }
        create_response = client.post(
            "/api/v1/permissions/",
            json=new_permission,
            headers=auth_headers_admin
        )
        permission_id = create_response.json()["data"]["id"]
        
        # Update the permission
        update_data = {
            "description": "Updated description"
        }
        response = client.put(
            f"/api/v1/permissions/{permission_id}",
            json=update_data,
            headers=auth_headers_admin
        )
        
        assert response.status_code == 200
        data = response.json()
        
        assert data["success"] is True
        assert data["data"]["description"] == "Updated description"
        assert data["data"]["name"] == "test.permission"  # Name unchanged
    
    def test_update_permission_name(
        self,
        client: TestClient,
        db_with_data: Session,
        auth_headers_admin: dict
    ):
        """Test updating permission name"""
        # Create a test permission
        new_permission = {
            "name": "old.permission",
            "description": "Old permission"
        }
        create_response = client.post(
            "/api/v1/permissions/",
            json=new_permission,
            headers=auth_headers_admin
        )
        permission_id = create_response.json()["data"]["id"]
        
        # Update the permission name
        update_data = {"name": "new.permission"}
        response = client.put(
            f"/api/v1/permissions/{permission_id}",
            json=update_data,
            headers=auth_headers_admin
        )
        
        assert response.status_code == 200
        assert response.json()["data"]["name"] == "new.permission"
    
    def test_update_permission_duplicate_name(
        self,
        client: TestClient,
        db_with_data: Session,
        auth_headers_admin: dict
    ):
        """Test updating permission with duplicate name"""
        # Create a test permission
        new_permission = {
            "name": "unique.permission",
            "description": "Unique permission"
        }
        create_response = client.post(
            "/api/v1/permissions/",
            json=new_permission,
            headers=auth_headers_admin
        )
        permission_id = create_response.json()["data"]["id"]
        
        # Try to update to existing name
        update_data = {"name": "user.login"}  # Already exists
        response = client.put(
            f"/api/v1/permissions/{permission_id}",
            json=update_data,
            headers=auth_headers_admin
        )
        
        assert response.status_code == 400
        assert "already exists" in _error_text(response)
    
    def test_update_permission_not_found(
        self,
        client: TestClient,
        db_with_data: Session,
        auth_headers_admin: dict
    ):
        """Test updating non-existent permission"""
        update_data = {"description": "New description"}
        response = client.put(
            "/api/v1/permissions/999",
            json=update_data,
            headers=auth_headers_admin
        )
        
        assert response.status_code == 404
    
    def test_update_permission_as_user_forbidden(
        self,
        client: TestClient,
        db_with_data: Session,
        auth_headers_user: dict
    ):
        """Test updating permission as regular user (should be forbidden)"""
        update_data = {"description": "New description"}
        response = client.put(
            "/api/v1/permissions/1",
            json=update_data,
            headers=auth_headers_user
        )
        
        assert response.status_code == 403


@pytest.mark.permission
class TestDeletePermission:
    """Test DELETE /permissions/{permission_id} endpoint"""
    
    def test_delete_permission_as_admin(
        self,
        client: TestClient,
        db_with_data: Session,
        auth_headers_admin: dict
    ):
        """Test deleting permission as admin"""
        # Create a test permission
        new_permission = {
            "name": "delete.permission",
            "description": "Permission to delete"
        }
        create_response = client.post(
            "/api/v1/permissions/",
            json=new_permission,
            headers=auth_headers_admin
        )
        permission_id = create_response.json()["data"]["id"]
        
        # Delete the permission
        response = client.delete(
            f"/api/v1/permissions/{permission_id}",
            headers=auth_headers_admin
        )
        
        assert response.status_code == 200
        data = response.json()
        
        assert data["success"] is True
        assert "deleted" in data["message"].lower()
        
        # Verify permission is deleted
        get_response = client.get(f"/api/v1/permissions/{permission_id}", headers=auth_headers_admin)
        assert get_response.status_code == 404
    
    def test_delete_system_permission_user_login(
        self,
        client: TestClient,
        db_with_data: Session,
        auth_headers_admin: dict
    ):
        """Test deleting system permission 'user.login' (should fail)"""
        # Get user.login permission ID
        list_response = client.get("/api/v1/permissions/?skip=0&limit=200", headers=auth_headers_admin)
        permissions = list_response.json()["data"]["items"]
        login_perm = next(p for p in permissions if p["name"] == "user.login")
        
        # Try to delete system permission
        response = client.delete(
            f"/api/v1/permissions/{login_perm['id']}",
            headers=auth_headers_admin
        )
        
        assert response.status_code == 400
        assert "system permission" in _error_text(response)
    
    def test_delete_system_permission_absensi(
        self,
        client: TestClient,
        db_with_data: Session,
        auth_headers_admin: dict
    ):
        """Test deleting system permission 'absensi.create' (should fail)"""
        # Get absensi.create permission ID
        list_response = client.get("/api/v1/permissions/?skip=0&limit=200", headers=auth_headers_admin)
        permissions = list_response.json()["data"]["items"]
        absensi_perm = next(p for p in permissions if p["name"] == "absensi.create")
        
        # Try to delete system permission
        response = client.delete(
            f"/api/v1/permissions/{absensi_perm['id']}",
            headers=auth_headers_admin
        )
        
        assert response.status_code == 400
        assert "system permission" in _error_text(response)
    
    def test_delete_permission_not_found(
        self,
        client: TestClient,
        db_with_data: Session,
        auth_headers_admin: dict
    ):
        """Test deleting non-existent permission"""
        response = client.delete("/api/v1/permissions/999", headers=auth_headers_admin)
        
        assert response.status_code == 404
    
    def test_delete_permission_as_user_forbidden(
        self,
        client: TestClient,
        db_with_data: Session,
        auth_headers_user: dict
    ):
        """Test deleting permission as regular user (should be forbidden)"""
        response = client.delete("/api/v1/permissions/1", headers=auth_headers_user)
        
        assert response.status_code == 403
